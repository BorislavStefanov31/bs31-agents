#!/bin/bash
# WHAT THIS IS
#   Hands a task from the laptop to a new coding-agent session on an always-on server. The
#   session runs inside tmux on the server, so it survives a closed laptop, and it starts
#   attached to the harness's remote control, so you can follow and answer it from a phone.
#   Three steps, on purpose not one:
#     hand-off-task.sh start  NAME DIR     start the session in DIR and print its screen
#     hand-off-task.sh screen NAME         print the screen again
#     hand-off-task.sh send   NAME "TASK"  type the task into the session and press Enter
#   Between "start" and "send" somebody has to READ the screen. A new session can show a
#   first-run tip or ask whether to trust the folder, and whatever you send next answers that
#   question. Accept folder trust only for a repository you chose yourself.
#
# WHAT TO CHANGE
#   - SERVER: your worker SSH alias (see ssh-config-example in this folder).
#   - AGENT_CMD: the command that starts a named, remotely controllable session. The default is
#     Claude Code's flag as of late 2026; check `claude --help`. Add a permission mode here if
#     you want one, and know what it allows before you do.
#   - NAME must be unique. A session that reuses the name of one that still exists can exit
#     at start. Put a date or an issue key in it.
#   - DIR is a path on the server, normally a checkout under the worker's home.
#   - WAIT_SECONDS, COLS and ROWS are examples: long enough for the session to draw its first
#     screen, and wide enough for the captured screen to stay readable.
#
# STATUS
#   A starting point to review, not a turnkey installer. It starts an agent with your
#   credentials on another machine. Read it before you run it.

set -euo pipefail

SERVER=${SERVER:-'my-server.<tailnet>.ts.net'}
AGENT_CMD=${AGENT_CMD:-claude --remote-control}
REMOTE_SHELL=${REMOTE_SHELL:-ssh -o BatchMode=yes $SERVER bash -ls}
WAIT_SECONDS=${WAIT_SECONDS:-8}
COLS=${COLS:-200}
ROWS=${ROWS:-50}

usage() { sed -n '6,9p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }

# Run a script on the server through a login shell, so that ~/.local/bin is on PATH.
remote() { $REMOTE_SHELL <<<"$1"; }

cmd=${1:-}
name=${2:-}
[ -n "$cmd" ] && [ -n "$name" ] || usage
# tmux rewrites dots and colons in session names, so keep to a safe set.
case "$name" in *[!A-Za-z0-9_-]*) echo "NAME may contain only letters, digits, underscore and dash" >&2; exit 2;; esac

case "$cmd" in
start)
  dir=${3:-}; [ -n "$dir" ] || usage
  remote "
    set -e
    if tmux has-session -t $name 2>/dev/null; then echo 'a tmux session named $name already exists' >&2; exit 1; fi
    tmux new-session -d -s $name -x $COLS -y $ROWS -c $(printf %q "$dir") $(printf %q "$AGENT_CMD $name")
    sleep $WAIT_SECONDS
    tmux capture-pane -p -t $name
  "
  echo "--- Read the screen above. Then: $0 send $name \"TASK\"" >&2
  ;;
screen)
  remote "tmux capture-pane -p -t $name"
  ;;
send)
  task=${3:-}; [ -n "$task" ] || usage
  # -l sends the text literally, so tmux does not read words such as Enter as key names.
  remote "
    set -e
    tmux send-keys -t $name -l $(printf %q "$task")
    tmux send-keys -t $name Enter
    sleep 2
    tmux capture-pane -p -t $name | grep -v '^[[:space:]]*\$' | tail -n 15 || true
  "
  echo "--- Sent. Follow the session '$name' from your phone, or attach: ssh -t $SERVER tmux attach -t $name" >&2
  ;;
*)
  usage
  ;;
esac
