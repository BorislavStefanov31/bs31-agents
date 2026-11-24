<!--
TEMPLATE: one story (a unit of work that can merge on its own) for your issue tracker.
Copy the fields into your tracker's story form, or keep this file next to your plans.
Change: the audience tags, the ticket prefix PROJ, the title length limit, the
ticket types in the last table, "the lead" (the role or person who approves plans
and rules on scope in your team), and where acceptance criteria live (a dedicated
tracker field is easier to check by script than a heading inside the description).
Delete the guidance in parentheses before saving a real story.
-->

# Story template

## Summary

`[Audience tag] Short title`

(One line, short enough to read in a board column; set your own length limit. The audience tag says who sees the result. Agree a short fixed list of tags for your product.)

## Description

### Story

As a (role), I want (capability), so that (result).

### Context and goal

(A short paragraph. What exists today, what is missing, and what will be true when this is done. Link the specification instead of restating it.)

## Acceptance criteria

(Each criterion says what a user, an operator, a report or a test can observe. Not how the code is shaped.)

- Given (starting state), when (action), then (observable result).
- Given (...), when (...), then (...).
- Constraint: (a limit on how it is built) because (reason).

(A constraint with no reason is negotiable. Keep constraints to the last bullets so a reader can tell outcomes from prescriptions.)

## Links

- Specification: (link, or `none: <reason>`)
- QA test plan: (link, or `none: <reason>`)
- Related stories: (keys, or `none`)

## Readiness check

A story is ready to build when all of these hold. An agent should stop, not guess, when one fails.

- [ ] It could merge to the integration branch on its own, with every other story in the epic abandoned.
- [ ] Acceptance criteria are present and observable.
- [ ] The specification link and the QA test plan link are present, or each has a `none: <reason>` line.
- [ ] No question to the lead is still unanswered on the ticket.
- [ ] If it depends on unmerged work, a flag that defaults to off carries the dependency.

## Readiness by ticket type

Adapt the rows to the ticket types your tracker has.

| Type | Needs |
|---|---|
| Feature work | Acceptance criteria, specification link, QA test plan link |
| Bug | Acceptance criteria, or expected and actual behaviour |
| Small task | Acceptance criteria |
| Container ticket (an epic) | Not gated; its stories are |
