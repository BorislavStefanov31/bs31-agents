#!/usr/bin/env node
// probe-contract.mjs: validate a tool contract, then (only with --run) check a running stdio MCP
// server against it. Node 18+, no dependencies, no network. Server output is compared, never obeyed.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HELP = `Usage: node scripts/probe-contract.mjs <tool.contract.json> [--run] [--stand-in URL] -- <server command...>
       node scripts/probe-contract.mjs <tool.contract.json>      validate the contract only
       node scripts/probe-contract.mjs --selftest

Without --run: validates the contract and prints the calls it would make. Starts nothing.
With --run:    starts the server (stdio, no shell) and checks that
  - the listed description, input schema and output schema equal the contract's
  - validSample succeeds with structured data that fits the output schema, repeated once as
    JSON text, and the whole result is within maxResultBytes
  - each errors[].sample, and one call with an unknown field, returns an error result that
    names the field and carries the contract's message
--stand-in URL: required when the contract declares outsideEffects. Must be a loopback URL; it is
  passed to the server in the environment variable named by outsideEffects.standInEnv.
Exit 0: all checks pass. Exit 1: a contract problem or failed check. Exit 2: bad usage.`;

const TIMEOUT_MS = 10000;
const UNKNOWN = 'zz_unknown_field';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const canon = (v) => JSON.stringify(v, (k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const fits = (v, t) => t === undefined || [].concat(t).some((x) => x === typeOf(v) || (x === 'number' && typeOf(v) === 'integer'));

// Static check of the contract. Returns a list of problems.
export function validate(c) {
  if (!isObj(c)) return ['contract is not a JSON object'];
  const e = [];
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(c.tool || '')) e.push('tool: 1 to 64 characters from A-Z a-z 0-9 _ . -');
  if (!text(c.description) || c.description.length < 60) e.push('description: cover the job, the moment to use it, the result and the limits (60+ characters)');
  const props = c.input?.properties;
  if (c.input?.type !== 'object' || !isObj(props)) e.push('input: a schema with type "object" and properties');
  else {
    for (const [k, p] of Object.entries(props)) if (!p?.type || !text(p?.description)) e.push(`input.properties.${k}: needs a type and a description`);
    if (!Array.isArray(c.input.required)) e.push('input.required: a list (may be empty)');
    else for (const r of c.input.required) if (!(r in props)) e.push(`input.required: "${r}" is not a property`);
    if (c.input.additionalProperties !== false) e.push('input.additionalProperties: must be false, so an unknown field is rejected');
    if (!isObj(c.validSample)) e.push('validSample: the arguments of one call that must succeed and is safe to repeat');
    else for (const k of [...Object.keys(c.validSample), ...(c.input.required || [])]) {
      if (!(k in props)) e.push(`validSample: "${k}" is not an input property`);
      else if (!(k in c.validSample)) e.push(`validSample: required field "${k}" is missing`);
    }
  }
  if (c.output?.type !== 'object' || !isObj(c.output?.properties)) e.push('output: a schema with type "object" and properties');
  if (!Number.isInteger(c.maxResultBytes) || c.maxResultBytes < 1) e.push('maxResultBytes: a positive integer for the whole result');
  if (!text(c.largeOutput)) e.push('largeOutput: "none", or how a reference, size and first line are returned');
  const fx = c.outsideEffects;
  if (fx !== false && !(text(fx?.what) && /^[A-Z][A-Z0-9_]*$/.test(fx?.standInEnv || ''))) e.push('outsideEffects: false, or { "what": ..., "standInEnv": "ENV_NAME" }');
  for (const k of ['resultUsedFor', 'inputComesFrom', 'likeliestWrongCall', 'changesOutside']) if (!text(c.answers?.[k])) e.push(`answers.${k}: the user's answer is missing`);
  if (!Array.isArray(c.errors) || !c.errors.length) e.push('errors: list at least one');
  else c.errors.forEach((x, i) => {
    if (!text(x?.wrongCall) || !text(x?.message)) return e.push(`errors[${i}]: needs wrongCall and message`);
    if (x.field === null) return /retry/i.test(x.message) || e.push(`errors[${i}]: no field is at fault, so the message must say when to retry`);
    if (!text(x.field)) return e.push(`errors[${i}]: field is a field name, or null when no field is at fault`);
    if (!x.message.includes(x.field)) e.push(`errors[${i}]: message must name the field "${x.field}"`);
    if (!isObj(x.sample)) e.push(`errors[${i}]: needs sample, the arguments that trigger this error`);
  });
  return e;
}

// Returns the server environment, or throws when a tool with outside effects has no local stand-in.
export function serverEnv(c, standIn, base = process.env) {
  if (c.outsideEffects === false) return { ...base };
  let host = '';
  try { host = new URL(standIn).hostname; } catch { /* refused below */ }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new Error(`${c.tool} changes things outside this machine (${c.outsideEffects.what}): give --stand-in with a loopback URL of a local stand-in that forwards nothing`);
  return { ...base, [c.outsideEffects.standInEnv]: standIn };
}

const probesOf = (c) => [
  ...c.errors.filter((x) => x.field !== null).map((x) => ({ field: x.field, label: `${x.field} (${x.wrongCall})`, message: x.message, args: x.sample })),
  { field: UNKNOWN, label: `${UNKNOWN} (a field the contract does not declare)`, message: null, args: { ...c.validSample, [UNKNOWN]: 1 } },
];

// Starts the server and runs every check. Returns the list of failed checks.
export async function probe(c, cmd, env, log = console.log) {
  const fails = [];
  const pass = (m) => log(`  pass  ${m}`);
  const fail = (m) => { fails.push(m); log(`  FAIL  ${m}`); };
  const child = spawn(cmd[0], cmd.slice(1), { env, stdio: ['pipe', 'pipe', 'inherit'] });
  const waiting = new Map();
  const drop = (why) => { for (const done of waiting.values()) done({ error: { code: 'closed', message: why } }); waiting.clear(); };
  child.on('error', (err) => drop(`cannot start the server: ${err.message}`));
  child.on('exit', () => drop('the server exited'));
  child.stdin.on('error', () => {});
  let buf = '', id = 0;
  child.stdout.on('data', (d) => {
    buf += d;
    for (let nl; (nl = buf.indexOf('\n')) >= 0; buf = buf.slice(nl + 1)) {
      let m; try { m = JSON.parse(buf.slice(0, nl)); } catch { continue; }
      if (waiting.has(m?.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    }
  });
  const send = (o) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...o }) + '\n');
  const rpc = (method, params) => new Promise((res, rej) => {
    const my = ++id;
    const timer = setTimeout(() => { waiting.delete(my); rej(new Error(`${method}: no answer within ${TIMEOUT_MS} ms`)); }, TIMEOUT_MS);
    waiting.set(my, (m) => { clearTimeout(timer); m.error ? rej(new Error(`${method}: ${m.error.code === 'closed' ? '' : 'protocol error: '}${String(m.error.message).slice(0, 120)}`)) : res(m.result ?? {}); });
    send({ id: my, method, params });
  });
  const call = (args) => rpc('tools/call', { name: c.tool, arguments: args });
  try {
    await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'probe-contract', version: '1' } });
    send({ method: 'notifications/initialized' });
    const listed = ((await rpc('tools/list', {})).tools || []).find((t) => t.name === c.tool);
    if (!listed) fail(`the server lists no tool named ${c.tool}`);
    else for (const [what, got, want] of [['description', listed.description, c.description], ['input schema', listed.inputSchema, c.input], ['output schema', listed.outputSchema, c.output]]) {
      canon(got) === canon(want) ? pass(`${what} equals the contract`) : fail(`${what} differs from the contract`);
    }
    const good = await call(c.validSample);
    const data = good.structuredContent, texts = (good.content || []).filter((p) => p.type === 'text');
    if (good.isError) fail('validSample returned an error result');
    else if (!isObj(data)) fail('validSample returned no structured data');
    else {
      const op = c.output.properties;
      const off = [...Object.keys(data).filter((k) => !(k in op) || !fits(data[k], op[k].type)), ...(c.output.required || []).filter((k) => !(k in data))];
      off.length ? fail(`structured data does not fit the output schema: ${off.join(', ')}`) : pass('validSample succeeds and fits the output schema');
      let same = false; try { same = texts.length === 1 && canon(JSON.parse(texts[0].text)) === canon(data); } catch { /* not JSON */ }
      same ? pass('the text block repeats the structured data once') : fail('content must be one text block holding the same data as compact JSON');
    }
    const size = Buffer.byteLength(JSON.stringify(good));
    size <= c.maxResultBytes ? pass(`result is ${size} bytes, limit ${c.maxResultBytes}`) : fail(`result is ${size} bytes, over the limit of ${c.maxResultBytes}`);
    for (const p of probesOf(c)) {
      let r; try { r = await call(p.args); } catch (err) { fail(`wrong ${p.label}: ${err.message}; a wrong call must return an error result`); continue; }
      const said = (r.content || []).map((x) => x.text || '').join(' ');
      if (!r.isError) fail(`wrong ${p.label}: the call succeeded`);
      else if (!said.includes(p.field)) fail(`wrong ${p.label}: the error does not name the field`);
      else if (p.message && !said.includes(p.message)) fail(`wrong ${p.label}: the error text is not the contract's message`);
      else pass(`wrong ${p.label}: error result names the field`);
    }
  } catch (err) { fail(err.message); } finally { child.kill(); }
  return fails;
}

const FIXTURE = {
  tool: 'depot_hours', description: 'Returns whether one depot is open now. Call it before booking a pickup. Does not list depots or change bookings.',
  input: { type: 'object', properties: { code: { type: 'string', description: 'Three-letter depot code, for example OSL' } }, required: ['code'], additionalProperties: false },
  output: { type: 'object', properties: { code: { type: 'string' }, open: { type: 'boolean' } }, required: ['code', 'open'] },
  maxResultBytes: 400, largeOutput: 'none', outsideEffects: false, validSample: { code: 'OSL' },
  errors: [{ field: 'code', wrongCall: 'a depot name instead of its code', message: 'code must be three capital letters such as OSL; send the code, not the depot name', sample: { code: 'Oslo depot' } }],
  answers: { resultUsedFor: 'deciding whether to book', inputComesFrom: 'the order record', likeliestWrongCall: 'depot name', changesOutside: 'no' },
};

function fakeServer(mode) { // a tiny stdio server for --selftest; mode picks one deliberate fault
  const c = FIXTURE, out = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  const wrong = (m) => ({ isError: true, content: [{ type: 'text', text: m }] });
  let buf = '';
  process.stdin.on('data', (d) => {
    buf += d;
    for (let nl; (nl = buf.indexOf('\n')) >= 0; buf = buf.slice(nl + 1)) {
      const m = JSON.parse(buf.slice(0, nl)), a = m.params?.arguments || {};
      const extra = Object.keys(a).find((k) => !(k in c.input.properties));
      const data = { code: a.code, open: true, ...(mode === 'big' ? { open: 'x'.repeat(900) } : {}) };
      if (m.method === 'initialize') out(m.id, { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '1' } });
      else if (m.method === 'tools/list') out(m.id, { tools: [{ name: c.tool, description: mode === 'drift' ? 'Depot hours.' : c.description, inputSchema: c.input, outputSchema: c.output }] });
      else if (m.method !== 'tools/call') continue;
      else if (extra && mode !== 'lax') out(m.id, wrong(`${extra} is not a field of ${c.tool}; send only code`));
      else if (!/^[A-Z]{3}$/.test(a.code)) out(m.id, wrong(mode === 'vague' ? 'Invalid input.' : c.errors[0].message));
      else out(m.id, { structuredContent: data, content: [{ type: 'text', text: mode === 'prose' ? 'The depot is open.' : JSON.stringify(data) }] });
    }
  });
}

async function selftest() {
  let failed = 0;
  const report = (ok, name) => { if (!ok) failed++; console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`); };
  const broken = (change, want) => { const c = structuredClone(FIXTURE); change(c); return validate(c).some((x) => want.test(x)); };
  report(validate(FIXTURE).length === 0, 'fixture contract is valid');
  report(broken((c) => { delete c.input.additionalProperties; }, /unknown field is rejected/), 'contract must reject unknown fields');
  report(broken((c) => { delete c.input.properties.code.description; }, /type and a description/), 'every input field needs a description');
  report(broken((c) => { c.errors[0].message = 'bad input'; }, /must name the field/), 'error message must name its field');
  report(broken((c) => { c.errors.push({ field: null, wrongCall: 'upstream down', message: 'try later' }); }, /when to retry/), 'fieldless error must say when to retry');
  let refused = false; try { serverEnv({ ...FIXTURE, outsideEffects: { what: 'sends mail', standInEnv: 'MAIL_URL' } }, 'https://mail.example.com'); } catch { refused = true; }
  report(refused, 'outside effects are refused without a loopback stand-in');
  const self = fileURLToPath(import.meta.url);
  for (const [mode, want] of [['ok', null], ['drift', /description differs/], ['lax', /does not declare\): the call succeeded/], ['big', /does not fit|over the limit/], ['vague', /does not name the field/], ['prose', /one text block/]]) {
    const fails = await probe(FIXTURE, [process.execPath, self, `--fake-server=${mode}`], process.env, () => {});
    report(want ? fails.some((f) => want.test(f)) : fails.length === 0, want ? `faulty server "${mode}" is caught` : 'conforming server passes every check');
  }
  console.log(failed ? `selftest: ${failed} cases failed` : 'selftest: 12 cases passed');
  process.exit(failed ? 1 : 0);
}

async function main(argv) {
  const fake = argv.find((a) => a.startsWith('--fake-server='));
  if (fake) return fakeServer(fake.split('=')[1]);
  if (argv.includes('--help') || argv.includes('-h')) return console.log(HELP);
  if (argv.includes('--selftest')) return selftest();
  const cut = argv.indexOf('--'), own = cut < 0 ? argv : argv.slice(0, cut), cmd = cut < 0 ? [] : argv.slice(cut + 1);
  const at = own.indexOf('--stand-in'), standIn = at < 0 ? undefined : own[at + 1];
  const files = own.filter((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
  const stop = (code, why) => { console.error(`probe-contract: ${why}`); process.exit(code); };
  if (files.length !== 1) stop(2, 'give exactly one contract file (see --help)');
  let c; try { c = JSON.parse(readFileSync(files[0], 'utf8')); } catch (err) { stop(1, `cannot read ${files[0]} as JSON: ${err.message}`); }
  const problems = validate(c);
  for (const p of problems) console.log(`contract: ${p}`);
  if (problems.length) stop(1, `${problems.length} contract problem(s), nothing was started`);
  console.log(`contract ${c.tool}: valid`);
  if (!cmd.length) return console.log('No server command given, so only the contract was checked.');
  let env; try { env = serverEnv(c, standIn); } catch (err) { stop(1, err.message); }
  const probes = probesOf(c);
  if (!own.includes('--run')) {
    console.log(`Plan (nothing started yet):\n  start: ${cmd.join(' ')}\n  list tools and compare description and both schemas\n  call ${c.tool} once with validSample, limit ${c.maxResultBytes} bytes\n  call it ${probes.length} times with wrong input:\n${probes.map((p) => `    ${p.label}`).join('\n')}\n  outside effects: ${c.outsideEffects === false ? 'none declared' : `declared, ${c.outsideEffects.standInEnv} points at the stand-in`}\nAdd --run before "--" to execute.`);
    return;
  }
  const fails = await probe(c, cmd, env);
  if (fails.length) stop(1, `${fails.length} check(s) failed for ${c.tool}`);
  console.log(`${c.tool}: the running tool matches its contract`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main(process.argv.slice(2));
