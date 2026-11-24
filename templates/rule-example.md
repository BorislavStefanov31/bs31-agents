---
description: Scheduled jobs are idempotent and catch up after downtime.
paths:
  - "services/**/jobs/**"
  - "libs/scheduler/**/*.ts"
---

<!--
TEMPLATE: a path-scoped rule file. Copy to .claude/rules/<topic>.md.

What it is: instructions that load only when the agent works on a file matching `paths`.
What to change: the description, the globs, the rules, and the incident under "Why".

`paths` is the key Claude Code reads. `description` is a convention for a rule-index script: write the
rule itself in one line, not its topic. Omit `paths` to load the rule in every session.
See docs/02-workspace/01-instruction-files-and-rules.md.
-->

# Scheduled jobs

## Rules

- A job that runs twice for the same window produces the same result. Key every write on job and window.
- On startup, a job works through every window it missed, oldest first, before the current one.
- A job logs its window, its outcome and its duration in one line.

## Why this rule exists

PROJ-123 (2026-10): a nightly job was down for two days and resumed with only the current day, so two
days of results were missing and nobody noticed for a week.

## How to check

`<command that runs the convention test or lint for this rule>`

## Does not apply to

- One-off migration scripts under `tools/migrations/`.
