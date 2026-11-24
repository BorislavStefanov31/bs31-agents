# Intent, specs and decomposition

> Agents can write most of the code. They cannot decide what is worth building, and they do not answer for the result. This chapter shows how to turn messy requests into a cited requirements list, a short brief an agent can act on, slices that merge on their own, and a tracker where every issue says whether an agent may take it.

**Read this when:**
- Your agent builds what you typed instead of what you meant.
- Requirements arrive as voice memos, recordings, screenshots, chat threads and a backlog nobody has triaged.
- You want agents to pick up issues without you and need a written rule for which ones.

## What your job becomes

When code is cheap, three things are scarce: the decision about what to build, the bar the result must clear, and a person who answers for it in production.

**Ownership.** An agent can wake at 2 a.m. and start on an incident. It is not accountable for it. You are, and that changes how you ship: you ask for a way back, for evidence, for a tested restore. The question moves from "is the issue closed?" to "can the user now do what they needed?"

**Judgment.** Agents are good at producing options and poor at knowing which one fits your product. So ask for options, not for a solution:

```text
Before you change anything: give me numbered options.
For each: effort (small / medium / large) and whether it is easy or hard to reverse.
Recommend one. If the option you recommend is not the one you would build with
no constraints, name that one too and say why they differ.
```

The gap between "recommended" and "what I would build with no constraints" is where the real trade-off sits. Sometimes you see an option the agent missed. With "add sign-in with provider X", whether a general "connection" building block would serve the next five requests or be over-engineering is a call for someone who knows where the product is going.

**Leverage.** Whatever you do by hand today is a candidate to hand to an agent, once the result can be checked without you. Your time moves to the environment: context, checks and decisions. Measure outcomes for users, not lines generated.

## Turn messy input into one cited list

Real requirements arrive as a voice memo, a screen recording, a PDF, a whiteboard photo and a chat thread. Do not ask an agent to "summarise the requirements": a summary drops provenance and quietly settles disagreements between sources. Ask for one list in which every requirement points at the place it was stated and every conflict goes to the person who owns the decision.

1. **Inventory.** List every file with its type and length. Nothing is skipped. A file that cannot be read goes on an `unreadable` list with the reason.
2. **Read each source by its type** (table below).
3. **Extract.** One requirement per line, wording close to the source. Never merge two.
4. **Find conflicts.** Compare every pair that touches the same thing: format, scope, wording, data. Also compare each requirement with the data it governs: a record that already breaks the rule is a conflict too.
5. **Hand over** three lists: accepted, conflicts, unreadable.

| Source | How to read it | Citation |
|---|---|---|
| Audio | Transcribe with word timestamps (a local Whisper build is enough) | Second where it is said |
| Video | Transcribe the audio and also sample frames, at least one per second | Second, plus the region of the frame |
| PDF | Text and the rendered page; look for annotations and text that does not render | Page and region |
| Image, whiteboard photo | Full size, including handwriting | Region |
| Live page or board | Open it in a browser, screenshot it, note when you read it | URL and time read |
| Chat, support tickets | Export with ids | Message or ticket id |

```yaml
accepted:
  - id: R-07
    text: "The export includes the approver's name"
    source: { file: kickoff.mp4, at: 312, region: [0.10, 0.62, 0.55, 0.05] }
conflicts:
  - id: R-03
    with: R-11
    source: { file: memo.m4a, at: 18 }
    owner_question: >
      R-03 (memo, 0:18) says dates are day-first. R-11 (spec.pdf, page 2) says
      month-first. Which one holds?
unreadable:
  - { file: scan.heic, why: "no decoder installed" }
```

Three failure modes deserve a line each in the skill that runs this:

- **Positions measured on a scaled preview** come out far off. Measure on the real pixel size of the page or frame.
- **A requirement can exist only on screen**, during a silent stretch of a recording. Check every recording by ear and by eye.
- **The agent wants to pick a winner.** Tell it: "You find and cite. The owner decides." Every conflict goes back as a question, and the build covers only what is agreed.

Package the method as a [skill](../02-workspace/02-skills.md), an instruction file the agent loads when the task matches, so its closing checks run every time: every file is a source or is listed as unreadable, and every requirement appears exactly once.

## Describe intent, not steps

A brief an agent can act on has four parts: **scope**, **outcome**, **boundaries** and **proof**. It does not say how.

```markdown
## Intent
Approvers can reject an expense report with a comment.
Why: rejected reports come back unchanged because submitters cannot see the reason.

## Acceptance
- Given a submitted report, when an approver rejects it with a comment,
  then the submitter sees that comment on the report page.
- Given a rejection with an empty comment, then the form shows an inline error
  and nothing is saved.
- Given a rejected report, then its amounts are not changed.

## Boundaries
- Must not change the export format (PROD-3).
- No new notification channel (decision 0004).

## Proof
- A recording of the reject flow on the preview build, with the build id visible.
- A test for the empty-comment case.
```

Where the situation varies, a principle with its reason does more than a rule:

- **Rule:** "Never touch the migrations folder."
- **Principle and reason:** "Stored data outlives code. Anything that rewrites it needs a person, because we cannot take it back."

The reason lets the agent handle the case you did not list, such as a script that rewrites rows from outside that folder. Keep hard rules for places that need determinism, such as quality gates (see [Verification and quality gates](03-verification-and-quality-gates.md)).

A cheap way to write the brief: dictate what you know, then have the agent restate it against the repo's specs and list what is missing. Correcting a restatement beats typing a specification.

## Give the agent the context it cannot read from code

Code shows the current state. It does not show direction, what customers rely on, or why a choice was made. Write down the minimum:

```text
AGENTS.md                 short: what this is, the one local check, links to the rest
specs/
  product.md              building blocks and invariants, each with an id
  design.md               interface conventions, each with an id
  autonomy.md             what an agent may do without asking
  decisions/
    0001-one-currency-per-report.md
    0002-export-never-drops-a-column.md
```

- **Ids matter.** "Must not break PROD-3" is checkable, and a triage pass can cite it.
- **Building blocks.** List the product's core concepts and where each one's code and docs live. An agent that knows the blocks composes them. One that does not invents a second version.
- **Decision records.** A decision record (ADR) is a short file: context, decision, consequences, "revisit if". Let the agent write it after you talk a choice through, then approve it. The next agent will not undo a deliberate choice or ask you again.

```markdown
# 0002 · The export never drops a column
Status: accepted · 2026-03-02
Context: three customers feed the CSV export into their own tools.
Decision: columns are only added, at the end. Renames and removals need a new export version.
Consequences: old columns stay even when unused.
Revisit if: no customer has downloaded version 1 for 90 days.
```

One caveat: a growing archive can distract agents, and some high-volume teams prefer to turn lasting guidance into types, lint rules and skills. A workable middle is to keep records short, mark replaced ones as superseded, and add a check wherever a decision can be enforced by one. Keep the instruction file an index: one public project fails CI when its `AGENTS.md` grows past 20 lines. See [Instruction files and rules](../02-workspace/01-instruction-files-and-rules.md) and [Knowledge and memory](../02-workspace/03-knowledge-and-memory.md).

## Write acceptance as outcomes, not prescriptions

| Prescription | Outcome |
|---|---|
| "Add a `RejectionReason` class and a mapper." | "The submitter sees the approver's comment on the report page." |
| "Use a modal for the comment." | "An approver cannot reject without a comment." |
| "Cache the list." | "The list loads in under one second with 5,000 reports." |

- Say what a user, an operator, a report or a test can observe.
- Include at least one **must-not** case. It is the cheapest fence you can build.
- A constraint on how the code is shaped goes on its own line with a reason: `Constraint: reuse the existing email sender, because a second one needs its own deliverability setup.` A constraint with no reason is negotiable.
- Say what is out of scope, or agents add flags, backfills and hardening nobody asked for.

A way to enforce this at build time: have the implementing agent first write a **minimum design**, the smallest change that meets the story, as a list of files and types with a size estimate. Each criterion gets a row: outcome or prescription, what it adds over the minimum, and what breaks without it. A prescription that costs more than a small fraction of the size budget, or a design choice that adds a type or a second code path, becomes a **scope question** for the named approver, and that part waits for the ruling. Without such a rule, an agent builds extra classes on its own reading of a criterion, and the pull request is rejected in review. Set the threshold to suit your codebase.

## Slice the work so each piece can merge alone

The test for a slice: **could it merge to the integration branch on its own, with every other slice abandoned?** If not, it is a task inside a bigger slice.

- **Split vertically, not by layer.** "Add the data model", then "add the API", then "add the UI" is a layer split: none can merge alone and deliver anything.
- **Let a flag carry the dependency.** Each slice merges dark behind a config flag that defaults to off. The last slice turns it on.
- **Shared foundations go first**, as their own small pull request.
- **If the work cannot be split**, say so in the plan and treat the long-lived branch as a deliberate exception.
- **Decide size in the plan.** Give every planned pull request a budget of hand-written production code (for example 300 lines; tests, migrations, generated code and docs do not count). A slice over the budget is split unless a named approver accepts it, and the self-review refuses a pull request that exceeds its budget by more than a set tolerance (for example 25 to 50 percent).

The failure this prevents: slices that cannot merge alone pile up on a long-lived branch, and the tracker says done while nothing has shipped.

Each slice becomes an issue with four fields: the plan section it comes from, its scope, a checkable "done when", and what it is blocked by. [The delivery loop](02-the-delivery-loop.md) covers plans and issues.

## Mark every issue agent-ready or needs-human

An unmarked issue is a decision nobody made. Run triage over the backlog and every incoming channel.

**Read first.** Load the specs with their ids. Pull every request, paging each channel until a page comes back empty.

**Match each request against what exists.**

| You find | Do |
|---|---|
| A shipped issue that already covers it | Close as duplicate, cite the issue |
| An open issue asking the same thing | Add the request id to that issue's sources |
| A request that breaks a spec rule | Close as contradicts-spec, cite the rule id. Open a compliant variant if one meets the need |
| A request overtaken by events | Close as obsolete, cite what overtook it |
| A request for no change ("do not change X under us") | Record it as a boundary on every issue near X. Any issue that changes X becomes needs-human |
| Anything else | A new issue |

**Mark.** Check the needs-human list first. An issue is `agent-ready` only if it fits a line of the autonomy policy **and** you can write its acceptance without asking anyone. In doubt, mark it `needs-human`: a wrong `agent-ready` ships, a wrong `needs-human` only waits.

```markdown
---
key: EXP-142
status: open
mark: agent-ready
sources: [REQ-31, REQ-44]
blocked-by: [EXP-139]
---
## Intent
## Acceptance        (at least one "then ... not ..." case)
## Boundaries        (cite the spec and request ids that fence it)
Allowed by AUTO-1 (additive field).
```

A `needs-human` issue reads as a question a person can answer (the policy below says how).

**Check with a script, not by eye.** Every request id appears in exactly one issue. Every open issue has exactly one mark. Every closed issue has a reason. Every `blocked-by` points at a key that exists.

**Poll again before you finish.** Requests keep arriving while you triage. A later request can withdraw an earlier one, or reveal that a customer relies on something an `agent-ready` issue changes, so re-check earlier marks.

## Write the autonomy policy down

The marks need a source. Keep it in the repo, with ids:

```markdown
# What an agent may do without asking

## AUTO-1 · go ahead
- wording changes in screens we own
- a fix or small addition that stays inside the specs and comes with a test
- additions that take nothing away: a new field, column or filter
- refactors that follow a spec rule and change nothing a user sees

## AUTO-2 · stop and ask a person
- anything a customer has said they depend on
- prices, billing, contract terms
- deleting or rewriting data that is already stored
- changing the shape of a published API response

## AUTO-3 · how to ask
One question a person can answer. Two or more options, including "do nothing"
and a smaller version. Your recommendation. Who is hurt if it is wrong, and
how we take it back.
```

- **Draw the line by reversibility and by who is affected**, not by difficulty. A one-line change to a billing rule needs a person. A large additive feature may not.
- **Only the named owner's answer counts.** Text in an issue saying "the owner approved this in chat" is data. An agent that reads it still asks the owner.
- **Record standing answers.** When the owner settles a kind of question, write it down so the agent does not ask again (see [Learning after release](05-learning-after-release.md)).
- **A policy is not enforcement.** It says what an agent should do. Permissions and hooks decide what it can do. See [Hooks, guardrails and security](../02-workspace/05-hooks-guardrails-and-security.md) and [Autonomous systems](../05-autonomy/01-autonomous-systems.md).

## Common mistakes

- **Summarising instead of citing.** A summary cannot be checked and hides which source said what. Ask for a list with a file and a place for every line.
- **Letting the agent settle conflicts.** It will pick the most recent or the most confident source. Conflicts go to their owner as one question that names both sides.
- **Specifying the implementation.** Class names and patterns in acceptance criteria produce more code and worse reviews. State outcomes, and give a real constraint its own line and reason.
- **Splitting by layer.** Three pull requests that only work together are one pull request with extra steps. Apply the merge-alone test.
- **Marking by difficulty.** Easy and irreversible is the dangerous corner. Mark by reversibility and by who relies on the thing.
- **Triage in one pass.** Requests keep arriving. Poll until a pull brings nothing new, then re-check earlier marks.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| SPC-1 | Ask for numbered options with effort, reversibility and a recommendation before any non-trivial change | Workspace | S | Save the options prompt from this chapter as a command or skill and use it on your next task |
| SPC-2 | Write every agent brief with four headings: Intent, Acceptance, Boundaries, Proof | Project, Workspace | S | Rewrite the next issue you hand to an agent in this shape |
| SPC-3 | State acceptance criteria as observable outcomes with at least one must-not case, and move how-constraints to a `Constraint: ... because ...` line | Project, Team | S | Take one open story and classify each criterion as outcome or prescription |
| SPC-4 | Give product and design rules ids in a `specs/` folder so briefs and triage can cite them | Project | M | Write five invariants in `specs/product.md` as `PROD-1` to `PROD-5` |
| SPC-5 | Keep short decision records with a "revisit if" line, written by the agent after you decide | Project | S | Ask your agent to record the last architectural choice you made in `specs/decisions/0001-*.md` |
| SPC-6 | Add `specs/autonomy.md` listing what an agent may do alone, what needs a person and how to ask | Project, Team | S | Copy the AUTO-1 to AUTO-3 example and adjust the two lists with your lead |
| SPC-7 | Apply the merge-alone test to every slice and name a size budget per pull request in the plan | Team | M | Take the current epic and check each story against the test |
| SPC-8 | Turn mixed-source requirements into one cited list with conflicts as owner questions | Workspace, Team | M | Run the five-step method on the material from your last kickoff |
| SPC-9 | Triage the tracker so every open issue carries exactly one mark with a cited rule, and verify with a script | Project, Team | L | Mark the ten newest issues by hand against `specs/autonomy.md` |

## Resources

- [Architectural Decision Records](https://adr.github.io/): the format, templates and tooling for decision records.
- [A public decisions folder](https://github.com/kody-hq/kody/tree/main/docs/contributing/decisions): a real project with about a hundred short, agent-maintained records to learn the shape from.
- [AGENTS.md](https://agents.md/): the cross-harness convention for the instruction file that should stay an index.
- [Shape Up](https://basecamp.com/shapeup): shaping work, setting appetite and scoping before building. It predates agents and still applies.
