# Templates

Starter files to copy into your own project or home directory. Each one has a header comment saying what it is and what to change. They are starting points to read and adapt, not installers: review every line before you rely on one, especially the hooks and the remote-setup files.

Examples target Claude Code as of late 2026. Paths such as `.claude/skills/` have equivalents in other harnesses; the chapters say where.

| Template | Copy to | Explained in |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | Project root (plus a one-line `CLAUDE.md` containing `@AGENTS.md` for Claude Code) | [Instruction files and rules](../docs/02-workspace/01-instruction-files-and-rules.md) |
| [`rule-example.md`](rule-example.md) | `.claude/rules/<topic>.md` | [Instruction files and rules](../docs/02-workspace/01-instruction-files-and-rules.md) |
| [`skill-example/SKILL.md`](skill-example/SKILL.md) | `.claude/skills/<name>/SKILL.md` | [Skills](../docs/02-workspace/02-skills.md) |
| [`team-memory-topic.md`](team-memory-topic.md) | `.claude/memory/<topic>.md` | [Knowledge and memory](../docs/02-workspace/03-knowledge-and-memory.md) |
| [`adr-template.md`](adr-template.md) | `docs/adr/NNNN-title.md` | [Knowledge and memory](../docs/02-workspace/03-knowledge-and-memory.md) |
| [`story-template.md`](story-template.md) | Your issue tracker's story template | [Intent, specs and decomposition](../docs/04-delivery/01-intent-specs-and-decomposition.md) |
| [`plan-template.md`](plan-template.md) | Your plans folder | [The delivery loop](../docs/04-delivery/02-the-delivery-loop.md) |
| [`pr-body-template.md`](pr-body-template.md) | `.github/pull_request_template.md` | [PR review with agents](../docs/04-delivery/04-pr-review-with-agents.md) |
| [`skills/pre-push-review/`](skills/pre-push-review/SKILL.md) | `.claude/skills/pre-push-review/` | [PR review with agents](../docs/04-delivery/04-pr-review-with-agents.md) |
| [`skills/peer-review/`](skills/peer-review/SKILL.md) | `.claude/skills/peer-review/` | [PR review with agents](../docs/04-delivery/04-pr-review-with-agents.md) |
| [`skills/resolve-threads/`](skills/resolve-threads/SKILL.md) | `.claude/skills/resolve-threads/` | [PR review with agents](../docs/04-delivery/04-pr-review-with-agents.md) |
| [`hooks/block-sensitive-edits.sh`](hooks/block-sensitive-edits.sh) and [`hooks/settings-snippet.json`](hooks/settings-snippet.json) | `.claude/hooks/` and the `hooks` key of `.claude/settings.json` | [Hooks, guardrails and security](../docs/02-workspace/05-hooks-guardrails-and-security.md) |
| [`global-instructions-security.md`](global-instructions-security.md) | A section of your user-level instruction file | [Hooks, guardrails and security](../docs/02-workspace/05-hooks-guardrails-and-security.md) |
| [`remote/global-instructions.md`](remote/global-instructions.md) | Your user-level instruction file, on the laptop and the server | [Blueprint: always-on remote setup](../docs/06-field-guides/02-always-on-remote-setup-blueprint.md) |
| [`remote/ssh-config-example`](remote/ssh-config-example) | `~/.ssh/config` | [Blueprint: always-on remote setup](../docs/06-field-guides/02-always-on-remote-setup-blueprint.md) |
| [`remote/remote-control.service`](remote/remote-control.service) | `~/.config/systemd/user/` on the server | [Blueprint: always-on remote setup](../docs/06-field-guides/02-always-on-remote-setup-blueprint.md) |
| [`remote/link-watchdog.sh`](remote/link-watchdog.sh) | `~/.local/bin/` on the server, run by a timer | [Blueprint: always-on remote setup](../docs/06-field-guides/02-always-on-remote-setup-blueprint.md) |
| [`remote/hand-off-task.sh`](remote/hand-off-task.sh) | Anywhere on your laptop's `PATH` | [Blueprint: always-on remote setup](../docs/06-field-guides/02-always-on-remote-setup-blueprint.md) |
