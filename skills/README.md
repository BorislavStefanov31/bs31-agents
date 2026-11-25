# Skills

Twenty-one ready-to-use agent skills. Each is a folder with a `SKILL.md` that tells a coding agent what to do in one specific situation, and most ship a small script that checks the part an agent should not be trusted to judge by itself.

They follow the Agent Skills folder format, so they work in Claude Code, Codex, Cursor and other harnesses that load a `SKILL.md`. You do not call a skill by hand: its `description` says when it applies, and the agent loads it when your request matches.

## Install

Copy the folders you want into your skills folder and start a new session.

```sh
git clone https://github.com/BorislavStefanov31/bs31-agents.git /tmp/bs31-agents
# one project (run from that project's root)
mkdir -p .claude/skills && cp -R /tmp/bs31-agents/skills/done-when .claude/skills/
# every project on this machine
mkdir -p ~/.claude/skills && cp -R /tmp/bs31-agents/skills/done-when ~/.claude/skills/
```

Other harnesses use other folders (`.agents/skills/`, `.cursor/skills/`, `~/.codex/skills/`). The [`repo-setup`](repo-setup/SKILL.md) skill covers sharing one skills folder across several harnesses.

To check that a skill loaded, ask the agent "which skills can you use?" in a new session. To see a skill work, ask for the thing its description names.

Or let your agent choose: *"Read `skills/README.md` in the playbook and tell me which three of these skills would help most in this project, and why."*

## What is here

### Finishing and remembering

| Skill | Use it when | Script |
|---|---|---|
| [`done-when`](done-when/SKILL.md) | A command can decide that the task is finished, and the agent should not stop until it passes or a limit is reached. | A stop-hook gate that runs the approved check. |
| [`findings-log`](findings-log/SKILL.md) | Something learned should outlast the session, work is handed over, or the agent is about to claim it can run a tool. | Checks which commands exist and that every entry has a source. |
| [`session-recall`](session-recall/SKILL.md) | The answer is in an earlier agent session: what was decided, said or run. | Read-only search of stored transcripts. |

### Deciding what to build

| Skill | Use it when | Script |
|---|---|---|
| [`decide-before-build`](decide-before-build/SKILL.md) | Someone asks for a new feature or a change in behaviour, before any work starts. | Checks a decision record and which records are in force. |
| [`clarify-with-owner`](clarify-with-owner/SKILL.md) | An item is waiting on a person and needs one good question to the one who decides. | Checks the question and the requirements written from the reply. |
| [`plan-to-issues`](plan-to-issues/SKILL.md) | A plan is ready and needs to become issues, or you are deciding whether an issue may close. | None. |

### Working with other agents

| Skill | Use it when | Script |
|---|---|---|
| [`delegate-brief`](delegate-brief/SKILL.md) | You are about to hand a job to a subagent, another session, a cloud agent or a CI run. | None. Ships a brief template. |
| [`merge-results`](merge-results/SKILL.md) | Results from other agents come back and you must answer from them, or times from different clocks must be compared. | Converts a local time in a named zone to UTC and refuses ambiguous ones. |
| [`agent-roles`](agent-roles/SKILL.md) | A project has more than one agent role, or a role works from stale facts or must start clean from another harness. | Assembles a role's fresh start, previews the launch, audits the role folder. |

### Proving and checking

| Skill | Use it when | Script |
|---|---|---|
| [`show-it-works`](show-it-works/SKILL.md) | You must show that a web product works for its user, not only that tests pass. | Checks that the page you recorded is the build you think it is. |
| [`read-the-contract`](read-the-contract/SKILL.md) | A request body is about to go to an API or form whose accepted shape you have not read. | Lists the contracts and forms a page declares. |
| [`shorten-safely`](shorten-safely/SKILL.md) | A person's text must get shorter while some passages stay exactly as written. | Measures length and finds the first changed character in a protected passage. |
| [`latest-check`](latest-check/SKILL.md) | The question is which model or product is the newest. | None. |
| [`link-check`](link-check/SKILL.md) | A link is about to be sent to someone outside, or a takedown must be confirmed. | Opens the link with no session, the way an outsider would. |
| [`tool-contract`](tool-contract/SKILL.md) | You build, wrap or change a tool that an agent calls. | Probes a running tool against its written contract. |

### Running unattended

| Skill | Use it when | Script |
|---|---|---|
| [`unattended-batch`](unattended-batch/SKILL.md) | The same operation runs over many items with nobody watching. | Runs the routine inside a time limit and an item limit that the program owns. |
| [`secret-scope`](secret-scope/SKILL.md) | A request carries a key, token, password or cookie. | Sends the request only if every hop, redirects included, is on that secret's host list. |
| [`hold-for-owner`](hold-for-owner/SKILL.md) | An item needs a decision that is not the agent's to make. | Stores the held item, records the owner's yes or no, completes it once. |

### Keeping review and verification moving

| Skill | Use it when | Script |
|---|---|---|
| [`review-queue`](review-queue/SKILL.md) | You want one bounded pass over the open pull requests: what waits on you, what needs a first review, what is ready to merge. Also for a recurring or always-on session that keeps review moving. | Sorts pull requests into groups from `gh` data, and holds a lock so two passes never overlap. |
| [`after-merge-check`](after-merge-check/SKILL.md) | Merged work needs checking in the shared environment against what it was supposed to do, with a recorded verdict. | A ledger of which merges are still unchecked and what verdict each got. |

### Setting up

| Skill | Use it when | Script |
|---|---|---|
| [`repo-setup`](repo-setup/SKILL.md) | A repository is being set up for agent work, or instructions and skills must be shared across harnesses. | None. Ships a shared-instructions template. |

Three of them are designed to work together: `unattended-batch` sends credentialed requests through `secret-scope` and parks what it may not decide in `hold-for-owner`. `delegate-brief` and `merge-results` are also a pair. Each still works alone.

## About the scripts

- Node 18 or newer, no dependencies, one file each. Each skill's `SKILL.md` writes its commands as `scripts/<file>.mjs`, relative to the skill's own folder. After installing into a project, the full form is, for example, `node .claude/skills/done-when/scripts/done-when.mjs --help`.
- Every script has a `--selftest` that runs built-in cases and exits 0 when they pass. Run it once after copying a skill: `node .claude/skills/done-when/scripts/done-when.mjs --selftest`.
- They are small on purpose. Each enforces one idea and says in its `SKILL.md` what it does **not** protect against. Read that section before you rely on one for anything that matters, especially `secret-scope`, `unattended-batch` and `hold-for-owner`.
- Harness details (hook formats, launch flags, where transcripts are stored) were checked against late-2026 versions. Check them against yours.

## Where the ideas are explained

| Skills | Chapter |
|---|---|
| How a skill is written and selected | [Skills](../docs/02-workspace/02-skills.md) |
| `done-when`, `session-recall` | [The agent loop and its primitives](../docs/03-agents/01-agent-loop-and-primitives.md) |
| `findings-log` | [Knowledge and memory](../docs/02-workspace/03-knowledge-and-memory.md) |
| `delegate-brief`, `merge-results` | [Subagents and multi-agent work](../docs/03-agents/03-subagents-and-multi-agent.md) |
| `agent-roles` | [Portable agent config](../docs/05-autonomy/02-portable-agent-config.md) |
| `decide-before-build`, `clarify-with-owner`, `plan-to-issues` | [Intent, specs and decomposition](../docs/04-delivery/01-intent-specs-and-decomposition.md), [The delivery loop](../docs/04-delivery/02-the-delivery-loop.md) |
| `show-it-works`, `link-check` | [Verification and quality gates](../docs/04-delivery/03-verification-and-quality-gates.md) |
| `tool-contract`, `read-the-contract` | [Tools and MCP](../docs/02-workspace/04-tools-and-mcp.md) |
| `secret-scope`, `hold-for-owner` | [Hooks, guardrails and security](../docs/02-workspace/05-hooks-guardrails-and-security.md) |
| `unattended-batch` | [Autonomous systems](../docs/05-autonomy/01-autonomous-systems.md) |
| `review-queue` | [PR review with agents](../docs/04-delivery/04-pr-review-with-agents.md) |
| `after-merge-check` | [Verification and quality gates](../docs/04-delivery/03-verification-and-quality-gates.md) |
| `latest-check` | [How LLMs work](../docs/01-foundations/01-how-llms-work.md) (the knowledge cutoff) |
| `shorten-safely` | [Verification and quality gates](../docs/04-delivery/03-verification-and-quality-gates.md) (a deterministic check instead of the agent's own judgment) |
| `repo-setup` | [Instruction files and rules](../docs/02-workspace/01-instruction-files-and-rules.md) |
