#!/usr/bin/env node
// held-items.mjs: keep items that wait for the owner's decision, and carry out each decided
// item exactly once. A hold stores a snapshot with its digest. A decision is accepted only
// from an interactive terminal and is tied to that digest. Completion claims the item in an
// append-only ledger before it acts, so a second attempt does nothing.
// Exit codes: 0 success, 1 declined, failed or refused, 2 usage error.
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HELP = `Usage: node held-items.mjs <operation> --store <dir> [options]

  add --id <id> --reason <text> --snapshot <file.json>   hold an item as it was checked
  list                                                   every held item with its state
  show <id>                                              one item: reason, snapshot, decision, result
  decide <id>                                            owner only: asks yes or no in a terminal
  complete <id> --routine <file.mjs> [--time-limit 60s]  carry out a decided item, once
  --selftest                                             run built-in cases in a temporary folder

The routine's default export is: async ({ id, snapshot, reason, answer }) => detail. It runs only
for a "yes", in a child process that is killed at the time limit (default 60s; units s or m).
Exit codes: 0 success, 1 declined, failed or refused (nothing more was done), 2 usage error.`;
class Usage extends Error {}

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const now = () => new Date().toISOString();
const digestOf = (snapshot) => createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const fileOf = (store, kind, id) => path.join(store, kind, `${id}.json`);
const ledgerOf = (store) => path.join(store, 'claims.log');
const claimOf = (store, id) => (fs.existsSync(ledgerOf(store)) ? fs.readFileSync(ledgerOf(store), 'utf8') : '')
  .split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((claim) => claim.id === id);
function writeJson(file, value, flag = 'w') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { flag });
}

// Everything known about one held item, plus the reason (if any) its decision cannot be used.
function load(store, id) {
  if (!ID.test(id ?? '')) throw new Usage('an item id is required (letters, digits, dot, dash, underscore)');
  const hold = readJson(fileOf(store, 'items', id));
  if (!hold) throw new Usage(`no readable held item ${id} in ${store}`);
  const decision = readJson(fileOf(store, 'decisions', id)), result = readJson(fileOf(store, 'results', id));
  const claim = claimOf(store, id), lastRun = readJson(path.join(store, 'last-run.json'));
  const intact = digestOf(hold.snapshot) === hold.digest;
  let problem = null;
  if (!intact) problem = 'the snapshot no longer matches its digest';
  else if (decision && decision.digest !== hold.digest) problem = 'the decision was made on a different snapshot';
  else if (decision && !(decision.decidedAt > hold.heldAt)) problem = 'the decision is not newer than the hold';
  else if (decision && lastRun && !(lastRun.endedAt && decision.decidedAt > lastRun.endedAt)) problem = 'the decision was recorded during a batch run or before the latest run ended';
  const state = result ? `completed (${result.outcome})` : claim ? 'claimed, no result: an effect is possible'
    : problem ? `blocked: ${problem}` : decision ? `decided ${decision.answer}, not completed` : 'waiting for the owner';
  return { id, hold, decision, result, claim, lastRun, intact, problem, state };
}

function add(store, opt) {
  if (!ID.test(opt.id ?? '') || !opt.reason?.trim() || !opt.snapshot) throw new Usage('add needs --id, --reason and --snapshot <file.json>');
  const snapshot = readJson(opt.snapshot);
  if (snapshot === null) throw new Usage('the --snapshot file is not readable JSON');
  try {
    writeJson(fileOf(store, 'items', opt.id), { id: opt.id, reason: opt.reason, heldAt: now(), snapshot, digest: digestOf(snapshot) }, 'wx');
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    console.log(`NOT-HELD ${opt.id}: this id is already held; the stored snapshot stays as it is`);
    return 1;
  }
  console.log(`HELD ${opt.id} digest=${digestOf(snapshot)}`);
  return 0;
}

function list(store) {
  const dir = path.join(store, 'items');
  const ids = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort() : [];
  for (const id of ids) {
    try { const it = load(store, id); console.log(`${id} | ${it.state} | held ${it.hold.heldAt} | ${it.hold.reason}`); } catch { console.log(`${id} | unreadable record`); }
  }
  console.log(`${ids.length} held item(s) in ${store}`);
  return 0;
}

function show(it) {
  console.log([`id: ${it.id}`, `state: ${it.state}`, `reason: ${it.hold.reason}`, `held at: ${it.hold.heldAt}`,
    `digest: ${it.hold.digest} (${it.intact ? 'matches the snapshot' : 'DOES NOT MATCH the snapshot'})`,
    `snapshot: ${JSON.stringify(it.hold.snapshot, null, 2)}`,
    `decision: ${it.decision ? `${it.decision.answer} at ${it.decision.decidedAt}` : 'none'}`,
    `claimed: ${it.claim ? it.claim.at : 'no'}`, `result: ${it.result ? JSON.stringify(it.result) : 'none'}`].join('\n'));
  return 0;
}

const writeDecision = (store, hold, answer, decidedAt = now()) => writeJson(fileOf(store, 'decisions', hold.id), { id: hold.id, answer, decidedAt, digest: hold.digest });

async function decide(store, id) {
  const refuse = (why) => { console.error(`refused: ${why}`); return 1; };
  if (!process.stdin.isTTY || !process.stdout.isTTY) return refuse('a decision is typed by the owner in an interactive terminal');
  const it = load(store, id);
  if (it.claim) return refuse('this item was already claimed for completion; a new decision changes nothing');
  if (!it.intact) return refuse('the snapshot no longer matches its digest; hold the item again under a new id');
  if (it.lastRun && !it.lastRun.endedAt) return refuse('a batch run is recorded as still going (or it was killed). Decide after it ends; after a killed run, read its log, then remove last-run.json yourself');
  show(it);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('\nCarry this item out? Type yes or no: ')).trim().toLowerCase();
  rl.close();
  if (answer !== 'yes' && answer !== 'no') return refuse('nothing recorded; the answer must be yes or no');
  writeDecision(store, it.hold, answer);
  console.log(`DECIDED ${id} ${answer}`);
  return 0;
}

function complete(store, id, opt) {
  const it = load(store, id);
  const refuse = (why) => { console.log(`NOT-DONE ${id}: ${why}`); return 1; };
  const limit = /^(\d+)([sm])$/.exec(opt['time-limit'] ?? '60s');
  if (!limit || Number(limit[1]) < 1) throw new Usage('--time-limit must look like 45s or 5m');
  if (it.result) return refuse(`already completed at ${it.result.finishedAt} (${it.result.outcome}); nothing was done this time`);
  if (it.claim) return refuse(`already claimed at ${it.claim.at} and there is no result record: the first attempt may have partly taken effect. Nothing was done this time; show the owner`);
  if (!it.decision) return refuse('the owner has not decided');
  if (it.problem) return refuse(`${it.problem}; ask the owner to decide again`);
  if (it.decision.answer === 'yes' && !(opt.routine && fs.existsSync(opt.routine))) throw new Usage('complete needs --routine <existing file.mjs>');
  const nonce = randomBytes(8).toString('hex');
  fs.appendFileSync(ledgerOf(store), `${JSON.stringify({ at: now(), id, nonce })}\n`);
  if (claimOf(store, id).nonce !== nonce) return refuse('another process claimed this item first; nothing was done this time');
  const record = { id, answer: it.decision.answer, digest: it.hold.digest, startedAt: now(), outcome: 'declined', effectPossible: false, detail: 'nothing was sent' };
  if (it.decision.answer === 'yes') {
    const input = JSON.stringify({ id, snapshot: it.hold.snapshot, reason: it.hold.reason, answer: 'yes' });
    const r = spawnSync(process.execPath, [SELF, '--child', opt.routine], { input, encoding: 'utf8', timeout: Number(limit[1]) * (limit[2] === 'm' ? 60000 : 1000), killSignal: 'SIGKILL', maxBuffer: 32 * 1024 * 1024 });
    const reply = r.status === 0 ? readLast(r.stdout) : null;
    record.effectPossible = true;
    record.outcome = r.error?.code === 'ETIMEDOUT' ? 'timed-out' : reply ? 'succeeded' : 'failed';
    record.detail = reply ? reply.detail : r.error?.code === 'ETIMEDOUT' ? `killed at the ${opt['time-limit'] ?? '60s'} limit` : (r.stderr ?? '').trim().split('\n').slice(-3).join(' | ').slice(-400);
  }
  writeJson(fileOf(store, 'results', id), { ...record, finishedAt: now() });
  if (record.outcome === 'succeeded') { console.log(`DONE ${id}: succeeded`); return 0; }
  return refuse(record.outcome === 'declined' ? 'declined by the owner; recorded, nothing was sent' : `${record.outcome}; it may have partly taken effect. Do not retry; show the owner the result record`);
}

const readLast = (stdout) => { try { return JSON.parse(stdout.trim().split('\n').at(-1)); } catch { return null; } };

async function childMain(routinePath) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const routine = (await import(pathToFileURL(path.resolve(routinePath)).href)).default;
  const detail = await routine(input);
  process.stdout.write(`\n${JSON.stringify({ detail: detail ?? null })}\n`, () => process.exit(0));
}

function selftest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-items-selftest-'));
  const store = path.join(dir, 'store'), ran = path.join(dir, 'ran.txt'), routine = path.join(dir, 'finish.mjs');
  fs.writeFileSync(routine, `import fs from 'node:fs';
export default async function ({ id, snapshot }) {
  fs.appendFileSync(${JSON.stringify(ran)}, id + '\\n');
  if (snapshot.mode === 'fail') throw new Error('stopped half-way');
  if (snapshot.mode === 'hang') await new Promise((resolve) => setTimeout(resolve, 30000));
  return 'sent';
}\n`);
  const runs = (id) => (fs.existsSync(ran) ? fs.readFileSync(ran, 'utf8') : '').split('\n').filter((line) => line === id).length;
  const hold = (id, snapshot = { amount: 120 }) => { fs.writeFileSync(path.join(dir, 'snap.json'), JSON.stringify(snapshot)); add(store, { id, reason: 'selftest', snapshot: path.join(dir, 'snap.json') }); };
  const owner = (id, answer, ms = 1000) => writeDecision(store, load(store, id).hold, answer, new Date(Date.now() + ms).toISOString());
  const finish = (id, limit = '20s') => complete(store, id, { routine, 'time-limit': limit });
  const outcome = (id) => readJson(fileOf(store, 'results', id))?.outcome;
  const cases = [
    ['a yes is carried out once', () => { hold('a'); owner('a', 'yes'); return finish('a') === 0 && runs('a') === 1 && outcome('a') === 'succeeded'; }],
    ['a second attempt does nothing', () => finish('a') === 1 && runs('a') === 1],
    ['still nothing after the result record is deleted', () => { fs.rmSync(fileOf(store, 'results', 'a')); return finish('a') === 1 && runs('a') === 1; }],
    ['an altered snapshot is rejected', () => { hold('b'); owner('b', 'yes'); const f = fileOf(store, 'items', 'b'); writeJson(f, { ...readJson(f), snapshot: { amount: 9000 } }); return finish('b') === 1 && runs('b') === 0 && !claimOf(store, 'b'); }],
    ['a no is recorded as declined and nothing runs', () => { hold('c'); owner('c', 'no'); return finish('c') === 1 && runs('c') === 0 && outcome('c') === 'declined' && finish('c') === 1; }],
    ['an undecided item is not completed', () => { hold('d'); return finish('d') === 1 && runs('d') === 0; }],
    ['a decision older than the hold is refused', () => { hold('e'); owner('e', 'yes', -60000); return finish('e') === 1 && runs('e') === 0; }],
    ['a failed completion is not retried', () => { hold('f', { mode: 'fail' }); owner('f', 'yes'); return finish('f') === 1 && outcome('f') === 'failed' && finish('f') === 1 && runs('f') === 1; }],
    ['a completion over its time limit is killed and not retried', () => { hold('g', { mode: 'hang' }); owner('g', 'yes'); return finish('g', '1s') === 1 && outcome('g') === 'timed-out' && finish('g', '1s') === 1 && runs('g') === 1; }],
    ['a decision from before the latest run ended is refused', () => { hold('h'); owner('h', 'yes'); writeJson(path.join(store, 'last-run.json'), { startedAt: now(), endedAt: new Date(Date.now() + 60000).toISOString() }); return finish('h') === 1 && runs('h') === 0; }],
    ['decide refuses without an interactive terminal', () => spawnSync(process.execPath, [SELF, 'decide', 'd', '--store', store], { input: 'yes\n' }).status === 1 && !readJson(fileOf(store, 'decisions', 'd'))],
  ];
  const say = console.log;
  let failed = 0;
  for (const [label, check] of cases) {
    let ok = false;
    console.log = () => {};
    try { ok = check(); } catch { ok = false; } finally { console.log = say; }
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(failed ? `selftest: ${failed} of ${cases.length} failed` : `selftest: ${cases.length} passed`);
  return failed ? 1 : 0;
}

async function main() {
  const argv = process.argv.slice(2), opt = {}, words = [];
  if (argv[0] === '--child') return childMain(argv[1]);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--')) words.push(argv[i]);
    else if (key === 'help' || key === 'selftest') opt[key] = true;
    else if (['store', 'id', 'reason', 'snapshot', 'routine', 'time-limit'].includes(key) && i + 1 < argv.length) opt[key] = argv[++i];
    else throw new Usage(`unknown or incomplete option: ${argv[i]} (see --help)`);
  }
  const [operation, id] = words;
  if (opt.help || (!operation && !opt.selftest)) { console.log(HELP); return opt.help ? 0 : 2; }
  if (opt.selftest) return selftest();
  if (!opt.store) throw new Usage('--store <dir> is required');
  const store = path.resolve(opt.store);
  if (operation === 'add') return add(store, opt);
  if (operation === 'list') return list(store);
  if (operation === 'show') return show(load(store, id));
  if (operation === 'decide') return decide(store, id);
  if (operation === 'complete') return complete(store, id, opt);
  throw new Usage(`unknown operation: ${operation} (see --help)`);
}

main().then((code) => { if (typeof code === 'number') process.exitCode = code; }, (err) => {
  console.error(`${err instanceof Usage ? 'usage error' : 'error'}: ${err.message}`);
  process.exitCode = 2;
});
