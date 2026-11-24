---
name: repo-setup
description: Use when the user asks to set a repository up for coding agents, wants instructions and skills shared across harnesses, asks to wire a harness (Claude Code, Codex, Cursor or another) into a repository or add one to a repository already set up, or when instruction files or skill copies have drifted apart between harnesses ("make Codex and Claude read the same rules"). Not for splitting a plan into issues, checking outgoing links, or configuration outside the repository.
---

# repo-setup

Sets a repository up so every harness reads one shared instruction file and one shared skills folder, connected by changes the user sees first.

## When to use

First agent setup, adding a harness, or rules and skills that differ between harnesses.

## Steps

1. **Inventory.** List instruction files, skills folders, harness rule folders and every skill with its location. Ask which harnesses the team uses.
2. **Check for links.** Run `ls -ld` on every path you will write and its parents. If one is a link, stop and ask: writing through it changes files elsewhere.
3. **One shared file**: `AGENTS.md` at the root, started from `shared-instructions-template.md`. Extend an existing one only as the user approves. Harness files reference it and add only harness-specific lines: two full files drift.
4. **Ask for the facts**: what the project is, how to run, test and lint it, what to read first. Never infer them: a guessed command misleads every session.
5. **Describe the working method** there: a plan is split into issues; a person approves the split before publication; one worker per issue on its own branch, model and effort chosen for it; a fixed closing note (change, harness, model, effort, commit); issues close only when their done condition is met. Say where issues, decisions and shared skills live, and forbid committing secrets. Done: no placeholder remains.
6. **One home per skill**: `.agents/skills/<name>/`. A harness that looks elsewhere gets a link or configuration entry, never a copy: copies drift. If a skill to add already exists, show the differences and let the user choose. Propose moving harness-only skills there.
7. **Write a change list per harness** and show it unaltered before acting. The user carries it out, or you make those changes and no others. Then report the repository state.
8. **Link with what the system offers**: a relative symlink on macOS and Linux, a directory junction on Windows. Keep an existing harness skills folder and link each shared skill into it. Leave a link untracked where version control would store a second copy (a junction, a team without symlink checkout), appending to the ignore file without disturbing its entries.
9. **Test in a fresh session** per harness: it must list the shared skills and answer something only the shared file states.
10. **Give the reversal**: delete the link object only (`rm .claude/skills`, no trailing slash, never `-r`; `rmdir` for a junction). Recursive removal destroys the shared skills.
11. **Commit** only rows marked tracked, after the user sees the diff and agrees.

## Harness conventions

As of late 2026, check your version.

| Harness | Instruction file | Skills folder | Connection |
|---|---|---|---|
| Claude Code | `CLAUDE.md`; `AGENTS.md` only when no `CLAUDE.md` exists | `.claude/skills/` | `CLAUDE.md` starting `@AGENTS.md`; link `.claude/skills` to `.agents/skills` |
| Codex | `AGENTS.md` | `.agents/skills/` | Usually none; step 9 decides |
| Cursor | `AGENTS.md`; scoped rules in `.cursor/rules/` | `.agents/skills/`, `.cursor/skills/` | Link only if step 9 fails |

## What to produce

The finished `AGENTS.md`, the `.agents/skills/` folder, and per harness the change list (path, change, content, tracked or not), test result and reversal:

```
Harness: Claude Code
CLAUDE.md       create   "@AGENTS.md"         tracked
.claude/skills  symlink  ../.agents/skills    tracked
Test: fresh session lists label-printer; "Release branch?" answered "trunk".
Undo: rm .claude/skills (link only); delete CLAUDE.md.
```

## Stop and ask

- A change would land outside the repository: never make it.
- A tool is missing: report it, never install it.
- An existing harness file holds real content.

## Not for

Splitting plans into issues, checking links for outsiders, or machine-wide configuration.
