#!/usr/bin/env node
// done-when.mjs: an owner-approved command, not a feeling, decides when an agent may stop.
// Node 18+, no dependencies, no network. The check itself is any executable file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

const CHECK = 'done-when.sh'; // the agreed check, at the project root
const STATE = '.done-when'; // inside the project: outcomes.log, halt, limit
const DEFAULT_MAX = 5;

const HELP = `done-when.mjs: stop only when ./${CHECK} passes, the round limit runs out, or the owner halts.

  approve [--max N]     Owner only, interactive terminal. Shows ./${CHECK}, asks for a typed
                        confirmation, stores its sha256 outside the project. N = rounds (default ${DEFAULT_MAX}).
  gate [--manual]       Stop-hook mode. Reads the hook JSON on stdin (skip with --manual).
                        Exit 0: the agent may stop. Exit 2: keep working, reason on stderr.
  halt                  Record the owner's "stop". The next gate allows the stop and logs it.
  run -- CMD [ARGS]     For harnesses without a stop hook: run the gate, and while it fails
                        run CMD with the failure report as its last argument.
  --selftest            Run built-in cases in a temporary folder.

Options: --project DIR (default: $CLAUDE_PROJECT_DIR, hook cwd, or .), --timeout SECONDS (default 300).
Files:   ${STATE}/outcomes.log (one line per stop), ${STATE}/limit (a lower round limit for this task),
         approvals in $DONE_WHEN_HOME or ~/.config/done-when.
Exit:    0 allowed or passed, 1 failure, 2 keep working (gate) or bad usage.`;

const home = () => process.env.DONE_WHEN_HOME || path.join(os.homedir(), '.config', 'done-when');
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function recordApproval(project, digest, maxRounds) {
  const file = path.join(home(), 'approvals.json');
  const all = readJson(file, {});
  all[project] = { sha256: digest, maxRounds, approvedAt: new Date().toISOString() };
  writeJson(file, all);
}

function logOutcome(project, entry) {
  fs.mkdirSync(path.join(project, STATE), { recursive: true });
  fs.appendFileSync(path.join(project, STATE, 'outcomes.log'), JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

// Decide one stop attempt. Returns { allow: true, outcome } or { allow: false, reason }.
function gate({ project, session = 'manual', timeoutSec = 300 }) {
  const check = path.join(project, CHECK);
  if (!fs.existsSync(check)) return { allow: true, outcome: 'no-check' };

  const roundsFile = path.join(home(), 'rounds.json');
  const rounds = readJson(roundsFile, {});
  const key = `${project}::${session}`;
  const st = rounds[key] || { round: 0 };
  const finish = (outcome, extra = {}) => {
    delete rounds[key];
    writeJson(roundsFile, rounds);
    logOutcome(project, { outcome, session, rounds: st.round, ...extra });
    return { allow: true, outcome, ...extra };
  };
  const again = (reason, extra = {}) => { rounds[key] = st; writeJson(roundsFile, rounds); return { allow: false, reason, ...extra }; };

  const haltFile = path.join(project, STATE, 'halt');
  if (fs.existsSync(haltFile)) { fs.rmSync(haltFile); return finish('owner-halted'); }

  const digest = sha256(fs.readFileSync(check));
  const approved = readJson(path.join(home(), 'approvals.json'), {})[project];
  if (!approved || approved.sha256 !== digest) {
    if (st.told === digest) return finish('not-approved', { check: digest.slice(0, 12) });
    st.told = digest; // tell the agent once, then let it stop
    return again(`./${CHECK} is not approved in its current form, so it was NOT run. Show the owner the whole file, ask them to run "done-when.mjs approve" in their own terminal, then stop and call the work unverified. Never approve it yourself.`, { unapproved: true });
  }

  const taskLimit = parseInt(readJson(path.join(project, STATE, 'limit'), ''), 10);
  const limit = Math.min(approved.maxRounds || DEFAULT_MAX, taskLimit >= 1 ? taskLimit : Infinity); // a task can only lower it
  const run = spawnSync(check, [], { cwd: project, encoding: 'utf8', timeout: timeoutSec * 1000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (!run.error && run.status === 0) return finish('passed', { limit });

  const why = run.error ? `could not run (${run.error.code || run.error.message}); is it executable?` : `exit ${run.status ?? run.signal}`;
  if (st.round >= limit) return finish('attempts-exhausted', { limit, check: why });
  st.round += 1;
  const tail = `${run.stdout || ''}${run.stderr || ''}`.trimEnd().split('\n').slice(-25).join('\n');
  const last = st.round === limit ? ' This is the last round: if the check still fails afterwards, your final message must say the work is NOT done and quote what the check reports.' : '';
  return again(`./${CHECK} failed (${why}), round ${st.round} of ${limit}. Fix the work, never the check.${last}\n${tail}`);
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'done-when-'));
  const project = fs.realpathSync(fs.mkdtempSync(path.join(tmp, 'project-')));
  process.env.DONE_WHEN_HOME = path.join(tmp, 'home');
  const check = path.join(project, CHECK);
  const setCheck = (body) => { fs.writeFileSync(check, `#!/bin/sh\n${body}\n`, { mode: 0o755 }); return sha256(fs.readFileSync(check)); };
  const log = () => fs.readFileSync(path.join(project, STATE, 'outcomes.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).outcome);
  const g = () => gate({ project, session: 's1', timeoutSec: 20 });
  const cases = [];
  const expect = (name, ok) => { cases.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); };

  expect('no check file: stop allowed, nothing logged', g().outcome === 'no-check' && !fs.existsSync(path.join(project, STATE)));
  let digest = setCheck('touch ran.marker; exit 1');
  const first = g();
  expect('unapproved check is not run and the agent is told once', !first.allow && first.unapproved && !fs.existsSync(path.join(project, 'ran.marker')));
  expect('unapproved check: second stop allowed as not-approved', g().outcome === 'not-approved' && log().at(-1) === 'not-approved');
  recordApproval(project, digest, 2);
  const r1 = g(), r2 = g(), r3 = g();
  expect('approved failing check blocks with a round number', !r1.allow && /round 1 of 2/.test(r1.reason) && /last round/.test(r2.reason));
  expect('limit reached: stop allowed as attempts-exhausted', r3.outcome === 'attempts-exhausted');
  fs.writeFileSync(path.join(project, 'good'), '');
  digest = setCheck('test -f good');
  expect('editing the check voids the approval', g().unapproved === true);
  recordApproval(project, digest, 2);
  expect('approved passing check: passed', g().outcome === 'passed' && log().at(-1) === 'passed');
  fs.rmSync(path.join(project, 'good'));
  fs.writeFileSync(path.join(project, STATE, 'limit'), '1\n');
  const l1 = g(), l2 = g();
  expect('a task limit lowers the approved limit', /round 1 of 1/.test(l1.reason) && l2.outcome === 'attempts-exhausted');
  fs.writeFileSync(path.join(project, STATE, 'limit'), '9\n');
  expect('a task limit cannot raise it', /of 2/.test(g().reason));
  fs.writeFileSync(path.join(project, STATE, 'halt'), 'owner said stop\n');
  expect('owner halt wins and is logged', g().outcome === 'owner-halted' && log().at(-1) === 'owner-halted');
  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = cases.filter((ok) => !ok).length;
  console.log(failed ? `selftest: ${failed} of ${cases.length} failed` : `selftest: ${cases.length} passed`);
  return failed ? 1 : 0;
}

async function main() {
  const all = process.argv.slice(2);
  const split = all.indexOf('--');
  const argv = split >= 0 ? all.slice(0, split) : all;
  const cmd = split >= 0 ? all.slice(split + 1) : [];
  const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const fail = (msg, code = 1) => { console.error(`done-when: ${msg}`); return code; };
  const mode = argv[0];
  if (!mode || mode === '--help' || mode === '-h') { console.log(HELP); return 0; }
  if (mode === '--selftest') return selftest();

  let hook = {};
  if (mode === 'gate' && !argv.includes('--manual') && !process.stdin.isTTY) {
    try { hook = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { /* no hook input: treat as a manual run */ }
  }
  const dir = opt('--project') || process.env.CLAUDE_PROJECT_DIR || hook.cwd || '.';
  if (!fs.existsSync(dir)) return fail(`project folder not found: ${dir}`, 2);
  const project = fs.realpathSync(dir);
  const timeoutSec = Number(opt('--timeout')) > 0 ? Number(opt('--timeout')) : 300;
  const check = path.join(project, CHECK);

  if (mode === 'approve') {
    if (!process.stdin.isTTY || !process.stdout.isTTY) return fail('approve needs an interactive terminal: the owner runs it, never the agent');
    if (!fs.existsSync(check)) return fail(`no ./${CHECK} in ${project}`);
    const max = opt('--max') === undefined ? DEFAULT_MAX : Number(opt('--max'));
    if (!Number.isInteger(max) || max < 1 || max > 50) return fail('--max must be a whole number from 1 to 50', 2);
    const content = fs.readFileSync(check); // approve exactly the bytes shown
    console.log(`Project: ${project}\nCheck:   ${check}\nsha256:  ${sha256(content)}\nRounds:  at most ${max}\n----- file starts -----\n${content.toString('utf8')}\n----- file ends -----`);
    const answer = await ask('This file will run at every stop with no permission prompt.\nType "approve" to allow exactly this content: ');
    if (answer.trim() !== 'approve') return fail('not approved');
    recordApproval(project, sha256(content), max);
    console.log('Approved. Any edit to the file voids this approval.');
    return 0;
  }
  if (mode === 'halt') {
    fs.mkdirSync(path.join(project, STATE), { recursive: true });
    fs.writeFileSync(path.join(project, STATE, 'halt'), `${new Date().toISOString()}\n`);
    console.log('done-when: owner halt recorded; the next stop is allowed and logged as owner-halted');
    return 0;
  }
  if (mode === 'gate') {
    const g = gate({ project, session: hook.session_id || 'manual', timeoutSec });
    if (!g.allow) { console.error(`done-when: ${g.reason}`); return 2; } // exit 2 = the harness keeps the agent working
    if (g.outcome !== 'no-check') console.log(`done-when: ${g.outcome}${g.check ? ` (${g.check})` : ''}`);
    return 0;
  }
  if (mode === 'run') {
    if (!cmd.length) return fail('run needs a command after --', 2);
    for (;;) {
      let g = gate({ project, session: 'runner', timeoutSec });
      if (!g.allow && g.unapproved) g = gate({ project, session: 'runner', timeoutSec }); // nobody to tell: log and stop
      if (g.allow) { console.log(`done-when: ${g.outcome}`); return g.outcome === 'passed' || g.outcome === 'no-check' ? 0 : 1; }
      console.error(`done-when: ${g.reason.split('\n')[0]}`);
      const run = spawnSync(cmd[0], [...cmd.slice(1), g.reason], { cwd: project, stdio: ['ignore', 'inherit', 'inherit'] });
      if (run.error) return fail(`could not start ${cmd[0]}: ${run.error.code || run.error.message}`);
    }
  }
  return fail(`unknown mode "${mode}"; see --help`, 2);
}

main().then((code) => process.exit(code), (err) => { console.error(`done-when: ${err.message}`); process.exit(1); });
