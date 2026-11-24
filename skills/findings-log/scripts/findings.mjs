#!/usr/bin/env node
// findings.mjs: helper for a findings log. Node 18+, no dependencies. Runs and installs nothing:
// "commands" only looks names up on the search path, "check" only reads the log.
import { readFileSync, writeFileSync, existsSync, statSync, accessSync, constants } from 'node:fs';
import { join, delimiter, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const HELP = `Usage: node scripts/findings.mjs commands <name>... [--write] [--file FINDINGS.md]
       node scripts/findings.mjs check [--file FINDINGS.md]
       node scripts/findings.mjs --selftest

commands  Looks each name up on the search path without running it and prints found or
          not found. With --write it replaces the commands section of the log with exactly
          this list, so name every command the work needs each time. Exit 1 if any is missing.
check     Prints, with line numbers, each entry that lacks Fact, Source or a valid Known value
          (executed, read, told), each executed entry without an output block, each stamped
          entry, each unlabelled block, and each line that looks like a credential.
          Exit 1 if anything is printed.
Exit 2: bad usage. The default file is FINDINGS.md in the current folder.`;

const START = '<!-- commands:start (written by scripts/findings.mjs: rerun it, do not edit) -->';
const END = '<!-- commands:end -->';
const KNOWN = ['executed', 'read', 'told'];
const SECRET = [
  /(pass(word|wd)?|secret|token|api[_-]?key|credential)s?["']?\s*[:=]\s*["']?(?!\[removed)\S{8,}/i,
  /\b(AKIA|ASIA)[0-9A-Z]{16}\b/, /\b(gh[pousr]_|github_pat_|sk-|xox[abprs]-)[A-Za-z0-9_-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}/, /:\/\/[^\s\/:@]+:[^\s\/@]{6,}@/,
];

// Returns the full path of an executable on the search path, or null. Never runs it.
export function lookup(name, pathVar = process.env.PATH || '') {
  const exts = process.platform === 'win32' ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')] : [''];
  for (const dir of pathVar.split(delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const p = join(dir, name + ext);
      try { if (statSync(p).isFile()) { accessSync(p, constants.X_OK); return p; } } catch { /* not here */ }
    }
  }
  return null;
}

export function commandsBlock(names, pathVar) {
  const home = homedir();
  const rows = [...new Set(names)].sort().map((n) => {
    const p = lookup(n, pathVar);
    return { name: n, found: !!p, line: `- ${n}: ${p ? `found at ${p.startsWith(home) ? '~' + p.slice(home.length) : p}` : 'not found'}` };
  });
  const body = ['## Commands on this machine', '', 'Looked up on the search path, not run. Found does not mean it works or has the flags you need.', '', ...rows.map((r) => r.line)];
  return { block: [START, ...body, END].join('\n'), rows };
}

export function replaceSection(text, block) {
  const a = text.indexOf(START.slice(0, 20)), b = text.indexOf(END);
  if (a >= 0 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
  if (!text.trim()) return `# Findings\n\n${block}\n\n## Entries\n`;
  const title = text.match(/^# .*\n/);
  return title ? `${title[0]}\n${block}\n${text.slice(title[0].length)}` : `${block}\n\n${text}`;
}

// Returns problems as "line N: ..." strings. Never includes the content of a suspect line.
export function checkEntries(text) {
  const out = [], seen = new Set();
  let cur = null, fence = false;
  const close = () => {
    if (!cur) return;
    for (const f of ['Fact', 'Source']) if (!cur[f.toLowerCase()]) out.push(`line ${cur.line}: ${cur.id} has no ${f}`);
    if (!KNOWN.includes(cur.known)) out.push(`line ${cur.line}: ${cur.id} needs "Known:" set to one of ${KNOWN.join(', ')}`);
    else if (cur.known === 'executed' && !cur.block) out.push(`line ${cur.line}: ${cur.id} is marked executed but has no "output:" block copied from the tool result`);
    if (cur.source && !/^(user\b|command:\s*\S)/i.test(cur.source) && !/:\d+|@\d+:\d\d/.test(cur.source)) out.push(`line ${cur.line}: ${cur.id} Source has no position (path:LINE or path@MM:SS) and is not "user" or "command: ..."`);
    cur = null;
  };
  text.split(/\r?\n/).forEach((line, i) => {
    const n = i + 1;
    if (SECRET.some((re) => re.test(line))) out.push(`line ${n}: looks like a credential; replace the value with [removed: credential]`);
    if (/^\s*(```|~~~)/.test(line)) {
      if (!fence && cur) { cur.block = true; if (!/^\s*(```|~~~)output:\s*\S/.test(line)) out.push(`line ${n}: block in ${cur.id} is not labelled "output: <command or origin>"`); }
      fence = !fence;
      return;
    }
    if (fence) return;
    const head = line.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (head) {
      close();
      const id = head[1] === '###' && head[2].match(/^F\d+$/);
      if (id) { if (seen.has(id[0])) out.push(`line ${n}: ${id[0]} is used twice`); seen.add(id[0]); cur = { id: id[0], line: n }; }
      return;
    }
    if (!cur || !line.trim() || line.startsWith('<!-- commands:')) return;
    const f = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (!f) return out.push(`line ${n}: loose text in ${cur.id}; put it in Fact, or give it its own entry with a source`);
    const key = f[1].toLowerCase();
    if (/^(date|time|written|added|updated|timestamp|when)$/.test(key)) out.push(`line ${n}: ${cur.id} is stamped with "${f[1]}:"; remove it, a stamp is not proof of freshness`);
    else if (['fact', 'source', 'known'].includes(key)) cur[key] = key === 'known' ? f[2].trim().toLowerCase() : f[2].trim();
    else out.push(`line ${n}: ${cur.id} has an unknown field "${f[1]}:"`);
  });
  close();
  return out;
}

function selftest() {
  const tick = '```';
  const good = `# Findings\n\n## Entries\n\n### F1\nFact: The importer skips rows with an empty sku column.\nSource: src/import.py:88\nKnown: read\n\n### F2\nFact: The importer test suite has 2 failing tests.\nSource: command: pytest tests/importer\nKnown: executed\n\n${tick}output: pytest tests/importer\n2 failed, 14 passed\nDate: this line is output, not a field\n${tick}\n\n### F3\nFact: Staging data is refreshed by hand.\nSource: user\nKnown: told\n\n### F4\nFact: The deadline moved by a week.\nSource: calls/kickoff.m4a@12:40\nKnown: read\n`;
  const fakeSecret = 'pass' + 'word: ' + 'correct-horse-9';
  const cases = [
    ['well-formed log passes', good, null],
    ['entry without a source', good.replace('Source: src/import.py:88\n', ''), /F1 has no Source/],
    ['source without a position', good.replace('src/import.py:88', 'src/import.py'), /no position/],
    ['invalid how-known value', good.replace('Known: told', 'Known: probably'), /F3 needs "Known:"/],
    ['executed without output', good.replace(/```output[\s\S]*?```\n/, ''), /F2 is marked executed/],
    ['unlabelled block', good.replace('```output: pytest tests/importer', '```'), /not labelled/],
    ['stamped entry', good.replace('Known: read\n\n### F2', 'Known: read\nDate: 2031-01-05\n\n### F2'), /stamped/],
    ['loose note', good.replace('Known: told', 'Known: told\nAlso the cache is probably stale.'), /loose text in F3/],
    ['duplicate id', good.replace('### F3', '### F1'), /F1 is used twice/],
    ['credential-like line', good.replace('Fact: Staging data', `Fact: staging ${fakeSecret} and data`), /line \d+: looks like a credential/],
  ];
  let failed = 0;
  const report = (ok, name) => { if (!ok) failed++; console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`); };
  for (const [name, text, want] of cases) {
    const got = checkEntries(text);
    report(want ? got.some((p) => want.test(p)) && !got.some((p) => p.includes('correct-horse')) : got.length === 0, name);
  }
  const nodeDir = dirname(process.execPath);
  const { block, rows } = commandsBlock(['node', 'no-such-command-zz9'], nodeDir);
  report(rows.find((r) => r.name === 'node').found && !rows.find((r) => r.name === 'no-such-command-zz9').found, 'lookup finds node and misses a made-up name');
  const once = replaceSection(good, block), twice = replaceSection(once, commandsBlock(['node'], nodeDir).block);
  report(once.includes('### F4') && twice.includes('### F4') && !twice.includes('no-such-command') && twice.split(START).length === 2, 'commands section is replaced, entries are kept');
  report(checkEntries(twice).length === 0 && replaceSection('', block).includes('## Entries'), 'log with a commands section still passes; empty log gets a skeleton');
  console.log(failed ? `selftest: ${failed} cases failed` : `selftest: ${cases.length + 3} cases passed`);
  process.exit(failed ? 1 : 0);
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h') || !argv.length) return console.log(HELP);
  if (argv.includes('--selftest')) return selftest();
  const stop = (why) => { console.error(`findings: ${why}`); process.exit(2); };
  const at = argv.indexOf('--file');
  const file = resolve(at < 0 ? 'FINDINGS.md' : argv[at + 1] || stop('--file needs a path'));
  const rest = argv.filter((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
  const mode = rest.shift();
  if (mode === 'check') {
    if (!existsSync(file)) stop(`no findings file at ${file}`);
    const problems = checkEntries(readFileSync(file, 'utf8'));
    for (const p of problems) console.log(p);
    console.log(problems.length ? `findings: ${problems.length} problem(s); fix them or remove the entry` : 'findings: every entry has a fact, a source and a valid Known value');
    process.exit(problems.length ? 1 : 0);
  }
  if (mode !== 'commands') stop('first argument must be "commands" or "check" (see --help)');
  if (!rest.length) stop('name at least one command');
  const odd = rest.find((n) => !/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(n));
  if (odd !== undefined) stop('command names are plain names such as jq, not paths or options');
  const { block, rows } = commandsBlock(rest);
  for (const r of rows) console.log(r.line.slice(2));
  if (argv.includes('--write')) {
    writeFileSync(file, replaceSection(existsSync(file) ? readFileSync(file, 'utf8') : '', block));
    console.log(`findings: commands section written to ${file}`);
  }
  const missing = rows.filter((r) => !r.found).map((r) => r.name);
  if (missing.length) { console.error(`findings: not found: ${missing.join(', ')}; do not promise or plan around them, and install nothing without consent`); process.exit(1); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
