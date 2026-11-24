# FAQ: Models, cost and choosing tools

### Which model should I use by default, and when should I switch?

Pick one strong general model at a medium reasoning-effort setting and use it for almost everything. Higher effort costs time and tokens on every turn, and medium is the working mode for most coding. Switch only for a capability the default lacks:

- **Video.** Use a model that ingests video natively. Models that sample frames and audio separately miss what happens between frames.
- **Driving a site or judging a screen.** Some model families are better at approaching an interface the way a person would. Try more than one.
- **Dense technical work.** A model that is terse and awkward to talk to can still produce excellent results. Judge the output, not the conversation.

None of this is a benchmark. It is taste you build by running several models on your own tasks. Re-test when a new generation ships.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### Should I build my own router that picks a model for each task?

Not as a first project. The subagent system in your harness has already been tuned by its vendor for cost and quality, so let it choose worker models.

Two things to know before you decide:

- **Combining models can work.** Vendors have published benchmarks in which two mid-tier models answer the same prompt, a merge step combines the answers, and the pair outscores a single top-tier model at a lower reported cost. Treat such numbers as claims until you reproduce them. If your task has a clear score, an ensemble is a cheap experiment.
- **Automatic routing has mostly disappointed so far.** That does not make the idea wrong. Ideas in this field often arrive before the models can carry them, so retry old ones after each model generation.

Budget changes the answer. With no cost limit you run the best model everywhere. When every cent counts, routing earns its complexity.

See: [Subagents and multi-agent](../../03-agents/03-subagents-and-multi-agent.md)

### How can I learn this on a personal budget?

Split your usage by how much quality matters:

- **Exploration, practice and routine edits:** a cheap or free model. Open-weight models are good enough to learn on and to do real work with. As of late 2026, Kimi and Qwen are two that hold up well.
- **The hard parts:** a frontier model. Side by side it is still noticeably better, so spend paid usage there.

For daily agent work, one flat-rate subscription usually buys far more than the same money at metered API prices. The next question covers that trade-off.

Be sceptical of workflows shown by people who do not pay for their tokens. Running several agents at maximum effort all day is a budget decision, not a technique you are failing to apply.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### Flat-rate subscription or metered API: which should I pay for?

It is a real trade-off, and it depends on who pays and what runs.

- **Interactive work on your own money: a subscription.** As of late 2026 the top individual plans of the major coding agents give many times more usage per dollar than metered API access, and you stop rationing turns.
- **Unattended or bulk jobs: the API.** Consumer plans assume a person at the keyboard. Batch runs against one are the usage pattern that gets accounts suspended.
- **Companies** usually sit on metered contracts, where heavy use is harder to justify. One option, if your data policy allows, is to expense individual plans for work that touches no customer data.

Heavy users hit plan limits. Moving up a tier or sending the overflow to API billing is a cost decision. What a plan permits is decided by the provider's terms, which change often, so read them first.

Habits that hold up:

- Compare bundles on what they include besides chat: compute hours, API credits, media generation quota.
- Pay a second vendor only for a capability the first lacks, such as video or site interaction.
- Keep an API key or another provider ready as a fallback for outages.
- Treat today's price as temporary. The cost of a given capability level keeps falling.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### Can I use my model subscription inside an open-source harness?

The provider's terms decide that, not the harness. Technically it often works: open-source harnesses reach a subscription through a login extension, and most of them share the same login logic. Whether it is permitted is a separate question. Provider policy on third-party clients has reversed more than once, including a short period of account suspensions that was later walked back, and nobody can promise that the state as of late 2026 will last.

- Read the provider's current terms before you depend on it, above all for paid work.
- If the terms allow it, use the harness's maintained login integration. Do not hand-roll one.
- Keep an API key configured. It is the supported path in every harness, and it turns a policy change into a cost, not a lost working day.

See: [Portable agent config](../../05-autonomy/02-portable-agent-config.md)

### My token bill is too high. Where do I cut first?

Cut waste before you cut ambition.

1. Ask an agent to read your local session history and report where tokens bought nothing: tool calls that failed and were retried, commands the agent had to guess, setup steps repeated in every session.
2. Take two or three of your most expensive threads and go through them with the agent. Why did this take so long? What got in the way? Which change to the repo or the tooling would have made it short?
3. Land those fixes in the repo so every later session benefits.

This often saves more than moving to a cheaper model.

Subscriptions have the opposite problem: quota that expires unused. Keep a short list of saved prompts for long, low-risk jobs (an eval run, a dependency audit, a documentation check) and start one when quota is left close to the reset.

See: [Self-improving systems](../../05-autonomy/05-self-improving-systems.md)

### What is worth spending tokens on that I would never ask a person to do?

Anything too tedious for a human that buys you confidence or attention:

- Extra verification loops that run before a change reaches you.
- A written summary every morning of everything that merged.
- An eval that tunes a prompt until its output reads the way you like.
- A weekly agent that re-checks every architecture note against the code.

Your attention and mood are the scarce resource. Tokens are not. A workflow that costs twice as much but never hands you a broken branch is the better workflow.

The habit to build is to look at a recurring annoyance and ask which loop of agent work would make it disappear. That habit is hard to form while you ration every request, which is one more reason to practise on a flat-rate plan.

See: [Working habits and anti-patterns](../03-working-habits-and-anti-patterns.md)

### How do companies keep token spend under control?

First, discount advice from people who do not pay for their tokens. Staff at model labs and sponsored creators can run everything at maximum reasoning. A "use as much as you can" directive usually lasts until the first full invoice.

What teams do in practice:

- Buy a seat-based plan sized to the team, with a higher tier or a metered API budget for the heaviest users.
- Put a gateway (a service the company runs between its harnesses and the model providers) in front of all API traffic and route by request type. Developers leave the most expensive model and the highest thinking level on by default, so a router sends routine requests to a cheaper model.
- Set spend limits per person or per kind of task at the gateway. The classic incident is an agent left looping overnight. A cap turns that from a surprise invoice into a stopped job.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### Is a terminal agent still worth it when the desktop apps do so much?

Both are good. Choose on how much you want to shape the tool.

The terminal's old weakness was configuration effort. That cost is gone, because the agent writes the shell config, keybindings and layouts for you. What remains is its strength: it runs the same on every machine, over SSH and on a phone.

A desktop app is the better fit for visual work, and for people who never need a shell.

One cost of never customising is easy to miss. Every change you ask the agent to make to your tools is recorded in your session history, including the options you turned down. That history is preference data the agent can read later. If you accept every default, the agent never learns how you like to work.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### How do I find out what my harness can do that I am not using?

Ask the agent to read the tool's own help and interview you about it. A prompt of this shape works in any harness:

```text
Run `<harness> --help` and read the settings reference.
I do not think I am using this tool to its full potential.
List the flags and options I have never used, grouped by what they enable
(tool control, model switching, orchestration, automation),
and propose three things I could build with them for this project.
```

Mature harnesses have dozens of flags that never show up in the default interface: headless modes, per-run tool allowlists, model overrides, hooks. You will not discover them by accepting the defaults.

Repeat this after major releases. It is the cheapest way to keep up.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### Should I build a custom setup on a minimal harness, or use a polished product?

Build one if you enjoy it and it removes daily friction. It is not required: people ship a great deal with an off-the-shelf harness.

A sensible split:

- Use defaults and community extensions for anything that can fade into the background.
- Own the parts that touch your whole development cycle.
- Start from friction you have always complained about. A frontier model often builds that fix in one attempt when you point it at existing extensions as references.

A minimal harness such as Pi, or an agent multiplexer such as Herdr, does one basic job and expects you to build on top, at the cost of a rougher start. Direct alternatives are few, because a competitor would end up nearly identical. Full products come from the other side and are adding plugin systems.

Three checks for any tool in this layer:

- Can the agent change its own environment (add a tool, a view, a command) when you ask?
- Is it open source, so you can read how a feature works and have your agent port it?
- Is the feature you envy a core capability, or an extension you could rebuild in an afternoon?

Switching is cheap: ask an agent to convert your config and shortcuts. The trap is tooling that builds tooling while nothing ships.

See: [Harnesses and settings](../../01-foundations/03-harnesses-and-settings.md)

### Should the team standardise on one coding agent?

Not yet. The tools overtake each other every few months, and developers resist having a harness dictated to them, so it is too early to bet a whole organisation on one.

Letting people choose has a price: every shared artefact has to work in every harness. That covers team skills, shared MCP servers, and hooks you push to every machine, such as checks that must run before a commit.

A workable rule: allow any harness that honours open standards (`AGENTS.md`, the skills format, MCP, hooks, a plugin mechanism). Then you package the team setup once and install it everywhere.

The same rule protects you personally. If moving to a new tool means rebuilding your skills and connections by hand, you will not move, even when the new tool is better.

See: [Portable agent config](../../05-autonomy/02-portable-agent-config.md)

### Models keep improving. Which parts of my setup will age badly?

Sort what you build into two piles.

**Short-lived:** scaffolding that compensates for a current model weakness. Long interview prompts that force the agent to question you, a home-grown review bot, a router that decides which instructions to load. Models are getting better at asking the right questions and at getting a change right the first time, so heavy investment here is likely to be thrown away. Use something off the shelf and move on.

**Durable:** things that give any model what it cannot know or do alone. A record of decisions and their reasons, fast tools for verifying a change, an environment that boots with one command, feature flags, tested recovery. A stronger model uses these better. It does not replace them.

When you have a free day, spend it on the second pile.

See: [AI-first transition playbook](../01-ai-first-transition-playbook.md)
