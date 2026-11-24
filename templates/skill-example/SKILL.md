---
name: changelog-entry
description: Use when a change is ready to merge and needs a changelog entry ("add a changelog line",
  "write the release note for this branch"). Not for cutting a release; that is a separate release skill.
allowed-tools: Bash(git log *) Bash(git diff *)
---

<!--
TEMPLATE: a skill. Copy this folder to .claude/skills/<name>/ (or your shared skills folder).

What it is: instructions the agent loads only when a request matches the description.
What to change: the name (kebab-case, same as the folder name), the description (a trigger:
"Use when ...", one quoted request, what it is not for), the steps and the hand-off.

`allowed-tools` pre-approves the listed tools for the turn; it does not restrict anything. Keep it to
read-only commands. For a skill with an irreversible step add: disable-model-invocation: true
See docs/02-workspace/02-skills.md.
-->

# changelog-entry

Writes one entry in `CHANGELOG.md` for the current branch. It does not commit or push.

## Steps

1. Read the diff against the base branch: `git diff <base>...HEAD --stat`, then the files that matter.
   Done: you can say in one sentence what a user of the system will notice.
2. Pick the section: Added, Changed, Fixed or Removed. If nothing is visible to a user, stop and say
   that no entry is needed.
3. Write one line under "Unreleased": what changed for the user, then the ticket key in brackets.
   No internal names, no "refactored".
   Done: the line makes sense to someone who has not seen the code.
4. Check the entry: one line, under 120 characters, ticket key present, section correct.
   Done: all four hold. (If you bundle a checker script in `scripts/`, run it here instead.)

## Do not

- Do not rewrite earlier entries.
- Do not describe how the change was made. Describe what is different.

## Hand off

Stop. Show the entry and say: "Next: run pre-push-review on this branch."
