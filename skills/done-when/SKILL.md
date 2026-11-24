---
name: done-when
description: Use when a command can decide that a task is finished (tests pass, a build succeeds, a type
  check is clean), when the user says "keep going until it passes", "do not stop until" or "stop after N
  tries", when you are about to call a task finished and an agreed check exists, or when someone wires a
  stop hook or headless loop that sends an agent back to work until a check passes. Not for repeating a
  prompt on a timer, scripted batches with no model, or work with no machine-checkable finish.
---

# done-when

A command the owner approved decides when you may stop; your sense of being finished does not.

## When to use

Before starting, and before calling done, any task a command can judge; and when wiring the hook or
loop that enforces it.

## Rules

1. **Agree the check first.** State the completion condition as a command, get a yes, then save it as
   the executable `./done-when.sh` at the project root. Ask your questions before creating it. A check
   invented after the work fits whatever was built.
2. **Keep it local, repeatable and free of side effects.** No deploy, no sending, no writes outside the
   project: it runs at every stop attempt.
3. **The owner approves the exact file.** Show the whole file and ask the owner to run
   `scripts/done-when.mjs approve` in their own terminal. It runs with no permission prompt, so the
   gate refuses it unless its content matches that approval. A commit is not approval, you never
   approve, and any edit voids it.
4. **Run the gate before stopping.** Pass means finished; anything else means work on what it reports.
5. **Fix the work, never the check.** Changing the condition, or an existing check, needs the owner's
   yes and a new approval.
6. **Honour the round limit.** The owner sets it at approval (default 5). A limit named in the task goes
   in `.done-when/limit` and can only lower it. Running out is not success: say the work is not done
   and quote the check.
7. **The owner's "stop" wins at once.** Run `scripts/done-when.mjs halt`, then stop. Never run it
   otherwise.
8. **An unapproved check does not run.** Show the file, ask for approval, stop, and call the work
   unverified.
9. **The owner installs the hook, per project.** User-wide, it would run checks from unknown
   repositories.

## What to produce

`./done-when.sh`, the approval record (kept outside the project), one line per stop in
`.done-when/outcomes.log`, and a final message naming the outcome: passed, attempts-exhausted,
owner-halted or not-approved.

```sh
#!/bin/sh
# done when the importer's tests pass and the type check is clean
npm test -- importer && npx tsc --noEmit
```

```
{"at":"2026-11-25T09:14:02Z","outcome":"passed","session":"7c1e","rounds":2,"limit":5}
```

## The helper script

Needs Node 18+. Run from the project root; see `--help`.

- `node scripts/done-when.mjs approve [--max N]`: owner only, in an interactive terminal.
- `node scripts/done-when.mjs gate`: the stop hook. Exit 0 lets you stop, exit 2 sends you back with
  the reason. Without a hook, run `gate --manual` yourself before every stop; it counts rounds and
  writes the log.
- `node scripts/done-when.mjs run -- <agent command>`: the loop for harnesses with no stop hook; the
  failure report becomes the command's last argument.

For Claude Code, the owner merges `stop-hook.settings.json` into `.claude/settings.local.json` and fixes
the script path. As of late 2026, check your version: the hook gets JSON on stdin (`session_id`, `cwd`),
exit code 2 with a reason on stderr keeps the agent working, and the harness ends the turn itself after
eight blocks in a row with no tool call.

What the script cannot stop: an agent with a shell writing the approval store or the halt marker. The
snippet's deny rule covers the edit tool only; rules 3 and 7 cover the rest.

## Stop and ask

- No command can decide the finish, or the owner has not agreed the condition.
- The check looks wrong, flaky or impossible: report it, do not edit it.
- The check would need network, credentials or writes outside the project.

## Not for

Timers and recurring prompts, batches with no model, sandboxing what the check runs, or test design.
