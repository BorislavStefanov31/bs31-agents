# Knowledge and memory

> Agents start every session with no memory of the last one, so whatever your team has learned must live somewhere an agent can reach. This chapter sorts that knowledge into kinds (team memory, saved plans, decision records, generated maps, personal memory), says where each belongs and who keeps it current, and explains how an agent actually finds a note. After reading it you can set up a small knowledge layout in a repository and keep it from going stale.

**Read this when:**
- You corrected the agent in one session and it made the same mistake in the next.
- Plans and decisions live in chat threads and vanish with them.
- Your wiki is in a hosted tool that your agent reads badly or cannot write to.
- The agent answered confidently from a note that was out of date or incomplete.

## Start from the code, then write down what code cannot say

The codebase is the first knowledge system. An agent can read it, search it and run it, and it is never out of date. So before writing a note, ask whether the problem is that the code is confusing. A note that explains tangled code leaves the code tangled, and the agent still has to work in it. Simplify first.

What code cannot say is worth writing down:

- **Why** something is the way it is, and which alternatives were rejected.
- **Domain rules** that live in people's heads or in a specification elsewhere.
- **What is planned**, what is in progress, and what was dropped.
- **Where the truth is** for things kept in other systems.

A knowledge base for agents has one more job than a wiki for people. A person brings background and notices when a page feels incomplete. An agent searches, finds three notes that look complete, and answers, without ever reaching the fourth note that explains the context. You cannot make that impossible. You can make it less likely, and most of this chapter is about how.

## The kinds, and where each lives

| Kind | Example location | Who writes it | When the agent sees it |
|---|---|---|---|
| Instruction file | `AGENTS.md` | People | Every session ([chapter](01-instruction-files-and-rules.md)) |
| Path-scoped rules | `.claude/rules/` | People | When it touches matching files |
| Team memory | `.claude/memory/<topic>.md` | Agents and people, reviewed in PRs | When a skill or pointer sends it there |
| Saved plans | `.claude/plans/PROJ-123-<name>.md` | The planning skill, after confirmation | When work on that ticket starts |
| Decision records | `docs/adr/0007-<title>.md` | People, or agents with a human sign-off | When a rule or plan cites them |
| Generated maps | `.claude/reference/<area>/` | A script | When a question is about that area |
| Personal memory | Outside the repository, per user | The harness | Its index loads at session start |

The folder names are one possible choice. What matters is that each kind has exactly one home and the instruction file says where it is.

## Files or a hosted platform?

| | Plain text files in git | Hosted platform (wiki, docs suite) |
|---|---|---|
| Agent reads and searches | Native: grep, read, follow links | Through a connector; often partial (images, comments and embeds get lost) |
| Agent writes | Edits a file, opens a PR | Often awkward or unavailable |
| Review and history | The same as code | The platform's own |
| Permissions, live co-editing, non-technical editors | Weak by default | Strong |

A workable split: keep the core that agents depend on as files, and treat hosted tools as bridges for the people who need them. Do not sync in both directions. For anything already well maintained elsewhere (the tracker, the product specification), keep a **pointer note** that says what lives there and how to fetch it, not a copy.

Markdown is the default format because every model reads and writes it well. A few additions earn their place:

- **Frontmatter** for facts about the note: where it came from, when it was last verified, who owns it. The [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) is one specification for this that stays plain Markdown.
- **HTML** when a person needs a rendered explainer more than an editable source.
- **MDX or svx** (Markdown that can embed components) when a page should show an overview first and let the reader open details: a live checklist, a schema browser. The source stays readable for the agent.
- **Sidecar text** for images and PDFs. Text search does not see inside them, so put a short description file beside each one.

A static-site generator such as [Astro](https://astro.build/) can turn the same files into a site for human readers, and an editor such as [Obsidian](https://obsidian.md/) works as a reading view while the agent does the writing.

## Team memory: one file per topic

Team memory is committed domain knowledge that is too long or too narrow for the instruction file and is not a rule. One topic per file, named for what you would search:

```
.claude/memory/
  job-catch-up-after-downtime.md
  invoice-rounding.md
  tenant-onboarding.md
```

While the folder holds a handful of files it needs no index; the file names are the index. Give it a writer and a moment of writing, which is what most wikis lack: the planning skill reads the relevant files before it analyses an epic, and after the plan is confirmed its last phase adds or updates a file when it learned something new.

A good topic file is short, states its facts with their source, and says how to check that it is still true. Copy [`templates/team-memory-topic.md`](../../templates/team-memory-topic.md).

What does not belong: anything the code shows, anything that is really a rule (make it a rule, so it loads by path), and raw copies of tickets or chat. Distil those; do not paste them.

## Saved plans

A plan written into chat is gone when the session ends. A plan in one long ticket gets worked top to bottom by one agent, including the parts that should have waited. Save the confirmed plan as a file:

```
.claude/plans/PROJ-123-export-api.md
```

Write one per epic or story, from the planning skill, once the named approver confirms. Put the ticket key in the file name, so the build skill finds its plan with a directory listing, not a search. Have each plan name the pull requests the story will open and a size budget for each, and have the later self-review hold the PR to that budget: the plan is a contract, not a note.

Plans also give an agent the wider view. Kept with a status (planned, active, done, dropped), or moved to a `done/` folder when finished, they let an agent on one task see what shipped before and what is coming next, and design for it. [Intent, specs and decomposition](../04-delivery/01-intent-specs-and-decomposition.md) covers how to write a plan; this chapter only says where it lives.

## Decision records

An architecture decision record (ADR) is a short numbered file for one decision: the context, the decision, the alternatives considered, and the consequences.

```markdown
# 0007 · One queue per tenant

- Status: accepted · 2026-10-12 · amends 0003

## Context
A single shared queue let one tenant's backlog delay everyone.

## Decision
Each tenant gets its own queue. Workers pull round-robin.

## Considered
- Priority lanes on the shared queue: fairer, but still one backlog to drain.

## Consequences
Queue count grows with tenants; the dashboard groups by tenant.
```

ADRs suit agents for three reasons. They are small enough to read whole. They are stable: a superseded record is marked and kept, never rewritten, so links stay valid. And a rule can cite one in a few characters ("No client-side state (ADR 0004)"), which gives the rule its reason without repeating it. Agents are also good at drafting them, as long as a person accepts the status change. Copy [`templates/adr-template.md`](../../templates/adr-template.md).

## Personal memory versus team memory

Most harnesses keep a memory for you: notes the agent saves about your preferences and corrections and loads in later sessions. In Claude Code, as of late 2026, this is a per-repository folder under `~/.claude/projects/`, with a `MEMORY.md` index that loads at session start and topic files read on demand. It is local to your machine.

| | Personal memory | Team memory |
|---|---|---|
| Lives | On your machine, outside git | In the repository |
| Written by | The harness, as you work | A skill step or a person, through a PR |
| Reviewed | By nobody unless you open it | Like code |
| Good for | How you like to work, corrections to the agent's habits, where you keep things | Domain knowledge every teammate's agent needs |

The mistake to avoid is letting project knowledge settle in personal memory. Your agent then knows the retry policy and your colleague's does not. When the agent saves something a teammate would need, move it into team memory or a rule. Open the personal memory folder now and then; it accumulates stale entries like any other notes.

## Generated maps

Some reference material is too large and too volatile to write by hand, and too scattered for an agent to rebuild in each session. Generate it.

A typical case: the user interface lives in a different repository from the backend. An agent working in the backend cannot see which page calls which route, so when it is asked "what does a user see?" it guesses, or answers from whatever UI code happens to be nearby. A script can generate a map of the UI that shows which page calls which backend route:

```markdown
<!-- GENERATED by .claude/scripts/ui-map.js. Do not edit; rerun the script. -->
| Page | UI route | Backend calls |
|---|---|---|
| Orders list | `/orders` | `GET orders-service /api/orders` |
| Order detail | `/orders/:id` | `GET orders-service /api/orders/{id}`, `GET audit-service /api/events?order={id}` |
```

The instruction file then tells the agent to answer such questions from that map. If the repository also holds a retired implementation next to the current one, say there which is authoritative.

Rules for generated reference: a header that says it is generated and how to regenerate it, a script in the repository, no hand edits, and regeneration tied to something that happens anyway (a CI job, a release step). This is the one kind of "map of the code" worth keeping, because a machine keeps it true.

## Keep it fresh

Stale knowledge is worse than none: the agent has no reason to doubt it. Three habits help.

**Give every kind an owner and a trigger.**

| Kind | Updated by | When |
|---|---|---|
| Team memory | The planning or implementing skill's knowledge-capture step | After a plan is confirmed or a surprise is found |
| Plans | The planning skill | On confirmation; status changes on merge |
| ADRs | The person who made the decision | When it is made or superseded |
| Generated maps | The script | On a schedule or in CI |
| Rules and instruction file | Whoever fixes the incident | In the same PR as the fix |

**Stamp what can expire.** A note that quotes thresholds or versions should say what it was verified against (a commit, a date) and point to the file that holds the live value, so a reader can re-check in one step. When a system changes several times a day, the stamp is the difference between a reference and a trap.

**Let agents do the upkeep, through review.** Upkeep is the tedious work people skip, and an agent will do it on a schedule. Useful routines:

- One inbox. Everything new lands in one folder; an agent files it and links it to what exists.
- A scheduled health check that merges duplicates, fixes broken links and lists notes whose stamp is old.
- Events as triggers: a merged PR is a reason to ask "does team memory or a rule need a line?".

Keep each routine simple, and send its changes through a PR like any other change. An autonomous cleanup that quietly deletes the one note that mattered is the failure to design against. [Events, hooks and pipelines](../05-autonomy/04-events-hooks-and-pipelines.md) shows how to wire the triggers, and [Learning after release](../04-delivery/05-learning-after-release.md) covers what to capture.

You can also let the agent propose the structure, since it will be the main reader and writer. Give it the purpose and the constraints, ask for a few candidate layouts, test each with a fresh session ("find out how we handle X"), and keep what a cold agent navigates best.

## How the agent finds things

Retrieval is a loop: the agent searches, reads, and searches again until it decides it has enough. Build for the cheap methods first.

1. **Pointers in the instruction file.** A line such as "Plans: `.claude/plans/<key>-<name>.md`. Decisions: `docs/adr/`." turns a search into a lookup.
2. **Names that carry the key.** Ticket keys in plan names, topics in memory file names, numbers in ADRs.
3. **Text search.** `grep` and `ripgrep` over files work very well for code and Markdown, and the agent retries with new terms when the first try misses. They see nothing inside images and PDFs.
4. **Index and summary files.** For a few hundred notes, an index the agent maintains (one line per note) is usually all the search engine you need.
5. **Semantic search.** An embedding model turns text into vectors so that a query can match notes that share meaning but no keywords. It needs an index, long notes must be split, and "similar in meaning" is not "relevant": a history of your deploy tooling can outrank the deploy runbook. Add it when you have evidence that keyword search is failing, and prefer hybrid search (both methods together) when you do.
6. **A small fast model as a file picker.** Tools such as [jevgrep](https://github.com/dzhng/jevgrep) put a cheap model in front of the search to name the likely files, which cuts exploration time in large trees.

Then design the notes so that a partial read does not mislead. Link each "how" note to its "why" note. Put the context a folder depends on in that folder's index or README, where a listing shows it first. Say in a note what it does not cover. For work that continues across sessions, have the agent write a short hand-off file (what is done, what is next, what to read) so the next session starts from a page, not from an exploration.

## Common mistakes

- **Documenting confusing code instead of fixing it.** The note ages; the confusion stays. Simplify the code and delete the note.
- **A hand-written map of files and modules.** It is wrong within weeks. Generate maps or leave them out.
- **Two homes for one kind of document.** When the instruction file names one folder for plans and the planning skill saves to another, plans end up split between the two and the agent searches the wrong one. Pick one and fix every reference.
- **Project knowledge in personal memory.** It helps one person's agent. Move it to the repository.
- **Copying tickets and chat into the knowledge base.** Volume hides the signal. Distil to the decision or the rule.
- **Two-way sync with a hosted wiki.** Conflicts and silent loss. One source of truth, with pointers.
- **Notes with no date and no owner.** Nobody can tell whether to trust them. Stamp them.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| KNW-1 | Add a "where things live" block to the instruction file naming the single home of plans, decisions, team memory and generated reference | Project | S | List the four folders in `AGENTS.md`, creating the ones that do not exist |
| KNW-2 | Save every confirmed plan as a committed file named with its ticket key | Project, Team | S | Save the plan from your current task as `.claude/plans/PROJ-123-<name>.md` and commit it |
| KNW-3 | Record each architectural decision as a numbered ADR and cite ADR numbers from rules | Project, Team | S | Copy `templates/adr-template.md` and write up the last decision your team argued about |
| KNW-4 | Start a team memory folder with one file per topic of domain knowledge, written through PRs | Project, Team | M | Copy `templates/team-memory-topic.md` and write the topic you last explained to an agent twice |
| KNW-5 | Review your personal agent memory and move anything a teammate's agent would need into the repository | Workspace | S | Open the harness memory folder for your main project and sort entries into keep, move and delete |
| KNW-6 | Stamp notes that quote versions or thresholds with what they were verified against and a pointer to the live value | Team | S | Add a `verified:` line to the three notes your agent reads most |
| KNW-7 | Give each knowledge kind an owner and a trigger, with a knowledge-capture step at the end of the planning skill | Team | M | Add a final step to your planning skill: "update or add a team memory file if you learned something new" |
| KNW-8 | Replace hand-written maps with generated reference files that carry a "generated, do not edit" header | Project | L | Pick the question agents answer wrongly most often and write a script that extracts the answer from the source |
| KNW-9 | Schedule an agent health check of the knowledge folders that reports duplicates, broken links and old stamps as a PR | Team | M | Run the check once by hand as a prompt and read what it proposes |

## Resources

- [Architectural Decision Records](https://adr.github.io/): the ADR practice, templates and tooling.
- [Claude Code: how Claude remembers your project](https://code.claude.com/docs/en/memory): how personal auto memory is stored, loaded and audited.
- [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md): Markdown with frontmatter that records a note's source, trust and freshness.
- [jevgrep](https://github.com/dzhng/jevgrep): a CLI that uses a small fast model to find relevant files for a coding agent.
- [Obsidian](https://obsidian.md/): a Markdown editor that works well as the human reading view over a folder of notes.
- [Astro](https://astro.build/): a static-site generator for publishing the same Markdown or MDX files as a website.
