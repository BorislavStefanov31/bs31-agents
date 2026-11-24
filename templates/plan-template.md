<!--
TEMPLATE: an implementation plan for one epic or story, written by a planning skill
and confirmed by a named person before any code exists.
Save as .claude/plans/PROJ-123-short-name.md (or another folder: pick ONE plans
folder and name it in your instruction file) and commit it.
Change: the ticket prefix PROJ, <BASE_BRANCH>, the name or role of the confirmer, and
<BUDGET_LINES> (the budget per slice in effective lines; choose your own number, for
example what a reviewer on your team can read with care in one sitting).
The six headings are one reasonable set. Rename or regroup them to suit your work,
then keep them fixed so people and agents always find the same thing in the same
place. Write "None" under a heading instead of deleting it.
-->

# Plan: PROJ-123 Short Name

| | |
|---|---|
| Ticket | PROJ-123 |
| Base branch | `<BASE_BRANCH>` at `<commit>` |
| Status | Draft / Confirmed by `<name>` on `<date>` |

## 1. Context

(What exists today that matters here: the services, libraries and data stores this work touches, what the code does now, and the closest existing feature to use as a pattern. Cite paths and tests, not prose.)

## 2. Requirement

(Why this is being built and how anyone will know it worked. Then the behaviour in plain words, with the rules, worked examples and edge cases from the specification. Mark each rule as confirmed, with its source, or inferred. For an epic, list the child stories in order and any story blocked on an open question.)

## 3. Impact

(What changes: data model, interfaces, events, observability, operator-facing behaviour. Name anything hard to undo and how it would be undone.)

## 4. Slices and steps

### Key decisions

| Decision | Chosen | Alternative considered | Why |
|---|---|---|---|
| | | | |

### Slices

Each slice is one pull request that can merge alone. Shared foundations go first. A flag that defaults to off carries any dependency between slices; the last slice turns it on.

| # | Pull request | Story | Budget (effective lines) | Flag | Depends on |
|---|---|---|---|---|---|
| 1 | | PROJ-124 | | | none |
| 2 | | PROJ-125 | | | 1 |

(A slice over `<BUDGET_LINES>` effective lines is split, or the confirmer accepts it here by name. Effective lines are hand-written production lines added; tests, migrations, generated code and docs are not counted.)

### Steps

(Ordered steps for each slice, from the data model outward.)

## 5. Tests

(Unit, integration and edge cases. Map each worked example in the specification to a test. Say which tests carry business rules, so the author writes those first.)

## 6. Risks and open questions

(Dependencies on other people, services or migrations, then the questions.)

| # | Question | Working assumption | Cost if the assumption is wrong | Blocks |
|---|---|---|---|---|
| 1 | | | | |

---

**Stop here.** No code is written until the confirmer named above has confirmed this plan. If the person in the session is not the confirmer, say so and name who to ask.
