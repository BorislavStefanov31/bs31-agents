#!/usr/bin/env node
// open-as-outsider.mjs: open one link the way a stranger would, with no session.
// One plain GET per hop. No cookies, no credentials, no proxy settings, nothing saved.
// Node 18+, no dependencies. Exit 0 = PASS, 1 = FAIL, 2 = could not run (bad usage).
import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const HELP = `Usage: node scripts/open-as-outsider.mjs '<address>' [options]

Opens one http(s) address as an outsider would and ends with one PASS or FAIL line.

  --expect '<phrase>'   text that only the genuine page contains (always pass one)
  --gone                takedown mode: PASS means an outsider can no longer open it
  --allow-local         permit this machine and private networks (for testing only;
                        the result then says nothing about an outsider)
  --timeout <seconds>   per hop, default 10
  --max-redirects <n>   default 5
  --selftest            run the built-in cases and exit
  --help                show this text

Quote the address so the shell acts on nothing inside it.
Exit: 0 PASS, 1 FAIL, 2 bad usage.`;

const BODY_LIMIT = 256 * 1024; // only this much of the body is read and searched
const REDIRECT = new Set([301, 302, 303, 307, 308]);

// Destinations an outsider cannot reach: this machine, private, link-local, reserved.
const inside = new BlockList();
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 3]]) inside.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [["::", 127], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]]) inside.addSubnet(net, bits, "ipv6");
const isInside = (address, family) => inside.check(address, family === 6 ? "ipv6" : "ipv4");

const usage = (message) => Object.assign(new Error(message), { usage: true });
const problem = (code) => Object.assign(new Error(code), { problem: code });

// Server text is data: control and invisible characters become "?" before display.
const clean = (text, max = 100) => String(text ?? "").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "?").slice(0, max);

// Origin and path only: a query string or fragment may carry an access token.
const show = (url) => clean(url.origin + url.pathname, 200) + (url.search || url.hash ? " [query hidden]" : "");

function parse(text) {
  let url;
  try { url = new URL(text); } catch { throw usage("refused: not a valid address"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw usage(`refused: only http and https are opened, not ${clean(url.protocol, 20)}`);
  if (url.username || url.password) throw usage("refused: the address carries credentials");
  return url;
}

// Resolve the host, refuse inside destinations, and return the one address to connect to.
async function vet(url, allowLocal) {
  let found;
  try { found = await lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true }); } catch { throw problem("unresolved"); }
  if (!found.length) throw problem("unresolved");
  if (!allowLocal && found.some((a) => isInside(a.address, a.family))) throw problem("private");
  return found[0];
}

function get(url, pin, seconds) {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(url, {
      method: "GET",
      agent: false,
      headers: { "user-agent": "link-check/1 (no session)", accept: "*/*", "accept-encoding": "identity" },
      // Connect to the address that was vetted, so a second DNS answer cannot swap it.
      lookup: (_host, options, done) => (options.all ? done(null, [pin]) : done(null, pin.address, pin.family)),
    }, (response) => {
      const chunks = [];
      const result = { status: response.statusCode, headers: response.headers, bytes: 0, cut: false };
      const finish = () => { clearTimeout(timer); result.body = Buffer.concat(chunks).toString("utf8", 0, BODY_LIMIT); resolve(result); };
      if (REDIRECT.has(result.status) && result.headers.location) { response.destroy(); return finish(); }
      response.on("data", (chunk) => {
        chunks.push(chunk);
        if ((result.bytes += chunk.length) >= BODY_LIMIT) { result.cut = true; response.destroy(); finish(); }
      });
      response.on("end", finish);
      response.on("error", broken);
    });
    const broken = (error) => { clearTimeout(timer); reject(problem(`network:${error.code || "ERROR"}`)); };
    const timer = setTimeout(() => { reject(problem("timeout")); request.destroy(); }, seconds * 1000);
    request.on("error", broken);
    request.end();
  });
}

const squash = (text) => text.toLowerCase().replace(/\s+/g, " ");
const PROBLEM = {
  unresolved: "the host does not resolve",
  private: "the host is this machine or a private network: nothing was sent, and an outsider could not reach it",
  timeout: "no answer within the time limit",
  redirects: "more redirects than the limit",
  "bad-redirect": "redirected to an address that is not plain http(s)",
};
const explain = (code) => PROBLEM[code] || `the connection failed (${clean(code.replace("network:", ""), 40)})`;

// The verdict. state: { problem, status, phrase } where phrase is true, false or null (not checked).
function judge({ problem: code, status, phrase }, gone) {
  const ok = status >= 200 && status < 300;
  if (!gone) {
    if (code) return { pass: false, reason: explain(code) };
    if (status === 401 || status === 403) return { pass: false, reason: `status ${status}: an outsider is refused or asked to sign in` };
    if (!ok) return { pass: false, reason: `status ${status}: an outsider gets an error page` };
    if (phrase === false) return { pass: false, reason: "the page answers but the expected phrase is missing: probably a login wall or an error page" };
    return { pass: true, reason: phrase ? "the expected phrase is on the page" : "status only: no phrase was given, so a login page would also pass" };
  }
  if (code === "unresolved") return { pass: true, reason: explain(code) };
  if (code) return { pass: false, reason: `inconclusive: ${explain(code)}` };
  if ([401, 403, 404, 410].includes(status)) return { pass: true, reason: `status ${status}: an outsider is refused or finds nothing` };
  if (!ok) return { pass: false, reason: `inconclusive: status ${status} is neither a refusal nor the page` };
  if (phrase === false) return { pass: true, reason: "something answers, but the expected phrase is gone" };
  return { pass: false, reason: phrase ? "the page still opens and shows the phrase" : "the address still opens; give --expect to tell the real page from a placeholder" };
}

async function check(options, print = console.log) {
  let url = parse(options.link);
  const state = { problem: null, status: 0, phrase: null };
  let final = show(url), type = "-", size = "-";
  for (let hop = 1; ; hop++) {
    print(`hop ${hop}: GET ${show(url)}`);
    let reply;
    try { reply = await get(url, await vet(url, options.allowLocal), options.timeout); } catch (error) {
      if (!error.problem) throw error;
      state.problem = error.problem;
      break;
    }
    state.status = reply.status;
    if (REDIRECT.has(reply.status) && reply.headers.location) {
      if (hop > options.maxHops) { state.problem = "redirects"; break; }
      try { url = parse(new URL(reply.headers.location, url).href); } catch { state.problem = "bad-redirect"; break; }
      print(`       ${reply.status} redirect to ${(final = show(url))}`);
      continue;
    }
    type = clean(reply.headers["content-type"] || "not stated", 80);
    size = /^\d+$/.test(reply.headers["content-length"] || "") ? `${reply.headers["content-length"]} bytes` : `${reply.bytes}${reply.cut ? "+" : ""} bytes read`;
    const packed = reply.headers["content-encoding"] && reply.headers["content-encoding"] !== "identity";
    if (options.expect) state.phrase = !packed && squash(reply.body).includes(squash(options.expect));
    if (packed && options.expect) print("note: the body arrived compressed and was not searched");
    if (reply.cut && state.phrase === false) print(`note: only the first ${BODY_LIMIT / 1024} KB of the body was searched`);
    break;
  }
  const verdict = judge(state, options.gone);
  print(`status: ${state.status || "none"}`);
  print(`final address: ${final}`);
  print(`content type: ${type}`);
  print(`size: ${size}`);
  print(`phrase: ${state.phrase === null ? "not checked" : state.phrase ? "found" : "missing"}`);
  print(`reason: ${verdict.reason}`);
  if (options.allowLocal) print("note: --allow-local was set, so this result says nothing about an outsider");
  const words = options.gone ? ["takedown is not confirmed", "an outsider can no longer open this link"] : ["do not send this link", "an outsider can open this link"];
  print(`${verdict.pass ? "PASS" : "FAIL"}: ${words[Number(verdict.pass)]}`);
  return verdict.pass;
}

function readArgs(argv) {
  const options = { link: null, expect: null, gone: false, allowLocal: false, timeout: 10, maxHops: 5 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--gone" || arg === "--allow-local") options[arg === "--gone" ? "gone" : "allowLocal"] = true;
    else if (arg === "--expect") options.expect = argv[++i];
    else if (arg === "--timeout") options.timeout = Number(argv[++i]);
    else if (arg === "--max-redirects") options.maxHops = Number(argv[++i]);
    else if (arg.startsWith("--")) throw usage(`unknown option ${clean(arg, 30)}; see --help`);
    else if (options.link === null) options.link = arg;
    else throw usage("one address at a time");
  }
  if (!options.link) throw usage("no address given; see --help");
  if (options.expect !== null && !String(options.expect ?? "").trim()) throw usage("--expect needs a phrase");
  if (!(options.timeout > 0) || !(options.maxHops >= 0)) throw usage("--timeout and --max-redirects need numbers");
  return options;
}

async function selftest() {
  const cases = [];
  const expect = (name, actual, wanted = true) => cases.push([name, actual === wanted]);
  for (const a of ["127.0.0.1", "10.4.5.6", "172.20.0.9", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "::1", "fe80::1", "fd12::7", "::ffff:127.0.0.1", "::ffff:a00:1"]) expect(`inside ${a}`, isInside(a, isIP(a)));
  for (const a of ["8.8.8.8", "2001:4860:4860::8888"]) expect(`outside ${a}`, isInside(a, isIP(a)), false);
  expect("query hidden", show(new URL("https://files.example/doc/7?key=s3cret#frag")), "https://files.example/doc/7 [query hidden]");
  expect("control characters neutralised", clean(`text${String.fromCharCode(27)}[31m${String.fromCharCode(0x202e)}evil${String.fromCharCode(13, 10)}`), "text?[31m?evil??");
  const refused = (text) => { try { parse(text); return false; } catch (error) { return error.usage === true; } };
  for (const bad of ["file:///etc/hosts", "javascript:alert(1)", "ftp://files.example/a", "https://user:pw@files.example/", "no scheme"]) expect(`refuses ${bad.split(":")[0]}`, refused(bad));
  const verdicts = [
    ["genuine page", { status: 200, phrase: true }, false, true], ["login wall answering 200", { status: 200, phrase: false }, false, false],
    ["403", { status: 403, phrase: null }, false, false], ["404", { status: 404, phrase: null }, false, false],
    ["private host", { problem: "private", status: 0 }, false, false], ["gone: 404", { status: 404, phrase: null }, true, true],
    ["gone: still shows phrase", { status: 200, phrase: true }, true, false], ["gone: phrase absent", { status: 200, phrase: false }, true, true],
    ["gone: opens, no phrase given", { status: 200, phrase: null }, true, false], ["gone: host unresolved", { problem: "unresolved", status: 0 }, true, true],
    ["gone: timeout is inconclusive", { problem: "timeout", status: 0 }, true, false], ["gone: 500 is inconclusive", { status: 500, phrase: false }, true, false],
  ];
  for (const [name, state, gone, wanted] of verdicts) expect(`verdict ${name}`, judge({ problem: null, ...state }, gone).pass, wanted);
  const lines = [];
  const base = { expect: "x", gone: false, allowLocal: false, timeout: 2, maxHops: 5 };
  expect("loopback refused, nothing sent", await check({ ...base, link: "http://127.0.0.1:9/draft?token=abc123" }, (l) => lines.push(l)), false);
  expect("loopback refused in takedown mode too", await check({ ...base, gone: true, link: "http://[::1]:9/draft" }, (l) => lines.push(l)), false);
  expect("token never printed", lines.join("\n").includes("abc123"), false);
  expect("private reason given", lines.join("\n").includes("private network"));
  const failed = cases.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) console.log(`selftest FAILED: ${failed.join("; ")}`);
  console.log(`selftest: ${cases.length - failed.length}/${cases.length} cases passed`);
  return failed.length === 0;
}

try {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) { console.log(HELP); process.exit(0); }
  if (process.env.NODE_USE_ENV_PROXY) throw usage("refused: NODE_USE_ENV_PROXY is set and the check must not travel through a proxy; unset it");
  if (argv.includes("--selftest")) process.exit((await selftest()) ? 0 : 1);
  process.exit((await check(readArgs(argv))) ? 0 : 1);
} catch (error) {
  console.error(`open-as-outsider: ${error.usage ? error.message : `unexpected failure (${clean(error.code || error.name, 40)})`}`);
  process.exit(2);
}
