# Prompt: audit my personal workspace

Use this for **your own setup**: your machine, your global agent configuration, your habits and your side projects. Open the session anywhere; your home directory or your projects folder works.

There is nothing to fill in. Paste the prompt as it is. The agent first looks at your configuration, then **asks you a short round of questions** about what it could not find out by itself (what you work on, what you want, what annoys you, how much risk you accept), and only then gives advice.

The audit is read-only. Nothing is changed until you ask.

## The prompt

```text
I want to improve my personal setup for working with coding agents, using the
BS31-Agents playbook at
https://github.com/BorislavStefanov31/bs31-agents
If it is not already cloned on this machine, clone it into a temporary folder and
read it from there.

Work in three steps. Do not skip or reorder them.

STEP 1 - Look before you ask.
Read the playbook's AGENTS.md and follow it. Then inspect my setup read-only:
- the user-level instruction file and settings of the harness you are running
  in (for Claude Code: ~/.claude/CLAUDE.md, ~/.claude/settings.json,
  ~/.claude/skills, ~/.claude/agents, installed plugins and MCP servers);
- permission mode, allow and deny lists, hooks;
- how secrets are stored (flag any secret in a settings file or shell profile
  by file name only; never print a value);
- anything scheduled or always-on (cron, launch agents, systemd user units,
  tmux sessions);
- if session history is on disk, sample my last 20 sessions and note recurring
  patterns: instructions I repeat, corrections I make more than once, requests
  that bundle unrelated changes, work started without a stated check.

STEP 2 - Interview me. Do not give any recommendation yet.
First tell me in three to five lines what you found, so I can correct you.
Then ask me what you still need to know to give good advice. Rules for the
questions:
- Ask only what you could not determine from my files and sessions. Never ask
  me something they already answered.
- One round of at most six questions. Offer two to four concrete options for
  each where that is possible, and always let me answer in my own words.
  If your harness has a tool for asking the user questions, use it; otherwise
  number the questions and wait.
- Cover at least, unless you already know:
  1. what I work on (a day job codebase, side projects, scripting, non-code work)
     and which of those I want this setup to serve;
  2. what I want most (less babysitting, fewer repeated instructions, better
     results on hard tasks, work that continues while I am away, lower cost);
  3. what annoys me most in a typical session today;
  4. how I check the agent's work (run it myself, read the diff, tests, trust it);
  5. how much risk I accept: may the agent run commands without asking, and is
     there anything it must never touch;
  6. what I have available: which harnesses and plans, a spare machine or
     server, a phone I would take notifications on.
- If my session history showed a pattern, ask me about it instead of assuming
  why I do it.
- Stop and wait for my answers. If an answer changes which practices are
  relevant, you may ask one short follow-up round. No more than that.

STEP 3 - Report.
Read the playbook's docs/reference/adoption-catalog.md, keeping the rows that
apply to "Workspace", and
docs/06-field-guides/03-working-habits-and-anti-patterns.md. Open only the
chapters behind the practices you are about to recommend.

Write the report in exactly this layout, with these headings in this order.
Leave a section out completely when you have nothing real to put in it: no
"none", no filler, no section written only because the layout lists it. No
introduction before the first heading and no summary after the last.

## Verdict
Two lines at most: the state of my setup in one sentence, and the single most
important thing to change.

## Fix now
Only for a real risk you found (a secret in a settings file or shell profile,
a permission mode that lets an agent do anything unasked, no deny rules).
One line each: what, where (the file), what to do.

## My setup
Three to five bullets: what is configured, what is left at its default, each
with the file that shows it.

## Recommended next
A table of at most five rows, ordered by value for effort:
| # | Practice (catalogue ID) | Why for me | Effort | First step |
"Why for me" names the file, the session pattern or the answer that makes it
relevant. "Effort" is S, M or L. "First step" is an exact file or command.

## Details
One block per table row, three lines at most, only for what the table cannot
hold: what changes day to day, and the chapter to read.

## Habits
Two short lists, three items each at most: what I do that works and should
keep, and what costs me time. Give one example from my sessions per item.
Leave this section out if you had no access to my session history.

## Turn into a rule, skill, hook or script
One line each for things I repeat by hand: what it is, which of the four it
should become, and why that one.

## Skip for now
One line each: the practice and the reason it should wait.

## Not checked
One line each: what you could not verify, so I do not take it as checked.

Rules for the report: recommend what is worth doing, not what fits a time
budget; the effort column lets me choose. Fewer than five rows is fine. Do not
repeat in Details what the table already says. Keep the whole report to about
one screen and a half.

Rules for the whole session: change no files, run nothing that writes, install
nothing (the one exception is cloning the playbook into a temporary folder), send nothing to any external service. If you could not check
something, say so instead of guessing.
```

## What the interview looks like

A good run asks questions that show the agent has looked first, for example:

> I found a user-level instruction file with four lines, default permission mode, no hooks, two MCP servers and no skills. In your last 20 sessions you typed "run the tests before you say you are done" eleven times.
>
> 1. Which work should this setup serve first? (day job repo / side projects / both)
> 2. You repeat the "run the tests" instruction a lot. Would you rather the agent be reminded, or be unable to finish without it? (a rule in my instruction file / a hook that blocks / not sure, explain the difference)
> 3. Do you want work to continue when your laptop is closed? (yes, I have a server / yes, but no server yet / no)
> 4. …

If the agent asks things your files already answer, tell it to go back to step 1.

## Follow-ups that work well

- `Write the user-level instruction file I should have, from what you learned about how I work. Keep it under 60 lines. Show it; do not save it yet.`
- `Turn the instruction I repeat most often into a skill. Use the playbook's templates/skill-example/SKILL.md as the shape. Ask me what you need to know about when it should trigger.`
- `Move the secrets you flagged out of my settings file into the OS keychain. Tell me each step before you do it and never print a value.`
- `I want sessions that keep running when my laptop is closed. Read the playbook's docs/06-field-guides/02-always-on-remote-setup-blueprint.md, ask me what you need to know about my devices and budget, then give me the smallest version of that setup that fits, as a phased plan with a check after each phase.`

## Why the prompt is shaped this way

- **Look first, ask second.** Your configuration and session history say more about how you work than you can describe from memory, so the agent reads them before it asks anything.
- **It asks about goals, not facts.** What you want, what annoys you and how much risk you accept are in no file. Those are the questions worth your time.
- **One bounded round of questions.** Six questions with options take two minutes. An open-ended interview does not get finished.
- **A fixed report layout.** The verdict comes first and anything risky second. Empty sections are left out, which stops an agent padding the report to match the layout.
- **No question about how much time you have.** Every recommendation carries an effort label, so you choose what fits.
- **Setup and habits are separate.** Most of the time lost with an agent is lost to habits; see [working habits and anti-patterns](../docs/06-field-guides/03-working-habits-and-anti-patterns.md).
- **One section asks for the right mechanism.** An instruction is advice the model may not follow; a hook or script always runs. Picking the mechanism is half of the work.
