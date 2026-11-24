# FAQ: Multi-agent work and orchestration

### Do I still need sub-agents?

Less than you used to. Sub-agents became popular when context windows were much smaller. A sub-agent behaves like a function: you pass inputs, it runs in its own context, it returns a result, and the parent's window stays free.

With larger windows, stronger models and skills that load on demand, many of those designs collapse into one agent with a set of skills. For sequential work, a single agent usually costs less and finishes sooner.

Two cautions:

- Some tasks still suit delegation. Do not delete sub-agents on principle.
- "You no longer need them" comes from vendors testing on their best model. On a smaller model, or one your company restricts you to, the result may differ.

So do not settle it by argument. Build both versions and run evals.

See: [Subagents and multi-agent](../../03-agents/03-subagents-and-multi-agent.md)

### Subagent, role agent or separate instance: what is the difference, and which do I need?

The difference is who starts the agent and who controls it.

| Kind | Started by | Relationship to the main agent |
|---|---|---|
| Subagent | The main conversation | Child: takes a task and reports back. You mostly see only the result |
| Role agent | You | Top level: a name, one job, its own persistent conversation, model and settings |
| Critic | Runs on its own | Observes the main agent and summarises for you. The main agent cannot control it |
| Domain agent | A trigger: a file in its area changes, an endpoint is hit | Feeds information in. The main agent can cause the trigger but never calls it |

- **Subagents** spread one task across workers. Ask for them when a task splits cleanly or a long job should run in the background. Otherwise let the harness decide.
- **Role agents** replace the giant conversation that drifts across topics for weeks. Split by expertise, not by project. A specialised context can run on a cheaper model, and a teammate or another agent can reuse it.
- **Separate instances** are for independence. A reviewer that the author can instruct is not much of a reviewer.

In Claude Code, subagents are built in and can be predefined under `.claude/agents/`. Critics and domain agents are separate sessions started by hooks or events.

See: [Subagents and multi-agent](../../03-agents/03-subagents-and-multi-agent.md)

### What does every role agent need defined before it runs?

Three things, per agent, written down:

1. **Its own system prompt.** State the one domain it is expert in and what it must hand back.
2. **What it may read.** Paths, repositories, data sources. An agent that can read everything will use everything.
3. **Which tools it may call.** An explicit allowlist. Do not let it inherit yours.

A model only produces text from what you give it. A role agent behaves like a specialist because its inputs and tools are narrow. Telling it that it is a specialist does not do that.

Start each agent locked down and loosen a permission only when a real task needs it. The one exception is the agent you talk to directly, where you are present to catch mistakes and can afford wider access.

See: [Orchestrating agent teams](../../05-autonomy/03-orchestrating-agent-teams.md)

### How many agents should I run at once, and how do I keep track of them?

Fewer than social media suggests. The limit is your attention, not the tooling. Switching threads means reloading each one's context into your head, and that tires you more than the volume of work.

A shape that holds up:

- **One or two interactive sessions that you steer.** Turn anything periodic or condition-triggered into an automated job, and check only that those jobs are healthy and not waiting for you.
- **One coordinating agent for the rest.** It writes the briefs, starts implementers, follows them and reports outcomes. At first, read its briefs and open the implementer threads often. As results keep matching what you asked for, look less. Opening about one implementer thread in ten is a realistic end state.
- **Views you take in at a glance.** A status board, a diff, a preview, and short notifications with two options: act or dismiss. Products that show a row of named agents, each with its own thread, fail here, because you re-read every thread to learn where it stands.

If you stay with several threads, hide the ones still working and treat the thread list as an inbox where an item leaves only when its change has merged.

The test: can you ignore the system for an hour and then catch up in ten seconds?

See: [Orchestrating agent teams](../../05-autonomy/03-orchestrating-agent-teams.md)

### Why run extra agents in terminal panes next to the main session?

Two uses.

**Protecting the main context.** A side agent watches the main session and speaks up in its own pane. Say you tell the main agent to raise a timeout so a slow test goes green. The watcher objects that this hides a regression instead of fixing it. You settle the question there, without spending the main session's tokens or polluting its history. In the same way, a new incoming issue can open its own investigation session and leave your current work alone.

**Display.** Some panes exist to show you live information derived from the session, such as the links mentioned so far or recent commits. Unlike a sub-agent, they report to you, not to a parent agent. Think of the squiggly underline in an editor.

The mechanism is plain. A terminal workspace manager with a CLI (Herdr, or tmux) lets an agent open a pane, start another agent in it, send it a message and read the reply.

See: [Orchestrating agent teams](../../05-autonomy/03-orchestrating-agent-teams.md)

### How do I run several agents in one repository without them colliding?

Give each thread its own Git worktree (a second working directory on its own branch, backed by the same repository), created automatically when the thread starts. Then fix whatever makes a new worktree slow or broken, one item at a time:

- Environment variables missing in the new directory.
- A local database or port that two copies fight over.
- A dependency install that takes a minute before the agent can do anything.

As of late 2026, Cursor and several agent desktop apps let the repo define a script that runs on worktree creation. Put the environment setup and the install there, and run it in the background so the agent can start reading code at once. Commit it, so every teammate's worktrees improve too.

The alternative is cloud agents: a fresh machine per task and nothing to tunnel into. It costs more, and it requires a project that boots from a clean clone.

See: [Subagents and multi-agent](../../03-agents/03-subagents-and-multi-agent.md)

### When should a new project move from one thread to parallel threads?

Later than you think. Start with an empty repository and one long thread. Stay in the loop: read the reasoning, correct misunderstandings early, keep going until the thing works. One long thread carries a lot of accumulated context, and that is exactly what a young project lacks on disk.

Split when you have a concrete reason: you want three things in progress at once, or a teammate is about to contribute. The first parallel threads will stumble, because they do not know what the long thread knew. Each stumble tells you what to write into the repo: a convention, a command, a decision. Shape the instruction files from those gaps.

See: [The delivery loop](../../04-delivery/02-the-delivery-loop.md)

### How do domain agents scale to dozens of developers in one codebase?

Nobody has a finished answer; vendors are still working on it. What holds up today:

- **Draw boundaries with code ownership.** Use the `CODEOWNERS` map you already have. Each owned area gets its own memory and glossary files, maintained by its owners, and the domain agent reads those.
- **Organise around code, not people.** Staff and roles change, and agents will change roles further. The code is the stable source of truth.
- **Feed decisions back in.** Pull decisions out of pull-request discussions and local agent sessions into the area's knowledge files, through review. Raw session logs are not memory.
- **Stay light.** Markdown in the repository scales further than you expect and does not lock you in. Add a coordination service only when you can name the problem it solves.

Cross-domain dependencies stay hard. Start with the areas whose boundaries are clear.

See: [Orchestrating agent teams](../../05-autonomy/03-orchestrating-agent-teams.md)

### When would I use A2A instead of MCP or a plain API?

A2A, the agent-to-agent protocol, is for handing a task to an agent you do not control. It fits when another party will not expose its data or tools to you (no MCP server, no access rights) but does offer an agent as a service. That agent runs in their trusted environment with their tools, access and logic. To you it is a black box, possibly built on a different framework. Your agent discovers it through the capabilities it publishes, delegates the task and gets a result back.

The distinction:

- An API call asks for one specific operation.
- MCP gives your agent tools so it can do the work itself.
- A2A hands the job to someone else's agent.

It sees the most use where businesses run large closed platforms. It is also a reminder that many agents never chat with a human at all.

See: [Subagents and multi-agent](../../03-agents/03-subagents-and-multi-agent.md)
