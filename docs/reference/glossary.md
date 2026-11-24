# Glossary

> The vocabulary used across the playbook, one or two lines each, with the chapter that explains the term properly. Where the industry uses several words for the same thing, they are listed together.

## Models and context

| Term | Meaning | More |
|---|---|---|
| **LLM (large language model)** | A model that predicts the next token given the text so far. Everything an agent does is built on that one operation. | [How LLMs work](../01-foundations/01-how-llms-work.md) |
| **Token** | The unit a model reads and writes: a word piece, not a word. Limits, cost and speed are all counted in tokens. | [How LLMs work](../01-foundations/01-how-llms-work.md) |
| **Context window** | Everything the model can see for one response: system prompt, instructions, tool definitions, the conversation and tool results. It has a hard size limit and quality drops well before the limit. | [Context engineering](../01-foundations/02-context-engineering.md) |
| **Context engineering** | Deciding what goes into the context window, when, and what stays out. | [Context engineering](../01-foundations/02-context-engineering.md) |
| **Compaction** | Replacing an older part of a long conversation with a summary to free space. Detail is lost; what survives depends on the harness. | [Context engineering](../01-foundations/02-context-engineering.md) |
| **Prompt caching** | Reuse of an unchanged prefix of the context between requests, at a fraction of the price and latency. It is why changing something early in the context is expensive. | [How LLMs work](../01-foundations/01-how-llms-work.md) |
| **Reasoning effort (thinking)** | A setting for how much the model deliberates before answering. Higher is slower and costs more. | [How LLMs work](../01-foundations/01-how-llms-work.md) |
| **Knowledge cutoff** | The date after which the model has seen no training data. Anything newer must come through context or tools. | [How LLMs work](../01-foundations/01-how-llms-work.md) |
| **Model tier** | A size and price class within one model family, from small and fast to large and capable. Match the tier to the task. | [How LLMs work](../01-foundations/01-how-llms-work.md) |
| **Hallucination** | A fluent, confident statement that is not grounded in the context or in fact. Reduced by giving the model the source and a way to check. | [How LLMs work](../01-foundations/01-how-llms-work.md) |

## Harness and configuration

| Term | Meaning | More |
|---|---|---|
| **Harness** | The program around the model that runs the loop, executes tools, manages context and enforces permissions: Claude Code, Codex, Cursor, Pi and others. | [Harnesses and settings](../01-foundations/03-harnesses-and-settings.md) |
| **Session (thread)** | One conversation with an agent, stored by the harness as a transcript. | [The agent loop](../03-agents/01-agent-loop-and-primitives.md) |
| **Instruction file** | A Markdown file the harness loads at the start of every session. `AGENTS.md` is the cross-harness name; `CLAUDE.md` is Claude Code's. | [Instruction files and rules](../02-workspace/01-instruction-files-and-rules.md) |
| **Rule (path-scoped rule)** | An instruction file with a `paths:` filter that loads only when the agent works on matching files. | [Instruction files and rules](../02-workspace/01-instruction-files-and-rules.md) |
| **Skill** | A folder with a `SKILL.md` and optional scripts. Only its name and description sit in context until a request matches; then the body loads. | [Skills](../02-workspace/02-skills.md) |
| **Frontmatter** | The YAML block at the top of a skill or rule file (`name`, `description`, `paths` and so on) that the harness reads as configuration. | [Skills](../02-workspace/02-skills.md) |
| **Plugin** | A distributable bundle of skills, hooks, commands or MCP servers for a harness. | [Harnesses and settings](../01-foundations/03-harnesses-and-settings.md) |
| **Permission mode** | How much the harness asks before acting: from asking for everything to bypassing prompts. Combined with allow and deny lists. | [Harnesses and settings](../01-foundations/03-harnesses-and-settings.md) |
| **Sandbox** | An operating-system-level limit on what the agent's commands can read, write or reach on the network. | [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md) |
| **Hook** | A script the harness runs at a fixed moment in its life cycle (session start, before a tool call, when the agent wants to stop). It can observe, add context or block. | [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md), [Events, hooks and pipelines](../05-autonomy/04-events-hooks-and-pipelines.md) |
| **Team memory** | Committed files of domain knowledge shared by everyone's agent. Different from an individual's personal agent memory. | [Knowledge and memory](../02-workspace/03-knowledge-and-memory.md) |
| **ADR (architecture decision record)** | A short file recording one decision, its context and its consequences, so a later reversal has something to check against. | [Knowledge and memory](../02-workspace/03-knowledge-and-memory.md) |
| **Plan (as a file)** | A written, confirmed description of a change before code exists: slices, size budget, tests, open questions. | [The delivery loop](../04-delivery/02-the-delivery-loop.md) |

## Tools and protocols

| Term | Meaning | More |
|---|---|---|
| **Tool (tool use, function calling)** | A function the model can ask the harness to run. The definition sits in context; the result comes back as text the model reads. | [Tools and MCP](../02-workspace/04-tools-and-mcp.md) |
| **MCP (Model Context Protocol)** | An open standard for connecting agents to tools and data through servers, so one integration works across harnesses. | [Tools and MCP](../02-workspace/04-tools-and-mcp.md) |
| **MCP server** | A program that exposes tools (and other capabilities) over MCP, locally or over HTTP. | [Tools and MCP](../02-workspace/04-tools-and-mcp.md) |
| **Deferred tool loading (tool search)** | Keeping tool definitions out of context until the agent searches for them, to save tokens when many tools are connected. | [Tools and MCP](../02-workspace/04-tools-and-mcp.md) |
| **A2A (Agent2Agent)** | An open protocol for agents built by different parties to discover and call each other. | [Subagents and multi-agent work](../03-agents/03-subagents-and-multi-agent.md) |
| **Prompt injection** | Text in a file, web page, issue or tool result that tries to give the agent instructions. Content the agent reads is data, never a command. | [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md) |
| **Guardrail** | Any mechanism that limits what an agent can do or checks what it did: permissions, hooks, policies, input and output checks. Guardrails reduce risk; none removes it. | [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md) |

## Agents

| Term | Meaning | More |
|---|---|---|
| **Agent** | A model calling tools in a loop until a stop condition is met. | [The agent loop](../03-agents/01-agent-loop-and-primitives.md) |
| **Agentic loop** | The cycle itself: the model responds, the harness runs any tool calls, results go back in, repeat. | [The agent loop](../03-agents/01-agent-loop-and-primitives.md) |
| **Stop condition** | What ends the loop: the model has no more tool calls, a limit is hit, or a check passes. | [The agent loop](../03-agents/01-agent-loop-and-primitives.md) |
| **Done-check** | A command whose result decides whether the task is finished, instead of the agent's own opinion. | [The agent loop](../03-agents/01-agent-loop-and-primitives.md) |
| **Subagent** | A second agent started by the first for one task, with its own context. The parent sees only its final report. | [Subagents and multi-agent work](../03-agents/03-subagents-and-multi-agent.md) |
| **Fork** | A subagent that starts with a copy of the parent's context instead of an empty one. | [Subagents and multi-agent work](../03-agents/03-subagents-and-multi-agent.md) |
| **Worktree** | A second working directory of the same git repository on its own branch. Lets parallel agents edit without colliding. | [Subagents and multi-agent work](../03-agents/03-subagents-and-multi-agent.md) |
| **Orchestrator** | The agent (or script) that splits work, hands it to workers and joins the results. | [Subagents and multi-agent work](../03-agents/03-subagents-and-multi-agent.md) |
| **Role agent** | An agent with a fixed job and prompt in a standing team: planner, worker, critic, integrator, reviewer. | [Orchestrating agent teams](../05-autonomy/03-orchestrating-agent-teams.md) |
| **Fan-out** | One agent starting many subagents at once. Fast, and expensive in tokens. | [Skills](../02-workspace/02-skills.md), [Subagents and multi-agent work](../03-agents/03-subagents-and-multi-agent.md) |
| **Trace** | The record of one agent run: every model call, tool call and result, with timing and cost. | [Reliability, observability and evals](../03-agents/04-reliability-observability-evals.md) |
| **Eval** | A repeatable test of agent behaviour: a set of cases with checks, run whenever a prompt, skill or model changes. | [Reliability, observability and evals](../03-agents/04-reliability-observability-evals.md) |
| **Model-graded check (LLM judge)** | An eval check where a model scores the output against a rubric, used where a deterministic check is not possible. | [Reliability, observability and evals](../03-agents/04-reliability-observability-evals.md) |

## Delivery

| Term | Meaning | More |
|---|---|---|
| **Acceptance criteria** | What a user, operator, report or test can observe when the work is done. Outcomes, not implementation instructions. | [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) |
| **Vertical slice** | A piece of a feature that cuts through every layer and can merge on its own. The opposite of a split by layer. | [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) |
| **Merge-alone test** | The question asked of each story: could it merge with every other story abandoned? | [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) |
| **Agent-ready / needs-human** | A mark on an issue saying whether an agent can take it without a person, with the reason cited. | [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) |
| **Autonomy policy** | A written list of what an agent may do without asking, what needs approval, and from whom. | [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) |
| **Minimum design** | The smallest change that meets the story, listed as files and types with a size estimate, written before coding. | [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) |
| **Effective lines** | Hand-written production code added by a change. Tests, migrations, generated code and docs are not counted. Used for size budgets. | [PR review with agents](../04-delivery/04-pr-review-with-agents.md) |
| **Size budget** | The number of effective lines a PR may add, agreed in the plan before the code exists. | [PR review with agents](../04-delivery/04-pr-review-with-agents.md) |
| **Self-review** | The author's agent reviewing its own diff, building, testing and attesting before any push. | [PR review with agents](../04-delivery/04-pr-review-with-agents.md) |
| **Attestation** | A recorded proof that the tests ran and passed for a specific commit, which a push hook can check. | [Verification and quality gates](../04-delivery/03-verification-and-quality-gates.md) |
| **Quality gate** | A check that must pass before work moves on: types, lint, tests, build, size, PR body. The important ones are deterministic. | [Verification and quality gates](../04-delivery/03-verification-and-quality-gates.md) |
| **System diff** | Everything a change alters beyond the code diff: behaviour, data, configuration, dependencies, permissions. | [Verification and quality gates](../04-delivery/03-verification-and-quality-gates.md) |
| **Slop** | Output that works but that nobody asked for or needs: extra abstractions, duplicate paths, tests that assert whatever the code does. | [Transition playbook](../06-field-guides/01-ai-first-transition-playbook.md) |
| **Guardrail metric** | A measure that must not get worse when a release improves its target metric. | [Learning after release](../04-delivery/05-learning-after-release.md) |
| **Feature flag** | A switch that lets code merge and ship turned off, then be enabled for some or all users. | [Learning after release](../04-delivery/05-learning-after-release.md) |

## Autonomy and operations

| Term | Meaning | More |
|---|---|---|
| **Autonomy level** | How much an agent does without a person: from answering questions, through acting with approval, to running unattended. | [Autonomous systems](../05-autonomy/01-autonomous-systems.md) |
| **Runtime** | Where an agent process lives so it survives a closed terminal: tmux, a service, a server, a hosted platform. | [Autonomous systems](../05-autonomy/01-autonomous-systems.md) |
| **State (on disk)** | What a long-running agent needs to resume, kept in files and git instead of in a conversation. | [Autonomous systems](../05-autonomy/01-autonomous-systems.md) |
| **Headless run** | Running a harness non-interactively with a prompt and getting the result on standard output. Some tools exist only in interactive sessions. | [Autonomous systems](../05-autonomy/01-autonomous-systems.md) |
| **Remote control** | A harness feature that lets you watch, answer and start sessions on another machine from a phone or browser. | [Blueprint: always-on remote setup](../06-field-guides/02-always-on-remote-setup-blueprint.md) |
| **Seat** | An always-on machine set up to run agents for one person, with a non-admin worker account. | [Blueprint: always-on remote setup](../06-field-guides/02-always-on-remote-setup-blueprint.md) |
| **Tailnet** | A private mesh network between your own devices (Tailscale's term), used for SSH and previews. | [Blueprint: always-on remote setup](../06-field-guides/02-always-on-remote-setup-blueprint.md) |
| **Break-glass access** | A separate, rarely used way in (for example a dedicated SSH key on the public address) for when the normal path is down. | [Blueprint: always-on remote setup](../06-field-guides/02-always-on-remote-setup-blueprint.md) |
| **Watchdog** | A small scheduled script that checks whether something is alive and restarts it when it is not. | [Blueprint: always-on remote setup](../06-field-guides/02-always-on-remote-setup-blueprint.md) |
| **Distillation** | Turning repeated corrections and review comments into a rule, a skill, a hook or a memory entry. | [Self-improving systems](../05-autonomy/05-self-improving-systems.md) |
| **Held-out cases** | Eval cases kept away from whoever is tuning a prompt or skill, so the final score is honest. | [Self-improving systems](../05-autonomy/05-self-improving-systems.md) |
