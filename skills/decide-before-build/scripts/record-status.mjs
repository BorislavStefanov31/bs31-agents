#!/usr/bin/env node
// record-status.mjs: read-only check of decision records. Node 18+, no dependencies.
// It checks shape and consistency. It cannot prove who wrote a sign-off: verify that at the Reference.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP = `Usage: node scripts/record-status.mjs <record.md>     check one record
       node scripts/record-status.mjs <folder>        list every .md record in a folder
       node scripts/record-status.mjs --selftest

One record: prints each problem. Exit 0 when the record is a well-formed "proposed" or
"accepted" record, exit 1 otherwise.
  proposed: every part filled, 3+ options with Kind as-requested, reduced and nothing,
            each with Build, Cost if wrong and Undo; Quote, Chosen and Signed still "-"
  accepted: the same, plus Quote and Reference filled, Chosen is an existing option number
            that the Quote contains, Signed equals Owner
A folder: one line per record: BINDING, NOT BINDING (with the reason) or NEEDS HUMAN READ.
Exit 1 if any record needs a human read. Exit 2: bad usage.
See record-template.md for the layout.`;

const KINDS = ['as-requested', 'reduced', 'nothing', 'other'];
const blank = (v) => !v || /^(-|none|n\/a|tbd|todo|<.*>)$/i.test(v.trim());
const who = (v) => (v || '').trim().replace(/^@/, '').toLowerCase();
const FIELD = /^([A-Za-z][A-Za-z ]*):\s*(.*)$/;

function parse(text) {
  const head = {}, sec = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1].toLowerCase(); sec[cur] = []; continue; }
    if (cur) { sec[cur].push(line); continue; }
    const f = line.match(FIELD);
    if (f) head[f[1].toLowerCase()] = f[2].trim();
  }
  return { head, sec };
}
function fieldsOf(lines = []) {
  const out = {};
  for (const line of lines) { const f = line.match(FIELD); if (f) out[f[1].toLowerCase()] = f[2].trim(); }
  return out;
}
function optionsOf(lines = []) {
  const out = [];
  let from = 0;
  lines.forEach((line, i) => {
    const h = line.match(/^###\s+(\d+)[.)]?\s*(.*)$/);
    if (!h) return;
    if (out.length) out.at(-1).f = fieldsOf(lines.slice(from, i));
    out.push({ n: h[1], title: h[2], f: {} });
    from = i + 1;
  });
  if (out.length) out.at(-1).f = fieldsOf(lines.slice(from));
  return out;
}

// Returns { shape, status, owner, chosen, supersedes, errors }. shape false: not this layout, a person must read it.
export function checkRecord(text) {
  const { head, sec } = parse(text);
  const status = (head.status || '').toLowerCase();
  if (!sec.options || !sec.answer || !['proposed', 'accepted'].includes(status)) {
    return { shape: false, errors: ['not in the expected layout (needs "Status: proposed|accepted", "## Options", "## Answer")'] };
  }
  const e = [];
  for (const f of ['Change', 'Requester', 'Owner', 'Request', 'Date']) if (blank(head[f.toLowerCase()])) e.push(`"${f}:" is empty`);
  if (/\[bot\]$|^(the )?(agent|bot|assistant|ai)$/i.test(who(head.owner))) e.push('Owner must be a person, not an agent or a bot');

  const ev = (sec.evidence || []).filter((l) => /^\s*-\s+\S/.test(l)).map((l) => l.replace(/^\s*-\s+/, '').trim());
  if (!ev.length) e.push('Evidence: empty (write "- none found" if there is none)');
  else if (!(ev.length === 1 && /^none found\b/i.test(ev[0]))) {
    ev.forEach((l, i) => { if (!/^\[(observed|praise|assertion)\]\s+\S+:\d+\s+\S/.test(l)) e.push(`Evidence line ${i + 1}: must be "[observed|praise|assertion] path:line what it shows"`); });
  }

  const opts = optionsOf(sec.options);
  if (opts.length < 3) e.push(`Options: ${opts.length} found, at least 3 are required`);
  for (const kind of ['as-requested', 'reduced', 'nothing']) if (!opts.some((o) => o.f.kind === kind)) e.push(`Options: none has "Kind: ${kind}"`);
  for (const o of opts) {
    if (!KINDS.includes(o.f.kind)) e.push(`Option ${o.n}: Kind must be one of ${KINDS.join(', ')}`);
    for (const f of ['Build', 'Cost if wrong', 'Undo']) if (blank(o.f[f.toLowerCase()]) && !(f === 'Build' && o.f.kind === 'nothing')) e.push(`Option ${o.n}: "${f}:" is empty`);
    if (o.f.kind !== 'nothing' && blank(o.f.measure)) e.push(`Option ${o.n}: "Measure:" is empty (how success will be seen)`);
  }
  for (const s of ['Recommendation', 'Revisit when']) if (blank((sec[s.toLowerCase()] || []).join(' ').trim())) e.push(`"## ${s}" is empty`);

  const a = fieldsOf(sec.answer);
  if (status === 'proposed') {
    for (const f of ['quote', 'chosen', 'signed']) if (!blank(a[f])) e.push(`a proposed record must not have "${f[0].toUpperCase() + f.slice(1)}:" filled`);
  } else {
    if (blank(a.quote)) e.push('accepted, but "Quote:" (the owner\'s own words) is empty');
    if (blank(a.reference)) e.push('accepted, but "Reference:" (where the answer is) is empty');
    if (!opts.some((o) => o.n === a.chosen)) e.push(`"Chosen: ${a.chosen || ''}" is not an option number`);
    else if (!new RegExp(`(^|[^0-9])${a.chosen}([^0-9]|$)`).test(a.quote || '')) e.push(`the quoted answer does not contain option number ${a.chosen}`);
    if (blank(a.signed) || who(a.signed) !== who(head.owner)) e.push('"Signed:" must equal "Owner:"');
  }
  return { shape: true, status, owner: head.owner, chosen: a.chosen, reference: a.reference, supersedes: blank(head.supersedes) ? '' : head.supersedes, errors: e };
}

// records: { 'file.md': text }. Returns one verdict line per file.
export function classify(records) {
  const checked = Object.entries(records).map(([name, text]) => ({ name, ...checkRecord(text) }));
  const binding = (r) => r.shape && r.status === 'accepted' && !r.errors.length;
  return checked.map((r) => {
    if (!r.shape) return `NEEDS HUMAN READ  ${r.name}: ${r.errors[0]}`;
    const newer = checked.find((o) => o !== r && binding(o) && o.supersedes && r.name.startsWith(o.supersedes));
    if (newer) return `NOT BINDING       ${r.name}: replaced by ${newer.name}`;
    if (binding(r)) return `BINDING           ${r.name}: option ${r.chosen}, signed ${r.owner}, answer at ${r.reference}`;
    if (r.status === 'proposed' && !r.errors.length) return `NOT BINDING       ${r.name}: proposed, waiting for ${r.owner}`;
    return `NOT BINDING       ${r.name}: ${r.errors.length} problem(s), first: ${r.errors[0]}`;
  });
}

function selftest() {
  const opt = (n, kind) => `### ${n}. Option ${n}\nKind: ${kind}\nBuild: ${kind === 'nothing' ? 'nothing' : 'a thing'}\nCost if wrong: support answers more mail\nUndo: remove the flag\n${kind === 'nothing' ? '' : 'Measure: fewer than 5 tickets a month\n'}`;
  const rec = (status, answer, extra = '') => `# Dark mode\nChange: add dark mode\nRequester: support desk\nOwner: @product-owner\nRequest: issue 9\nDate: 2031-02-03\nStatus: ${status}\n${extra}\n## Evidence\n- [assertion] notes/calls.md:14 two customers asked\n\n## Options\n${opt(1, 'as-requested')}${opt(2, 'reduced')}${opt(3, 'nothing')}\n## Recommendation\nOption 2.\n\n## Revisit when\nTen more requests arrive.\n\n## Answer\n${answer}\n`;
  const open = 'Quote: -\nReference: -\nChosen: -\nSigned: -';
  const signed = 'Quote: "2, go ahead"\nReference: issue 9, comment 4\nChosen: 2\nSigned: @product-owner';
  const one = [
    ['proposed record passes', rec('proposed', open), null],
    ['accepted record passes', rec('accepted', signed), null],
    ['proposed with a choice', rec('proposed', signed), /proposed record must not/],
    ['signed by someone else', rec('accepted', signed.replace('Signed: @product-owner', 'Signed: @someone-else')), /must equal "Owner:"/],
    ['answer names another option', rec('accepted', signed.replace('Chosen: 2', 'Chosen: 3')), /does not contain option number 3/],
    ['chosen option missing', rec('accepted', signed.replace('Chosen: 2', 'Chosen: 7')), /not an option number/],
    ['no do-nothing option', rec('proposed', open).replace('Kind: nothing', 'Kind: other'), /Kind: nothing/],
    ['two options', rec('proposed', open).replace(opt(2, 'reduced'), ''), /at least 3/],
    ['option without undo', rec('proposed', open).replace('Undo: remove the flag', 'Undo: -'), /"Undo:" is empty/],
    ['bot as owner', rec('proposed', open).replace('Owner: @product-owner', 'Owner: release[bot]'), /not an agent or a bot/],
  ];
  let failed = 0;
  const report = (ok, name) => { if (!ok) failed++; console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`); };
  for (const [name, text, want] of one) {
    const r = checkRecord(text);
    report(want ? r.errors.some((x) => want.test(x)) : r.shape && r.errors.length === 0, name);
  }
  const lines = classify({
    '0003-dark-mode.md': rec('accepted', signed),
    '0005-dark-mode-again.md': rec('accepted', signed, 'Supersedes: 0003'),
    '0006-export.md': rec('proposed', open),
    'old-adr.md': '# We chose Postgres\nDecided in 2029.\n',
  });
  report(/^NOT BINDING.*replaced by 0005/.test(lines[0]), 'replaced record does not bind');
  report(/^BINDING/.test(lines[1]), 'replacement binds');
  report(/^NOT BINDING.*proposed/.test(lines[2]), 'proposed record does not bind');
  report(/^NEEDS HUMAN READ/.test(lines[3]), 'unfamiliar layout needs a human read');
  console.log(failed ? `selftest: ${failed} cases failed` : `selftest: ${one.length + 4} cases passed`);
  process.exit(failed ? 1 : 0);
}

function main(args) {
  if (args.includes('--help') || args.includes('-h')) return console.log(HELP);
  if (args.includes('--selftest')) return selftest();
  if (args.length !== 1) { console.error('record-status: give one record file or one folder (see --help)'); process.exit(2); }
  const target = resolve(args[0]);
  let stat;
  try { stat = statSync(target); } catch { console.error(`record-status: cannot read ${args[0]}`); process.exit(2); }
  if (stat.isDirectory()) {
    const records = {};
    for (const name of readdirSync(target).sort()) if (name.endsWith('.md')) records[name] = readFileSync(join(target, name), 'utf8');
    const lines = classify(records);
    console.log(lines.length ? lines.join('\n') : 'no .md records in this folder');
    console.log('Sign-offs are not proven here: before relying on a BINDING record, confirm the author at its Reference.');
    process.exit(lines.some((l) => l.startsWith('NEEDS HUMAN READ')) ? 1 : 0);
  }
  const r = checkRecord(readFileSync(target, 'utf8'));
  for (const x of r.errors) console.log(`${basename(target)}: ${x}`);
  if (r.errors.length) { console.log(`${basename(target)}: ${r.shape ? `${r.errors.length} problem(s), not binding` : 'needs a human read'}`); process.exit(1); }
  console.log(r.status === 'proposed'
    ? `${basename(target)}: ok, proposed, waiting for ${r.owner}; build nothing yet`
    : `${basename(target)}: ok, accepted, option ${r.chosen}, signed ${r.owner}; confirm the author at: ${r.reference}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
