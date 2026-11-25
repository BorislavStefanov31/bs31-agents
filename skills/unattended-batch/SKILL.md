---
name: unattended-batch
description: Use when the user wants the same operation applied to many items with nobody watching
  ("send all 400 reminders overnight", a scheduled job, a batch against an API that needs a
  credential); when you are about to work through a list by hand although every item follows the
  same steps; when you are about to put routine work under a scheduler; or when you must interpret
  how such a run ended or decide whether to run it again. Not for a model iterating until a check
  passes, one-off actions, work where every item needs judgement, or choosing a scheduler.
---

# unattended-batch

Moves repetitive work out of the model into a deterministic routine under a runner that owns the time and item limits, so you write the routine once and handle only what it could not settle.

## When to use

Many items, identical steps, nobody watching; also to read how such a run ended.

## Rules

1. **Agree the scope with the owner before the first run**: the items, what completes one item, the maximum wall-clock time, the maximum item count. Pass exactly those limits to the runner and never raise them: self-set limits get extended.
2. **Write the routine as code with three endings per item**: done, hold with a reason for the owner, or an error. No model call inside, so every item is treated identically.
3. **Keep the routine away from secrets and decisions.** It sends credentialed requests only through `tools.send()`, the host-restricted sender (`../secret-scope/`), never reads secret values, never writes to the holds folder: it must not leak a secret or approve its own work.
4. **Trial one item first** with `--only <id>` and read `run.log`, or one bug repeats across the list.
5. **Do no items by hand during a run.** It duplicates work and breaks the counts.
6. **Report the final `OUTCOME` line exactly as printed** and act only as that outcome allows.
7. **After an item error**, fix the routine, retry that item alone, then ask before resuming.
8. **Running out of time is not success.** Another run or a larger limit needs the owner's yes.
9. **Resume only from the stopped run's `not-started.jsonl`.** Hand-picking skips or repeats items.
10. **An item cut off mid-way, or whose request was blocked after a redirect, may have partly taken effect.** Say so, never "not sent", before anything runs it again.
11. **A log that ends on a `start` event with no `end` line means the run was killed.** Confirm with `--inspect`, tell the owner and wait.

## Produce

```
Outcome: time-exhausted (exit 3). Limits used: 45m, 400 items.
Completed 212, held 9, failed 0, interrupted 1, remaining 178.
Possible effect: inv-0213, "the time limit was reached mid-item".
Held: runs/nov-25/holds. Remaining: runs/nov-25/not-started.jsonl.
```

## Run

The routine:

```js
export default async function remind(item, tools) {
  if (item.amount > 500) return { outcome: 'hold', reason: 'terms.md line 9: owner decides above 500' };
  const r = await tools.send({ method: 'POST', url: 'https://api.billing.example/v2/reminders',
    headers: { Authorization: 'Bearer {{BILLING_KEY}}' }, body: JSON.stringify({ invoice: item.id }) });
  if (r.outcome !== 'response' || r.status !== 201) throw new Error(`not confirmed: ${r.outcome}`);
  return { outcome: 'done' };
}
```

```sh
node scripts/batch-run.mjs --routine remind.mjs --items invoices.jsonl --time-limit 45m \
  --max-items 400 --run-dir runs/nov-25 --scope secret-scope.json
```

Node 18 or later. Items: one JSON object per line with a unique `id`. Each run needs a new `--run-dir`. Exit codes: 0 all processed, 1 item error, 2 usage error, 3 time exhausted, 4 interrupted, 5 item limit reached. `--selftest` runs the built-in cases. Held items are stored in the layout `../hold-for-owner/` reads.

The runner does not sandbox the routine: its code gets a minimal environment but can still open files (a values file included) or use the network directly. The runner cannot tell who typed a limit; rule 1 is yours to keep.

## Stop and ask

- Scope or limits are not agreed, or you want more.
- Any outcome other than `all-processed`.
- A `possible-effect` line.
- Held items: those decisions are the owner's.
- `--inspect` prints `NO-OUTCOME`.

## Not for

A model iterating until a check passes, one-off actions, work where every item needs judgement, choosing a scheduler.

## Script paths

`scripts/...` in this file means the `scripts/` folder of this skill, wherever the skill is installed. From a project root that is usually `.claude/skills/unattended-batch/scripts/`, so the full form of a command is `node .claude/skills/unattended-batch/scripts/<file>.mjs ...`.
