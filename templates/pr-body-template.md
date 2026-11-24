<!--
TEMPLATE: pull request body with fixed headings that a CI job can check.
On GitHub, save as .github/pull_request_template.md so every new PR starts from it.
Change: the ticket prefix PROJ, the heading list (keep it in step with your CI body
check), and the budget wording (the budget comes from the plan, in whatever unit and
size your team chose). Remove a row or bullet that does not apply by writing
"None" under the heading; do not delete headings, or the check fails.
This comment is invisible in the rendered PR; you can leave it in.
See docs/04-delivery/04-pr-review-with-agents.md.
-->

## Ticket

PROJ-123 (link)

## What changed

(Two to five sentences a reviewer can read before the diff. What the system does now that it did not do before.)

## Size

| | |
|---|---|
| Plan slice | (name and number from the plan, or `no plan`) |
| Budget (effective lines) | |
| Actual (effective lines) | |
| Over budget because | (`None`, or the reason and who accepted it) |

## Acceptance criteria

| Criterion | Where it is met | Test that proves it |
|---|---|---|
| | `path/to/file` | `test name` |

## New machinery

(Every new type, interface or abstraction, and the criterion that forces it. `None` if the diff adds none.)

## Tests

- Command run: `<TEST_CMD>`
- Result: (passed / failed / skipped counts)
- Attested commit: `<sha>`
- Already red on the base branch: (`None`, or test name and ticket key)

## Risk and rollback

- Hard to undo? (`No`, or what: data migration, public contract, deletion)
- Flag: (`None`, or flag name and default)
- How to roll back:

## Out of scope

(What a reader might expect here that this PR deliberately leaves out, and the ticket that covers it.)
