# FAQ: Autonomy and running agents remotely

### How much autonomy should agents get, and when may they merge without a human?

It depends on the stakes and on who else has a say. Firmware for a medical device and a personal side project should not share a merge policy.

Unattended merging is responsible when three things exist:

1. **Alignment.** Decisions and building blocks are written down, so the agent builds what you would have built.
2. **Verification.** The agent has tools to prove its change works, and uses them.
3. **Limited damage.** Feature flags, backups and tested recovery mean a wrong change is an inconvenience.

The usual failure is switching on autonomy before the first two exist. Getting there:

- Start stricter than feels necessary.
- Define risk tiers and let agents merge only the lowest without a human. Low and medium may be fine on a solo project. A team product usually starts lower.
- List the kinds of change that always need a person.
- Collect evidence. Have the agent stop for approval and track how often you approve without changes. When that has been every time for a while, for a class of changes, remove the gate for that class.
- Raise the level on purpose, when guardrails and verification have improved, not when you are tired of approving.

On a team, these answers are not yours alone. Have the conversation before the tooling decides for you.

See: [Autonomous systems](../../05-autonomy/01-autonomous-systems.md)

### How do I get a repository ready for agents to ship without me reading every line?

Start with a readiness audit that changes nothing. Have an agent inspect the repository for gaps, not bugs, and record each with evidence:

- Can an agent verify its own work?
- Does one command run the same checks locally as in CI?
- Are decisions written down?
- Is there a safe way to roll back?
- Do all the tests run somewhere? Audits regularly find end-to-end specs wired into nothing.

Next, have the agent interview you instead of guessing: what it must never do, which risk levels it may merge alone, what always needs your approval, how deployment and backups work.

The result is a plan and usually one PR: verification commands, git hooks, CI workflows, issue and PR templates, decision records, a rollback document. With a decent test suite the mechanical part takes about an hour. Your answers are the hard part.

See: [Autonomous systems](../../05-autonomy/01-autonomous-systems.md)

### How do I decide, task by task, whether the agent merges on its own or stops for me?

Keep two explicit modes and choose when you write the task.

- **Finish and merge.** For changes where you already know the shape of the fix and what it touches. The agent may merge once it has verified the result to a higher bar than usual. Expect two to three times the tokens, spent on verification.
- **Go far, then stop.** For changes you want to look at. The agent does everything up to the merge and waits.

When you cannot tell which applies, ask before choosing: explain this issue simply, why does it matter to the user, what is the best fix, what risks do you see, what is the worst outcome if we merged your fix unseen? The answers usually settle it.

Encode each mode as a skill or a saved prompt, so that the bar is the same every time.

See: [Autonomous systems](../../05-autonomy/01-autonomous-systems.md)

### How do I let an agent run overnight without it breaking the system?

Give every unattended agent its own explicit permissions. Do not let it borrow yours.

- **Scope per agent.** Each one gets a list of what it may read, what it may write and which tools it may call, sized to its role.
- **Start strict.** Begin with the minimum and widen only when a real task is blocked. Tightening after an accident is harder.
- **Protect the agent from itself.** Its own config, instruction files and permission settings should be read-only to it.
- **Loosen only where you are present.** Wide permissions are acceptable for the agent you talk to, because you see each step.
- **Verify the walls.** Before the first overnight run, have another agent try to break out in a sandbox.

A prompt that says "do not touch system config" is a request. A permission that denies the write is a guarantee. Use the second for anything that runs while you sleep.

See: [Autonomous systems](../../05-autonomy/01-autonomous-systems.md)

### What makes a long unattended run succeed?

A hill to climb. Agents handle problems that have a measurable target and a way to check progress: a benchmark, a test suite, an eval score, a visual check. Shape the task that way and the agent keeps moving in the right direction for hours.

Practical points:

- Add verification tools, not scaffolding. Giving each agent thread its own desktop window to operate the application, with shared sign-in state, has produced clearly better results than threads that cannot see what they built.
- Run a second thread that periodically audits the first one's history, finds bottlenecks and proposes fixes.
- Watch the real constraint. On verification-heavy runs, compute for CI and test machines can cost more than the tokens.
- Set a spend cap before you walk away.

A polish loop left running for most of a day can come back mergeable, with only cosmetic complaints.

See: [Autonomous systems](../../05-autonomy/01-autonomous-systems.md)

### If I am not reading diffs, what should I be watching?

The flow of work and the exceptions.

- **A view of the pipeline.** What is planned, in progress, verified, deployed, and what each item cost. You will catch yourself asking an agent "is that live yet?" the way a project manager once asked you. A status page answers it.
- **Improvisation.** The key exception. When an agent did something that was not in the agreed plan, that change loses the right to auto-merge and gets a review.
- **A daily summary.** A scheduled script reads everything merged since yesterday and writes what changed and what deserves a look. Adjust its format until you really read it.

Accept that you will know the system at the level of how data moves through it, not which file does what. When you need detail, ask an agent to explain that part. That costs little, and it replaces a lot of anxious reading.

See: [Orchestrating agent teams](../../05-autonomy/03-orchestrating-agent-teams.md)

### Which scheduled agents are worth running?

Jobs that fight slow decay, which nobody gets around to by hand:

| Job | Cadence | What it does |
|---|---|---|
| Doc sync | Daily | Compares code changes with doc changes and fixes mismatches |
| Change summary | Daily | Tells you what merged and what needs a look |
| Friction fixer | Daily or on issue | Works through issues that other agents filed about slow or confusing steps |
| Dead-code removal | Weekly | Deletes unused code, instruments what it is unsure about |
| Cleanup follow-up | Weekly | Re-checks open cleanup issues and deletes what is now safe |
| Decision-record audit | Weekly | Verifies records and maps still match the code |

Start with one. Each job needs the same safeguards as any autonomous change: verification, a limited scope and an easy revert. Look at what the jobs produce for the first weeks before you let them merge alone.

See: [Events, hooks and pipelines](../../05-autonomy/04-events-hooks-and-pipelines.md)

### How do I manage running agents from my phone?

There are two routes.

**Cloud agents.** Each task runs in a vendor-hosted environment, so there is no machine of yours to reach and no private network to set up. You need a project that boots from a clean clone, and a budget.

**Your own machines.** Agents run on a server or a desktop you control, and you reach them over a private network such as Tailscale with a terminal multiplexer or a remote-capable agent app. It is cheaper, with more to maintain. Check that you can open the remote working directory in your editor over SSH. Reviewing code you cannot open is where remote setups fall down.

On a phone, one thread is all you can follow. Use a coordinating agent that manages the others and brings you only decisions. And design for delay: the system should keep going on other tasks while a question waits for you.

See: [Always-on remote setup blueprint](../02-always-on-remote-setup-blueprint.md)

### tmux or a multiplexer built for agents?

A terminal multiplexer keeps many terminal sessions alive in one place and lets you detach and reattach. tmux does that and nothing more. A multiplexer built for agents, such as Herdr, does the same job and adds a layer that knows what each agent is doing (working, waiting, done, failed) and publishes that state to other clients.

Choose on where you want to spend effort:

- **tmux**, if you know it well and want full control. You can rebuild the status layer yourself with an agent's help.
- **An agent multiplexer**, if you would sooner accept a good default and build on top. Status tracking is solved, and you get building blocks for your own widgets and a mobile client (maturing as of late 2026).

If the tool offers a desktop app and a terminal UI, most things work in either. Custom command bars and widgets feel more native in the desktop app, and it renders the window and the terminals separately, so one can crash without the other. Extension support can differ, so check the packages you rely on.

See: [Always-on remote setup blueprint](../02-always-on-remote-setup-blueprint.md)

### Which terminal customisations pay off for agent work?

Four have lasting value:

- **Shell configuration.** Aliases and functions for starting agents with the right flags, split across files so an agent can edit one without touching the rest.
- **Keyboard shortcuts** for the actions you repeat most: new agent pane, jump to the next pane that needs input, send a saved prompt.
- **Disposable terminal instances.** A command that starts a clean, isolated terminal with your tool inside it, so other agents can use that tool from the outside as a black box. This lets you test an agent setup without risking your live sessions.
- **A command bar across panes.** One search box that lists every open pane with its agent's status and jumps to it. With more than six panes, this replaces hunting through tabs.

You do not write any of these by hand. Describe the behaviour and let the agent produce the config.

See: [Always-on remote setup blueprint](../02-always-on-remote-setup-blueprint.md)

### How do I see agent status on my desktop, my phone and a client view at once?

Keep the agent state in one core service and make every screen a view of it.

The core has three parts:

- **Schemas** for tasks, agents and events.
- **Wrappers around each running agent** that know its state: in progress, done, failed, waiting for input.
- **An event stream** that any client can subscribe to and send commands back through.

Desktop, web and mobile views all read the same stream, so they never disagree. A read-only view for a client or teammate is one more subscriber.

Some agent multiplexers ship a core like this, so check before writing your own. If you do build it, start with the event schema; the views are quick to generate once that is stable.

This is the usual backend and client split: the core is the backend where the agents run, and the views are thin clients.

See: [Events, hooks and pipelines](../../05-autonomy/04-events-hooks-and-pipelines.md)
