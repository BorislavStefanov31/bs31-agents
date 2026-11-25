#!/usr/bin/env node
// queue.mjs: sort open pull requests into review groups from `gh pr list --json` data, and hold a
// lock file so two passes never overlap. Node 18+, no dependencies, no network.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const HELP = `queue.mjs: sort the open pull requests for one review pass, and lock the pass

  node queue.mjs sort [FILE|-] --me LOGIN [--approvals N] [--quiet-days N] [--now ISO]
                      [--no-checks-ok] [--json]
  node queue.mjs lock   --file PATH [--stale-minutes N]
  node queue.mjs unlock --file PATH --token TOKEN
  node queue.mjs --selftest | --help

sort    Reads a JSON array of open pull requests (FILE, or standard input) and prints each one
        under exactly one group with a one-line reason. The input is the output of:
          gh pr list --state open --limit 50 --json number,title,author,isDraft,updatedAt,\\
            reviewDecision,statusCheckRollup,reviews,commits,comments
        (latestReviews is accepted in place of reviews; comments is optional.)
        --approvals N      approvals required before "ready to merge" (default 1)
        --quiet-days N     days without activity before a waiting pull request is "quiet" (default 7)
        --now ISO          the clock quiet days are measured against (default: now)
        --no-checks-ok     a pull request that reports no checks at all may still be ready
lock    Creates the lock file and prints its token. Exit 3 when a lock younger than
        --stale-minutes (default 120) exists; an older lock is taken over.
unlock  Removes the lock when the token matches. Exit 3 when it belongs to another pass.
Exit: 0 done; 2 bad input or usage; 3 lock held.`;

const GROUPS = [['answer', 'Needs your answer'], ['rereview', 'Needs your re-review'],
  ['first', 'Needs a first review'], ['ready', 'Ready to merge (report only)'],
  ['waiting', 'Waiting on someone else'], ['quiet', 'Quiet for too long']];
const BAD = ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE'];
const GOOD = ['SUCCESS', 'NEUTRAL', 'SKIPPED'];

class Fail extends Error { constructor(reason, code = 2) { super(reason); this.code = code; } }
const ts = (s) => { const t = Date.parse(s); return Number.isNaN(t) ? 0 : t; };
const day = (t) => new Date(t).toISOString().slice(0, 10);
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
// Pull request text is echoed only through this: no control characters, one line, bounded.
const clean = (s, max = 60) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };

// A CheckRun carries status and conclusion; a StatusContext carries state.
function checkState(rollup) {
  const items = Array.isArray(rollup) ? rollup : [];
  if (!items.length) return 'none';
  const results = items.map((c) => c.conclusion || c.state || '');
  if (results.some((r) => BAD.includes(r))) return 'failing';
  return results.every((r) => GOOD.includes(r)) ? 'passing' : 'pending';
}

// Per reviewer: the latest review of any kind, and the latest approval or change request.
function reviewers(pr) {
  const by = new Map();
  [...(pr.reviews || []), ...(pr.latestReviews || [])]
    .filter((r) => r && r.author && r.author.login && r.state !== 'PENDING' && ts(r.submittedAt))
    .sort((a, b) => ts(a.submittedAt) - ts(b.submittedAt))
    .forEach((r) => {
      const key = r.author.login.toLowerCase();
      const e = by.get(key) || { login: r.author.login, opinion: null };
      e.last = r.state; e.at = ts(r.submittedAt);
      if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED') e.opinion = r.state;
      by.set(key, e);
    });
  return by;
}

function classify(pr, o) {
  const author = pr.author.login, mine = same(author, o.me);
  const push = Math.max(0, ...(pr.commits || []).map((c) => ts(c.committedDate)));
  const by = reviewers(pr);
  const others = [...by.values()].filter((e) => !same(e.login, author));
  const approvals = others.filter((e) => e.opinion === 'APPROVED').length;
  const blocker = others.find((e) => e.opinion === 'CHANGES_REQUESTED');
  const checks = checkState(pr.statusCheckRollup);
  const who = mine ? 'you as author' : `author @${author}`;
  if (mine) {
    const said = (pr.comments || []).filter((c) => c && c.author && same(c.author.login, author)).map((c) => ts(c.createdAt));
    const answered = Math.max(push, by.get(author.toLowerCase())?.at || 0, ...said);
    const asking = others.filter((e) => ['CHANGES_REQUESTED', 'COMMENTED'].includes(e.last) && e.at > answered);
    if (asking.length) {
      const list = asking.map((e) => `@${e.login} ${e.last === 'COMMENTED' ? 'commented' : 'requested changes'} ${day(e.at)}`);
      return ['answer', `${list.join(', ')}, after your last push or reply`];
    }
  } else if (!pr.isDraft) {
    const own = by.get(o.me.toLowerCase());
    if (own && push > own.at) return ['rereview', `@${author} pushed ${day(push)}, after your review of ${day(own.at)}`];
    if (!others.length) return ['first', `no review yet; opened by @${author}; checks ${checks}`];
  }
  let wait;
  if (pr.isDraft) wait = `draft; waits on ${who}`;
  else if (blocker && push > blocker.at) wait = `@${blocker.login} requested changes and a push followed; waits on @${blocker.login}`;
  else if (blocker) wait = `changes requested by @${blocker.login}; waits on ${who}`;
  else if (checks === 'failing') wait = `checks failing; waits on ${who}`;
  else if (checks === 'pending') wait = 'checks still running; waits on CI';
  else if (checks === 'none' && !o.noChecksOk) wait = 'no checks reported, so it cannot be called ready';
  else if (approvals < o.approvals) wait = `${approvals} of ${o.approvals} approvals; waits on reviewers`;
  else if (['REVIEW_REQUIRED', 'CHANGES_REQUESTED'].includes(pr.reviewDecision)) wait = 'the branch rule still asks for a review; waits on reviewers';
  else return ['ready', `${approvals} of ${o.approvals} approvals, checks ${checks}, no changes requested, not a draft`];
  const idle = Math.floor((o.now - ts(pr.updatedAt)) / 86400000);
  return idle >= o.quietDays ? ['quiet', `no activity for ${idle} days; ${wait}`] : ['waiting', wait];
}

function sortQueue(prs, o) {
  if (!Array.isArray(prs)) throw new Fail('input must be a JSON array of pull requests');
  const out = Object.fromEntries(GROUPS.map(([id]) => [id, []]));
  prs.forEach((pr, i) => {
    if (!pr || !Number.isInteger(pr.number) || !pr.author || typeof pr.author.login !== 'string' || !ts(pr.updatedAt)) {
      throw new Fail(`pull request at index ${i} lacks number, author.login or updatedAt`);
    }
    const [group, reason] = classify(pr, o);
    out[group].push({ number: pr.number, author: clean(pr.author.login, 40), title: clean(pr.title), updatedAt: pr.updatedAt, reason: clean(reason, 240) });
  });
  for (const list of Object.values(out)) list.sort((a, b) => ts(a.updatedAt) - ts(b.updatedAt) || a.number - b.number);
  return out;
}

const render = (sorted) => GROUPS.map(([id, label]) => [`${label} (${sorted[id].length})`,
  ...sorted[id].map((p) => `  #${p.number} @${p.author}  ${p.title} | ${p.reason}`)].join('\n')).join('\n');

function lock(file, staleMinutes, now = Date.now()) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const mine = { token: crypto.randomBytes(8).toString('hex'), pid: process.pid, host: os.hostname(), at: new Date(now).toISOString() };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { fs.writeFileSync(file, `${JSON.stringify(mine)}\n`, { flag: 'wx' }); return mine; } catch (e) {
      if (e.code !== 'EEXIST') throw new Fail(`cannot write the lock: ${e.code || e.message}`);
    }
    const since = ts(readJson(file).at) || fs.statSync(file).mtimeMs; // unreadable lock: judge it by file time
    if ((now - since) / 60000 < staleMinutes) throw new Fail(`lock held since ${new Date(since).toISOString()}; another pass is running`, 3);
    fs.rmSync(file, { force: true }); // stale: take it over on the second attempt
  }
  throw new Fail('lock changed hands during takeover; another pass is running', 3);
}

function unlock(file, token) {
  if (!fs.existsSync(file)) return 'no lock to release';
  if (!token || readJson(file).token !== token) throw new Fail('the lock belongs to another pass; left in place', 3);
  fs.rmSync(file);
  return 'lock released';
}

function parse(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) { a._.push(argv[i]); continue; }
    const key = argv[i].slice(2);
    if (key === 'json' || key === 'no-checks-ok') a[key] = true;
    else if (i + 1 < argv.length) a[key] = argv[i += 1];
    else throw new Fail(`--${key} needs a value`);
  }
  return a;
}
const count = (value, fallback, name) => {
  if (value !== undefined && !/^\d+$/.test(value)) throw new Fail(`${name} must be a whole number`);
  return value === undefined ? fallback : Number(value);
};

function main(argv) {
  if (!argv.length || argv.includes('--help')) return console.log(HELP);
  if (argv.includes('--selftest')) return selftest();
  const [mode, ...rest] = argv;
  const a = parse(rest);
  if (mode === 'sort') {
    if (!a.me) throw new Fail('sort needs --me LOGIN');
    const o = { me: a.me, approvals: count(a.approvals, 1, '--approvals'), quietDays: count(a['quiet-days'], 7, '--quiet-days'),
      now: a.now ? ts(a.now) : Date.now(), noChecksOk: Boolean(a['no-checks-ok']) };
    if (!o.now) throw new Fail('--now is not a date');
    let prs;
    try { prs = JSON.parse(fs.readFileSync(a._[0] && a._[0] !== '-' ? a._[0] : 0, 'utf8')); } catch (e) {
      throw new Fail(`cannot read the pull request JSON: ${e.message.split('\n')[0]}`);
    }
    const sorted = sortQueue(prs, o);
    return console.log(a.json ? JSON.stringify(sorted, null, 2) : render(sorted));
  }
  if (mode !== 'lock' && mode !== 'unlock') throw new Fail(`unknown mode "${clean(mode, 20)}"; see --help`);
  if (!a.file) throw new Fail(`${mode} needs --file PATH`);
  if (mode === 'unlock') return console.log(unlock(a.file, a.token));
  return console.log(`locked ${a.file}\ntoken ${lock(a.file, count(a['stale-minutes'], 120, '--stale-minutes')).token}`);
}

function selftest() {
  const d = (n, hour) => `2026-11-${String(n).padStart(2, '0')}T${hour}:00:00Z`;
  const rv = (login, state, at) => ({ author: { login }, state, submittedAt: d(at, 10) });
  const pr = (number, login, pushed, updated, reviews, extra = {}) => ({ number, title: `change ${number}`, author: { login },
    isDraft: false, updatedAt: d(updated, 12), reviewDecision: '', reviews,
    commits: [{ committedDate: d(pushed, '08') }], statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }], ...extra });
  const fixture = [
    [pr(101, 'dana', 20, 22, [rv('nilo', 'CHANGES_REQUESTED', 22)]), 'answer'],
    [pr(102, 'dana', 20, 23, [rv('nilo', 'COMMENTED', 21), rv('dana', 'COMMENTED', 22)]), 'waiting'],
    [pr(103, 'brask', 23, 23, [rv('Dana', 'APPROVED', 18)]), 'rereview'],
    [pr(104, 'brask', 22, 22, []), 'first'],
    [pr(105, 'nilo', 21, 24, [rv('dana', 'APPROVED', 24), rv('brask', 'APPROVED', 23), rv('brask', 'COMMENTED', 24)], { reviewDecision: 'APPROVED' }), 'ready'],
    [pr(106, 'nilo', 20, 23, [rv('brask', 'CHANGES_REQUESTED', 23)]), 'waiting'],
    [pr(107, 'brask', 1, 2, [rv('nilo', 'COMMENTED', 2)]), 'quiet'],
    [pr(108, 'brask', 24, 24, [], { isDraft: true }), 'waiting'],
    [pr(109, 'nilo', 20, 24, [rv('dana', 'APPROVED', 21), rv('brask', 'APPROVED', 22)], { statusCheckRollup: [{ state: 'SUCCESS' }, { status: 'COMPLETED', conclusion: 'FAILURE' }] }), 'waiting'],
    [pr(110, 'dana', 20, 24, [rv('nilo', 'APPROVED', 21), rv('brask', 'APPROVED', 22)]), 'ready'],
  ];
  const o = { me: 'dana', approvals: 2, quietDays: 7, now: ts('2026-11-25T12:00:00Z'), noChecksOk: false };
  const prs = fixture.map(([p]) => p);
  const sorted = sortQueue(prs, o);
  const fails = fixture.filter(([p, want]) => !sorted[want].some((x) => x.number === p.number)).map(([p, want]) => `#${p.number} not in ${want}`);
  let checks = 0;
  const check = (name, ok) => { checks += 1; if (!ok) fails.push(name); };
  const code = (fn) => { try { fn(); return 0; } catch (e) { return e.code; } };
  check('each pull request in exactly one group', Object.values(sorted).flat().length === prs.length);
  check('same input in another order sorts the same', render(sortQueue([...prs].reverse(), o)) === render(sorted));
  check('non-array input refused', code(() => sortQueue({}, o)) === 2);
  check('pull request without author refused', code(() => sortQueue([{ number: 1 }], o)) === 2);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'queue-selftest-'));
  const file = path.join(dir, 'pass.lock');
  const first = lock(file, 120);
  check('held lock refused', code(() => lock(file, 120)) === 3);
  check('wrong token refused', code(() => unlock(file, 'not-the-token')) === 3);
  check('right token releases', unlock(file, first.token) === 'lock released' && !fs.existsSync(file));
  lock(file, 120, Date.now() - 3 * 3600000);
  check('stale lock taken over', code(() => lock(file, 120)) === 0);
  fs.rmSync(dir, { recursive: true, force: true });
  if (fails.length) throw new Fail(`selftest failed: ${fails.join('; ')}`, 1);
  console.log(`selftest ok: ${fixture.length} pull requests across ${GROUPS.length} groups, ${checks} other checks`);
}

try { main(process.argv.slice(2)); } catch (e) {
  console.error(`queue: ${e instanceof Fail ? e.message : `unexpected error: ${e.message}`}`);
  process.exit(e instanceof Fail ? e.code : 1);
}
