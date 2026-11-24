#!/usr/bin/env bash
# block-sensitive-edits.sh
#
# WHAT IT IS
#   A Claude Code PreToolUse hook. It refuses Edit / Write / NotebookEdit calls
#   that target secrets, keys, lockfiles, CI configuration or the agent's own
#   guardrails. The agent sees the reason and can ask you instead.
#
# WHAT TO CHANGE
#   1. PROTECTED_NAMES   file names (shell globs) that must never be edited.
#   2. PROTECTED_DIRS    path fragments; anything under them is refused.
#   3. ALLOWED_NAMES     exceptions, such as example env files.
#   Then save this file as .claude/hooks/block-sensitive-edits.sh, run
#   `chmod +x` on it, and register it with settings-snippet.json (same folder).
#
# HOW IT TALKS TO CLAUDE CODE
#   stdin : one JSON object with tool_name and tool_input.file_path
#           (tool_input.notebook_path for NotebookEdit).
#   exit 0: no objection; the normal permission flow continues.
#   exit 2: the call is refused; stderr is shown to the agent as the reason.
#
# VERIFIED AGAINST
#   The official hooks reference and hooks guide (code.claude.com/docs/en/hooks,
#   /hooks-guide) as published on 2026-11-24, Claude Code 2.1.x. Hook input and
#   output shapes are version-sensitive: re-check those pages after an upgrade.
#
# LIMITS
#   It guards the file-editing tools only. A shell command (`echo x > .env`)
#   does not pass through this hook. Pair it with permission deny rules and,
#   where it has to hold, the sandbox.
#
# TEST IT
#   echo '{"tool_name":"Edit","tool_input":{"file_path":"/repo/.env"}}' \
#     | ./block-sensitive-edits.sh; echo "exit $?"        # expect: exit 2
#   echo '{"tool_name":"Edit","tool_input":{"file_path":"/repo/src/app.ts"}}' \
#     | ./block-sensitive-edits.sh; echo "exit $?"        # expect: exit 0

set -u

PROTECTED_NAMES=(
  ".env" ".env.*" "*.pem" "*.key" "*.p12" "id_rsa" "id_ed25519"
  "credentials" "credentials.json" ".npmrc" ".netrc"
  "package-lock.json" "pnpm-lock.yaml" "yarn.lock"
)

PROTECTED_DIRS=(
  "/.git/" "/.ssh/" "/.aws/" "/secrets/"
  "/.github/workflows/"
  "/.claude/hooks/"
)

ALLOWED_NAMES=(
  ".env.example" ".env.sample" ".env.template"
)

refuse() {
  echo "$1" >&2
  exit 2
}

# Fail closed: a guardrail that cannot read its input must not wave calls through.
command -v jq >/dev/null 2>&1 \
  || refuse "Blocked: the block-sensitive-edits hook needs jq and it is not installed. Tell the owner."

input=$(cat)
path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input" 2>/dev/null) \
  || refuse "Blocked: the block-sensitive-edits hook could not read the tool call."

# Tools without a file path are not this hook's business.
[[ -z "$path" ]] && exit 0

# Claude Code sends absolute paths. Normalise Windows separators for matching.
path=${path//\\//}
name=${path##*/}

for allowed in "${ALLOWED_NAMES[@]}"; do
  # shellcheck disable=SC2053  # glob match is intended
  [[ "$name" == $allowed ]] && exit 0
done

for pattern in "${PROTECTED_NAMES[@]}"; do
  # shellcheck disable=SC2053
  if [[ "$name" == $pattern ]]; then
    refuse "Blocked: $path is a protected file (rule: $pattern). Do not edit it and do not work around this with a shell command. Tell the owner which change is needed and why."
  fi
done

for dir in "${PROTECTED_DIRS[@]}"; do
  if [[ "$path" == *"$dir"* ]]; then
    refuse "Blocked: $path is inside a protected folder (rule: $dir). Do not edit it and do not work around this with a shell command. Tell the owner which change is needed and why."
  fi
done

exit 0
