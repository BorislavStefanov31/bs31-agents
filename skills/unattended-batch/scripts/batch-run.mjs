#!/usr/bin/env node
// batch-run.mjs: run one routine over a list of items under limits the routine cannot change.
// The runner owns the clock, the item count, the run log, the held-item store and the resume
// file. The routine runs in a child process with a minimal environment (no secrets) and is
// killed at the time limit, even in the middle of an item.
import { fork, execFile, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const EXIT = { 'all-processed': 0, 'item-error': 1, 'time-exhausted': 3, interrupted: 4, 'item-limit': 5 };
const HELP = `Usage: node batch-run.mjs --routine <file.mjs> --items <file.jsonl> --time-limit <N>s|m|h --run-dir <new dir> [options]
       node batch-run.mjs --inspect <run dir>

  --routine <file>     module whose default export is: async (item, tools) => { outcome: 'done' }
                       or { outcome: 'hold', reason: '...' }; a throw or anything else is an item error
  --items <file>       one JSON object per line, each with a unique "id"
  --time-limit <N>u    required wall-clock limit for the whole run, for example 90s, 45m, 2h
  --max-items <n>      start at most n items
  --only <id>          run this one item (a trial, or a retry after an item error)
  --run-dir <dir>      a new folder per run; receives run.log, routine.out, not-started.jsonl
  --holds <dir>        held-item store, default <run-dir>/holds
  --scope <file>       host list for tools.send(); without it the routine cannot send secrets
  --values <file>      owner-kept values file, passed to the sender only
  --sender <file>      default ../../secret-scope/scripts/scoped-send.mjs
  --inspect <dir>      say how the run in that folder ended, from its log
  --selftest           run built-in cases in a temporary folder

Exit codes: 0 all processed, 1 item error, 2 usage error, 3 time exhausted, 4 interrupted,
5 item limit reached, 6 no final outcome in the log (--inspect).`;
class Usage extends Error {}

// Child side: load the routine once, then answer one item message at a time.
async function childMain(routinePath) {
  const routine = (await import(pathToFileURL(path.resolve(routinePath)).href)).default;
  const waiting = new Map();
  let calls = 0;
  const tools = { send: (request) => new Promise((resolve) => { waiting.set(++calls, resolve); process.send({ type: 'send', n: calls, request }); }) };
  process.on('message', async (msg) => {
    if (msg.type === 'sent') return waiting.get(msg.n)?.(msg.result);
    let reply;
    try {
      const r = await routine(msg.item, tools);
      if (r?.outcome === 'done') reply = { outcome: 'done' };
      else if (r?.outcome === 'hold' && typeof r.reason === 'string' && r.reason.trim()) reply = { outcome: 'hold', reason: r.reason };
      else reply = { outcome: 'error', reason: 'the routine returned neither done nor hold with a reason' };
    } catch (err) { reply = { outcome: 'error', reason: String(err?.message ?? err) }; }
    process.send({ type: 'result', ...reply });
  });
  process.on('disconnect', () => process.exit(1)); // the routine never outlives its runner
  process.send({ type: 'ready' });
}

function readItems(file) {
  const items = fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line, i) => {
    try { return JSON.parse(line); } catch { throw new Usage(`item ${i + 1} in the items file is not JSON`); }
  });
  const seen = new Set();
  for (const item of items) {
    const id = String(item?.id ?? '');
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) || seen.has(id)) throw new Usage(`every item needs a unique "id" made of letters, digits, dot, dash, underscore (problem: ${JSON.stringify(id)})`);
    seen.add(id);
  }
  return items;
}

function parseLimit(text) {
  const m = /^(\d+)([smh])$/.exec(text ?? '');
  if (!m || Number(m[1]) < 1) throw new Usage('--time-limit is required, as a whole number with a unit: 90s, 45m or 2h');
  return Number(m[1]) * { s: 1000, m: 60000, h: 3600000 }[m[2]];
}

// A held item is stored once, as the routine saw it, with a digest of that snapshot.
function storeHold(holds, item, reason) {
  const record = { id: String(item.id), reason, heldAt: new Date().toISOString(), snapshot: item, digest: createHash('sha256').update(JSON.stringify(item)).digest('hex') };
  try { fs.writeFileSync(path.join(holds, 'items', `${item.id}.json`), JSON.stringify(record, null, 2), { flag: 'wx' }); } catch (err) { if (err.code !== 'EEXIST') throw err; }
}

async function run(opt) {
  for (const key of ['routine', 'items', 'run-dir']) if (!opt[key]) throw new Usage(`--${key} is required (see --help)`);
  const limitMs = parseLimit(opt['time-limit']);
  const maxItems = opt['max-items'] === undefined ? Infinity : Number(opt['max-items']);
  if (!(maxItems >= 1) || (maxItems !== Infinity && !Number.isInteger(maxItems))) throw new Usage('--max-items must be a whole number of 1 or more');
  const all = readItems(opt.items);
  const todo = opt.only ? all.filter((item) => String(item.id) === opt.only) : all;
  if (!todo.length) throw new Usage('no item to run');
  const runDir = path.resolve(opt['run-dir']), holds = path.resolve(opt.holds ?? path.join(runDir, 'holds'));
  const logFile = path.join(runDir, 'run.log'), resume = path.join(runDir, 'not-started.jsonl'), marker = path.join(holds, 'last-run.json');
  if (fs.existsSync(logFile)) throw new Usage('this --run-dir already holds a run.log; use a new folder for each run');
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(path.join(holds, 'items'), { recursive: true });
  const log = (event) => fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
  const startedAt = new Date().toISOString();
  fs.writeFileSync(marker, JSON.stringify({ startedAt, endedAt: null }));
  log({ event: 'run', items: todo.length, timeLimit: opt['time-limit'], maxItems: opt['max-items'] ?? null });

  const out = fs.openSync(path.join(runDir, 'routine.out'), 'a');
  const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
  const child = fork(SELF, ['--child', opt.routine], { env, stdio: ['ignore', out, out, 'ipc'] });
  process.on('exit', () => child.kill('SIGKILL'));
  const counts = { completed: 0, held: 0, failed: 0, interrupted: 0 }, notes = [];
  let current = null, settle = null, stop = null;
  const next = () => new Promise((resolve) => { settle = resolve; });
  const halt = (type) => { stop ??= type; settle?.({ type }); };
  const timer = setTimeout(() => halt('timeout'), limitMs);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => halt('signal'));
  child.on('exit', (code) => settle?.({ type: 'exit', code }));
  child.on('message', (msg) => {
    if (msg.type !== 'send') return settle?.(msg);
    const id = current;
    const reply = (result) => {
      log({ event: 'send', id, outcome: result.outcome, status: result.status, step: result.step, destination: result.destination, secret: result.secret, reason: result.reason });
      if (result.outcome === 'blocked' && result.sentBefore) notes.push(`possible-effect id=${id} reason="request blocked at redirect step ${result.step}; the earlier host received it"`);
      if (child.connected) child.send({ type: 'sent', n: msg.n, result });
    };
    if (!opt.scope) return reply({ outcome: 'unavailable', reason: 'the runner was started without --scope' });
    const request = msg.request ?? {};
    const args = [path.resolve(opt.sender ?? path.join(path.dirname(SELF), '../../secret-scope/scripts/scoped-send.mjs')), '--json', '--scope', opt.scope, '--method', String(request.method ?? 'GET'), '--url', String(request.url)];
    if (opt.values) args.push('--values', opt.values);
    for (const [name, value] of Object.entries(request.headers ?? {})) args.push('--header', `${name}: ${value}`);
    if (request.body != null) args.push('--body', String(request.body));
    execFile(process.execPath, args, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      try { reply(JSON.parse(stdout)); } catch { reply({ outcome: 'sender-failed', reason: `the sender gave no result (exit code ${err?.code ?? 0})` }); }
    });
  });

  let index = 0, outcome = null;
  const ready = await next();
  if (ready.type !== 'ready') outcome = ready.type === 'timeout' ? 'time-exhausted' : ready.type === 'signal' ? 'interrupted' : 'item-error';
  if (ready.type === 'exit') notes.push(`failed id=- reason="the routine could not be loaded (exit code ${ready.code}); see routine.out"`);
  while (!outcome && index < todo.length) {
    if (stop) { outcome = stop === 'timeout' ? 'time-exhausted' : 'interrupted'; break; }
    if (index >= maxItems) { outcome = 'item-limit'; break; }
    const item = todo[index++];
    current = String(item.id);
    log({ event: 'start', id: current });
    child.send({ type: 'item', item });
    const msg = await next();
    if (msg.type === 'result') {
      if (msg.outcome === 'hold') storeHold(holds, item, msg.reason);
      counts[{ done: 'completed', hold: 'held', error: 'failed' }[msg.outcome]]++;
      log({ event: msg.outcome, id: current, reason: msg.reason });
      if (msg.outcome !== 'error') continue;
      outcome = 'item-error';
      notes.push(`failed id=${current} reason=${JSON.stringify(msg.reason)}`);
    } else {
      const why = { timeout: 'the time limit was reached mid-item', signal: 'the runner was signalled mid-item' }[msg.type] ?? `the routine process exited mid-item (code ${msg.code})`;
      counts.interrupted++;
      log({ event: 'interrupted', id: current, reason: why });
      notes.push(`possible-effect id=${current} reason=${JSON.stringify(why)}`);
      outcome = { timeout: 'time-exhausted', signal: 'interrupted' }[msg.type] ?? 'item-error';
    }
  }
  outcome ??= 'all-processed';
  clearTimeout(timer);
  child.kill('SIGKILL');
  const rest = todo.slice(index);
  fs.writeFileSync(resume, rest.map((item) => `${JSON.stringify(item)}\n`).join(''));
  log({ event: 'end', outcome, ...counts, remaining: rest.length });
  fs.writeFileSync(marker, JSON.stringify({ startedAt, endedAt: new Date().toISOString(), outcome }));
  for (const note of notes) console.log(note);
  console.log(`OUTCOME ${outcome} completed=${counts.completed} held=${counts.held} failed=${counts.failed} interrupted=${counts.interrupted} remaining=${rest.length} limits=time:${opt['time-limit']},items:${opt['max-items'] ?? 'none'} log=${logFile} holds=${holds} resume=${resume}`);
  return EXIT[outcome];
}

function inspect(runDir) {
  const events = fs.readFileSync(path.join(runDir, 'run.log'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const last = events.at(-1);
  if (last.event === 'end') {
    console.log(`ENDED outcome=${last.outcome} completed=${last.completed} held=${last.held} failed=${last.failed} interrupted=${last.interrupted} remaining=${last.remaining}`);
    return EXIT[last.outcome];
  }
  const midItem = last.event === 'start' ? ` Item ${last.id} was started and has no result: it may have partly taken effect.` : '';
  console.log(`NO-OUTCOME the log has no end line (last event: ${last.event} at ${last.at}). The run is still going or was killed.${midItem} Tell the owner and wait.`);
  return 6;
}

function selftest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-run-selftest-'));
  fs.writeFileSync(path.join(dir, 'routine.mjs'), `export default async function (item) {
  if (process.env.FAKE_TOKEN) throw new Error('a secret is visible to the routine');
  if (item.kind === 'slow') await new Promise((resolve) => setTimeout(resolve, 30000));
  if (item.kind === 'bad') throw new Error('boom');
  if (item.kind === 'ask') return { outcome: 'hold', reason: 'needs the owner' };
  return { outcome: 'done' };
}\n`);
  const attempt = (name, kinds, extra, wantCode, wantLine, also = () => true) => {
    const runDir = path.join(dir, name), items = path.join(dir, `${name}.jsonl`);
    fs.writeFileSync(items, kinds.map((kind, i) => `${JSON.stringify({ id: kind === 'dup' ? 'same' : `${name}-${i + 1}`, kind })}\n`).join(''));
    const r = spawnSync(process.execPath, [SELF, '--routine', path.join(dir, 'routine.mjs'), '--items', items, '--run-dir', runDir, ...extra], { encoding: 'utf8', env: { ...process.env, FAKE_TOKEN: 'fake-not-a-secret' } });
    const ok = r.status === wantCode && wantLine.test(r.stdout.trim().split('\n').at(-1) ?? '') && also(runDir);
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
    return ok;
  };
  const lines = (file) => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
  const results = [
    attempt('all-processed-with-one-hold', ['ok', 'ask', 'ok'], ['--time-limit', '20s'], 0, /^OUTCOME all-processed completed=2 held=1 failed=0 interrupted=0 remaining=0 /, (d) => JSON.parse(fs.readFileSync(path.join(d, 'holds/items/all-processed-with-one-hold-2.json'), 'utf8')).digest.length === 64 && JSON.parse(fs.readFileSync(path.join(d, 'holds/last-run.json'), 'utf8')).endedAt !== null),
    attempt('item-error-stops-the-run', ['ok', 'bad', 'ok', 'ok'], ['--time-limit', '20s'], 1, /^OUTCOME item-error completed=1 held=0 failed=1 interrupted=0 remaining=2 /, (d) => lines(path.join(d, 'not-started.jsonl')) === 2),
    attempt('time-limit-kills-mid-item', ['ok', 'slow', 'ok'], ['--time-limit', '1s'], 3, /^OUTCOME time-exhausted completed=1 held=0 failed=0 interrupted=1 remaining=1 /, (d) => spawnSync(process.execPath, [SELF, '--inspect', d]).status === 3),
    attempt('item-limit', ['ok', 'ok', 'ok'], ['--time-limit', '20s', '--max-items', '1'], 5, /^OUTCOME item-limit completed=1 .* remaining=2 /),
    attempt('only-one-item', ['ok', 'bad', 'ok'], ['--time-limit', '20s', '--only', 'only-one-item-3'], 0, /^OUTCOME all-processed completed=1 .* remaining=0 /),
    attempt('duplicate-ids-refused', ['dup', 'dup'], ['--time-limit', '20s'], 2, /^$/),
    attempt('time-limit-is-required', ['ok'], [], 2, /^$/),
  ];
  fs.rmSync(dir, { recursive: true, force: true });
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `selftest: ${failed} of ${results.length} failed` : `selftest: ${results.length} passed`);
  return failed ? 1 : 0;
}

async function main() {
  const argv = process.argv.slice(2), opt = {};
  if (argv[0] === '--child') return childMain(argv[1]);
  const valued = ['routine', 'items', 'time-limit', 'max-items', 'only', 'run-dir', 'holds', 'scope', 'values', 'sender', 'inspect'];
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'help' || key === 'selftest') opt[key] = true;
    else if (argv[i].startsWith('--') && valued.includes(key) && i + 1 < argv.length) opt[key] = argv[++i];
    else throw new Usage(`unknown or incomplete option: ${argv[i]} (see --help)`);
  }
  if (opt.help) { console.log(HELP); return 0; }
  process.exit(opt.selftest ? selftest() : opt.inspect ? inspect(opt.inspect) : await run(opt));
}

main().catch((err) => { console.error(`${err instanceof Usage ? 'usage error' : 'error'}: ${err.message}`); process.exit(2); });
