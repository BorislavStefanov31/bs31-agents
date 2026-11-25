# BS31-Agents

**A playbook for working with coding agents: a prompt to paste, skills to install, and a book to read.**

Ideas, patterns and reference designs for making a codebase, a team and a personal workspace AI-first, without the slop.

> **You do not have to read any of this.** You can read it like a book, but if you just want results, copy [one of the prompts](#ask-your-agent) (one for a project, one for your own setup, one for a guided read) into a coding-agent session. The agent reads the playbook for you, asks you a few questions, and tells you which practices fit.

This repository is documentation, written to be used in two ways:

1. **Just use the prompt.** Paste it into your coding agent in *your* project or on *your* machine. There is nothing for you to clone or fill in; the agent fetches the playbook itself. The repo is structured so an agent can answer well: an [`AGENTS.md`](AGENTS.md) that tells it how to audit before advising, and an [adoption catalogue](docs/reference/adoption-catalog.md) that lists every practice in one table.
2. **Read it like a book.** Six parts, from how models work to agents that run while you sleep. Each chapter stands on its own, so you can also open only the one you need.

It is a collection of ideas, patterns and reference designs: how to set up a workspace around a coding agent, how a team can run delivery and review through agents, and how to keep sessions running on a VPS while your laptop is closed. It describes no particular company, project or machine. The practices are what matter.

## Start here

| If you want to… | Go to |
|---|---|
| Get advice for a project in five minutes | [Ask your agent: project audit](#example-prompt-a-project) |
| Get advice for your own machine and habits | [Ask your agent: workspace audit](#example-prompt-a-personal-workspace) |
| Read it chapter by chapter with your agent as the guide | [Ask your agent: read it like a book](#example-prompt-read-it-like-a-book) |
| Introduce agents to an existing team without breaking things | [The AI-first transition playbook](docs/06-field-guides/01-ai-first-transition-playbook.md) |
| See every practice at a glance | [Adoption catalogue](docs/reference/adoption-catalog.md) |
| Run agents while your laptop is closed | [Blueprint: always-on remote setup](docs/06-field-guides/02-always-on-remote-setup-blueprint.md) |
| Install ready-made skills | [`skills/`](skills/) |
| Copy a starter file | [`templates/`](templates/) |
| Get a short answer to a specific question | [FAQ](docs/06-field-guides/04-faq.md) |

## Ask your agent

Open a session in **your** project (or anywhere, for a workspace audit) and paste one of the prompts below. There is nothing to fill in: the agent fetches the playbook, looks at your setup, then **asks you a short round of questions** about what it cannot find out by itself, and only then gives a short, structured report: a verdict, anything urgent, a table of what to do next, and what to skip. Both audits are read-only: the agent changes nothing until you ask.

### Example prompt: a project

Short form (the full version, with follow-ups, is in [`prompts/audit-my-project.md`](prompts/audit-my-project.md)):

```text
I want to know which practices from the BS31-Agents playbook would improve
this project. The playbook is at
https://github.com/BorislavStefanov31/bs31-agents
If it is not cloned on this machine, clone it into a temporary folder.

1. Read the playbook's AGENTS.md and follow it. Inspect this repository
   read-only: instruction files, agent config, CI, tests, hooks, recent PRs.
2. Do not advise yet. Tell me in a few lines what you found, then ask me up to
   six questions about what you could not find out yourself: the team and who
   uses agents, what hurts most, how far we want to go, what is off limits, who
   decides. Offer options where you can. Never ask what a file already
   answered. Wait for my answers.
3. Then report in the layout the playbook's AGENTS.md defines:
   - Verdict: the rung of the transition ladder we are on and the one most
     important thing to do, in two lines.
   - Fix now: any security risk you found (secrets, unguarded destructive actions).
   - Where we are: what holds and what is missing, with evidence.
   - Recommended next: a table of at most five practices with catalogue ID,
     why here, effort and first step, then short details per row.
   - Skip for now, and what you could not check.
   Leave out any section that would be empty. Recommend what is worth doing,
   not what fits a time budget.

Change no files (cloning the playbook into a temporary folder is the one exception).
If you could not check something, say so instead of guessing.
```

### Example prompt: a personal workspace

Short form (full version in [`prompts/audit-my-workspace.md`](prompts/audit-my-workspace.md)):

```text
I want to improve my personal setup for working with coding agents, using the
BS31-Agents playbook at
https://github.com/BorislavStefanov31/bs31-agents
If it is not cloned on this machine, clone it into a temporary folder.

1. Read the playbook's AGENTS.md and follow it. Inspect my setup read-only: my
   user-level instruction file and settings, skills, plugins, MCP servers,
   permissions, hooks, how secrets are stored (never print a value), and
   anything scheduled or always-on. If my session history is on disk, sample
   the last 20 sessions for things I repeat or correct more than once.
2. Do not advise yet. Tell me in a few lines what you found, then ask me up to
   six questions about what you could not find out yourself: what I work on,
   what I want most, what annoys me, how I check your work, how much risk I
   accept, what devices and plans I have. Offer options where you can. Never
   ask what a file already answered. Wait for my answers.
3. Then report in the layout the playbook's AGENTS.md defines:
   - Verdict: my setup in one sentence and the one most important change.
   - Fix now: any risk you found (a secret in a settings file, no deny rules).
   - My setup: what is configured and what is default, with the file.
   - Recommended next: a table of at most five practices with catalogue ID,
     why for me, effort and first step, then short details per row.
   - Habits that work and habits that cost me time, with examples.
   - What I repeat by hand that should become a rule, a skill, a hook or a script.
   - Skip for now, and what you could not check.
   Leave out any section that would be empty.

Change no files (cloning the playbook into a temporary folder is the one exception)
and send nothing to any external service.
```

Good follow-ups once you have the answer: *"Apply practice `<ID>` only. Show the diff first, and tell me how to verify it and how to undo it."*

### Example prompt: read it like a book

For when you want to go through the playbook from the first chapter, with your agent as the guide. It shows you the table of contents, asks what you already know, then teaches one chapter at a time and waits for you after each. Short form (full version in [`prompts/read-the-playbook.md`](prompts/read-the-playbook.md)):

```text
I want to read the BS31-Agents playbook with you like a book, starting at the
beginning. The playbook is at
https://github.com/BorislavStefanov31/bs31-agents
If it is not cloned on this machine, clone it into a temporary folder.

1. Show me the table of contents from the README: the six parts and their
   chapters, one line each. Ask how much I already know about coding agents and
   whether I want every chapter in order or one of the README's reading paths.
   Wait for my answer, then start with chapter 1.1 unless I chose otherwise.
2. For each chapter: read the whole file first. Start your reply with where we
   are ("1.2 Context engineering, 2 of 25"). Teach it in your own words in
   about one screen: the main idea, the three to five points that matter most,
   and one concrete example. Name the one practice from its "Adopt this" table
   that is easiest to try today. End with one question for me.
3. Stop after every chapter and wait. I will say "next", ask questions, say
   "skip" or name a chapter. Never move on by yourself. After each part, give
   a five-line recap.

Reading only: change no files (the temporary clone is the one exception).
```

## What is in the playbook

### Part 1: Foundations

What you need to know about the machine before you try to steer it.

| # | Chapter | What it covers |
|---|---|---|
| 1.1 | [How LLMs work](docs/01-foundations/01-how-llms-work.md) | Tokens, sampling, context windows, caching, reasoning effort, model tiers, and what each means for daily work. |
| 1.2 | [Context engineering](docs/01-foundations/02-context-engineering.md) | What is really in an agent's context, how quality degrades as it fills, when to compact and when to start fresh. |
| 1.3 | [Harnesses and settings](docs/01-foundations/03-harnesses-and-settings.md) | The program around the model: permission modes, settings scope, what to commit for the team and what to keep personal. |

### Part 2: Your workspace

The files and configuration that make an agent useful in *your* project.

| # | Chapter | What it covers |
|---|---|---|
| 2.1 | [Instruction files and rules](docs/02-workspace/01-instruction-files-and-rules.md) | `AGENTS.md` / `CLAUDE.md` as an index, path-scoped rules, and what belongs in neither. |
| 2.2 | [Skills](docs/02-workspace/02-skills.md) | Packaging a repeatable task so the agent picks it up at the right moment; frontmatter, scope, chains, cost. |
| 2.3 | [Knowledge and memory](docs/02-workspace/03-knowledge-and-memory.md) | Knowledge bases, team memory, saved plans, decision records, and keeping them fresh. |
| 2.4 | [Tools and MCP](docs/02-workspace/04-tools-and-mcp.md) | How tool use works, designing tools an agent uses well, the Model Context Protocol, building your own server. |
| 2.5 | [Hooks, guardrails and security](docs/02-workspace/05-hooks-guardrails-and-security.md) | Prompt injection, permissions, hooks that block, secrets handling, and why guardrails reduce risk rather than remove it. |

### Part 3: Building agents

What an agent is underneath, and how to build or extend one.

| # | Chapter | What it covers |
|---|---|---|
| 3.1 | [The agent loop and its primitives](docs/03-agents/01-agent-loop-and-primitives.md) | A model calling tools in a loop: identity, context, memory, tools, stop conditions. |
| 3.2 | [Build your own agent](docs/03-agents/02-build-your-own-agent.md) | When it is worth it, a minimal architecture, a worked example, and adding a custom role agent to an existing harness. |
| 3.3 | [Subagents and multi-agent work](docs/03-agents/03-subagents-and-multi-agent.md) | Delegation mechanics and costs, briefing, worktrees, architectures, and when one agent is the better design. |
| 3.4 | [Reliability, observability and evals](docs/03-agents/04-reliability-observability-evals.md) | Traces, cost, eval sets built from real failures, and a ladder from no evals to evals in CI. |

### Part 4: Delivery with agents

The engineering process once agents write most of the code.

| # | Chapter | What it covers |
|---|---|---|
| 4.1 | [Intent, specs and decomposition](docs/04-delivery/01-intent-specs-and-decomposition.md) | Turning messy input into requirements, acceptance criteria as observable outcomes, slices that merge on their own. |
| 4.2 | [The delivery loop](docs/04-delivery/02-the-delivery-loop.md) | Explore, plan, execute, feedback; plans as files, work as issues; workflows over tool piles. |
| 4.3 | [Verification and quality gates](docs/04-delivery/03-verification-and-quality-gates.md) | Proving a change works in the running product, reading the system diff, gates that must be deterministic. |
| 4.4 | [PR review with agents](docs/04-delivery/04-pr-review-with-agents.md) | Self-review before push, agent peer review, size budgets, thread resolution, and what humans still decide. |
| 4.5 | [Learning after release](docs/04-delivery/05-learning-after-release.md) | Signals, synthesis and decisions after shipping, and feeding them back into specs and rules. |

### Part 5: Autonomy

Agents that work without you watching.

| # | Chapter | What it covers |
|---|---|---|
| 5.1 | [Autonomous systems](docs/05-autonomy/01-autonomous-systems.md) | Runtime, state, control, observation and recovery; raising autonomy one notch at a time. |
| 5.2 | [Portable agent config](docs/05-autonomy/02-portable-agent-config.md) | Roles, prompts and knowledge as files that move between harnesses, machines and models. |
| 5.3 | [Orchestrating agent teams](docs/05-autonomy/03-orchestrating-agent-teams.md) | Planner, worker, critic, integrator: coordination through files, parallelism without collisions, supervision. |
| 5.4 | [Events, hooks and pipelines](docs/05-autonomy/04-events-hooks-and-pipelines.md) | Triggers, scheduled agents, pipelines with checks, and notifications that reach you when you are needed. |
| 5.5 | [Self-improving systems](docs/05-autonomy/05-self-improving-systems.md) | Collecting feedback, evaluating changes to the setup, distilling corrections into rules, and governance. |

### Part 6: Field guides

Where the ideas meet practice.

| # | Chapter | What it covers |
|---|---|---|
| 6.1 | [The AI-first transition playbook](docs/06-field-guides/01-ai-first-transition-playbook.md) | A ladder of eight rungs (0 to 7) for moving an existing project, with exit checks and signs you climbed too fast. |
| 6.2 | [Blueprint: always-on remote setup](docs/06-field-guides/02-always-on-remote-setup-blueprint.md) | Laptop, VPS and phone: sessions that keep running, notifications, secrets, and the weak points to check. |
| 6.3 | [Working habits and anti-patterns](docs/06-field-guides/03-working-habits-and-anti-patterns.md) | The human side: habits that save time with an agent, and the ones that quietly cost it. |
| 6.4 | [FAQ](docs/06-field-guides/04-faq.md) | Short answers to the questions developers actually ask, by topic. |

### Reference

| File | What it is |
|---|---|
| [Adoption catalogue](docs/reference/adoption-catalog.md) | Every practice from every chapter in one table, with effort and first step. |
| [Glossary](docs/reference/glossary.md) | The vocabulary, one line each. |
| [Resources](docs/reference/resources.md) | Every external link the chapters recommend. |
| [`skills/`](skills/) | Twenty-one ready-to-use agent skills, most with a small checking script: finishing on a check, delegating, keeping the review queue moving, proving a change works, running unattended, and more. |
| [`templates/`](templates/) | Starter files: instruction file, rule, skill, review skills, story and plan templates, hooks, remote-setup units. |
| [`prompts/`](prompts/) | The two audit prompts and the guided-reading prompt in full, with follow-ups. |

## Suggested reading paths

- **New to coding agents:** 1.1 → 1.2 → 2.1 → 6.3, then the workspace audit prompt.
- **Daily user who wants more leverage:** 2.2 → 2.5 → 3.3 → 4.3 → 6.2.
- **Tech lead bringing a team along:** 6.1 → 2.1 → 4.1 → 4.4.
- **Building your own agent or MCP server:** 3.1 → 3.2 → 2.4 → 3.4.
- **Going unattended:** 5.1 → 5.4 → 6.2 → 5.3 → 5.5.

## How the chapters are built

Every chapter except the FAQ has the same skeleton, so you and your agent always know where to look:

- **Read this when**: the situations the chapter is for.
- **The body**: organised around what you are trying to do, with examples.
- **Common mistakes**: what goes wrong and what to do instead.
- **Adopt this**: a table of concrete practices, each with an ID (for example `SKL-3`), where it applies (`Project`, `Workspace`, `Team`), effort (`S` under an hour, `M` about a day, `L` several days or ongoing) and a first step.
- **Resources**: public links worth opening.

The [adoption catalogue](docs/reference/adoption-catalog.md) is generated from the "Adopt this" tables with `node scripts/build-reference.mjs`.

## The one idea, if you read nothing else

An agent makes writing code cheap. It does not make knowing the code is right cheap. So a transition that works adds things in this order: **context** (the agent knows your project), then **checks** (you find out quickly when it is wrong), and only then **output** (more work with less of your attention). Do it in the other order and you get more code, more review and more bugs. The [transition playbook](docs/06-field-guides/01-ai-first-transition-playbook.md) turns that into steps.

## Caveats

- **Written in late 2026.** Harnesses change monthly. The ideas age well; config keys and flags do not. Where a chapter shows a setting, check it against your installed version.
- **Examples lean on Claude Code.** Most practices carry over to Codex, Cursor, Pi and other harnesses; chapters say where they do not.
- **Numbers are examples.** Thresholds, budgets and intervals are illustrations. Choose your own and measure.
- **Guardrails reduce risk, they do not remove it.** Read [the security chapter](docs/02-workspace/05-hooks-guardrails-and-security.md) before you give an agent more permissions.

## Contributing

Corrections and additions are welcome through issues and pull requests. Keep the chapter skeleton, keep it free of company and personal names, and run `node scripts/build-reference.mjs` after changing an "Adopt this" or "Resources" section or a FAQ question (it also regenerates the FAQ index).

## Licence

[MIT](LICENSE). Copy the skills, templates and prompts into your own projects, private or commercial, and adapt them as you like.
