# Skills

> A skill is a folder of instructions, and optionally scripts, that the agent loads only when a task calls for it. This chapter covers how skills get selected, how to write one that triggers and gets followed, what the frontmatter keys really do, and how a team keeps a set of skills cheap, chained and safe to install. After reading it you can turn a procedure you keep retyping into a skill and judge whether it should be a skill at all.

**Read this when:**
- You are pasting the same procedure into chat for the third time.
- A skill you wrote never triggers, or triggers when it should not.
- One skill run costs far more tokens than the work seems worth.
- Your team wants shared skills that say clearly when a dependency is missing.

## What a skill is

```
.claude/skills/pre-push-review/
  SKILL.md              frontmatter (name, description) and the instructions
  references/           detail the agent opens only on the branch that needs it
    size-budget.md
  scripts/              code the agent runs instead of reading
    effective-lines.sh
```

The format is an open one ([Agent Skills](https://agentskills.io/home)) that several harnesses read. What makes it useful is that it loads in three steps:

| Step | What enters the context | When |
|---|---|---|
| Listing | `name` and `description` of every installed skill | Session start |
| Body | The whole `SKILL.md` | When you type `/name`, or the model decides the task matches |
| Resources | A reference file, or the output of a script | Only when the body sends the agent there |

So fifty installed skills cost fifty short descriptions, not fifty documents. Compare that with the [instruction file](01-instruction-files-and-rules.md), which is paid for in every session.

Where a skill lives decides who gets it. In Claude Code: `~/.claude/skills/` is yours in every project, `.claude/skills/` is committed and shared with the team, and a plugin can carry skills to many repositories. A common cross-harness convention is one `.agents/skills/` folder as the single source, with each harness pointed at it by a link or a config entry. Do not copy skill folders between locations; copies drift.

## Write the description as a trigger

When the model chooses a skill it has only the name and the description. The description is therefore not a summary of what the skill does. It is the condition under which it should load, written in the words a request would use.

```yaml
# Vague: matches everything about pull requests, or nothing
description: Helps with pull requests.

# A trigger: says when, quotes a request, and names the neighbour it is not
description: Use when the user wants their own branch checked before opening a PR
  ("self-review my branch", "is this ready to push?"). Not for reviewing someone
  else's PR; that is peer-review.
```

Practical rules:

- Start with "Use when". Put the main case first: listings are truncated when they get long (in Claude Code, as of late 2026, each entry is capped at 1,536 characters and the least-used skills lose their descriptions first when the whole listing is over budget). The open format allows 1,024 characters.
- Use the user's language, not yours. Nobody asks for "dependency drift remediation"; they say "bump the packages".
- Name what the skill is not for when a neighbour exists. Overlapping descriptions are the usual cause of the wrong skill loading.
- For a skill that must run only on an explicit phrase, say so: "Use only when the user says 'ship it'."
- If you cannot state the trigger in one sentence, the scope is wrong. A useful authoring rule: when the trigger is unclear, ask the user before writing the skill.

Test it in a fresh session with five requests that should trigger and five near misses that should not. When it misfires in real use, ask the agent why it picked (or skipped) the skill and adjust the description.

## Keep the body short and scoped

Long skills fail in predictable ways. Not every instruction gets followed, the steps you care about are buried, the text goes out of date faster, and once loaded the body stays in context for the rest of the session.

Choose the mode by the kind of work:

| The work is | Write | Example |
|---|---|---|
| Judgment (review, design, writing) | Principles with their reasons, and questions the agent should ask itself | "Prefer the smallest change that meets the story. Before adding a type, ask what breaks without it." |
| A fragile procedure specific to you | Exact numbered steps, each naming the tool and the done condition | "1. Fetch the ticket. 2. Run the readiness check. If it prints NOT READY, stop and report why." |

Do not write step-by-step instructions for things the model already does well; that removes its room to adapt and adds nothing. Do write them for facts it cannot guess: your branch naming, the order your release must follow, the check that has to pass.

More ways to keep it short:

- **Point at live sources.** "Run `tool --help` for flags" beats a pasted manual that will be wrong after the next release.
- **Use one loaded word.** "Write it like a man page" carries a whole style guide.
- **Put what matters first.** After the harness compacts a long conversation it may keep only the start of a loaded skill.
- **End each step with its done condition.** "Done: the script prints `result: ok`."

When one skill starts to cover several situations, split it and add a **router skill**: a few lines that map situations to other skills.

```markdown
---
name: delivery
description: Use when the user asks what to do next on a story, or names a stage
  (plan, build, review, release) without naming a skill.
---
Pick one and load it:
- No confirmed plan yet: `write-plan`
- Plan confirmed, code not written: `implement-plan`
- Code written, not pushed: `pre-push-review`
```

A starter you can copy: [`templates/skill-example/SKILL.md`](../../templates/skill-example/SKILL.md).

## Bundle scripts and reference files

Keep judgment in prose and mechanics in code. Counting, parsing, diffing, validating and calling an API with a fixed contract are jobs for a script: it gives the same answer every time and costs only its output in tokens. A skill for shortening a text, for example, lets the model do the writing and has a bundled script verify the length limit and that every passage marked "keep" survived character for character.

- Say in `SKILL.md` what each file is for and when to open or run it. An unreferenced file is invisible.
- Put a branch that is rarely taken in `references/`. If the rollback procedure matters in one release out of ten, the other nine runs should not pay for it.
- State what a script needs (runtime, version, working directory) and make its output tell the agent what to do next.

## Skill, subagent, script or hook?

| Use a | When | Because |
|---|---|---|
| Skill | The work needs the current conversation and you want to steer it | It loads into the thread you are in |
| Subagent | The work is long and read-heavy and you only want the conclusion | It runs in its own context and returns a summary |
| Script | No judgment is involved | It is deterministic, testable and free of tokens |
| Hook | It must happen at a fixed moment whether or not anyone remembers | The harness runs it, not the model |

The four combine: a skill calls scripts, may hand one bounded job to a subagent, and relies on a hook for the step that must not be skipped. [Subagents and multi-agent patterns](../03-agents/03-subagents-and-multi-agent.md) and [Hooks, guardrails and security](05-hooks-guardrails-and-security.md) own those topics.

## Frontmatter keys and what each really does

This table is for Claude Code as of late 2026; the [skills docs](https://code.claude.com/docs/en/skills) are the place to check. Claude Code ignores a key it does not recognise without any error, so a misspelt key turns a feature off silently. It also reads frontmatter only when `---` is the first line of the file.

| Key | What it really does | Watch out |
|---|---|---|
| `name` | The command name. Kebab-case, at most 64 characters, same as the folder | |
| `description` | The trigger text in the listing | See above |
| `disable-model-invocation: true` | Only a person typing `/name` can start the skill | This is the key for irreversible or privileged skills |
| `user-invocable: false` | Hides the skill from the `/` menu | The model can still invoke it. It is not a safety control |
| `allowed-tools` | Pre-approves the listed tools for the turn that invokes the skill | A grant, not a restriction: every other tool stays available under normal permissions. Scope it tightly and never pre-approve the destructive step (push, publish, cloud writes) |
| `disallowed-tools` | Removes tools while the skill is active | This is the restriction. A read-only briefing skill can drop `Edit` and `Write` |
| `context: fork` | Runs the body as the prompt of a new subagent that does not see your conversation | Only for long, self-contained, read-only work. It cuts the confirmation loop, so a skill that stops to ask you something must not use it |
| `arguments`, `argument-hint` | Named positional inputs such as `[story]`, and the autocomplete hint | The body must reference `$story`, otherwise the declaration does nothing |
| `paths` | Limits automatic activation to matching files | Rarely right for skills triggered by intent, which fire before any file is open |

Other keys exist (`model`, `effort`, `hooks`, `shell`, `when_to_use`). Most skills need none of them. If a skill must also load outside Claude Code, stay within the open format's keys: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`.

## Declare dependencies and check them at session start

A skill that needs an MCP server (a connector that gives the agent tools for an outside system) fails badly when the server is missing: the agent improvises or halts halfway. A convention solves this: each skill declares what it needs in extra frontmatter keys that the harness ignores:

```yaml
---
name: implement-plan
description: Use when the user asks to build a change that has a confirmed plan ("Use implement-plan on PROJ-123").
mcp: [issue-tracker]
plugins: [review-toolkit]
---
```

A script then runs from a session-start hook, collects every declared key and compares it with what is installed:

```sh
#!/usr/bin/env bash
# .claude/scripts/toolset-check.sh: report MCP servers that skills declare but this machine lacks.
# No model call, no writes, and it always exits 0 so it can never stop a session from starting.
need=$(sed -n 's/^mcp: *\[\(.*\)\]/\1/p' .claude/skills/*/SKILL.md 2>/dev/null | tr ',' '\n' | tr -d ' ' | sort -u)
have=$(claude mcp list 2>/dev/null | tr '[:upper:]' '[:lower:]')
for server in $need; do
  grep -q "$server" <<<"$have" || echo "Missing MCP server '$server': a skill declares it. Add it with 'claude mcp add'."
done
exit 0
```

```json
{ "hooks": { "SessionStart": [ { "matcher": "startup", "hooks": [
  { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/toolset-check.sh" } ] } ] } }
```

A fuller version also lists every skill with its description and checks declared plugins against `claude plugin list`. The agent then prints only what needs action, with the fix. Nothing is hardcoded: a new skill that declares a new dependency is picked up with no change to the script. The match is a loose substring match because the listing's format is not a stable interface. If your skills must stay valid under the open format, put the same values inside its `metadata` map.

[Tools and MCP](04-tools-and-mcp.md) covers the servers themselves; [Events, hooks and pipelines](../05-autonomy/04-events-hooks-and-pipelines.md) covers session-start automation.

## Single pass or fan-out

A **single-pass** skill does its work in the context it was loaded into. A **fan-out** skill tells the agent to start subagents, and each subagent loads its own context from nothing.

The second kind is where cost hides. Every subagent pays for its own full context load, so a review skill that starts several of them can cost many times what a single pass over the same branch would. The skill text does not have to be long for this to happen. The cost comes from the behaviour the text asks for, not from the text.

Rules for skill authors:

- Keep a skill single-pass and prime it with the [rule index](01-instruction-files-and-rules.md#keep-a-large-rules-folder-usable) instead of full rule files.
- Do not make a skill fan out to many subagents.
- When delegation is justified, hand over one bounded job with a narrow brief: the files, the one rule file that applies, the cases with the expected result for each, and "no other work, no further subagents, no commits". Read everything that comes back.

Before you write "spawn an agent per …" in a skill, multiply the number of agents by the context each has to load, and ask whether an index and one pass would do.

## Chain skills

When work has stages, give each stage its own skill and let each one end by naming the next, then stop:

```markdown
## Hand off
Stop. Do not start building.
Say: "Plan saved to `.claude/plans/PROJ-123-<name>.md`. Next: Use implement-plan on PROJ-123."
```

Three things make a chain hold. Each stage has one sentence to type, listed in one table people can find. Each skill says what it will not do (the implementer does not merge and does not push without the self-review). And a gate names whose confirmation counts, resolved from the [shared values file](01-instruction-files-and-rules.md#put-shared-project-values-in-one-file), not from whoever is in the session.

## Generate, test and iterate

Let the agent write the first draft, then edit it yourself. Models phrase well and pad heavily; they are weak at compressing and generalising. Most of your edit is deletion.

1. **Decide whether it is a skill.** A fact that applies everywhere is an instruction-file line. A rule for some files is a path-scoped rule. A step with no judgment is a script.
2. **Fit it among the existing skills.** Check for a description that overlaps.
3. **Write the failure cases first.** What would a wrong run look like? Those become the "do not" lines.
4. **Test in a fresh session.** Run the same request with and without the skill, more than once, and include a case with missing information and one with a tool error. One good run proves little.
5. **Keep watching.** Have the agent scan recent session history on a schedule for skills that misfired, were never used, or should exist. [Self-improving systems](../05-autonomy/05-self-improving-systems.md) describes the loop.

A meta-skill helps a team stay consistent: one skill that holds your rules for frontmatter and is applied whenever a skill is created or edited.

## Install shared skills

- **From your team:** commit them to the repository, or ship them in a plugin when several repositories need the same set ([Portable agent config](../05-autonomy/02-portable-agent-config.md)).
- **From the public:** [skills.sh](https://skills.sh) is a directory, and the `skills` CLI installs from a GitHub repository into the project (`npx skills add <owner>/<repo>`, `-g` for all projects).
- **Read before you install.** A skill is instructions plus code that run with your permissions. Read `SKILL.md`, every script, and the `allowed-tools` line. Malicious skills that hide instructions from reviewers have been documented (see Resources). Treat an update like a dependency update.
- **Then tailor it.** A public skill is a starting point. Cut what you do not need.

## Common mistakes

- **A description that describes.** "Helps with releases" tells the model nothing about when. Write the trigger.
- **The 600-line skill.** Part of it is followed. Split it, move branches into `references/`, add a router.
- **Treating `allowed-tools` as a sandbox.** It only removes permission prompts for what it lists. Use `disallowed-tools` or permission rules to restrict.
- **Relying on `user-invocable: false` for safety.** The model can still run the skill. Use `disable-model-invocation: true`.
- **`context: fork` on an interactive skill.** The subagent cannot stop and ask you. Keep interactive skills in the main thread.
- **Fan-out by default.** Several subagents for one review is a budget decision hidden in a sentence.
- **Installing unread skills.** Read the scripts and the grants first.
- **Prose where a script belongs.** If the step is "count", "parse" or "compare exactly", write the script.

## Adopt this

| ID | Practice | Applies to | Effort | First step |
|---|---|---|---|---|
| SKL-1 | Rewrite every skill description as a trigger: "Use when …", one quoted request, and what it is not for | Project, Workspace | S | List your skills with their descriptions and rewrite the three vaguest |
| SKL-2 | Turn the procedure you retype most into a skill of under about 60 lines with a done condition per step | Workspace | S | Copy `templates/skill-example/` and paste in the last prompt you typed twice |
| SKL-3 | Set `disable-model-invocation: true` on every skill with an irreversible or privileged side effect, and remove destructive commands from `allowed-tools` | Project, Team | S | Grep `SKILL.md` files for push, publish, delete and deploy steps |
| SKL-4 | Read `SKILL.md`, the scripts and the `allowed-tools` line of any third-party skill before installing it | Workspace, Team | S | Review the skills already installed in `~/.claude/skills/` and remove the ones you cannot vouch for |
| SKL-5 | Move counting, parsing and exact-comparison steps out of skill prose into bundled scripts | Project | M | Pick one skill step where the model does arithmetic or diffing and replace it with a script that prints the result |
| SKL-6 | End each stage skill by naming the next skill and stopping, and publish one table of the sentence to type per stage | Team | M | Add a "Hand off" section to your planning skill that names the build skill |
| SKL-7 | Keep skills single-pass; where a skill tells the agent to spawn subagents, measure one run and cut to one bounded delegation at most | Project, Team | M | Check the token usage of your most expensive skill run and count the subagents it started |
| SKL-8 | Declare each skill's MCP and plugin dependencies in frontmatter and check them with a script on session start | Team | M | Add an `mcp:` line to two skills and wire the script from this chapter into a `SessionStart` hook |
| SKL-9 | Test each new skill in a fresh session with five should-trigger and five should-not-trigger requests, with and without the skill | Workspace, Team | M | Write the ten requests for one skill into a file next to its `SKILL.md` |

## Resources

- [Agent Skills](https://agentskills.io/home): the open format, with authoring guidance; the [specification](https://agentskills.io/specification) lists the portable frontmatter keys and limits.
- [Claude Code: skills](https://code.claude.com/docs/en/skills): where skills load from, the full frontmatter reference, arguments, forked context, and how to evaluate a skill.
- [skills.sh](https://skills.sh): a public directory of skills, useful for seeing many shapes.
- [vercel-labs/skills](https://github.com/vercel-labs/skills): the `npx skills` CLI for installing, listing and updating skills across harnesses.
- [How some malicious AI skills hide instructions from reviewers](https://blog.virustotal.com/2026/10/how-some-malicious-ai-skills-hide.html): why you read a skill before you install it.
- [MCP skills extension](https://modelcontextprotocol.io/seps/2640-skills-extension): the proposal that lets an MCP server publish skills next to its tools.
