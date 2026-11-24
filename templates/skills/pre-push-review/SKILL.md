---
name: pre-push-review
description: Review the current branch before it is pushed, then build, test, attest, push and open the pull request. Use when the user says "run the self-review", "self-review my branch" or asks to push or open a PR for finished work. Example - "Run the PR self-review on my current branch."
---

<!--
TEMPLATE: author's self-review skill. The author's agent runs it before any push.
Copy to .claude/skills/pre-push-review/SKILL.md (or your harness's skills folder).
Change: <BASE_BRANCH>, <BUILD_CMD>, <TEST_CMD>, the script paths, the plans folder,
and "the lead" (name the role or person who rules on size and scope in your team).
Choose your own numbers for the two size placeholders; there is no universal value:
  <BUDGET_LINES>  default budget per PR in effective lines, used when no plan gives one.
                  Start from what a reviewer on your team can read with care in one sitting.
  <TOLERANCE>     how far over budget a PR may go before the lead must rule, as a
                  percentage. Enough to absorb an honest estimate error, no more.
See docs/04-delivery/04-pr-review-with-agents.md for the reasoning.
-->

# PR self-review

You are the author of this branch. Nothing is pushed and no pull request is opened until every step below has passed. Work in one pass, in this session. Do not start subagents.

## Inputs

- Base branch: `<BASE_BRANCH>`.
- The ticket key, read from the branch name (`feat/PROJ-123-short-name`).
- The saved plan for the ticket in `.claude/plans/`, if one exists. It names this PR and its budget in effective lines.

## Steps

1. **Refresh and diff.** `git fetch origin <BASE_BRANCH>`, then read `git diff origin/<BASE_BRANCH>...HEAD` in full. Stop if the working tree has uncommitted changes.
2. **Size.** Run `.claude/scripts/effective-lines.sh origin/<BASE_BRANCH>`. Compare the number with the budget in the plan. With no plan, the budget is `<BUDGET_LINES>`.
   - At or under budget: continue.
   - Over budget by no more than `<TOLERANCE>` percent: continue, and state the overrun and its reason in the PR body.
   - Over budget by more than `<TOLERANCE>` percent: stop. Ask the lead to rule (split, accept or cut). Do not push.
3. **Signals.** Run `.claude/scripts/pr-signals.sh origin/<BASE_BRANCH>`. For each new type, single-implementation interface or other piece of machinery it lists, name the acceptance criterion that forces it. Remove what no criterion forces.
4. **Rules.** Run `.claude/scripts/matched-rules.sh origin/<BASE_BRANCH>` to get the index of rules this diff matches. Read the diff against the index. Open a full rule file only when you suspect a violation of it.
5. **Acceptance criteria.** Fetch the ticket. For each criterion, point to the file or test that satisfies it. A criterion with no evidence is unfinished work, not a review note.
6. **Fix what you found.** Commit each fix. Re-run steps 2 and 3 if the fixes added code.
7. **Build and test.** Run `<BUILD_CMD>` and `<TEST_CMD>` for the whole repository, not only the folder you touched. Zero failed tests is a hard gate. A test that was already red on the base branch is reported in the PR body with its ticket key; it is not skipped or deleted.
8. **Attest.** Run `scripts/attest.sh`. It records the commit and the test result that the push hook will check.
9. **Push and open the PR.** Push the branch. Fill in `pr-body-template.md` completely and open the PR against `<BASE_BRANCH>`.
10. **Report.** Print the PR link, effective lines against budget, and anything you left for the reviewer. Move the ticket to In Review.

## Never

- Never set the environment variable that skips the push hook, and never suggest it.
- Never push by hand or open the PR before step 8 has passed on the current commit.
- Never merge. Never move the ticket past In Review.
- Never weaken, skip or delete a test to get to zero failures.

## Next

Tell the user: "Next: ask a peer to run `peer-review` on this PR."
