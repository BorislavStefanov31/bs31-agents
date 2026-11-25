#!/usr/bin/env node
// merged-ledger.mjs: which merges on a branch still need a check after merge, and the verdict
// recorded for each. Node 18+, no dependencies, no network. It calls the local git binary
// read-only (rev-parse, log, merge-base) and writes one file: the ledger.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HELP = `merged-ledger.mjs: a ledger of checks after merge, over a local git repository

  node merged-ledger.mjs start   --at REF                      first use: check merges after REF only
  node merged-ledger.mjs pending [--deployed REF] [--retry-blocked] [--limit N] [--check] [--json]
  node merged-ledger.mjs record  --commit REF --verdict passed|failed|blocked --note TEXT
                                 [--deployed REF] [--replace]
  node merged-ledger.mjs status
  node merged-ledger.mjs --selftest | --help

Options for every mode:
  --branch NAME       integration branch to read (default main; use origin/main after a fetch)
  --ledger FILE       ledger path (default .merged-ledger.jsonl at the top of the working folder)
  --key-pattern RE    work item key pattern (default [A-Z][A-Z0-9]+-[0-9]+)
  --all-commits       count every first-parent commit, for squash or rebase merging
pending  Lists merges on the first-parent history of the branch that have no verdict, oldest
         first: commit, date, work item keys, subject. Keys come from the merge message, or from
         the commits it brought in when the message has none. --deployed marks each merge
         in-build or not-in-build against the commit the environment runs. --check exits 1
         when anything is pending.
record   Appends one verdict. Refuses an unknown verdict, an empty note, a commit that is not on
         the branch, a second passed or failed verdict without --replace, and passed or failed
         for a merge that the --deployed build does not contain.
status   Counts and lists by verdict, plus what is pending.
Exit: 0 done; 1 something is pending (pending --check only); 2 bad input or git failure.`;

const VERDICTS = ['passed', 'failed', 'blocked'];
class Fail extends Error {}
let git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim();
// Text from commits is echoed only through this: one line, no control characters, bounded.
const clean = (s, max = 80) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
const short = (id) => id.slice(0, 10);

function resolve(ref, what) {
  if (!ref || /^-|\s|\.\./.test(ref)) throw new Fail(`bad ${what}: "${clean(ref, 40)}"`);
  try { return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); } catch {
    throw new Fail(`${what} "${clean(ref, 40)}" is not a commit in this repository`);
  }
}
function contains(build, commit) { // true when the build's history includes the commit
  try { git(['merge-base', '--is-ancestor', commit, build]); return true; } catch (e) {
    if (e.status === 1) return false;
    throw new Fail(`git merge-base failed for ${short(commit)}`);
  }
}
const keysIn = (text, pattern) => [...new Set(String(text).match(new RegExp(pattern, 'g')) || [])];

// Merges on the first-parent line of the branch after the ledger start, oldest first.
function merges(o, start) {
  const pick = o.allCommits ? [] : ['--merges'];
  const out = git(['log', '--first-parent', ...pick, '--reverse', '--format=%H%x1f%cs%x1f%s%x1f%b%x1e', start ? `${start}..${o.tip}` : o.tip]);
  return out.split('\x1e').map((r) => r.replace(/^\s+/, '')).filter(Boolean).map((r) => {
    const [commit, date, subject, body = ''] = r.split('\x1f');
    let keys = keysIn(`${subject}\n${body}`, o.pattern);
    if (!keys.length) { try { keys = keysIn(git(['log', '--format=%s%n%b', `${commit}^1..${commit}`]), o.pattern); } catch { /* root commit */ } }
    return { commit, date, subject: clean(subject), keys };
  });
}

function parseLedger(text) {
  const led = { start: null, verdicts: new Map() };
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let e;
    try { e = JSON.parse(line); } catch { throw new Fail(`ledger line ${i + 1} is not JSON`); }
    if (e.start) led.start = e.start;
    else if (e.commit && VERDICTS.includes(e.verdict)) led.verdicts.set(e.commit, e); // the latest line for a commit wins
    else throw new Fail(`ledger line ${i + 1} is neither a start nor a verdict`);
  });
  return led;
}

function pending(o, led) {
  const list = merges(o, led.start).filter((m) => {
    const seen = led.verdicts.get(m.commit);
    return !seen || (o.retryBlocked && seen.verdict === 'blocked');
  });
  if (o.build) for (const m of list) m.inBuild = contains(o.build, m.commit);
  return list;
}

function record(o, led) {
  if (!VERDICTS.includes(o.verdict)) throw new Fail(`unknown verdict "${clean(o.verdict, 20)}"; use passed, failed or blocked`);
  const note = clean(o.note, 400);
  if (!note) throw new Fail('--note is required: what was done and seen, or why the item is blocked');
  const commit = resolve(o.commit, 'commit');
  const merge = merges(o, led.start).find((m) => m.commit === commit);
  if (!merge) throw new Fail(`${short(commit)} is not on the first-parent history of ${o.branch} after the ledger start`);
  const seen = led.verdicts.get(commit);
  if (seen && seen.verdict !== 'blocked' && !o.replace) throw new Fail(`${short(commit)} is already ${seen.verdict} (${seen.at}); use --replace to correct it`);
  if (o.build && o.verdict !== 'blocked' && !contains(o.build, commit)) throw new Fail(`build ${short(o.build)} does not contain ${short(commit)}; leave it pending`);
  const entry = { commit, verdict: o.verdict, keys: merge.keys, note, branch: o.branch, build: o.build || null, at: new Date().toISOString() };
  fs.appendFileSync(o.ledger, `${JSON.stringify(entry)}\n`);
  return entry;
}

const row = (m, extra) => [short(m.commit), m.date || (m.at || '').slice(0, 10), m.keys.join(',') || '(no key)', ...extra].join('  ');

function parse(argv) {
  const flags = new Set(['check', 'json', 'replace', 'retry-blocked', 'all-commits']);
  const a = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, '');
    if (key === argv[i]) throw new Fail(`unexpected argument "${clean(argv[i], 40)}"; see --help`);
    if (flags.has(key)) a[key] = true;
    else if (i + 1 < argv.length) a[key] = argv[i += 1];
    else throw new Fail(`--${key} needs a value`);
  }
  return a;
}

function main(argv) {
  if (!argv.length || argv.includes('--help')) return console.log(HELP);
  if (argv.includes('--selftest')) return selftest();
  const [mode, ...rest] = argv;
  const a = parse(rest);
  if (!['start', 'pending', 'record', 'status'].includes(mode)) throw new Fail(`unknown mode "${clean(mode, 20)}"; see --help`);
  const o = { branch: a.branch || 'main', pattern: a['key-pattern'] || '[A-Z][A-Z0-9]+-[0-9]+', allCommits: a['all-commits'],
    retryBlocked: a['retry-blocked'], replace: a.replace, commit: a.commit, verdict: a.verdict, note: a.note };
  try { keysIn('', o.pattern); } catch { throw new Fail('--key-pattern is not a valid pattern'); }
  let top;
  try { top = git(['rev-parse', '--show-toplevel']); } catch { throw new Fail('not inside a git working folder'); }
  o.ledger = a.ledger || path.join(top, '.merged-ledger.jsonl');
  o.tip = resolve(o.branch, 'branch');
  if (a.deployed) o.build = resolve(a.deployed, 'deployed build');
  const led = parseLedger(fs.existsSync(o.ledger) ? fs.readFileSync(o.ledger, 'utf8') : '');
  if (mode === 'start') {
    const at = resolve(a.at, 'start point');
    if (!contains(o.tip, at)) throw new Fail(`start point ${short(at)} is not in the history of ${o.branch}`);
    fs.appendFileSync(o.ledger, `${JSON.stringify({ start: at, branch: o.branch, at: new Date().toISOString() })}\n`);
    return console.log(`start set to ${short(at)}${led.start ? ` (was ${short(led.start)})` : ''} in ${o.ledger}`);
  }
  if (mode === 'record') {
    const e = record(o, led);
    return console.log(`recorded ${e.verdict} for ${row(e, [])}`);
  }
  const todo = pending(o, led);
  if (a.limit && !/^[1-9]\d*$/.test(a.limit)) throw new Fail('--limit must be a whole number above zero');
  const shown = a.limit ? todo.slice(0, Number(a.limit)) : todo;
  if (!led.start && !led.verdicts.size) console.error('merged-ledger: no start point yet, so the whole history is listed; set one with: start --at REF');
  if (mode === 'pending') {
    if (a.json) console.log(JSON.stringify(shown, null, 2));
    else console.log([`pending: ${todo.length}${shown.length < todo.length ? ` (showing the oldest ${shown.length})` : ''}`,
      ...shown.map((m) => row(m, [...(o.build ? [m.inBuild ? 'in-build' : 'not-in-build'] : []), m.subject]))].join('\n'));
    if (a.check && todo.length) process.exitCode = 1;
    return undefined;
  }
  const done = [...led.verdicts.values()];
  const tally = VERDICTS.map((v) => `${v} ${done.filter((e) => e.verdict === v).length}`).join(', ');
  return console.log([`pending ${todo.length}, ${tally}`, ...shown.map((m) => `pending  ${row(m, [m.subject])}`),
    ...VERDICTS.flatMap((v) => done.filter((e) => e.verdict === v).map((e) => `${v.padEnd(7)}  ${row(e, [clean(e.note)])}`))].join('\n'));
}

function selftest() {
  const realGit = git;
  const ids = ['a', 'b', 'c', 'd'].map((c) => c.repeat(40));
  const log = [[ids[0], 'Merge TRK-12: trim export headers', ''], [ids[1], 'Merge TRK-14 and TRK-15 (TRK-14 first)', 'Closes TRK-15'],
    [ids[2], 'Merge branch tidy-up', ''], [ids[3], 'Merge branch late-fix', '']];
  git = (args) => { // a stand-in for git: four merges; the build holds the first two; ids[3] hides a key in its commits
    if (args[0] === 'rev-parse') { const ref = args[args.length - 1].replace('^{commit}', ''); if (ref === 'main' || ids.includes(ref)) return ref === 'main' ? ids[3] : ref; throw new Error('unknown'); }
    if (args[0] === 'merge-base') { if (ids.indexOf(args[2]) <= 1) return ''; throw Object.assign(new Error('no'), { status: 1 }); }
    if (args.includes('--first-parent')) return log.map(([id, s, b]) => `${id}\x1f2026-11-24\x1f${s}\x1f${b}\x1e`).join('\n');
    return args[args.length - 1].startsWith(ids[3]) ? 'fix rounding for TRK-21' : 'tidy imports';
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merged-ledger-selftest-'));
  const o = { branch: 'main', tip: ids[3], pattern: '[A-Z][A-Z0-9]+-[0-9]+', ledger: path.join(dir, 'ledger.jsonl'), build: ids[1] };
  const read = () => parseLedger(fs.existsSync(o.ledger) ? fs.readFileSync(o.ledger, 'utf8') : '');
  const refused = (fn) => { try { fn(); return false; } catch (e) { return e instanceof Fail; } };
  const fails = [];
  let checks = 0;
  const check = (name, ok) => { checks += 1; if (!ok) fails.push(name); };
  try {
    const all = pending(o, read());
    check('four merges pending, oldest first', all.map((m) => m.commit).join() === ids.join());
    check('two keys found once each', all[1].keys.join() === 'TRK-14,TRK-15');
    check('no key reported as none', all[2].keys.length === 0);
    check('key taken from the merged commits', all[3].keys.join() === 'TRK-21');
    check('build marks', all.map((m) => m.inBuild).join() === 'true,true,false,false');
    check('unknown verdict refused', refused(() => record({ ...o, commit: ids[0], verdict: 'fine', note: 'x' }, read())));
    check('empty note refused', refused(() => record({ ...o, commit: ids[0], verdict: 'passed', note: ' ' }, read())));
    check('commit off the branch refused', refused(() => record({ ...o, commit: 'e'.repeat(40), verdict: 'passed', note: 'x' }, read())));
    check('verdict on a merge outside the build refused', refused(() => record({ ...o, commit: ids[2], verdict: 'failed', note: 'x' }, read())));
    record({ ...o, commit: ids[0], verdict: 'passed', note: 'export has 14 rows' }, read());
    record({ ...o, commit: ids[2], verdict: 'blocked', note: 'no work item key' }, read());
    check('second verdict needs --replace', refused(() => record({ ...o, commit: ids[0], verdict: 'failed', note: 'x' }, read())));
    check('recorded merges leave pending', pending(o, read()).map((m) => m.commit).join() === [ids[1], ids[3]].join());
    check('blocked returns with --retry-blocked', pending({ ...o, retryBlocked: true }, read()).length === 3);
    check('damaged ledger refused', refused(() => parseLedger('{"commit":"x","verdict":"maybe"}')));
  } finally { git = realGit; fs.rmSync(dir, { recursive: true, force: true }); }
  if (fails.length) throw new Fail(`selftest failed: ${fails.join('; ')}`);
  console.log(`selftest ok: ${checks} checks on keys, pending, record and the ledger (git replaced by a stand-in)`);
}

try { main(process.argv.slice(2)); } catch (e) {
  console.error(`merged-ledger: ${e instanceof Fail ? e.message : `git or file error: ${clean(e.message, 200)}`}`);
  process.exit(2);
}
