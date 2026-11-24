# Instruction files and rules

> An instruction file is the one document your agent reads at the start of every session. This chapter shows what to put in it, what to keep out, how to move the rest into rule files that load only for the code they govern, and which instructions should stop being prose and become a hook or a script. After reading it you can write a project instruction file that stays short and a rules folder that stays usable when it holds dozens of files.

**Read this when:**
- You are adding a coding agent to a repository and need a first `AGENTS.md` or `CLAUDE.md`.
- Your instruction file has grown past a few hundred lines and the agent has started to skip parts of it.
- The same review comment keeps coming back and you want the agent to know the rule before it writes the code.
- You wrote "always run X" in the file and the agent still skips X.

## What the file is and how it loads

A new session knows nothing about your project. The harness (the program around the model: Claude Code, Codex, Cursor, Pi) fixes that by injecting a few things before your first message: its own system prompt, tool definitions, a list of skills, and your instruction files. [Context engineering](../01-foundations/02-context-engineering.md) covers the whole picture.

`AGENTS.md` is the cross-harness name for the project instruction file. `CLAUDE.md` is Claude Code's name for it. Keep one source and point the other at it:

```
repo/
  AGENTS.md     the content; Codex, Cursor, Pi and others read it
  CLAUDE.md     one line, "@AGENTS.md", plus anything Claude-specific below it
```

`@path` is Claude Code's import syntax. As of late 2026 Claude Code also reads `AGENTS.md` on its own when a repository has no `CLAUDE.md`, but when both exist it reads only `CLAUDE.md`, so the import is what keeps the two from drifting. The [Claude Code memory docs](https://code.claude.com/docs/en/memory) list the exact rules for your version.

Two properties decide everything else in this chapter:

1. **It loads in every session.** Each line costs context in every task, including the tasks it has nothing to do with.
2. **It is context, not configuration.** The model reads it and usually follows it. Nothing enforces it.

## Write an index, not an encyclopedia

The test for a line: *could the agent get this with one command?* If yes, leave it out. The agent can read `package.json`, list folders and grep for a string. It cannot guess why your team does something, which of two similar-looking systems is the live one, or what you call things.

| Belongs in the file | Why |
|---|---|
| Two or three sentences on what the system is and what it must never get wrong | Sets priorities for every decision the agent makes |
| Build, test, lint and run commands, with flags | Costly to rediscover, and wrong guesses waste turns |
| An architecture map: the main parts and what each owns, in ten lines | Orientation, not a file listing |
| Gotchas: things that look right and are wrong here | The agent cannot derive them from the code |
| Team vocabulary | Stops the agent naming one thing three ways in three sessions |
| Pointers: which rules to read first, where plans, decisions and team knowledge live | The file is a table of contents for everything else |

| Does not belong | Put it here instead |
|---|---|
| A file-by-file map of the codebase | Nowhere. The agent finds paths itself, and a hand-written map goes stale |
| Rules for one module or one file type | A path-scoped rule (below) |
| A multi-step procedure | A [skill](02-skills.md) |
| Domain knowledge and history | [Team memory and decision records](03-knowledge-and-memory.md) |
| Tool documentation | A sentence saying how to get it (`tool --help`, a docs URL) |
| Anything a linter or test can check | The linter or the test |
| Secrets, tokens, personal data | A secret store; name the variable, never the value |

A workable shape for a large multi-service codebase: say near the top that domain rules live in the rules folder and are not restated. Then hold a short list of rule files to read before any task, the build and test commands, a table of services and shared libraries, a short list of critical gotchas, one paragraph on how a feature moves from plan to release, and one process rule (for example, non-trivial work starts with the planning skill and stops for confirmation). Everything else is a pointer.

Claude Code's documentation suggests staying under about 200 lines per file. Splitting a long file with imports tidies it but saves nothing, because imported files load together with the file that imports them.

A starter you can copy: [`templates/AGENTS.md`](../../templates/AGENTS.md).

## Split by scope: global, project, local, nested

| Scope | Where (Claude Code) | Shared with | Put here |
|---|---|---|---|
| You, in every project | `~/.claude/CLAUDE.md`, `~/.claude/rules/` | Nobody | How you like to be told a long task finished; which tools are installed on this machine; where your secrets live (names only); what the agent must leave alone on your machine |
| The project | `AGENTS.md` / `CLAUDE.md` at the repo root, `.claude/rules/` | The team, through git | Everything in the "belongs" table above |
| You, in this project | `CLAUDE.local.md` (gitignored) | Nobody | Your sandbox URL, your test account |
| A subfolder | An instruction file inside that folder | The team | What is true only for that package; it loads when the agent works on files there |

Other harnesses have the same layers under other names (Codex reads a user-level `~/.codex/AGENTS.md`, for example).

The rule of thumb: if a teammate's agent needs it to work in this repository, it is project scope and goes in git. If it describes you or your machine, it is user scope.

In a monorepo, start the session in the directory that holds the agent configuration. If the `.claude/` folder sits one level below the repository root, a session opened at the root does not load those instructions or list those skills at startup. That looks like "the agent forgot everything" until you notice where you opened it.

## Path-scoped rules

A rule file is a Markdown file that the harness loads only when the agent works on a matching file. In Claude Code it lives in `.claude/rules/` and declares globs in YAML frontmatter:

```markdown
---
description: Scheduled jobs are idempotent and catch up after downtime.
paths:
  - "services/**/jobs/**"
  - "libs/scheduler/**/*.ts"
---

# Scheduled jobs

- A job that runs twice for the same window produces the same result.
- On startup, a job works through every window it missed, oldest first.

## Why this rule exists

PROJ-123: a nightly job was down for two days and resumed with only the current day.
```

`paths` is the only key Claude Code reads from a rule. It ignores any other key without an error, so `description` here is a team convention for the index script in the next section. A rule with no `paths` loads at session start like the instruction file. Cursor has the same idea as project rules with `globs`.

As a rules folder grows, its files tend to fall into four kinds. Sort yours the same way, so that each rule has an obvious scope:

| Kind | Examples | Scope |
|---|---|---|
| Always on | `no-workarounds.md`, `review-checklist.md` | `"**/*"`, or no `paths` at all |
| Language-wide | `coding-style.md`, `logging.md` | `"**/*.ts"` |
| Cross-cutting pattern | `scheduled-jobs.md`, `api-compatibility.md`, `testing.md` | Globs on the kind of file the pattern governs |
| Domain | `billing-rounding.md`, `orders-domain.md` | The service folder the rule describes |

A rule about a legacy area should say so in its first words, so the agent does not apply it to new code.

Start with one rule, for the module that collects the most review comments. Copy [`templates/rule-example.md`](../../templates/rule-example.md).

## Keep a large rules folder usable

Path scoping solves loading during implementation. It does not solve review. A reviewing agent looks at a diff that touches many folders, every matching rule loads in full, and the context fills with rule text before the review starts. A mature rules folder can run to hundreds of kilobytes, and a single domain rule can be a large share of that. (As of late 2026 Claude Code also delivers only the start of an on-demand rule file that is over a per-file limit, 40,000 characters on a 200K context window, so a very long rule is partly unread in any case.)

The fix is an index built by a script: one line per rule that matches the diff. The reviewer reads the index first and opens a full rule only when a finding needs it.

```js
// .claude/scripts/matched-rules.mjs: print one line per rule that applies to the changed files.
// Usage: git diff --name-only origin/main...HEAD | node .claude/scripts/matched-rules.mjs
import { readFileSync, readdirSync } from "node:fs";
import { matchesGlob } from "node:path"; // Node 22.5+

const changed = readFileSync(0, "utf8").split("\n").filter(Boolean);
const dir = ".claude/rules";

for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
  const head = readFileSync(`${dir}/${file}`, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const description = head.match(/^description:\s*(.+)$/m)?.[1] ?? "(no description)";
  const globs = [...head.matchAll(/^\s+-\s*["']?([^"'\n]+)["']?\s*$/gm)].map((m) => m[1]);
  const hit = globs.length === 0 || changed.some((f) => globs.some((g) => matchesGlob(f, g)));
  if (hit) console.log(`${dir}/${file}: ${description}`);
}
```

```
.claude/rules/no-workarounds.md: Fix the cause; a workaround needs a label, an owner and a removal condition.
.claude/rules/scheduled-jobs.md: Scheduled jobs are idempotent and catch up after downtime.
```

Two things make this work. Each rule's `description` must state the rule itself, not its topic ("Jobs are idempotent and catch up after downtime", not "Rules about jobs"). And the review skill must say "read the index, open a rule only for a finding". [PR review with agents](../04-delivery/04-pr-review-with-agents.md) covers the review side.

## Record why a rule exists

A rule without a reason reads as arbitrary, to the agent and to the next engineer. A rule with a reason can be applied to cases its author did not think of, and can be set aside, out loud, in the rare case where following it would defeat its purpose.

Record the incident, not a principle:

- *Weak:* "Do not use the old HTTP client."
- *Strong:* "`libs/http` is the current client. `libs/http-v1` is retired and stays only until its last caller is migrated. Do not read or copy it unless the task is that migration. Why: agents kept copying its retry logic, which sends a request twice after a timeout (PROJ-123)."

The strong version tells the agent which of two plausible sources is wrong, where the right one is, and what failure it prevents. Whenever a repository holds a retired implementation next to the current one, say which is authoritative.

Do the same in tickets: write a constraint as "Constraint: … because …" and treat a constraint with no reason as negotiable. The reason also tells you when to retire a rule: when the incident can no longer happen.

## Put shared project values in one file

Skills and rules keep needing the same few facts: the ticket prefix, the base branch, who approves plans. Written into each skill, they drift. Put them in one file and import it from the instruction file:

```markdown
<!-- .claude/project-values.md, imported from the instruction file with @.claude/project-values.md -->
| Key | Value |
|---|---|
| Ticket prefix | `PROJ` |
| Base branch | `main` |
| Plan approver | `<login of the named approver>` |
```

Every skill then says "the base branch" or "the plan approver" and resolves the value here. The pay-off shows in gates. A planning skill can say "the confirmation that counts is the plan approver's; if the person in this session is not the approver, say so and name who to ask", and that sentence stays correct when the approver changes, because one table cell changed.

## Know what prose cannot do

An instruction that is in the context is not always used, and one that was followed at the start of a long session can fade later as tool output piles up. So sort each instruction by what happens if it is skipped:

| The instruction is | Put it in | Example |
|---|---|---|
| A preference applied with judgment | Instruction file or rule | "Check each change at a depth that matches its blast radius. Say which checks you ran." |
| A pattern a tool can detect | Linter, formatter, type checker, convention test | Banned API, import order, naming |
| Required at a fixed moment, every time | A git hook (for example with [Husky](https://typicode.github.io/husky/)), a harness hook, or CI | Tests attested before push |
| A calculation or lookup | A script the agent calls | Counting changed lines, building the rule index |
| A multi-step procedure for one kind of task | A [skill](02-skills.md) | Cutting a release |
| Irreversible or privileged | A permission deny rule and a human | Writes to production |

The first row deserves a note. "Always run the full lint and test suite before every commit" is a poor instruction: it is slow, the agent sometimes skips it, and a hook that enforces it gets disabled by a person in a hurry. A general instruction plus a narrow deterministic gate works better. Let the agent choose checks in proportion to the change and report them, and put one fast hard gate at the push.

A workable division: rules stay prose, and hooks at a few fixed points (the push, writes to the issue tracker, the build) hold the few things that must not be skipped. A push hook, for example, refuses a push that has no fresh local test attestation. Sizes are counted by a script, not estimated by the model. [Hooks, guardrails and security](05-hooks-guardrails-and-security.md) covers how to build such gates, and [Verification and quality gates](../04-delivery/03-verification-and-quality-gates.md) covers what to check.

There is also an order of remedies. When an agent keeps making a mistake, first ask whether the code itself is confusing and can be simplified. Then ask whether a type, a lint rule or a test can make the mistake impossible. Only then write prose.

## Tune it from evidence

- **Run a cold-start test.** Open a fresh session, give it a real small task and add: "Explore, propose a fix, and tell me what was confusing or hard to find." Each confusion is a candidate line, or better, a candidate cleanup in the code.
- **Ask why.** When the agent uses the wrong tool or edits the wrong file, ask what in its context led there. Agents are good at naming the cause. They are worse at writing the fix, so read their proposed edit as a diagnosis and write the final wording yourself, shorter.
- **Add on the second occurrence.** A mistake made once is noise. The same mistake twice, or the same correction typed in two sessions, earns a line.
- **Remove on a schedule.** Models and harnesses improve, and an instruction written for last year's model can hold this year's back. Once a month, have the agent list instructions that are outdated, contradict each other or point at files that no longer exist. Claude Code ships a prompt audit for this (`/doctor prompt-audit`, as of late 2026). [Self-improving systems](../05-autonomy/05-self-improving-systems.md) turns this into a routine.

## Common mistakes

- **The encyclopedia.** A 900-line file that explains every module. The agent follows less of it as it grows. Cut to an index and move the rest into scoped rules and skills.
- **A hand-written file map.** It is out of date within weeks. Describe responsibilities, not paths.
- **Rules without reasons.** They get applied where they should not be and ignored where they matter. Add the incident.
- **Prose for things that must hold.** "Never push without tests" in a file is a hope. Make it a hook.
- **Two files that disagree.** A user-level rule and a project rule in conflict, or an instruction file that names one folder while a skill writes to another. The agent picks one arbitrarily. Audit for contradictions.
- **Values in the file.** Name the secret, say how to fetch it, never paste it. Instruction files are committed and injected into every session.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| INS-1 | Cut the project instruction file to an index of about 200 lines or fewer: purpose, commands, architecture map, gotchas, vocabulary, pointers | Project | S | Delete every line the agent could get with one command, then move module-specific lines into a note for INS-4 |
| INS-2 | Keep one instruction source: `AGENTS.md` with the content and a `CLAUDE.md` that imports it | Project | S | Rename the existing file to `AGENTS.md` and create `CLAUDE.md` containing `@AGENTS.md` |
| INS-3 | Move personal preferences and machine facts out of the project file into your user-level instruction file | Workspace | S | Create `~/.claude/CLAUDE.md` with how you want to be notified and what the agent must leave alone on your machine |
| INS-4 | Add a `paths:`-scoped rule file for the module with the most review comments | Project, Team | S | Copy `templates/rule-example.md` to `.claude/rules/`, set the globs, and write the three rules reviewers repeat most |
| INS-5 | Add a "Why this rule exists" line naming the incident to every rule and gotcha | Team | M | Pick the five rules the agent breaks most often and add the ticket or incident behind each |
| INS-6 | Put ticket prefix, base branch and plan approver in one shared values file that the instruction file imports | Project, Team | S | Create `.claude/project-values.md` and replace hardcoded branch names in two skills with "the base branch" |
| INS-7 | Convert each instruction that must hold every time into a hook, lint rule or CI check | Project, Team | M | Grep the instruction files for "always" and "never" and pick the one whose violation costs most |
| INS-8 | Give every rule a one-line `description` and add a script that prints the rules matching a diff, so reviewers read the index before any full rule | Project | M | Add `description:` to ten rules and run the script from this chapter against your last merged branch |
| INS-9 | Run a cold-start test and a monthly audit of instruction files for stale or conflicting lines | Workspace, Team | M | Open a fresh session on a small real task and ask the agent what was confusing or hard to find |

## Resources

- [AGENTS.md](https://agents.md/): the open format for a cross-harness instruction file, with examples and the list of tools that read it.
- [Claude Code: how Claude remembers your project](https://code.claude.com/docs/en/memory): load order, imports, `.claude/rules/`, `paths` globs, size limits and when `AGENTS.md` is read.
- [Claude Code: hooks reference](https://code.claude.com/docs/en/hooks): where to move an instruction that has to run at a fixed point.
- [Cursor rules](https://cursor.com/docs/rules): the same path-scoped idea in another harness.
- [Husky](https://typicode.github.io/husky/): git hooks an agent can configure once so a check always runs.
