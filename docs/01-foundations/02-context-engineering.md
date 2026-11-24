# Context engineering: what the agent sees and how to keep it useful

> An agent's behaviour is decided by the text in its context window, and you typed only a small part of that text. This chapter shows what is in the window, how quality degrades as it fills, what compaction keeps and loses, and how to split work across short threads without re-explaining everything. After reading it you can diagnose "why did it ignore that?" and set up a project so that a fresh thread gets productive in a minute.

**Read this when:**
- An agent followed a rule at the start of a session and dropped it an hour later.
- You keep one long thread per day and results get worse in the afternoon.
- You run several agents in parallel and each one rediscovers the same facts.
- You need to continue a task tomorrow, on another machine, or in another agent.

This chapter owns context-window mechanics for the whole playbook. Model-level basics (tokens, caching, effort) are in [How LLMs work](01-how-llms-work.md).

## What is in the window

Before you type a word, the harness (the program around the model, see [Harnesses and settings](03-harnesses-and-settings.md)) has already filled part of the window. More arrives while the agent works.

```
+-------------------------------------------------------------+
| System prompt             harness rules, tone, safety       |  loaded
| Tool definitions          built-in tools; MCP tools, often  |  before
|                           as names only until needed        |  your
| Instruction files         user-level and project-level      |  first
| Memory                    notes carried over from earlier   |  message
| Skills list               name + description per skill      |
| Subagent types            name + description per type       |
| Environment               cwd, OS, date, git status snapshot|
+-------------------------------------------------------------+
| Your message                                                |
| Model reasoning and replies                                 |  grows
| Tool calls and tool results   file contents, command output |  with
| Skill bodies              full text, once a skill is used   |  every
| Path-scoped rules         loaded when a matching file opens |  turn
| Harness reminders, hook output                              |
+-------------------------------------------------------------+
| Free space                                                  |
+-------------------------------------------------------------+
```

Three things to notice:

- **A greeting is not small.** With a few MCP servers (external tool connectors) and skills (instruction files loaded on demand) configured, a one-word prompt can cost around 20k input tokens. That is the fixed overhead of every thread.
- **Tool results dominate.** One file read or test run is often larger than everything you typed. Most of a long thread is text the agent fetched for itself.
- **Lists are cheap, bodies are not.** Skills and deferred tools sit in the window as one line each; the full text loads only when used. A short index up front and detail on demand is the main technique of this chapter.

Layers with their own chapter: [instruction files and rules](../02-workspace/01-instruction-files-and-rules.md), [skills](../02-workspace/02-skills.md), [knowledge and memory](../02-workspace/03-knowledge-and-memory.md), [tools and MCP](../02-workspace/04-tools-and-mcp.md).

### Ask the agent what it sees

The layout above is not secret. Ask:

```text
Do not run any tools. List the blocks of context you can see right now, top to
bottom: system prompt sections, instruction files (with paths), memory, tools,
skills, subagent types, environment info. Give a rough size for each and say
which blocks you could not see in full.
```

Run it in a fresh thread in your main project. You usually find something unexpected: a stale instruction file from a parent directory, an MCP server you forgot, two skills with overlapping descriptions. The answer is a self-report, so treat sizes as estimates. For exact numbers use the harness's own view; in Claude Code, `/context` shows a breakdown by category and names the instruction and memory files that loaded.

## In the window is not the same as used

A prompt is not a program. The model does not execute your rules line by line; it produces a continuation influenced by everything in the window. An instruction can be followed for twenty turns and then quietly dropped while it is still sitting there.

When an agent does not do what you asked, the cause is one of five, and the fix differs for each:

| Cause | How to tell | Fix |
|---|---|---|
| **Never provided.** The fact was in your head, your editor or another thread. | Ask the agent to quote the instruction. It cannot. | Provide it, and store it where the next thread will find it. |
| **Removed by the harness.** Compaction summarised it away, a large result was truncated, an attachment was passed as a name only. | It was followed before a compaction or a long tool run, not after. | Re-state it, move it to a file that reloads, or start fresh. |
| **Present but not attended to.** The window is full and the detail is buried. | Short threads obey it; long ones do not. | Shorter threads, less always-loaded text, load detail on demand. |
| **Present, noticed, not obeyed.** The model's default habit, or a competing instruction, won. | The agent can quote the rule and explain why it did otherwise. | Rewrite the rule to be specific and checkable, remove the conflict, or enforce it with a test or a hook (a script the harness runs at fixed points). |
| **Misunderstood.** A term means something else to the model, or an image or web page was read badly. | The agent paraphrases the rule and gets it wrong. | Define the term in a glossary, give an example, check what the tool really returned. |

Only some of these are under your control, so the working rule is to raise the odds and verify. Rules that must hold belong in deterministic checks: see [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md).

## How quality degrades as the window fills

Advertised window sizes describe what a model can accept, not what it handles well.

- **Retrieval holds up, reasoning does not.** Recent models can find one fact in hundreds of thousands of tokens. Combining many scattered facts into a correct multi-step change gets worse as the window fills.
- **Instruction-following fades.** Rules stated early compete with a growing pile of tool output.
- **Old mistakes linger.** A wrong assumption from turn five is still there at turn sixty, nudging later output.
- **Cost per turn rises.** Each turn re-sends the history, cached or not.

A rule of thumb that works across models: do the important work in the first 30 to 40 percent of the window, and plan to start a new thread somewhere between 30 and 50 percent. Put the usage percentage in your status line so you see it without asking (see [Harnesses and settings](03-harnesses-and-settings.md#status-line)).

There is also a hard limit: input and output share the window. If a request fills 95 percent and the reply needs more than the remaining 5, the call fails. Harnesses prevent this by trimming and summarising.

## Compaction: what it keeps and what it loses

Compaction replaces older conversation with a summary so the thread can continue. It runs automatically near the limit, and you can usually trigger it yourself.

It is lossy by design. A summary keeps "fixed the retry bug in the queue worker". It tends to drop the constraint you mentioned once, the reason an approach was rejected, and exact strings such as identifiers and error text. Repeated compaction compounds the loss: each pass summarises a summary.

What survives depends on where the text lives, not on how important it is. In Claude Code, as of late 2026:

| Content | After compaction |
|---|---|
| System prompt, project-root instruction file, unscoped rules, memory | Kept, or reloaded from disk unchanged |
| Skill descriptions | Rebuilt and re-injected |
| Conversation: your messages, replies, tool results | Replaced by a summary |
| Files the agent read or edited | Up to five are re-read, most recently modified first; large ones come back as a path only |
| Bodies of skills that were invoked | Re-injected, truncated to about 5,000 tokens each and 25,000 in total, oldest dropped first |
| Path-scoped rules and instruction files in subdirectories | Gone until a matching file is touched again |
| Text added earlier by hooks | Summarised with the rest |

Other harnesses differ. Check what yours keeps before relying on a long thread.

The practical conclusions:

- **A rule you only said in chat will not survive.** If it matters beyond the next few turns, it belongs in a file.
- **Put the most important lines at the top of a skill.** Truncation keeps the beginning.
- **Compact on your terms.** Trigger it at a natural break and say what to keep, for example `/compact keep the API contract decisions and the list of failing tests`. A compaction that fires mid-change keeps whatever the summariser guessed.
- **Rewind after a dead end.** If the last twenty turns went nowhere, go back to the turn before them instead of summarising the failed attempt.
- **Check the invariants afterwards.** Ask the agent to restate the task, the constraints and the definition of done before it continues.

### Compact, clear or start fresh

| Situation | Do this |
|---|---|
| Same task, window filling, work is going well | Compact with a focus instruction at the next natural break |
| Task finished, next task is unrelated | New thread (`/clear` in Claude Code) |
| Agent repeated a mistake twice after correction | New thread, with the correction in the first message |
| Last stretch was a dead end | Rewind to before it |
| Thread already compacted once and quality dropped | Write a handoff file, start a new thread from it |

## Keep threads short and single-purpose

One thread, one outcome: a bug fix, a review, one slice of a feature. Close it when the outcome is reached.

The objection is that a new thread has to rediscover the project. True, and that is the right problem to solve: you can engineer the cost of rediscovery down once for every future thread, including those of teammates and unattended agents:

- A short project instruction file: what the project is, how to build and test it, where things live.
- A map of deeper documents the agent can open when a task needs them.
- Skills for recurring procedures, loaded by name when relevant.
- Code that explains itself: predictable names, a README per module, tests that show intent. The best place for project knowledge is where an agent looks first.
- A handoff file for work in progress (below).

Parallel threads share nothing. If you correct one agent, the agent in the next terminal makes the same mistake, because the correction lives only in the first conversation. Fix it at the source, in code, documentation or an instruction file, and every later thread gets it.

For work that needs a lot of reading and a small conclusion, such as "find where sessions are invalidated", use a subagent: it reads in its own window and returns a summary. See [Subagents and multi-agent patterns](../03-agents/03-subagents-and-multi-agent.md).

## What to load up front and what to load on demand

Always-loaded text costs tokens in every thread and competes with the task for attention. Keep it for what the agent cannot work out cheaply.

| Load up front (instruction file, unscoped rules) | Load on demand |
|---|---|
| What the project is, in three or four sentences | Module-level documentation, through a list of paths |
| Commands to build, test, lint and run | Procedures for specific jobs, as skills |
| Product principles that should shape every change | Rules for one area, as path-scoped rules |
| Team vocabulary: a glossary of domain terms and what you call things | Tool documentation: say how to fetch it (`--help`, a docs URL), do not paste it |
| Hard boundaries: never touch X, always ask before Y | Large tool results: write to a file, read the part that matters |
| Pointers to the right-hand column | Tool schemas, through tool search where supported |

Two tests help when deciding:

1. **Can the agent get this with one command?** Directory layout, dependency versions, the list of scripts: it can read them, and its copy will be current. Leave them out.
2. **Would a new senior engineer need to be told this?** Why a module is structured oddly, which service is the source of record, what "active" means in your domain. Put it in.

A glossary earns its place: without one, the agent calls the same concept by three names in three threads.

## Tell the agent what it is missing

The interface often suggests the agent can see more than it can.

- **Files are not visible until read.** An "open" project means the agent can read files, not that it has. Name the files or the symbol to start from.
- **Attachments may be partial.** A large document is often passed as a name plus a first chunk. Ask how much of it is loaded.
- **Large results get cut.** Output beyond the inline limit goes to a file and the agent reads a slice.
- **Web pages fail quietly.** A fetch can return a login wall or an empty shell. Ask what came back before trusting a summary.
- **Your screen is not its screen.** A screenshot with an arrow and three words is often the fastest precise bug report.

Good task openings state what the agent cannot infer: the goal, the starting point, the constraint, how to verify.

```text
Goal: retries for failed webhook deliveries must stop after 5 attempts.
Start at: services/notifier/src/retry.ts and its test file.
Constraint: do not change the public config shape; other services read it.
Done when: `npm test -- retry` passes and a new test covers attempt 6.
```

When it still goes wrong, do not just correct the output. Ask: "What in your context made you choose that?" If the answer is a missing fact, add it where the next thread will find it. If it is a misleading line in an instruction file, delete the line. Each such fix removes a class of future mistakes.

## Hand off between sessions

A handoff is a short file that lets a fresh thread continue as if it had been there. Ask the agent to write it before you stop, then review it: the agent knows what it did, and you know what matters.

```markdown
**Handoff: webhook retry limit (PROJ-123)**

**Goal**
Stop retrying failed webhook deliveries after 5 attempts and mark them dead.

**State**
- Done: retry counter and limit in services/notifier/src/retry.ts; unit tests green.
- Not done: dead-letter write, metrics counter, docs.

**Decisions (do not revisit)**
- The limit is a constant, not config. Reason: config shape is read by other services.
- Attempts are counted per delivery, not per endpoint.

**Next step**
Implement the dead-letter write in services/notifier/src/dead-letter.ts,
following the pattern in services/billing/src/dead-letter.ts.

**Verify**
npm test -- notifier && npm run lint

**Open questions for the human**
- Should dead deliveries alert on-call?
```

Start the next session with one line: "Continue the work described in `docs/handoff/webhook-retry.md`." You pass a path; the agent reads the file. A session started from a handoff file can finish on a fraction of the tokens the first one used, because it has nothing to rediscover.

Rules for a handoff that works:

- **Decisions with reasons.** A list of activity does not stop the next agent from re-opening a settled question.
- **Exact values.** Copy identifiers, branch names, commands and error text verbatim. Paraphrased identifiers are how handoffs break.
- **One next step.** A list of ten invites the agent to start all of them.
- **A verification command**, so the new thread can confirm the stated state before building on it.
- **Somewhere findable.** A known folder in the repository or the issue tracker. Remove it when the work merges.

Resuming a stored session (in Claude Code, `claude --continue` or `--resume`) restores the old conversation, including its length and its dead ends. It suits a short interruption. For anything longer, a handoff file and a new thread give a cleaner window.

Handoff files cover one task. Knowledge that should outlast it belongs in the project's documents or in memory, the notes a harness extracts and reloads across threads. Memory has its own failure modes: contradicting entries, duplicates, facts attached to the wrong subject. In Claude Code the memory index loads at every session start up to a fixed size (the first 200 lines or 25KB as of late 2026), so read and prune it now and then. Details are in [Knowledge and memory](../02-workspace/03-knowledge-and-memory.md).

## Do not over-build this

Models are getting better at managing their own context. Heavy scaffolding around the window, such as custom summarisers, memory pipelines and long always-loaded rule sets, can make a newer model perform worse than it would alone, with no obvious sign of what is to blame. Keep the setup small: a short instruction file, a few skills, a docs map, a handoff habit. Every few months, rerun the context self-report and delete what the model no longer needs.

## Common mistakes

- **One thread for the whole day.** By mid-afternoon the window holds three finished tasks and their dead ends. Start a thread per task.
- **Stating an important rule only in chat.** It disappears at the first compaction. Put it in a file that reloads.
- **Putting derivable facts in the instruction file.** Directory trees and dependency lists go stale and cost tokens in every thread. Keep what cannot be read from the repository.
- **Correcting the same thing in every thread.** The correction never left the conversation. Fix the source.
- **Letting auto-compaction fire mid-change.** You get a summary you did not choose. Compact or hand off at a break.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| CTX-1 | Start a new thread for each unrelated task instead of continuing the current one | Workspace | S | Finish your current task, then clear or open a new thread before typing the next request |
| CTX-2 | Ask the agent to list its context blocks in a fresh thread and remove what should not be there | Project, Workspace | S | Paste the "list the blocks of context" prompt from this chapter into a new thread in your main repository |
| CTX-3 | Show context usage in the status line and start a new thread before it passes about half | Workspace | S | Add the model name and context percentage to your status line |
| CTX-4 | Write a handoff file before stopping any task that will continue later | Workspace, Team | S | Copy the handoff template from this chapter into `docs/handoff/` and have the agent fill it in at the end of today's unfinished task |
| CTX-5 | Compact manually at natural breaks with an instruction on what to keep | Workspace | S | At your next break in a long thread, run the compact command with one sentence naming the decisions and constraints to preserve |
| CTX-6 | Move every rule that must persist out of chat and into a file that reloads | Project | S | Scroll your last long thread for instructions you typed more than once and add them to the instruction file or a rule file |
| CTX-7 | Trim the project instruction file to non-derivable knowledge plus pointers | Project, Team | M | Delete every line the agent could reproduce with one command and add a short list of paths to deeper documents |
| CTX-8 | Add a glossary of team and domain terms to the always-loaded context | Project, Team | M | Write ten terms your team uses with a one-line definition each and link the file from the instruction file |
| CTX-9 | After an unwanted action, ask the agent which context caused it and fix that source | Workspace, Team | M | Next time it happens, ask "what in your context made you choose that?" and edit the file it names |

## Resources

- [Explore the context window (Claude Code docs)](https://code.claude.com/docs/en/context-window): what loads when, with token counts, and what survives compaction.
- [How Claude remembers your project (Claude Code docs)](https://code.claude.com/docs/en/memory): instruction file loading order, path-scoped rules and memory limits.
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices): the vendor's advice on telling the agent what it cannot see.
- [AGENTS.md](https://github.com/agentsmd/agents.md): the open, cross-harness format for the project instruction file.
- [Context Language Models](https://arxiv.org/abs/2609.37725): a paper arguing that models can manage their own working context, a reason to keep scaffolding light.
- [Agent Skills](https://agentskills.io/home): the specification for skills, the standard way to load procedures on demand.
