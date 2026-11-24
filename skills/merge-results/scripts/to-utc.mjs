#!/usr/bin/env node
// to-utc.mjs: convert times written on a named clock to UTC. Node 18+, no dependencies, no network.
// Zone rules come from the runtime's Intl data. A local time that never happened is an error;
// one that happened twice prints both instants and is not converted until the caller picks one.
import { readFileSync } from 'node:fs';

const HELP = `to-utc.mjs: convert times written on a named clock to UTC

  node to-utc.mjs "<time>" <clock> [--elapsed <dur>] [--pick first|second]
  node to-utc.mjs --list <file|->    one entry per line; use it for times taken from results or files
  node to-utc.mjs --selftest | --help
  time     YYYY-MM-DD HH:MM[:SS[.mmm]], space or T. A trailing Z or +HH:MM must agree with the clock.
  clock    a zone id (Europe/Helsinki), a numeric offset (+02:00, -0530, UTC+2) or UTC. Abbreviations
           (EST, CET, IST) are refused: each names more than one clock.
  elapsed  a position into a recording or run that started at <time>: H:MM:SS, MM:SS or 875s.
  pick     only for a local time that happened twice (clocks set back): first or second.
  list     lines of: label | time | clock | elapsed | pick   (last two optional; # starts a comment)
Output, one tab-separated line per entry:
  OK         label  UTC instant        what was read, and the offset that applied
  AMBIGUOUS  label  both UTC instants  the local time happened twice: add pick, or the source's offset
  ERROR      label  reason             bad input, or a local time that never happened (clocks set forward)
Exit: 0 every entry converted; 1 at least one AMBIGUOUS or ERROR; 2 bad usage.`;

// Input is echoed only through this: anything outside a small safe set becomes "?".
const clean = (s, max = 60) => String(s ?? '').replace(/[^A-Za-z0-9 :+\-/_.#]/g, '?').trim().slice(0, max);
const pad = (n) => String(n).padStart(2, '0');
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z');
const millis = (digits) => Number((digits ?? '').padEnd(3, '0'));
const showOffset = (ms, minutes = Math.floor(Math.abs(ms) / 60000)) =>
  `UTC${ms < 0 ? '-' : '+'}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const fail = (reason) => { throw new Error(reason); };
const usage = (reason) => { console.error(`to-utc: ${reason}. Run with --help.`); return 2; };
const TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

function parseOffset(text) {
  const m = /^(?:UTC)?([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(String(text ?? '').trim());
  if (!m) return null;
  if (Number(m[2]) > 14 || Number(m[3] ?? 0) > 59) fail(`offset "${clean(text)}" is out of range`);
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60000;
}

// Returns the wall-clock fields as if they were UTC, plus any offset written in the time itself.
function parseTime(text) {
  const m = TIME.exec(String(text ?? '').trim()) ?? fail(`time "${clean(text)}" is not YYYY-MM-DD HH:MM[:SS]`);
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map((v) => Number(v ?? 0));
  const wall = Date.UTC(y, mo - 1, d, h, mi, s, millis(m[7]));
  const back = new Date(wall);
  const real = y >= 1900 && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d && h < 24 && mi < 60 && s < 60;
  if (!real) fail(`"${clean(text)}" is not a real date and time (years from 1900)`);
  return { wall, inline: m[8] ? parseOffset(/^z$/i.test(m[8]) ? '+00' : m[8]) : null };
}

function parseElapsed(text) {
  const v = String(text ?? '').trim().replace(/^\+/, '');
  if (!v || v === '-') return 0;
  let m = /^(\d+)(?:\.(\d{1,3}))?s$/.exec(v);
  if (m) return Number(m[1]) * 1000 + millis(m[2]);
  m = /^(?:(\d+):)?(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/.exec(v) ?? fail(`elapsed "${clean(text)}" is not H:MM:SS, MM:SS or <seconds>s`);
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + millis(m[4]);
}

// Offset of a zone at a UTC instant: format the instant in the zone, read the fields back as UTC.
const formats = new Map();
function zoneOffset(zone, t) {
  if (!formats.has(zone)) {
    const numeric = Object.fromEntries(['year', 'month', 'day', 'hour', 'minute', 'second'].map((k) => [k, 'numeric']));
    formats.set(zone, new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', ...numeric }));
  }
  const p = Object.fromEntries(formats.get(zone).formatToParts(new Date(t)).map(({ type, value }) => [type, Number(value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
}

// Every UTC instant at which the zone's wall clock showed these fields: none, one or two.
function candidates(zone, wall) {
  const offsets = new Set([-86400000, 0, 86400000].map((shift) => zoneOffset(zone, wall + shift)));
  return [...offsets].filter((o) => zoneOffset(zone, wall - o) === o).map((o) => ({ t: wall - o, offset: o })).sort((a, b) => a.t - b.t);
}

function convert(entry) {
  const { wall, inline } = parseTime(entry.time);
  const add = parseElapsed(entry.elapsed);
  const clock = String(entry.clock ?? '').trim().replace(/^-$/, '');
  const name = clean(clock);
  const pick = String(entry.pick ?? '').trim().toLowerCase();
  if (pick && pick !== 'first' && pick !== 'second') fail('pick must be first or second');
  const fixed = /^(UTC|Z)$/i.test(clock) ? 0 : parseOffset(clock);
  let found;
  if (!clock) {
    if (inline === null) fail('no clock: give a zone id, a numeric offset or UTC');
    found = [{ t: wall - inline, offset: inline }];
  } else if (fixed !== null) {
    if (inline !== null && inline !== fixed) fail(`the time carries ${showOffset(inline)} but the clock says ${showOffset(fixed)}`);
    found = [{ t: wall - fixed, offset: fixed }];
  } else {
    if (!clock.includes('/')) fail(`clock "${name}" is an abbreviation or unknown: use a zone id such as Europe/Helsinki, or a numeric offset`);
    if (/^Etc\/GMT[+-]/i.test(clock)) fail(`clock "${name}" has an inverted sign by convention: give a numeric offset instead`);
    try { zoneOffset(clock, wall); } catch { fail(`unknown zone "${name}"`); }
    found = candidates(clock, wall);
    if (found.length === 0) {
      const [before, after] = [-86400000, 86400000].map((shift) => showOffset(zoneOffset(clock, wall + shift)));
      fail(`"${clean(entry.time)}" never happened in ${name}: clocks went from ${before} to ${after} and skipped it. The source used another clock; ask its producer`);
    }
    if (inline !== null) found = found.filter((c) => c.offset === inline);
    if (found.length === 0) fail(`the time carries ${showOffset(inline)}, which ${name} did not use at that moment: wrong clock at the source`);
  }
  if (found.length === 2 && pick) found = [found[pick === 'first' ? 0 : 1]];
  const read = `read "${clean(entry.time)}"${name ? ` on ${name}` : ''}${add ? ` plus ${clean(entry.elapsed)} elapsed` : ''}`;
  const instants = found.map((c) => iso(c.t + add));
  if (found.length === 2) {
    const both = found.map((c, i) => `${instants[i]} (${i ? 'second' : 'first'}, ${showOffset(c.offset)})`).join(' or ');
    return { status: 'AMBIGUOUS', instants, text: `${both}\t${read}; it happened twice` };
  }
  return { status: 'OK', instants, text: `${instants[0]}\t${read} (${showOffset(found[0].offset)})` };
}

function attempt(entry) { // never throws: a failed entry becomes an ERROR result
  try { return convert(entry); } catch (err) { return { status: 'ERROR', instants: [], text: err.message }; }
}
function run(entries) {
  const results = entries.map(attempt);
  results.forEach((r, i) => console.log(`${r.status}\t${clean(entries[i].label, 40) || `entry ${i + 1}`}\t${r.text}`));
  const failed = results.filter((r) => r.status !== 'OK').length;
  if (failed) console.error(`to-utc: ${failed} of ${entries.length} entries not converted`);
  return failed ? 1 : 0;
}

const readList = (path) => readFileSync(path === '-' ? 0 : path, 'utf8').split(/\r?\n/)
  .map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split('|').map((field) => field.trim()))
  .map(([label, time, clock, elapsed, pick]) => ({ label, time, clock, elapsed, pick }));

const CASES = [ // time, clock, elapsed, pick, expected status and instants (or ERROR plus a fragment)
  ['2026-07-01 12:00', 'Europe/Helsinki', '', '', 'OK 2026-07-01T09:00:00Z'],
  ['2026-11-25 09:15', '-05:00', '', '', 'OK 2026-11-25T14:15:00Z'],
  ['2026-03-29 03:30', 'Europe/Helsinki', '', '', 'ERROR never happened'],
  ['2026-09-06 00:30', 'America/Santiago', '', '', 'ERROR never happened'],
  ['2026-10-25 03:30', 'Europe/Helsinki', '', '', 'AMBIGUOUS 2026-10-25T00:30:00Z 2026-10-25T01:30:00Z'],
  ['2026-10-25 03:30', 'Europe/Helsinki', '', 'second', 'OK 2026-10-25T01:30:00Z'],
  ['2026-10-25T03:30:00+03:00', 'Europe/Helsinki', '', '', 'OK 2026-10-25T00:30:00Z'],
  ['2026-10-25T03:30:00+05:00', 'Europe/Helsinki', '', '', 'ERROR wrong clock'],
  ['2026-11-01 00:50', 'America/New_York', '1:20:00', '', 'OK 2026-11-01T06:10:00Z'],
  ['2026-11-25 09:15', 'EST', '', '', 'ERROR abbreviation'],
  ['2026-02-30 10:00', 'UTC', '', '', 'ERROR not a real date'],
];

function selftest() {
  let bad = 0;
  for (const [time, clock, elapsed, pick, want] of CASES) {
    const r = attempt({ time, clock, elapsed, pick });
    const got = `${r.status} ${r.instants.join(' ') || r.text}`;
    const pass = want.startsWith('ERROR ') ? got.startsWith('ERROR ') && got.includes(want.slice(6)) : got === want;
    bad += pass ? 0 : 1;
    console.log(`${pass ? 'pass' : 'FAIL'}  ${[time, clock, elapsed, pick].filter(Boolean).join(' | ')}  ->  ${got}`);
  }
  console.log(bad ? `selftest: ${bad} of ${CASES.length} cases failed` : `selftest: ${CASES.length} cases passed`);
  return bad ? 1 : 0;
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return console.log(HELP) ?? 0;
  if (argv.includes('--selftest')) return selftest();
  const [opt, positional] = [{}, []];
  for (let i = 0; i < argv.length; i++) {
    if (['--list', '--elapsed', '--pick'].includes(argv[i])) {
      if (argv[i + 1] === undefined) return usage(`${argv[i]} needs a value`);
      opt[argv[i].slice(2)] = argv[++i];
    } else if (argv[i].startsWith('--')) return usage(`unknown option ${clean(argv[i])}`);
    else positional.push(argv[i]);
  }
  if (opt.list !== undefined) {
    if (positional.length) return usage('--list takes no time arguments');
    let entries;
    try { entries = readList(opt.list); } catch { return usage(`cannot read the list ${clean(opt.list)}`); }
    return entries.length ? run(entries) : usage('the list has no entries');
  }
  if (positional.length < 1 || positional.length > 2) return usage('give one time and one clock, or --list <file>');
  return run([{ label: 'time', time: positional[0], clock: positional[1], elapsed: opt.elapsed, pick: opt.pick }]);
}

process.exitCode = main(process.argv.slice(2));
