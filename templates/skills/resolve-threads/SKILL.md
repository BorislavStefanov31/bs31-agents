---
name: resolve-threads
description: Answer every open review thread on the user's own pull request with a commit and a test, or with a reasoned reply. Use when the user says "resolve the review comments on PR 123" or "address the review". Do not use to review someone else's PR.
argument-hint: "[pr-number]"
---

<!--
TEMPLATE: comment resolution skill. The author's agent runs it after a review arrives.
Copy to .claude/skills/resolve-threads/SKILL.md (or your harness's skills folder).
Change: <BUILD_CMD>, <TEST_CMD>, the script paths, and "the lead" (the role or person
who rules on scope in your team).
See docs/04-delivery/04-pr-review-with-agents.md for the reasoning.
-->

# PR comments resolution

You are the author of pull request `$ARGUMENTS`. A review has arrived. Every open thread gets an answer; none is left silent. Work in the PR's existing worktree and branch.

## Steps

1. **List every unresolved thread** on the PR, with file, line, reviewer, severity and text. Print the list before changing anything.
2. **Sort each thread into one of four kinds:**
   - **Fix**: the finding is right. Most threads.
   - **Disagree**: the finding is wrong, or the rule it cites does not apply here.
   - **Question**: the reviewer asked something; no change is requested yet.
   - **Scope**: doing what is asked would add a type, a second code path or a feature the ticket does not ask for.
3. **Handle each thread, one at a time:**
   - **Fix**: write the test that fails because of the finding, then the change that makes it pass. One commit per thread where practical, with the ticket key in the subject. Reply with the commit hash and the test name.
   - **Disagree**: reply with the reason, and cite the rule, acceptance criterion or plan section that supports it. Do not change the code to end the discussion.
   - **Question**: answer it. If the answer shows a defect, treat it as Fix.
   - **Scope**: do not build it. Reply that it is a scope question, and raise it with the lead on the ticket.
4. **Re-run the gates:** `<BUILD_CMD>`, `<TEST_CMD>` for the whole repository, `.claude/scripts/effective-lines.sh` against the budget, then `scripts/attest.sh`. Push through the same hook as the first push.
5. **Report** a table: thread, kind, commit, test, reply posted. Every row must be filled in.

## Never

- Never resolve a reviewer's thread yourself. The reviewer closes its own threads in the re-review.
- Never answer a finding with "done" and no commit hash.
- Never fix a finding by deleting or loosening the test that exposes it.
- Never fold unrelated cleanups into these commits.
- Never merge.

## Next

Tell the user: "Next: ask the reviewer to re-review and close their threads. The PR merges only with zero open threads."
