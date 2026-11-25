# Prompt: audit my project

Use this in a coding-agent session opened **in the project you want to improve**. It works for a team repository or a solo one.

There is nothing to fill in. Paste the prompt as it is. The agent first looks at the repository, then **asks you a short round of questions** about what it could not find out by itself (your team, what hurts, how far you want to go, what is off limits), and only then gives advice.

The audit is read-only. Nothing is changed until you ask.

## The prompt

```text
I want to know which practices from the BS31-Agents playbook would improve
this project. The playbook is at
https://github.com/BorislavStefanov31/bs31-agents
If it is not already cloned on this machine, clone it into a temporary folder and
read it from there.

Work in three steps. Do not skip or reorder them.

STEP 1 - Look before you ask.
Read the playbook's AGENTS.md and follow it. Then inspect this repository
read-only: instruction files, agent config folders, CI, tests, lint, hooks, the
PR template, docs and decision records, and the size and shape of the last 20
merged PRs if you can see them. Do not print any secret you find; name the file.

STEP 2 - Interview me. Do not give any recommendation yet.
First tell me in three to five lines what you found, so I can correct you.
Then ask me what you still need to know to give good advice. Rules for the
questions:
- Ask only what you could not determine from the repository. Never ask me
  something a file already answered.
- One round of at most six questions. Offer two to four concrete options for
  each where that is possible, and always let me answer in my own words.
  If your harness has a tool for asking the user questions, use it; otherwise
  number the questions and wait.
- Cover at least, unless you already know:
  1. the team: how many people commit, and how many of them use a coding agent;
  2. how agents are used today (single tasks, whole features, review, nothing shared);
  3. what hurts most right now (for example slow reviews, oversized PRs,
     regressions, flaky tests, repeated corrections, onboarding);
  4. the goal: how far we want to go in the next three months (better daily
     use, a shared team workflow, agent review, parallel or unattended work);
  5. constraints: areas agents must not touch, compliance or security limits,
     which harnesses and models are allowed, budget;
  6. who decides: who confirms plans and approves changes to shared agent setup.
- Add a question of your own if something in the repository surprised you.
- Stop and wait for my answers. If an answer changes which practices are
  relevant, you may ask one short follow-up round. No more than that.

STEP 3 - Report.
Read the playbook's docs/reference/adoption-catalog.md and
docs/06-field-guides/01-ai-first-transition-playbook.md, then open only the
chapters behind the practices you are about to recommend.

Write the report in exactly this layout, with these headings in this order.
Leave a section out completely when you have nothing real to put in it: no
"none", no filler, no section written only because the layout lists it. No
introduction before the first heading and no summary after the last.

## Verdict
Two lines at most: the rung of the transition ladder we are on, and the single
most important thing to do next.

## Fix now
Only for a real security or data-loss risk you found (a committed secret, an
unguarded destructive action, an agent that can push or read secrets freely).
One line each: what, where (the file), what to do.

## Where we are
Three to six bullets: what already holds and what is missing, each with its
evidence (a file and line, a number you computed, or one of my answers).

## Recommended next
A table of at most five rows, ordered by value for effort:
| # | Practice (catalogue ID) | Why here | Effort | First step |
"Why here" names the file or answer that makes it relevant. "Effort" is S, M
or L. "First step" is a file path or command in this repository.

## Details
One block per table row, three lines at most, only for what the table cannot
hold: what changes for us, how we will know it worked, the chapter to read.

## Skip for now
One line each: the practice and the reason it should wait.

## Not checked
One line each: what you could not verify, so I do not take it as checked.

Rules for the report: recommend what is worth doing, not what fits a time
budget; the effort column lets me choose. Fewer than five rows is fine. Do not
repeat in Details what the table already says. Keep the whole report to about
one screen and a half.

Rules for the whole session: change no files, run nothing that writes, install
nothing (the one exception is cloning the playbook into a temporary folder). If something I told you does not match what you see in the repository,
say so. If you could not check something, say that instead of guessing.
```

## What the interview looks like

A good run asks questions that show the agent has read the repository, for example:

> I found a `CLAUDE.md` with build commands, CI that runs tests and lint on every PR, no hooks and no skills. The last 20 PRs have a median of about 600 changed lines and merge after three days.
>
> 1. How many people commit here regularly, and how many use a coding agent? (just me / 2 to 5 / 6 to 20 / more)
> 2. The PRs are large and wait three days. Which is the bigger problem for you? (review takes too long / PRs are too big to review well / neither, something else)
> 3. Is there any area agents should stay out of? (no / yes: which)
> 4. …

If the agent asks things the repository already answers ("what language is this project?"), tell it to go back to step 1.

## Follow-ups that work well

- `Apply practice <ID> only. Show me the diff before writing, tell me how to verify it and how to undo it.`
- `Draft the AGENTS.md this project should have, as an index. Use the playbook's templates/AGENTS.md as the shape and only facts you can verify in this repo. Ask me for anything you cannot verify.`
- `Which three rules, written as path-scoped rule files, would have prevented the most review comments in the last 20 PRs? Show the evidence.`
- `Turn the "Recommended next" table into issues, one per practice, each with an acceptance check.`

## Why the prompt is shaped this way

- **Look first, ask second.** An agent that asks before reading wastes your time on questions the repository answers. One that advises without asking guesses at the things only you know: the team, the pain and the limits.
- **One bounded round of questions.** Six questions with options take two minutes to answer. An open-ended interview does not get finished.
- **It says back what it found.** You can correct a wrong reading before it turns into wrong advice.
- **A fixed report layout.** The verdict comes first and anything urgent second, so nobody has to read to the end to find the committed secret. Empty sections are left out, which stops an agent padding the report to match the layout.
- **No question about how much time you have.** Every recommendation carries an effort label, so you choose what fits; an agent that is told you have an hour a week shrinks its advice to fit.
- **At most five practices, plus what to skip.** A transition that adopts everything at once produces slop; see the [transition playbook](../docs/06-field-guides/01-ai-first-transition-playbook.md).
- **A check per practice** ("how we will know it worked"), because a practice without a check tends to be adopted on paper only.
- **Read-only**, so you can run it on a work repository without side effects.
