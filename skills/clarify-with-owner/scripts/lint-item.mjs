#!/usr/bin/env node
// lint-item.mjs: read-only check of one clarification item folder. Node 18+, no dependencies.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_WORDS = 60;
const CLASSES = ['did', 'felt', 'other'];
const HELP = `Usage: node scripts/lint-item.mjs <item-folder>
       node scripts/lint-item.mjs --selftest

Reads one item folder, changes nothing, prints each broken rule and one status line.
  question.md, question-2.md, question-3.md
      header fields "Item:", "To:", "Anchor:", "Resume:" and a "## Message" section with
      exactly one question mark, at most ${MAX_WORDS} words, opening with the Anchor text
  reply.md
      one "## Reply N" heading per reply received; entries "- R1 | did|felt|other | words"
  requirements.md
      "## Intent", "## Acceptance", "## Boundaries"; every bullet ends with [R1] or [R1, R2]
      citing "did" entries only; one Acceptance bullet starts with "MUST NOT"
Exit 0: no broken rule. Exit 1: at least one broken rule. Exit 2: bad usage.`;

function parse(text) {
  const head = {}, sec = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1].toLowerCase(); sec[cur] = []; continue; }
    if (cur) { sec[cur].push(line); continue; }
    const f = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (f) head[f[1].toLowerCase()] = f[2].trim();
  }
  return { head, sec };
}
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const bullets = (lines = []) => lines.filter((l) => /^\s*-\s+\S/.test(l)).map((l) => l.replace(/^\s*-\s+/, '').trim());
const short = (s) => (s.length > 50 ? s.slice(0, 50) + '...' : s);

// files: { 'question.md': text, 'reply.md': text, ... }. Returns { item, errors, status }.
export function checkItem(files) {
  const errs = [];
  const qNames = Object.keys(files).filter((n) => /^question(-\d+)?\.md$/.test(n)).sort();
  let item = '';
  if (!qNames.length) errs.push('question.md: missing');
  if (qNames.length > 3) errs.push(`${qNames[3]}: only two follow-up questions are allowed`);
  for (const name of qNames) {
    const { head, sec } = parse(files[name]);
    item ||= head.item || '';
    for (const f of ['Item', 'To', 'Anchor', 'Resume']) {
      if (!head[f.toLowerCase()]) errs.push(`${name}: field "${f}:" is empty`);
    }
    const msg = (sec.message || []).join('\n').trim();
    if (!msg) { errs.push(`${name}: "## Message" section is missing or empty`); continue; }
    const marks = (msg.match(/\?/g) || []).length;
    if (marks !== 1) errs.push(`${name}: message has ${marks} question marks, must have exactly 1`);
    const words = msg.split(/\s+/).length;
    if (words > MAX_WORDS) errs.push(`${name}: message has ${words} words, the cap is ${MAX_WORDS}`);
    const anchor = norm((head.anchor || '').replace(/^["'`]|["'`]$/g, ''));
    const at = anchor ? norm(msg).indexOf(anchor) : 0;
    if (at < 0) errs.push(`${name}: message does not contain the Anchor text`);
    else if (at > 80) errs.push(`${name}: message must open with the Anchor text, it starts at character ${at}`);
  }

  const entries = new Map();
  let rounds = 0;
  if (files['reply.md'] !== undefined) {
    files['reply.md'].split(/\r?\n/).forEach((line, i) => {
      if (/^##\s+Reply\b/i.test(line)) rounds++;
      if (!/^\s*-\s/.test(line)) return;
      const m = line.match(/^\s*-\s+(R\d+)\s*\|\s*([A-Za-z]+)\s*\|\s*(\S.*)$/);
      if (!m) return errs.push(`reply.md:${i + 1}: entry is not "- R<n> | class | statement"`);
      if (entries.has(m[1])) errs.push(`reply.md:${i + 1}: identifier ${m[1]} is used twice`);
      if (!CLASSES.includes(m[2])) errs.push(`reply.md:${i + 1}: class "${m[2]}" is not one of ${CLASSES.join(', ')}`);
      entries.set(m[1], m[2]);
    });
    if (!entries.size) errs.push('reply.md: no entries');
    if (!rounds) errs.push('reply.md: no "## Reply N" heading');
  }

  const dids = [...entries.values()].filter((c) => c === 'did').length;
  const req = files['requirements.md'];
  if (req !== undefined) {
    if (!dids) errs.push('requirements.md: must not exist while reply.md has no "did" entry');
    const { sec } = parse(req);
    for (const part of ['Intent', 'Acceptance', 'Boundaries']) {
      const lines = bullets(sec[part.toLowerCase()]);
      if (!lines.length) errs.push(`requirements.md: "## ${part}" has no bullet`);
      for (const b of lines) {
        const c = b.match(/\[(R\d+(?:\s*,\s*R\d+)*)\]\s*$/);
        if (!c) { errs.push(`requirements.md: no [R..] citation at the end of "${short(b)}"`); continue; }
        for (const id of c[1].split(/\s*,\s*/)) {
          if (!entries.has(id)) errs.push(`requirements.md: "${short(b)}" cites ${id}, which is not in reply.md`);
          else if (entries.get(id) !== 'did') errs.push(`requirements.md: "${short(b)}" cites ${id}, which is classed "${entries.get(id)}"; cite "did" entries only`);
        }
      }
    }
    if (!bullets(sec.acceptance).some((b) => /^must not\b/i.test(b))) {
      errs.push('requirements.md: no Acceptance bullet starts with "MUST NOT"');
    }
  }

  const q = qNames.length;
  let status;
  if (errs.length) status = `${errs.length} broken rule(s), fix and rerun`;
  else if (rounds < q) status = `waiting for the reply to ${qNames[q - 1]} (send it only if the user says so)`;
  else if (dids && req !== undefined) status = `requirements ready, built on ${dids} past-action ${dids === 1 ? 'entry' : 'entries'}`;
  else if (dids) status = `${dids} past-action ${dids === 1 ? 'entry' : 'entries'}, write requirements.md`;
  else if (q >= 3) status = 'still open after two follow-ups, report it to the user';
  else status = `no past-action entry, draft question-${q + 1}.md`;
  return { item, errors: errs, status };
}

function selftest() {
  const question = 'Item: SUP-88\nTo: the support lead named in SUP-88\nAnchor: SUP-88\nResume: paste the reply, rerun the skill\n\n## Message\nSUP-88 says refunds over 200 need a second approver. When did you last process one, and what did you do step by step?\n';
  const reply = '## Reply 1\n- R1 | did | "On Monday I refunded 240 and had to message a colleague for the code."\n- R2 | felt | "The refund screen is great."\n- R3 | other | "We will need bulk refunds soon."\n';
  const reqs = '## Intent\n- Approver is asked inside the refund screen. [R1]\n## Acceptance\n- MUST show an approval request for refunds over 200. [R1]\n- MUST NOT issue the refund before approval. [R1]\n## Boundaries\n- Refunds of 200 or less stay unchanged. [R1]\n';
  const cases = [
    ['complete item passes', { 'question.md': question, 'reply.md': reply, 'requirements.md': reqs }, null, /requirements ready/],
    ['question alone waits', { 'question.md': question }, null, /waiting for the reply/],
    ['two question marks', { 'question.md': question.replace('one,', 'one?') }, /2 question marks/],
    ['anchor missing from message', { 'question.md': question.replace('## Message\nSUP-88', '## Message\nThe ticket') }, /Anchor text/],
    ['over the word cap', { 'question.md': question.replace('step by step', 'step '.repeat(70)) }, /the cap is/],
    ['duplicate identifier', { 'question.md': question, 'reply.md': reply.replace('R2', 'R1') }, /used twice/],
    ['unknown class', { 'question.md': question, 'reply.md': reply.replace('felt', 'wish') }, /is not one of/],
    ['cites praise', { 'question.md': question, 'reply.md': reply, 'requirements.md': reqs.replace('unchanged. [R1]', 'unchanged. [R2]') }, /cite "did" entries only/],
    ['uncited line', { 'question.md': question, 'reply.md': reply, 'requirements.md': reqs.replace('screen. [R1]', 'screen.') }, /no \[R\.\.\] citation/],
    ['no negative criterion', { 'question.md': question, 'reply.md': reply, 'requirements.md': reqs.replace('MUST NOT issue', 'MUST delay') }, /MUST NOT/],
    ['no past action asks for follow-up', { 'question.md': question, 'reply.md': reply.replace('| did |', '| other |') }, null, /draft question-2\.md/],
    ['requirements without past action', { 'question.md': question, 'reply.md': reply.replace('| did |', '| other |'), 'requirements.md': reqs }, /must not exist/],
  ];
  let failed = 0;
  for (const [name, files, wantErr, wantStatus] of cases) {
    const r = checkItem(files);
    const ok = wantErr ? r.errors.some((e) => wantErr.test(e)) : r.errors.length === 0 && wantStatus.test(r.status);
    if (!ok) failed++;
    console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`);
  }
  console.log(failed ? `selftest: ${failed} of ${cases.length} cases failed` : `selftest: ${cases.length} cases passed`);
  process.exit(failed ? 1 : 0);
}

function main(args) {
  if (args.includes('--help') || args.includes('-h')) return console.log(HELP);
  if (args.includes('--selftest')) return selftest();
  if (args.length !== 1) { console.error('lint-item: give exactly one item folder (see --help)'); process.exit(2); }
  const dir = resolve(args[0]);
  if (!existsSync(dir)) { console.error(`lint-item: no such folder: ${args[0]}`); process.exit(2); }
  const files = {};
  for (const name of readdirSync(dir)) {
    if (/^(question(-\d+)?|reply|requirements)\.md$/.test(name)) files[name] = readFileSync(join(dir, name), 'utf8');
  }
  const r = checkItem(files);
  for (const e of r.errors) console.log(e);
  console.log(`${r.item || basename(dir)}: ${r.status}`);
  process.exit(r.errors.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
