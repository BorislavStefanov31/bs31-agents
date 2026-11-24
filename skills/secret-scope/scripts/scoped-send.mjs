#!/usr/bin/env node
// scoped-send.mjs: send one HTTP request whose secrets are written as {{NAME}} placeholders.
// Every hop (the first request and each redirect) must be an origin listed for every secret
// the request carries. Values are filled in only after that check passes, and they are
// masked in everything this script prints.
// Exit codes: 0 response received, 1 network error, 2 usage error, 3 blocked.
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const HELP = `Usage: node scoped-send.mjs --scope <file> --url <url> [options]

  --scope <file>       JSON host list: { "SECRET_NAME": ["https://exact.host", "http://127.0.0.1:4010"] }
  --url <url>          destination; no placeholder and no user:password@ part
  --method <verb>      default GET
  --header 'N: v'      repeatable; write a secret as {{SECRET_NAME}}
  --body <text>        or --body-file <path>; placeholders allowed
  --values <file>      owner-kept NAME=value lines; without it values come from the environment
  --max-redirects <n>  default 5, at most 10
  --timeout <seconds>  per hop, default 30
  --json               print one JSON result object instead of the response body
  --selftest           run built-in cases against two servers on 127.0.0.1

Exit codes: 0 response received (any HTTP status), 1 network error, 2 usage error, 3 blocked.`;

const NAME = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
class Usage extends Error {}
class Blocked extends Error {
  constructor(reason, at = {}) { super(reason); Object.assign(this, { secret: null, destination: null, step: 0 }, at); }
}

function loadScope(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Usage('the scope file is not valid JSON'); }
  const scope = new Map();
  for (const [name, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) throw new Usage(`the scope of ${name} must be a list of origins`);
    scope.set(name, new Set(entries.map((entry) => {
      let u;
      try { u = new URL(entry); } catch { throw new Usage(`scope entry of ${name} is not a URL: ${entry}`); }
      const exact = !entry.includes('*') && /^https?:$/.test(u.protocol) && !u.username && !u.password && u.pathname === '/' && !u.search && !u.hash;
      if (!exact) throw new Usage(`scope entry of ${name} must be scheme://host[:port] with no wildcard and no path: ${entry}`);
      return u.origin;
    })));
  }
  return scope;
}

// Addresses no secret may reach even when listed: link-local ranges and cloud metadata services.
function neverAllowed(hostname) {
  let h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const mapped = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) { const [a, b] = [parseInt(mapped[1], 16), parseInt(mapped[2], 16)]; h = `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`; }
  return /^169\.254\./.test(h) || /^fe[89ab][0-9a-f]:/.test(h) || ['100.100.100.200', 'fd00:ec2::254', 'metadata', 'metadata.google.internal'].includes(h);
}

function checkHop(url, carried, scope, step) {
  const at = { destination: url.origin === 'null' ? url.protocol : url.origin, step };
  if (!/^https?:$/.test(url.protocol)) throw new Blocked('the scheme is not http or https', at);
  if (url.username || url.password) throw new Blocked('credentials in the user part of the URL', at);
  if (neverAllowed(url.hostname)) throw new Blocked('link-local or cloud metadata address', at);
  for (const name of carried) {
    if (!scope.get(name)?.has(url.origin)) throw new Blocked(`this origin is not on the host list of ${name}`, { ...at, secret: name });
  }
}

// req: { url, method, headers: [[name, value]], body }. valueOf(name) returns a secret value or undefined.
async function send(req, scope, valueOf, env = process.env, { maxRedirects = 5, timeoutMs = 30000 } = {}) {
  const headers = req.headers ?? [];
  const carrying = [req.body ?? '', ...headers.map(([n, v]) => `${n}: ${v}`)];
  const carried = [...new Set(carrying.flatMap((t) => [...t.matchAll(NAME)].map((m) => m[1])))];
  const known = [...scope.keys()].map((n) => [n, valueOf(n)]).filter(([, v]) => v).sort((a, b) => b[1].length - a[1].length);
  const mask = (text) => known.reduce((out, [n, v]) => out.split(v).join(`{{${n}}}`).split(encodeURIComponent(v)).join(`{{${n}}}`), String(text));
  const fill = (text) => text.replace(NAME, (_, n) => valueOf(n));
  const hops = [];
  let url, step = 0;
  let method = (req.method ?? 'GET').toUpperCase(), body = req.body;
  try {
    for (const [n, v] of known) {
      if ([req.url, ...carrying].some((t) => t.includes(v))) throw new Blocked(`the literal value of ${n} is in the request; write {{${n}}} instead`, { secret: n });
    }
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Blocked('certificate verification is switched off (NODE_TLS_REJECT_UNAUTHORIZED=0)');
    if (env.NODE_USE_ENV_PROXY === '1') throw new Blocked('requests would pass through an environment proxy (NODE_USE_ENV_PROXY=1)');
    if (/\{\{|\}\}/.test(req.url)) throw new Blocked('placeholder in the URL; a secret may not be part of the host name, path or query', { secret: [...req.url.matchAll(NAME)][0]?.[1] ?? null });
    if (headers.some(([n]) => /^host$/i.test(n.trim()))) throw new Blocked('caller-supplied Host header');
    if (!carried.length) throw new Usage('no {{NAME}} placeholder in the headers or body; this wrapper is only for credentialed requests');
    if (body != null && ['GET', 'HEAD'].includes(method)) throw new Usage(`a ${method} request cannot have a body`);
    for (const name of carried) {
      if (!scope.has(name)) throw new Blocked(`${name} has no host list`, { secret: name });
      if (!valueOf(name)) throw new Usage(`no value available for ${name} (environment or --values file)`);
    }
    try { url = new URL(req.url); } catch { throw new Usage('--url is not a valid absolute URL'); }
    for (; step <= maxRedirects; step++) {
      checkHop(url, carried, scope, step);
      let res, text;
      try {
        res = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
          headers: headers.map(([n, v]) => [n, fill(v)]), body: body == null ? undefined : fill(body) });
        text = await res.text();
      } catch (err) {
        return { outcome: 'network-error', step, destination: url.origin, hops, reason: mask(err.cause?.code ?? err.cause?.message ?? err.message) };
      }
      hops.push(mask(`step ${step}: ${method} ${url.origin}${url.pathname} -> ${res.status}`));
      const location = res.headers.get('location');
      if (!REDIRECTS.has(res.status) || !location) {
        const shown = Object.fromEntries([...res.headers].map(([n, v]) => [n, mask(v)]));
        return { outcome: 'response', status: res.status, step, destination: url.origin, hops, headers: shown, body: mask(text) };
      }
      try { url = new URL(location, url); } catch { throw new Blocked('redirect to a location that is not a URL', { destination: url.origin, step: step + 1 }); }
      if (res.status === 303 ? method !== 'HEAD' : res.status < 303 && method === 'POST') { method = 'GET'; body = undefined; }
    }
    throw new Blocked(`more than ${maxRedirects} redirects`, { destination: url.origin, step });
  } catch (err) {
    if (!(err instanceof Blocked)) throw err;
    return { outcome: 'blocked', secret: err.secret, destination: err.destination, step: err.step, sentBefore: err.step > 0, hops, reason: mask(err.message) };
  }
}

function parseArgs(argv) {
  const opt = { headers: [] };
  const valued = ['scope', 'url', 'method', 'header', 'body', 'body-file', 'values', 'max-redirects', 'timeout'];
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (['json', 'help', 'selftest'].includes(key)) { opt[key] = true; continue; }
    if (!argv[i].startsWith('--') || !valued.includes(key) || i + 1 >= argv.length) throw new Usage(`unknown or incomplete option at position ${i + 1} (see --help)`);
    const value = argv[++i];
    if (key !== 'header') { opt[key] = value; continue; }
    const colon = value.indexOf(':');
    if (colon < 1) throw new Usage('a header must look like "Name: value"');
    opt.headers.push([value.slice(0, colon).trim(), value.slice(colon + 1).trim()]);
  }
  return opt;
}

function valueSource(file, env) {
  const fromFile = new Map();
  for (const line of file ? readFileSync(file, 'utf8').split('\n') : []) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) fromFile.set(m[1], m[2].replace(/^(['"])(.*)\1$/, '$2'));
  }
  return (name) => fromFile.get(name) ?? env[name];
}

function report(r, json) {
  for (const hop of r.hops ?? []) console.error(hop);
  const where = `secret=${r.secret ?? '-'} destination=${r.destination ?? '-'} step=${r.step}`;
  if (r.outcome === 'response') console.error(`RESPONSE ${r.status} from ${r.destination} after ${r.step} redirect(s)`);
  else if (r.outcome === 'blocked') console.error(`BLOCKED ${where} reason=${r.reason} | ${r.sentBefore ? 'earlier steps were sent and may have taken effect' : 'nothing was sent'}`);
  else console.error(`NETWORK ERROR destination=${r.destination} step=${r.step} reason=${r.reason} | the request may have been sent`);
  if (json) console.log(JSON.stringify(r));
  else if (r.outcome === 'response') process.stdout.write(r.body);
  return { response: 0, 'network-error': 1, blocked: 3 }[r.outcome];
}

async function selftest() {
  const fake = () => `fake-${randomBytes(12).toString('hex')}`;
  const values = { DEMO_TOKEN: fake(), WIDE_TOKEN: fake(), META_TOKEN: fake() };
  const seen = [];
  const listen = (label) => new Promise((resolve) => {
    const server = http.createServer((q, r) => {
      seen.push(`${label} ${q.headers.authorization ?? 'no-auth'}`);
      const to = new URL(q.url, 'http://x').searchParams.get('to');
      if (to) r.writeHead(302, { location: to }).end(); else r.end(`auth=${q.headers.authorization}`);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
  const [a, b] = [await listen('A'), await listen('B')];
  const A = `http://127.0.0.1:${a.address().port}`, B = `http://127.0.0.1:${b.address().port}`;
  const scope = loadScope(JSON.stringify({ DEMO_TOKEN: [A], WIDE_TOKEN: [A, B], META_TOKEN: ['http://169.254.169.254'] }));
  const auth = (name) => [['Authorization', `Bearer {{${name}}}`]];
  const run = (req, env = {}) => send(req, scope, (n) => values[n], env);
  const viaA = `${A}/hop?to=${encodeURIComponent(`${B}/echo`)}`;
  const atB = () => seen.filter((s) => s.startsWith('B')).length;
  const blocked = (r, step = 0) => r.outcome === 'blocked' && r.step === step && !JSON.stringify(r).includes('fake-');
  const cases = [
    ['listed host gets the value and the output is masked', async () => { const r = await run({ url: `${A}/echo`, headers: auth('DEMO_TOKEN') }); return r.outcome === 'response' && r.body === 'auth=Bearer {{DEMO_TOKEN}}' && seen.at(-1) === `A Bearer ${values.DEMO_TOKEN}`; }],
    ['redirect to an unlisted port is blocked and receives nothing', async () => { const before = atB(); const r = await run({ url: viaA, headers: auth('DEMO_TOKEN') }); return blocked(r, 1) && r.sentBefore && r.secret === 'DEMO_TOKEN' && r.destination === B && atB() === before; }],
    ['redirect to a listed origin is followed', async () => { const r = await run({ url: viaA, headers: auth('WIDE_TOKEN') }); return r.outcome === 'response' && r.step === 1 && seen.at(-1) === `B Bearer ${values.WIDE_TOKEN}`; }],
    ['unlisted first host: nothing is sent', async () => { const before = seen.length; const r = await run({ url: `${B}/echo`, headers: auth('DEMO_TOKEN') }); return blocked(r) && !r.sentBefore && seen.length === before; }],
    ['an alias of a listed host is a different destination', async () => blocked(await run({ url: `${A.replace('127.0.0.1', 'localhost')}/echo`, headers: auth('DEMO_TOKEN') }))],
    ['user part in the URL', async () => blocked(await run({ url: `${A.replace('//', '//user:pw@')}/echo`, headers: auth('DEMO_TOKEN') }))],
    ['caller-supplied Host header', async () => blocked(await run({ url: `${A}/echo`, headers: [...auth('DEMO_TOKEN'), ['Host', 'elsewhere.example']] }))],
    ['literal value instead of the placeholder', async () => blocked(await run({ url: `${A}/echo`, headers: [['Authorization', `Bearer ${values.DEMO_TOKEN}`]] }))],
    ['placeholder in the URL', async () => blocked(await run({ url: `${A}/echo?key={{DEMO_TOKEN}}`, headers: auth('DEMO_TOKEN') }))],
    ['metadata address even when listed', async () => blocked(await run({ url: 'http://169.254.169.254/latest', headers: auth('META_TOKEN') }))],
    ['certificate verification off', async () => blocked(await run({ url: `${A}/echo`, headers: auth('DEMO_TOKEN') }, { NODE_TLS_REJECT_UNAUTHORIZED: '0' }))],
    ['wildcard scope entry is refused', async () => { try { loadScope('{"X":["https://*.example.com"]}'); return false; } catch (err) { return err instanceof Usage; } }],
  ];
  let failed = 0;
  for (const [label, check] of cases) {
    const ok = await check().catch(() => false);
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  }
  for (const server of [a, b]) { server.closeAllConnections?.(); server.close(); }
  console.log(failed ? `selftest: ${failed} of ${cases.length} failed` : `selftest: ${cases.length} passed`);
  return failed ? 1 : 0;
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  if (opt.help) { console.log(HELP); return 0; }
  if (opt.selftest) return selftest();
  if (!opt.scope || !opt.url) throw new Usage('--scope and --url are required (see --help)');
  if (opt.body != null && opt['body-file']) throw new Usage('give --body or --body-file, not both');
  const maxRedirects = Number(opt['max-redirects'] ?? 5), timeoutMs = Number(opt.timeout ?? 30) * 1000;
  if (!Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 10 || !(timeoutMs > 0)) throw new Usage('--max-redirects must be 0 to 10 and --timeout a positive number');
  let scopeText, body = opt.body;
  try {
    scopeText = readFileSync(opt.scope, 'utf8');
    if (opt['body-file']) body = readFileSync(opt['body-file'], 'utf8');
  } catch (err) { throw new Usage(`cannot read a file: ${err.code}`); }
  const req = { url: opt.url, method: opt.method, headers: opt.headers, body };
  return report(await send(req, loadScope(scopeText), valueSource(opt.values, process.env), process.env, { maxRedirects, timeoutMs }), opt.json);
}

main().then((code) => { process.exitCode = code; }, (err) => {
  console.error(`${err instanceof Usage ? 'usage error' : 'error'}: ${err.message}`);
  process.exitCode = 2;
});
