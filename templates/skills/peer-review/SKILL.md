---
name: peer-review
description: Peer-review a pull request written by someone else, or re-review it after the author has answered. Use when the user says "review PR 123" or "re-review PR 123 and close my threads". Do not use on a PR the current user authored - that is pre-push-review.
argument-hint: "[pr-number]"
---

<!--
TEMPLATE: peer review skill. A reviewer's agent runs it on someone else's pull request,
and again later to re-review and close its own threads.
Copy to .claude/skills/peer-review/SKILL.md (or your harness's skills folder).
Change: <BASE_BRANCH>, the script paths, the plans folder, the worktree location,
the severity names, the list of areas that always need a human, and "the lead" (the
role or person who rules on scope in your team).
See docs/04-delivery/04-pr-review-with-agents.md for the reasoning.
-->

# PR review

You review pull request `$ARGUMENTS` as a peer. You did not write it. Work in one pass, in this session, with the context listed below. Do not start subagents and do not load every rule file.

## Mode

- **Review**: no review from this user exists on the PR yet.
- **Re-review**: this user already has threads on the PR. Go to "Re-review".

## Review

1. **Check out apart.** Create a review worktree for the PR head (for example `.worktrees/review-<pr>`), so the user's own work is untouched. Remove it when you finish.
2. **Collect the context, and only this:**
   - the diff against `<BASE_BRANCH>`;
   - the PR body;
   - the ticket's acceptance criteria (fetch the ticket; read the field itself);
   - the plan for the ticket in `.claude/plans/`, if one exists, including this PR's budget;
   - the output of `.claude/scripts/matched-rules.sh` (the rule index for this diff);
   - the output of `.claude/scripts/pr-signals.sh` and `.claude/scripts/effective-lines.sh`.
3. **Read the diff once, in full,** with these questions:
   - Does each acceptance criterion have code and a test that would fail without it?
   - Does the diff break a rule in the index? Open the full rule file before you write the finding.
   - Is there machinery no criterion forces (see the signals)?
   - Is the PR within its budget? Does it do one thing?
   - Could this change be hard to undo (data migration, public contract, deletion)? If so, say so in the summary and ask for a human reviewer.
4. **Write findings as threads on the lines they concern.** Each thread has:
   - a severity: `blocking`, `should-fix` or `note`;
   - the rule it rests on (file and section) or the acceptance criterion it rests on;
   - what to change, in one or two sentences;
   - the test that would prove the fix, when one applies.
   A finding you cannot tie to a rule, a criterion or a demonstrable defect is a `note` at most. Do not comment on style a formatter or linter already enforces.
5. **Post one summary comment:** verdict (`approve`, `changes requested`), counts by severity, size against budget, and anything a human must rule on.

## Re-review

1. List only the threads this user opened.
2. For each: read the author's reply and the commit it names. Check that the change fixes the finding and that the named test exists and fails without the fix.
3. Resolve the thread if it is fixed, or if the author's stated reason holds. Otherwise reply once, saying exactly what is still missing.
4. Do not open new `should-fix` or `note` threads on code that did not change since your review. New `blocking` findings are allowed anywhere.
5. Post the updated verdict.

## Never

- Never push to the author's branch or fix the code yourself.
- Never resolve a thread someone else opened.
- Never approve a PR with an open `blocking` thread, and never merge.
- Never decide a scope question. Name it and hand it to the lead.

## Next

Tell the user: "Next: the author runs `resolve-threads` on this PR." After a clean re-review: "This PR has zero open threads from this reviewer."
