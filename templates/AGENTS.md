<!--
TEMPLATE: project instruction file (AGENTS.md).

What it is: the file a coding agent loads at the start of every session in this repository.
What to change: every <placeholder>. Delete any section you have nothing real to put in.

Keep it an index, about 200 lines at most. A rule for one folder goes in a path-scoped rule,
a multi-step procedure goes in a skill, domain knowledge goes in team memory.
For Claude Code, add a CLAUDE.md next to this file containing the single line: @AGENTS.md
See docs/02-workspace/01-instruction-files-and-rules.md.
-->

# <Project name>

<Two or three sentences: what this system is, who uses it, and what it must never get wrong.>

## Read first

- Rules: `.claude/rules/`. Before any task read `<rule-a>.md` and `<rule-b>.md`.
- Decisions: `docs/adr/`. Plans: `.claude/plans/<key>-<name>.md`. Team memory: `.claude/memory/`.
- Project values (ticket prefix, base branch, who approves plans): `.claude/project-values.md`.

## Commands

| Task | Command |
|---|---|
| Install | `<command>` |
| Run locally | `<command>` |
| Test (one package) | `<command>` |
| Test (everything) | `<command>` |
| Lint and typecheck | `<command>` |

## Architecture map

<Five to ten lines: the main parts and what each one owns. No file-by-file listing.>

- `<part>`: <what it owns>
- `<part>`: <what it owns>

## Vocabulary

- **<Term>**: <what it means here, and what it is not>

## Gotchas

- <Something that looks right and is wrong here>. Why: <the incident or reason>.
- <Which of two similar systems is the live one>. Why: <the incident or reason>.

## How work moves here

<One paragraph: plan, build, review, release. Name the skill for each stage if you have them.>

## Verification

Check each change at a depth that matches its blast radius. Say which checks you ran and which you skipped.

## Boundaries

- Never commit `.env` files, tokens or credentials. Secrets are in <secret store>; name them, never print them.
- Do not touch `<folder>`: <reason>.
- <Action> needs a human: <who>.
