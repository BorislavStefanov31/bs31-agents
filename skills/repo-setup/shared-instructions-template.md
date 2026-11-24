<!--
Fill-in template for the shared instruction file (AGENTS.md at the repository root).
Replace every <placeholder> with what the user tells you. Do not guess. Delete a section
that has nothing real in it, and delete this comment.
Done when no <placeholder> is left.
-->

# <Project name>

<Two or three sentences from the user: what this is, who uses it, what it must never get wrong.>

## Commands

| Task | Command |
|---|---|
| Run | `<command>` |
| Test | `<command>` |
| Lint | `<command>` |

## Read first

- `<file or folder>`: <why it matters before any task>

## How work moves here

1. A plan is a file: `<plan path>`. It is split into issues, one per unit of work, each with a done condition.
2. A person approves the split before any issue is published.
3. One worker per issue, on its own branch. Model and effort are chosen per issue.
4. Close an issue once its done condition holds, and never before. Add this note:

   ```
   done: <what changed>
   worker: <harness> · <model> · <effort>
   commit: <hash>
   ```

## Where things live

| What | Where |
|---|---|
| Issues | <tracker and repository or project, or a folder of issue files> |
| Decisions | `<folder>` |
| Shared skills | `.agents/skills/` (one copy; harnesses link to it) |

## Boundaries

- Never commit secrets, tokens or `.env` files. Name the variable, never the value.
- <Action> needs a person: <who>.
