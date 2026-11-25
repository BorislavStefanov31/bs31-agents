# Instructions for an agent reading this repository

This repository is a playbook, not a codebase. Someone has pointed you at it and asked a question such as "what from here should I use in my project?" or "how do I set up X?". Your job is to turn the playbook into advice that fits **their** situation.

## How to answer "what should I adopt?"

1. **Look at their situation before you read the playbook.** Advice that ignores what is already there is noise. Inspect, read-only:
   - For a project: instruction files (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md`), agent config folders (`.claude/`, `.agents/`, `.codex/`, `.pi/`), CI workflows, test and lint setup, hooks, PR template, docs and decision records, the size and shape of recent PRs (`git log`, `gh pr list` if available), and how many people commit.
   - For a personal workspace: user-level instruction and settings files (for example `~/.claude/CLAUDE.md`, `~/.claude/settings.json`), installed skills, plugins and MCP servers, shell helpers, how sessions are started, and whether anything runs unattended.
   - Never print secrets you come across. Name the file and the problem instead.
2. **Ask before you advise.** Some things are in no file: the team, the goal, the pain, the limits. Say in a few lines what you found, then ask one round of at most six questions and wait for the answers.
   - Ask only what inspection could not answer. Never ask what a file already told you.
   - Do not ask how much time they have. Every recommendation carries an effort label, and they choose.
   - Offer two to four concrete options per question where you can, and always accept a free-text answer. Use your harness's question tool if it has one; otherwise number the questions.
   - For a project, cover: who commits and who uses agents; how agents are used today; what hurts most; how far they want to go in the next three months; areas, tools or budgets that are off limits; who confirms plans and approves shared setup.
   - For a personal workspace, cover: what they work on; what they want most; what annoys them in a typical session; how they check the agent's work; how much risk they accept; which harnesses, plans, spare machines and phone they have.
   - One short follow-up round is allowed if an answer changes which practices are relevant. Then stop asking.
   - If the user already gave this information in their message, do not ask for it again.
3. **Read [`docs/reference/adoption-catalog.md`](docs/reference/adoption-catalog.md).** It lists every practice in the playbook in one table: ID, practice, where it applies, effort, first step, and the chapter that explains it.
4. **Place them on the ladder.** [`docs/06-field-guides/01-ai-first-transition-playbook.md`](docs/06-field-guides/01-ai-first-transition-playbook.md) defines the rungs and what must be true before climbing each one. Recommend from the lowest rung that is not yet solid. Do not recommend autonomy to a project with no deterministic test gate. Practices that only add context and no output, such as tightening the instruction file or recording decisions (ADRs), are safe at any rung: when decisions are not written down, include that among your recommendations even if the gates come first.
5. **Open only the chapters you need** for the practices you are about to recommend. Do not load the whole playbook into context.
6. **Recommend at most five practices**, ordered by value for effort. Recommend what is worth doing, not what fits a time budget. Fewer than five is fine. Each one needs:
   - the catalogue ID and the practice,
   - the evidence that makes it relevant: a file, a pattern, a gap, or one of their answers,
   - its effort (S, M or L),
   - the first step, concrete to their repo (file path, command).
7. **Write the report in the layout below.**
8. **Change nothing unless asked.** This is an audit. If they then ask you to apply a practice, do one practice at a time, show the diff, and say how to verify it and how to undo it.

## Report layout

Use these headings in this order. **Leave a section out completely when you have nothing real to put in it**: no "none", no filler, no section written only because the layout lists it. No introduction before the first heading and no summary after the last. Aim for about one and a half screens.

| Heading | What goes in it | Leave out when |
|---|---|---|
| `## Verdict` | Two lines at most. For a project: the rung of the ladder and the single most important thing to do next. For a workspace: the setup in one sentence and the single most important change. | Never. |
| `## Fix now` | Real security or data-loss risks only: a committed secret, a secret in a settings file, an unguarded destructive action, an agent that can push or read secrets freely. One line each: what, where (the file), what to do. Never print a secret's value. | You found no such risk. |
| `## Where we are` (project) or `## My setup` (workspace) | Three to six bullets: what holds and what is missing or left at its default, each with its evidence (a file and line, a number you computed, or one of their answers). | Never. |
| `## Recommended next` | A table of at most five rows, ordered by value for effort, with the columns: #, Practice (catalogue ID), Why here, Effort, First step. | Never, but it may have fewer than five rows. |
| `## Details` | One block per table row, three lines at most, only for what the table cannot hold: what changes for them, how they will know it worked, the chapter to read. Do not repeat the table. | The table says everything. |
| `## Habits` (workspace only) | Two short lists of at most three items: what works and should stay, what costs time. One example from their sessions per item. | You had no access to session history. |
| `## Turn into a rule, skill, hook or script` (workspace only) | One line each for things they repeat by hand: what it is, which of the four it should become, and why that one. | You saw nothing repeated. |
| `## Skip for now` | One line each: the practice and the reason it should wait. An honest "not yet" is part of the answer. | Nothing notable was held back. |
| `## Not checked` | One line each: what you could not verify, so it is not taken as checked. | You verified everything you stated. |

## How to read the playbook with someone

When they ask to read it like a book or be taken through it:

1. Show the table of contents from the README (six parts, their chapters, one line each). Ask what they already know about coding agents and whether they want every chapter in order or one of the README's reading paths. Wait.
2. Take one chapter at a time, starting at 1.1 unless they chose otherwise. Read the whole chapter file first. Open your reply with the position ("1.2 Context engineering, 2 of 25"). Teach it in your own words in about one screen: the main idea, the three to five points that matter most, one concrete example. Do not paste long passages; name the section to open instead.
3. Name the one practice from the chapter's "Adopt this" table that is easiest to try today, and end with one question.
4. Stop after every chapter and wait for "next", a question, "skip" or a chapter number. Never move on unasked. After each part, give a five-line recap.

## How to answer a "how do I…?" question

Use the map below to find the owning chapter, read it, and answer from it. Chapters are written against late-2026 tooling. When a chapter names a config key, flag or setting, check it against the user's installed version (for example `--help`, or the tool's own docs) before you tell them to rely on it.

## Map

| Question is about | Open |
|---|---|
| Why the model behaves as it does: tokens, cost, caching, model choice | `docs/01-foundations/01-how-llms-work.md` |
| What is in the context window, when to compact or start fresh | `docs/01-foundations/02-context-engineering.md` |
| Choosing and configuring a harness, permissions, settings scope | `docs/01-foundations/03-harnesses-and-settings.md` |
| `AGENTS.md` / `CLAUDE.md`, path-scoped rules | `docs/02-workspace/01-instruction-files-and-rules.md` |
| Writing, structuring and chaining skills | `docs/02-workspace/02-skills.md` |
| Knowledge bases, team memory, plans, decision records | `docs/02-workspace/03-knowledge-and-memory.md` |
| Tool design, MCP, building an MCP server | `docs/02-workspace/04-tools-and-mcp.md` |
| Prompt injection, permissions, hooks as guardrails, secrets | `docs/02-workspace/05-hooks-guardrails-and-security.md` |
| What an agent is, the loop, stop conditions | `docs/03-agents/01-agent-loop-and-primitives.md` |
| Building a custom agent | `docs/03-agents/02-build-your-own-agent.md` |
| Subagents, worktrees, multi-agent patterns | `docs/03-agents/03-subagents-and-multi-agent.md` |
| Traces, evals, budgets | `docs/03-agents/04-reliability-observability-evals.md` |
| Requirements, acceptance criteria, splitting work | `docs/04-delivery/01-intent-specs-and-decomposition.md` |
| Explore, plan, execute, feedback | `docs/04-delivery/02-the-delivery-loop.md` |
| Proving a change works, quality gates | `docs/04-delivery/03-verification-and-quality-gates.md` |
| Code review by and for agents | `docs/04-delivery/04-pr-review-with-agents.md` |
| Signals and feedback after release | `docs/04-delivery/05-learning-after-release.md` |
| Unattended agents: runtime, state, control | `docs/05-autonomy/01-autonomous-systems.md` |
| Config that moves between harnesses and machines | `docs/05-autonomy/02-portable-agent-config.md` |
| A standing team of role agents | `docs/05-autonomy/03-orchestrating-agent-teams.md` |
| Triggers, scheduled agents, notifications | `docs/05-autonomy/04-events-hooks-and-pipelines.md` |
| Making the setup improve itself | `docs/05-autonomy/05-self-improving-systems.md` |
| Moving an existing project to AI-first step by step | `docs/06-field-guides/01-ai-first-transition-playbook.md` |
| Laptop + server + phone, sessions that run with the lid closed | `docs/06-field-guides/02-always-on-remote-setup-blueprint.md` |
| Day-to-day habits with an agent | `docs/06-field-guides/03-working-habits-and-anti-patterns.md` |
| Short answers to common questions | `docs/06-field-guides/04-faq.md` |
| A term you do not recognise | `docs/reference/glossary.md` |
| Ready-made skills to install, with an index of when each applies | `skills/README.md` |
| Starter files to copy | `templates/` |

## Editing this repository

If you are asked to change the playbook itself:

- Every chapter keeps the same skeleton: title, summary quote, "Read this when", body, "Common mistakes", "Adopt this" table (exact heading, five columns: ID, Practice, Applies to, Effort, First step), "Resources".
- After changing any "Adopt this" or "Resources" section, or adding or renaming a FAQ question under `docs/06-field-guides/faq/`, run `node scripts/build-reference.mjs`. It regenerates `docs/reference/adoption-catalog.md`, `docs/reference/resources.md` and the FAQ index `docs/06-field-guides/04-faq.md`. Do not edit those three files by hand.
- Keep it free of company, project and personal names. Examples use placeholders (`PROJ-123`, `my-server`, `OWNER/REPO`).
