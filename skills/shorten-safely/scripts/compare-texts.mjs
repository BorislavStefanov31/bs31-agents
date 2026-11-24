#!/usr/bin/env node
// compare-texts.mjs: check a shortened text against its source.
// Measures length, verifies protected passages character for character, and
// lists sentences that were removed or newly worded. No network, no writes.
import { readFileSync } from 'node:fs';

const HELP = `Usage:
  node compare-texts.mjs --source <file> --short <file> [--protected <file>]
                         [--max-chars <n> | --max-words <n>]
  node compare-texts.mjs --selftest

Checks
  length     A character is one Unicode code point; a word is any run without white
             characters. A leading BOM and line breaks at the very end of a
             file are not counted.
  protected  Each passage must occur in the short file, and in the source,
             with every character identical. On a mismatch the earliest
             differing character is shown with its code point.
  sentences  Source sentences missing from the short file, and short-file
             sentences missing from the source (whitespace collapsed first).
             A reworded sentence appears in both lists.

Protected file: one passage, or several separated by a line holding only %%%
Exit: 0 limit holds and every passage intact, 1 a check failed, 2 usage or file error`;

const NAMES = {
  0x9: 'TAB', 0xa: 'LINE FEED', 0xd: 'CARRIAGE RETURN', 0x20: 'SPACE', 0x22: 'STRAIGHT DOUBLE QUOTE',
  0x27: 'STRAIGHT APOSTROPHE', 0x2d: 'HYPHEN-MINUS', 0xa0: 'NO-BREAK SPACE', 0x2009: 'THIN SPACE',
  0x200b: 'ZERO WIDTH SPACE', 0x2011: 'NON-BREAKING HYPHEN', 0x2013: 'EN DASH', 0x2014: 'EM DASH',
  0x2018: 'LEFT SINGLE QUOTE', 0x2019: 'RIGHT SINGLE QUOTE', 0x201c: 'LEFT DOUBLE QUOTE',
  0x201d: 'RIGHT DOUBLE QUOTE', 0x2026: 'ELLIPSIS', 0x202f: 'NARROW NO-BREAK SPACE',
};

const clean = (t) => t.replace(/^﻿/, '').replace(/[\r\n]+$/, '');
const countChars = (t) => [...t].length;
const countWords = (t) => t.split(/\s+/).filter(Boolean).length;
const squash = (t) => t.replace(/\s+/g, ' ').trim();
const splitPassages = (t) => clean(t).split(/^%%%[ \t]*\r?$/m).map((p) => p.replace(/^[\r\n]+|[\r\n]+$/g, ''));

function describe(ch) {
  if (ch === undefined) return 'end of text';
  const cp = ch.codePointAt(0);
  const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
  return `${JSON.stringify(ch)} ${hex}${NAMES[cp] ? ' ' + NAMES[cp] : ''}`;
}

// Sentences: one per line, then split after . ! ? or an ellipsis when white space follows.
function sentences(t) {
  return t.split(/\r?\n/)
    .flatMap((line) => line.replace(/^\s*(?:[-*•]|#+|\d+[.)])\s+/, '').split(/(?<=[.!?…]["'”’)\]]*)\s+/))
    .map(squash)
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

function missingFrom(a, b) {
  const hay = squash(b);
  return [...new Set(sentences(a))].filter((s) => !hay.includes(s));
}

// null when the passage occurs exactly; otherwise the earliest differing
// character at the place in the text that matches the passage for longest.
function locate(passage, text) {
  if (text.includes(passage)) return null;
  const p = [...passage], t = [...text];
  let best = { run: -1, at: 0, pos: 0 };
  for (let i = 0; i < t.length; i++) {
    let k = 0;
    while (k < p.length && t[i + k] === p[k]) k++;
    let at = k, run = k;
    if (k === 0) { // the first character itself may be the altered one
      let j = 1;
      while (j < p.length && t[i + j] === p[j]) j++;
      at = 0; run = j - 1;
    }
    if (run > best.run) best = { run, at, pos: i };
  }
  return {
    at: best.at + 1, matched: Math.max(best.run, 0), total: p.length,
    expected: describe(p[best.at]), found: describe(t[best.pos + best.at]),
    after: p.slice(Math.max(0, best.at - 30), best.at).join(''),
  };
}

function compare({ source, short, passages = [], maxChars = null, maxWords = null }) {
  const chars = countChars(short), words = countWords(short);
  const limit = maxChars != null ? { unit: 'characters', max: maxChars, got: chars }
    : maxWords != null ? { unit: 'words', max: maxWords, got: words } : null;
  const failures = [];
  if (limit && limit.got > limit.max) failures.push(`over the limit by ${limit.got - limit.max} ${limit.unit}`);
  const prot = passages.map((p, i) => {
    const r = { length: countChars(p), inShort: locate(p, short), inSource: locate(p, source) };
    if (!p) failures.push(`protected passage ${i + 1} is empty`);
    else if (r.inSource) failures.push(`protected passage ${i + 1} is not an exact copy from the source`);
    if (p && r.inShort) failures.push(`protected passage ${i + 1} is altered or missing in the short version`);
    return r;
  });
  return { chars, words, limit, prot, removed: missingFrom(source, short), added: missingFrom(short, source), failures };
}

function report(r) {
  const out = [];
  const margin = r.limit ? r.limit.max - r.limit.got : null;
  out.push(`length: ${r.chars} characters, ${r.words} words` + (r.limit
    ? `; limit ${r.limit.max} ${r.limit.unit}, margin ${margin >= 0 ? '+' : ''}${margin}: ${margin >= 0 ? 'OK' : 'OVER'}`
    : '; no limit given'));
  r.prot.forEach((p, i) => {
    for (const [where, miss] of [['short version', p.inShort], ['source', p.inSource]]) {
      if (!miss) { out.push(`protected ${i + 1}/${r.prot.length} in ${where}: INTACT (${p.length} characters)`); continue; }
      out.push(`protected ${i + 1}/${r.prot.length} in ${where}: MISMATCH at character ${miss.at} of the passage (closest place matches ${miss.matched} of ${miss.total})`);
      out.push(`    expected ${miss.expected}`, `    found    ${miss.found}`, `    after    ${JSON.stringify(miss.after)}`);
    }
  });
  out.push(`removed from the source (${r.removed.length}):`, ...r.removed.map((s) => `  - ${s}`));
  out.push(`new in the short version (${r.added.length}):`, ...r.added.map((s) => `  + ${s}`));
  out.push(r.failures.length ? `result: FAIL (${r.failures.join('; ')})` : 'result: PASS');
  return out.join('\n');
}

function selftest() {
  const src = 'Rent is due on the 1st. We don’t accept cash. Call 555-0100 before noon. The lobby is being repainted in May.';
  const keep = 'We don’t accept cash.';
  const cases = [
    ['code points and words', () => countChars('naïve café \u{1F44D}') === 12 && countWords(' naïve  café\n\u{1F44D} ') === 3],
    ['trailing line breaks and BOM are not counted', () => countChars(clean('﻿abc\r\n\n')) === 3],
    ['intact passage inside the limit passes', () => {
      const r = compare({ source: src, short: 'Rent is due on the 1st. We don’t accept cash.', passages: [keep], maxChars: 60 });
      return r.failures.length === 0 && r.removed.length === 2 && r.added.length === 0;
    }],
    ['look-alike apostrophe is found at its position', () => {
      const m = compare({ source: src, short: 'Rent due on the 1st. We don\'t accept cash.', passages: [keep] }).prot[0].inShort;
      return m.at === 7 && m.expected.includes('U+2019') && m.found.includes('U+0027');
    }],
    ['altered first character is found', () => {
      const m = locate('“No refunds” applies.', 'Note: "No refunds” applies.');
      return m.at === 1 && m.expected.includes('U+201C') && m.found.includes('U+0022');
    }],
    ['over the limit fails with the excess', () => compare({ source: src, short: 'one two three four', maxWords: 3 }).failures[0] === 'over the limit by 1 words'],
    ['reworded sentence is listed as removed and as new', () => {
      const r = compare({ source: src, short: 'Rent is due on the 1st. Phone before noon.' });
      return r.added.join() === 'Phone before noon.' && r.removed.includes('Call 555-0100 before noon.');
    }],
    ['passage that is not in the source fails', () => compare({ source: src, short: 'We do not accept cash.', passages: ['We do not accept cash.'] }).failures.length === 1],
    ['separator line splits passages', () => splitPassages('first one\n%%%\nsecond\nline\n').join('|') === 'first one|second\nline'],
  ];
  let bad = 0;
  for (const [name, fn] of cases) {
    let ok = false;
    try { ok = fn() === true; } catch { ok = false; }
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  }
  console.log(bad ? `selftest: ${bad} of ${cases.length} failed` : `selftest: ${cases.length} passed`);
  process.exit(bad ? 1 : 0);
}

function usage(reason) {
  console.error(`compare-texts: ${reason} (run with --help)`);
  process.exit(2);
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return console.log(HELP);
  if (argv.includes('--selftest')) return selftest();
  const opt = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = { '--source': 'source', '--short': 'short', '--protected': 'protected', '--max-chars': 'maxChars', '--max-words': 'maxWords' }[argv[i]];
    if (!key) usage(`unknown argument ${argv[i]}`);
    if (argv[i + 1] === undefined) usage(`${argv[i]} needs a value`);
    opt[key] = argv[i + 1];
  }
  if (!opt.source || !opt.short) usage('--source and --short are required');
  if (opt.maxChars && opt.maxWords) usage('give --max-chars or --max-words, not both');
  for (const k of ['maxChars', 'maxWords']) {
    if (opt[k] !== undefined && !/^\d+$/.test(opt[k])) usage(`--max-${k === 'maxChars' ? 'chars' : 'words'} must be a whole number`);
  }
  const read = (f) => { try { return readFileSync(f, 'utf8'); } catch (e) { usage(`cannot read ${f}: ${e.code || e.message}`); } };
  const result = compare({
    source: clean(read(opt.source)), short: clean(read(opt.short)),
    passages: opt.protected ? splitPassages(read(opt.protected)) : [],
    maxChars: opt.maxChars ? Number(opt.maxChars) : null, maxWords: opt.maxWords ? Number(opt.maxWords) : null,
  });
  console.log(report(result));
  process.exit(result.failures.length ? 1 : 0);
}

main(process.argv.slice(2));
