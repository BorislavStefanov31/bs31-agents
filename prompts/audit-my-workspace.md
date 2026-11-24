# Prompt: audit my personal workspace

Use this for **your own setup**: your machine, your global agent configuration, your habits and your side projects. Open the session anywhere; your home directory or your projects folder works.

There is nothing to fill in. Paste the prompt as it is. The agent first looks at your configuration, then **asks you a short round of questions** about what it could not find out by itself (what you work on, what you want, what annoys you, how much risk you accept), and only then gives advice.

The audit is read-only. Nothing is changed until you ask.

## The prompt

```text
I want to improve my personal setup for working with coding agents, using the
Agent Playbook at
https://github.com/BorislavStefanov31/bs-agent-playbook
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
- One round of at most seven questions. Offer two to four concrete options for
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
     server, a phone I would take notifications on;
  7. how much time I am willing to spend on setup this month.
- If my session history showed a pattern, ask me about it instead of assuming
  why I do it.
- Stop and wait for my answers. If an answer changes which practices are
  relevant, you may ask one short follow-up round. No more than that.

STEP 3 - Advise.
Read the playbook's docs/reference/adoption-catalog.md, keeping the rows that
apply to "Workspace", and
docs/06-field-guides/03-working-habits-and-anti-patterns.md. Open only the
chapters behind the practices you are about to recommend. Give me:

A. My setup in five lines: what is configured, what is default, what is risky.
B. At most five practices to adopt next, ordered by value for effort. For each:
   catalogue ID and name; why it fits (cite the file, the session pattern or my
   answer that makes it relevant); what changes for me day to day; effort
   (S/M/L); the first step as an exact file or command; the chapter to read.
C. Habits: up to three things I do that work and should keep, and up to three
   that cost me time, each with one example from my sessions if you had access.
D. Things I repeat by hand that should become a rule, a skill, a hook or a
   script. Say which of the four, and why that one.
E. What to skip for now, one line of reason each.

Rules for the whole session: change no files, run nothing that writes, install
nothing, send nothing to any external service. If you could not check
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
- **One bounded round of questions.** Seven questions with options take two minutes. An open-ended interview does not get finished.
- **Setup and habits are separate.** Most of the time lost with an agent is lost to habits; see [working habits and anti-patterns](../docs/06-field-guides/03-working-habits-and-anti-patterns.md).
- **Section D asks for the right mechanism.** An instruction is advice the model may not follow; a hook or script always runs. Picking the mechanism is half of the work.
