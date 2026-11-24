# FAQ: Context, instructions and memory

### Why does my agent ignore parts of a long system prompt?

Often it is not ignoring them. It is following a different instruction that conflicts. The system prompt is sent on every model call, so everything in it competes for attention on every turn, including turns where it is irrelevant. A prompt assembled from many fragments (rules, examples, partial templates), plus loaded files and the user's message, easily contains contradictions. The model picks one side, and it looks like disobedience.

Fixes:

- Keep in the system prompt only what the model must know on every call, as short as you can make it.
- Move the rest into skills or reference files that load when the task calls for them.
- Review what your coding agent writes. Agent-written prompts are verbose, and when you ask a coding agent to add a feature to another agent, its first move is to append a paragraph to the system instructions. Stop it and put the behaviour where it belongs.

See: [Instruction files and rules](../../02-workspace/01-instruction-files-and-rules.md)

### The shared instruction file in a repo tells the agent things I disagree with. Can I override it just for me?

Yes, with a local file that Git never sees. Claude Code reads a `CLAUDE.local.md` next to the shared `CLAUDE.md` (as of late 2026; confirm in the memory documentation of your harness). Ignore it globally so it can never be committed in any repo:

```sh
git config --global core.excludesFile ~/.gitignore_global
echo "CLAUDE.local.md" >> ~/.gitignore_global
```

You now have a private layer in every project for preferences that differ from the team's: a different test command, a tone, a rule that gets in your way.

Use it sparingly. If your override would help everyone, propose it for the shared file. If it contradicts a rule that protects the codebase, talk to the person who wrote the rule.

See: [Instruction files and rules](../../02-workspace/01-instruction-files-and-rules.md)

### My system is spread over many repositories. How do I give an agent the whole picture?

Harnesses assume one folder is the project, so make one. Create an umbrella repository on your machine that holds each service as a Git submodule, and add a root instruction file that says what every module is, how they call each other, and what each expects (test command, release order, owners). Work from that root. You do not have to share the umbrella with anyone.

This fixes navigation, not delivery. A change that spans three services is still three pull requests and three releases to time. If that hurts every week, it is a signal to move the pieces that change together into one repository.

The general rule: a layout that is hard for a new human to understand is hard for an agent too. Reshaping the code towards what agents handle well is usually cheaper than teaching every session your layout.

See: [Instruction files and rules](../../02-workspace/01-instruction-files-and-rules.md)

### Who should trigger compaction: the provider, the harness or my own agent?

Compaction means replacing older conversation history with a summary to free up the context window. The model side does it automatically when the window fills, but do not wait for that. The harness, or your own agent code, knows what the task is and what must survive. The automatic pass does not.

Two rules:

1. Compact before the automatic pass fires, at a threshold you can configure. Around three quarters of the window is a reasonable default; let users move it earlier or later.
2. Before compacting, persist anything worth keeping (decisions, open items, file references) somewhere outside the conversation.

Treat this as scaffolding with an expiry date. As models get better at summarising their own history, check whether your custom handling still earns its place. If you build on an agent framework, use its compaction instead of writing your own.

See: [Context engineering](../../01-foundations/02-context-engineering.md)

### What do I do with a week-long session that has been compacted dozens of times?

Mine the session log, not the live context. Harnesses write the full transcript to disk (commonly a JSONL file). Compaction only shrinks what the model sees; the log still has everything.

A process that works:

1. Have an agent read the log and map the topics the session covered.
2. Let it propose focused agents or skills, one per topic. Build nothing until you choose.
3. For each one you pick, generate a definition that carries the findings, the file references and the vocabulary for that topic.

An agent that starts with the research already loaded can often run on a small, cheap model. Next time, split earlier: one conversation per area of expertise.

Do not expect fully automatic capture to replace this. An agent that sits in your meetings and reads your chat and email to build a "second brain" still gives mediocre results.

See: [Knowledge and memory](../../02-workspace/03-knowledge-and-memory.md)

### How does an agent learn my preferences without me writing them all down?

Through the record of what you rejected. An instruction file only says what you want. A session history also shows the nine options you turned down and the one you kept, and that contrast tells the agent much more.

To make use of it:

- Ask for several options instead of one answer, and say which you picked and why.
- Keep session transcripts. Do not clear them out as clutter.
- When starting related work, point the agent at earlier sessions: "look at how I customised X last month and apply the same taste here".
- Customise your tools through the agent. Each request is one more data point about how you work.

This is also the weakness of a spec-only workflow: a spec records the constraints and loses everything you considered and discarded.

See: [Context engineering](../../01-foundations/02-context-engineering.md)

### Should memory capture and session reflection be automated?

Not fully, for a project. Automate the proposal and keep the approval with a person.

- **Memory.** A side process watches the main conversation, notices decisions and adds them to a backlog. You accept an item into a plain Markdown memory file or dismiss it. For a team, route a proposal to several people and save it only when they agree.
- **Reflection.** At a checkpoint (a feature merged, a bug closed, an experiment abandoned), ask the agent to read back over the session and extract what should change: a rule, a glossary term, a skill. These are the moments where you steer the system, so run them by hand.

Why a person: every saved rule narrows what the model will try, and many hard problems are solved by a change of perspective that a wall of old rules prevents. Unreviewed memory also fills with stale decisions. Keep it small.

For search and indexing over the Markdown files, an open-source tool such as Basic Memory adds it, and it is simple enough to build yourself.

See: [Knowledge and memory](../../02-workspace/03-knowledge-and-memory.md)

### What is the first document to write for a project, and why a glossary?

A glossary, because words do not carry a stable meaning between you and the model. People disagree on what "harness", "sub-agent" or "workspace" mean, domain nouns are worse, and the model's reading can shift between sessions. As a project grows, you and the agent also invent names that drift, until "booking", "reservation" and "stay" mean the same thing in three files.

Before any spec, describe the product to an agent and have it list the core terms, one definition each, and how they relate:

```text
I want to follow domain-driven design principles in this project.
Start by interviewing me about the product, then write GLOSSARY.md
with the terms we agree on.
```

Have the agent load that file, and use the words the same way in prompts, code and issues. The payoff is shorter prompts, fewer features built on a misunderstanding, and people and agents pointing at the same boxes. Domain-driven design is the practice to read up on: it treats shared vocabulary as a design artefact.

The glossary also tests your own understanding. If you cannot name a concept precisely, you cannot ask for it precisely, and an imprecise request gets you a demo, not a system that survives a security review or real load.

See: [Knowledge and memory](../../02-workspace/03-knowledge-and-memory.md)

### Where should shared team knowledge live so it survives the next tool change?

In Markdown files in folders, either inside the repository or in a sibling repository that acts as a wiki for it. It is an unexciting answer and it holds up.

- **Portable.** Teams that buy into a hardened knowledge system get stuck when the next system arrives. Plain text moves anywhere.
- **Readable in one pass.** Models with very large context windows can take in a whole knowledge base at once. Build search tooling later if you need it; the files stay the source of truth.
- **Reviewable.** Go through the files with the team regularly.

Add one habit: when a decision is made in a pull request or a chat thread, run it against the knowledge base ("does this contradict or change anything here?"). If something is flagged, discuss it and update the file.

See: [Knowledge and memory](../../02-workspace/03-knowledge-and-memory.md)

### The code is the source of truth. Why keep architecture notes and maps at all?

Two reasons.

**Size.** Under roughly 100,000 lines an agent usually finds what it needs by searching. Somewhere between a quarter and half a million lines, search starts to eat a large share of the context window, and the agent re-implements helpers that already exist because it never found them. A short map of the building blocks and where they live costs less than exploring again in every planning session.

**Reasons.** Code cannot say why it looks the way it does, or what was left out on purpose. Only a written decision holds that.

So skip all of this for a throwaway tool of a few thousand lines. For a product you expect to maintain, start the records and the map on day one, while the codebase is still small. The line counts are rules of thumb, not measurements.

See: [Knowledge and memory](../../02-workspace/03-knowledge-and-memory.md)

### We have over a hundred decision records. How do I stop them filling every session's context?

Do not load them. An architecture decision record (ADR, a short note on one decision and its reasons) is a file in the repo that an agent opens only when it is relevant.

A pattern that works is to split planning from implementation. The planning session reads the records and the map of reusable building blocks while you discuss the feature. It then starts a separate implementer with a brief that links only the few documents that matter. The implementer's context stays small, and the cost of reading history is paid once, in the session where it informs a decision.

Keep rejected options in the records. An agent that cannot see "we considered X and said no" will suggest X again, and may go and build it.

See: [Context engineering](../../01-foundations/02-context-engineering.md)

### What do I do with a decision record that only partly replaces an older one?

No standard governs this, so choose whatever keeps the set readable.

- **Amend in place.** Edit the old record and add one line saying what changed, with the commit hash of the previous version. Git keeps the history. Purists dislike this, and it works. Add an "amended" status to your template if you want it to be explicit.
- **Compact now and then.** When records pile up, have an agent rewrite the set into the current state of every decision, delete the originals, and leave one index file listing them with the commit where they were removed. It is the same move as squashing a long chain of database migrations into one baseline.

Either way, the working set should describe the system as it is today, with the history one hop away for the rare task that needs to know how you got here.

See: [Knowledge and memory](../../02-workspace/03-knowledge-and-memory.md)

### Docs go stale and then mislead the agent. How do I keep them current?

Treat a stale document as a defect with a cause, not as a reason to stop writing documents. Three mechanisms cover most of it:

1. **End-of-task feedback.** The agent's last step is to report what slowed it down: an instruction that contradicted the code, a document that was wrong, a document that gave far more than the task needed. Each item becomes an issue, and an agent fixes it.
2. **A daily sync job.** An agent compares the day's code changes with the day's documentation changes and repairs any mismatch.
3. **A periodic audit.** Once a week an agent re-checks every decision record and map entry against the code.

Also have the planning agent write the decision record in the same conversation where the decision is made, and commit it with the change. Documentation written at that moment is the cheapest kind you will get.

See: [Self-improving systems](../../05-autonomy/05-self-improving-systems.md)
