# Prompt: audit my project

Use this in a coding-agent session opened **in the project you want to improve**. It works for a team repository or a solo one.

There is nothing to fill in. Paste the prompt as it is. The agent first looks at the repository, then **asks you a short round of questions** about what it could not find out by itself (your team, what hurts, how far you want to go, what is off limits), and only then gives advice.

The audit is read-only. Nothing is changed until you ask.

## The prompt

```text
I want to know which practices from the Agent Playbook would improve
this project. The playbook is at
https://github.com/BorislavStefanov31/bs-agent-playbook
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
- One round of at most seven questions. Offer two to four concrete options for
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
  6. who decides: who confirms plans and approves changes to shared agent setup;
  7. how much time per week we can spend on improving the setup.
- Add a question of your own if something in the repository surprised you.
- Stop and wait for my answers. If an answer changes which practices are
  relevant, you may ask one short follow-up round. No more than that.

STEP 3 - Advise.
Read the playbook's docs/reference/adoption-catalog.md and
docs/06-field-guides/01-ai-first-transition-playbook.md, then open only the
chapters behind the practices you are about to recommend. Give me:

A. Where we are: the rung of the transition ladder, what is already solid, and
   the two or three gaps that cost us the most, with evidence from the
   repository and from my answers.
B. At most five practices to adopt next, ordered by value for effort. For each:
   catalogue ID and name; why it fits (cite the file or the answer that makes
   it relevant); what changes for us; effort (S/M/L); the first step as a
   concrete file path or command in this repo; how we will know it worked; the
   chapter to read.
C. What to skip for now, one line of reason each.
D. One thing that looks risky today (security, secrets, an unguarded
   destructive action), if you found any.

Rules for the whole session: change no files, run nothing that writes, install
nothing. If something I told you does not match what you see in the repository,
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
- `Turn section B into issues, one per practice, each with an acceptance check.`

## Why the prompt is shaped this way

- **Look first, ask second.** An agent that asks before reading wastes your time on questions the repository answers. One that advises without asking guesses at the things only you know: the team, the pain and the limits.
- **One bounded round of questions.** Seven questions with options take two minutes to answer. An open-ended interview does not get finished.
- **It says back what it found.** You can correct a wrong reading before it turns into wrong advice.
- **At most five practices, plus what to skip.** A transition that adopts everything at once produces slop; see the [transition playbook](../docs/06-field-guides/01-ai-first-transition-playbook.md).
- **A check per practice** ("how we will know it worked"), because a practice without a check tends to be adopted on paper only.
- **Read-only**, so you can run it on a work repository without side effects.
