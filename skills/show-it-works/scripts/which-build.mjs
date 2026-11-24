#!/usr/bin/env node
// which-build.mjs: does the live page come from the build you are about to claim?
// One GET without cookies or credentials; reads .git files directly, runs nothing.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import path from 'node:path';

const HELP = `Usage:
  node which-build.mjs <page-url> [--expect <id>] [--repo <dir>] [--meta <name>]
                       [--allow-local] [--timeout <ms>]
  node which-build.mjs --selftest

Makes one GET (no cookies, no credentials, redirects not followed), reads the
build identifier the page declares, and compares it with --expect or, without
it, with the commit HEAD points to in the repository at --repo (default: the
current folder; found by reading .git, so uncommitted changes are not seen).

A page declares its build in one of these forms (first match wins):
  <meta name="build-commit" content="...">   also build-sha, build-version,
                                             git-commit, commit, revision, or --meta <name>
  any element with a data-build="..." or data-commit="..." attribute
  <span data-testid="build-sha">...</span>

Two identifiers agree when they are equal, or when both are hexadecimal, at
least 7 characters long, and one starts with the other.

--allow-local  permit localhost and private-network addresses (ask the user first)
Exit: 0 match, 1 differ, 2 the page declares no build, 3 usage, refused address or network error`;

const META = ['build-commit', 'build-sha', 'build-version', 'git-commit', 'commit', 'revision'];

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}

function declaredBuild(html, extra) {
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  const metas = [...body.matchAll(/<meta\b([^>]*)>/gi)].map((m) => attrs(m[1]));
  for (const n of extra ? [extra.toLowerCase(), ...META] : META) {
    const hit = metas.find((a) => (a.name || '').toLowerCase() === n && a.content && a.content.trim());
    if (hit) return { id: hit.content.trim(), how: `<meta name="${n}">` };
  }
  const data = body.match(/<[a-z][^>]*\sdata-(build|commit)\s*=\s*["']?([^"'\s>]+)/i);
  if (data) return { id: data[2], how: `data-${data[1].toLowerCase()} attribute` };
  const el = body.match(/<[a-z][^>]*\sdata-testid\s*=\s*["']?build-sha["']?[^>]*>\s*([^<\s][^<]*?)\s*</i);
  return el ? { id: el[1], how: 'element with data-testid="build-sha"' } : null;
}

function agree(a, b) {
  if (a.trim() === b.trim()) return true;
  const x = a.trim().toLowerCase(), y = b.trim().toLowerCase(), hex = /^[0-9a-f]{7,64}$/;
  return hex.test(x) && hex.test(y) && (x.startsWith(y) || y.startsWith(x));
}

// The commit HEAD points to, read from the .git folder (also a worktree's .git file).
function repoCommit(dir) {
  let d = path.resolve(dir), dot;
  for (;;) {
    dot = path.join(d, '.git');
    if (existsSync(dot)) break;
    if (path.dirname(d) === d) throw new Error(`no .git at or above ${dir}; pass --expect <id>`);
    d = path.dirname(d);
  }
  const text = (f) => readFileSync(f, 'utf8').trim();
  const gitDir = statSync(dot).isFile() ? path.resolve(d, text(dot).replace(/^gitdir:\s*/, '')) : dot;
  const head = text(path.join(gitDir, 'HEAD'));
  if (!head.startsWith('ref:')) return { id: head, where: 'detached HEAD' };
  const ref = head.slice(4).trim();
  const shared = existsSync(path.join(gitDir, 'commondir')) ? path.resolve(gitDir, text(path.join(gitDir, 'commondir'))) : gitDir;
  for (const g of [gitDir, shared]) if (existsSync(path.join(g, ref))) return { id: text(path.join(g, ref)), where: ref };
  const packed = path.join(shared, 'packed-refs');
  const line = existsSync(packed) && text(packed).split('\n').find((l) => l.endsWith(' ' + ref));
  if (line) return { id: line.split(' ')[0], where: ref };
  throw new Error(`cannot resolve ${ref} from .git files; pass --expect <id>`);
}

function privateIp(ip) {
  const v = ip.toLowerCase().replace(/^::ffff:/, '');
  if (v.includes(':')) return v === '::1' || v === '::' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  return /^\d+\.\d+\.\d+\.\d+$/.test(v) && /^(0|10|127)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(v);
}

async function privateHost(hostname) {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || /\.(localhost|local|internal|lan|home\.arpa)$/.test(h) || privateIp(h)) return true;
  try { return (await lookup(h, { all: true })).some((r) => privateIp(r.address)); } catch { return false; }
}

// Returns { code, lines }. code follows the exit codes in HELP.
async function check({ url, expect, repo = '.', meta, allowLocal = false, timeout = 15000 }) {
  let u;
  try { u = new URL(url); } catch { return { code: 3, lines: ['error: not a valid address'] }; }
  if (!/^https?:$/.test(u.protocol)) return { code: 3, lines: ['error: only http and https addresses are read'] };
  if (u.username || u.password) return { code: 3, lines: ['error: the address carries credentials; remove them'] };
  if (!allowLocal && await privateHost(u.hostname)) return { code: 3, lines: [`error: ${u.hostname} is a local or private address; rerun with --allow-local only if the user permits it`] };
  let want;
  try { want = expect ? { id: expect, where: '--expect' } : repoCommit(repo); } catch (e) { return { code: 3, lines: [`error: ${e.message}`] }; }
  let res, html;
  try {
    res = await fetch(u, { method: 'GET', redirect: 'manual', credentials: 'omit', headers: { accept: 'text/html,*/*;q=0.5', 'user-agent': 'which-build' }, signal: AbortSignal.timeout(timeout) });
    html = res.status < 300 ? await res.text() : '';
  } catch (e) { return { code: 3, lines: [`error: request failed: ${e.name === 'TimeoutError' ? `no answer in ${timeout} ms` : (e.cause?.code || e.message)}`] }; }
  const lines = [`page:     ${u.href} (HTTP ${res.status})`, `checked:  ${new Date().toISOString()}`];
  if (res.status >= 300 && res.status < 400) return { code: 3, lines: [...lines, `error: redirects to ${res.headers.get('location') || 'an unnamed address'}; not followed. Ask the user whether that is the address to check`] };
  if (res.status >= 400) return { code: 3, lines: [...lines, `error: the page answered HTTP ${res.status}`] };
  const live = declaredBuild(html, meta);
  lines.push(`expected: ${want.id} (${want.where})`);
  if (!live) return { code: 2, lines: [...lines, 'live:     the page declares no build', 'result: UNKNOWN. Ask for the page to declare its build, for example <meta name="build-commit" content="...">'] };
  lines.push(`live:     ${live.id} (${live.how})`);
  const ok = agree(live.id, want.id);
  lines.push(ok ? 'result: MATCH' : 'result: DIFFERENT. Deploy the build under claim, or ask the user which build is live');
  return { code: ok ? 0 : 1, lines };
}

async function selftest() {
  const { createServer } = await import('node:http');
  const pages = {
    '/meta': '<html><head><meta content="9b1c4e7" name="build-commit"></head></html>',
    '/data': '<!-- <meta name="commit" content="0000000"> --><html data-build=rel-2031><body>hi</body></html>',
    '/testid': '<footer>build <span data-testid="build-sha" class="x"> 9B1C4E7A22 </span></footer>',
    '/none': '<html><script>var s = \'<meta name="commit" content="fffffff">\';</script><body>shop</body></html>',
  };
  const server = createServer((req, res) => {
    if (req.url === '/moved') { res.writeHead(302, { location: '/meta' }); return res.end(); }
    res.writeHead(pages[req.url] ? 200 : 404, { 'content-type': 'text/html' }).end(pages[req.url] || 'missing');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const at = (p) => `http://127.0.0.1:${server.address().port}${p}`;
  const code = async (o) => (await check({ allowLocal: true, timeout: 3000, ...o })).code;
  const cases = [
    ['short and long commit agree', () => agree('9b1c4e7', '9B1C4E7A22F0') && !agree('9b1c4e7', '9b1c4e8a') && !agree('9b1c', '9b1c4e7')],
    ['named builds compare exactly', () => agree('rel-2031', 'rel-2031') && !agree('rel-2031', 'rel-203')],
    ['private addresses are recognised', () => ['127.0.0.1', '10.4.0.9', '192.168.1.20', '172.20.0.3', '100.101.1.2', '::1', 'fd12::1'].every(privateIp) && !['8.8.8.8', '172.32.0.1', '2606:4700::1'].some(privateIp)],
    ['local address refused without --allow-local', async () => (await check({ url: at('/meta'), expect: '9b1c4e7' })).code === 3],
    ['meta tag matches --expect', async () => await code({ url: at('/meta'), expect: '9b1c4e7a22f0' }) === 0],
    ['different build exits 1', async () => await code({ url: at('/meta'), expect: 'aaaaaaa' }) === 1],
    ['data attribute, commented-out meta ignored', async () => await code({ url: at('/data'), expect: 'rel-2031' }) === 0],
    ['data-testid element text', async () => await code({ url: at('/testid'), expect: '9b1c4e7' }) === 0],
    ['no declaration exits 2', async () => await code({ url: at('/none'), expect: 'fffffff' }) === 2],
    ['redirect is not followed', async () => await code({ url: at('/moved'), expect: '9b1c4e7' }) === 3],
    ['HTTP 404 exits 3', async () => await code({ url: at('/gone'), expect: '9b1c4e7' }) === 3],
  ];
  let bad = 0;
  for (const [name, fn] of cases) {
    let ok = false;
    try { ok = (await fn()) === true; } catch { ok = false; }
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  }
  server.close();
  console.log(bad ? `selftest: ${bad} of ${cases.length} failed` : `selftest: ${cases.length} passed`);
  return bad ? 1 : 0;
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return console.log(HELP);
  if (argv.includes('--selftest')) process.exit(await selftest());
  const opt = {}, valued = { '--expect': 'expect', '--repo': 'repo', '--meta': 'meta', '--timeout': 'timeout' };
  const usage = (why) => { console.error(`which-build: ${why} (run with --help)`); process.exit(3); };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allow-local') opt.allowLocal = true;
    else if (valued[a]) { if (argv[i + 1] === undefined) usage(`${a} needs a value`); opt[valued[a]] = argv[++i]; }
    else if (a.startsWith('--')) usage(`unknown option ${a}`);
    else if (opt.url) usage('give one page address');
    else opt.url = a;
  }
  if (!opt.url) usage('a page address is required');
  if (opt.timeout !== undefined && !(Number(opt.timeout) > 0)) usage('--timeout must be a number of milliseconds');
  const { code, lines } = await check({ ...opt, timeout: opt.timeout ? Number(opt.timeout) : 15000 });
  (code === 3 ? console.error : console.log)(lines.join('\n'));
  process.exit(code);
}

main(process.argv.slice(2));
