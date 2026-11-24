#!/bin/bash
# WHAT THIS IS
#   A watchdog sketch for a coding agent's remote-control entry that runs in a tmux session
#   (see remote-control.service in this folder). A process supervisor only notices a process that
#   exits. This script covers the other failure: the process is still running, but its link to
#   the relay is dead, so the machine has vanished from the phone. It reads the last lines of
#   the tmux pane and restarts the entry when
#     1. the newest "failed" line is newer than the newest "connected" line, or
#     2. the newest status line reports that no session capacity is left, or
#     3. the tmux session is gone.
#   Every restart is written to a log with the reason. A healthy check prints nothing.
#
# WHAT TO CHANGE
#   - FAIL_RE, OK_RE, STATUS_RE, DEAD_RE: these match text that Claude Code's remote-control
#     screen showed as of late 2026. They are NOT a stable interface. Run
#     `tmux capture-pane -p -t remote` on a healthy entry and on a broken one, and write patterns
#     for what YOUR version prints.
#   - RESTART_CMD: the default restarts the systemd user unit. On a machine without systemd,
#     point it at a command that kills the tmux session and runs the script your login item
#     uses to start the entry.
#   - SESSION, LOG, TAIL_LINES, TMUX_BIN if yours differ. Schedulers start jobs with a short
#     PATH, so give TMUX_BIN an absolute path if tmux is not in /usr/bin.
#
# HOW TO SCHEDULE IT (every few minutes; <INTERVAL> is yours to choose)
#   systemd, as two user units next to remote-control.service:
#     link-watchdog.service      [Service]
#                              Type=oneshot
#                              ExecStart=%h/.local/bin/link-watchdog
#     link-watchdog.timer        [Timer]
#                              OnBootSec=<INTERVAL>
#                              OnUnitActiveSec=<INTERVAL>
#                              [Install]
#                              WantedBy=timers.target
#   macOS: a launch agent with a StartInterval that runs this script.
#
# STATUS
#   A starting point to review, not a turnkey installer. It scrapes a terminal screen, so a
#   harness update can blind it without any error. Test the three cases against saved sample
#   screens after every upgrade, and check the log now and then: a restart on every run
#   means a pattern is wrong, not that the link is bad.

SESSION=${SESSION:-remote}
TMUX_BIN=${TMUX_BIN:-/usr/bin/tmux}
LOG=${LOG:-$HOME/link-watchdog.log}
TAIL_LINES=${TAIL_LINES:-200}
RESTART_CMD=${RESTART_CMD:-systemctl --user restart remote-control.service}

export FAIL_RE=${FAIL_RE:-Session failed}
export OK_RE=${OK_RE:-Reconnected|Connected ·}
export STATUS_RE=${STATUS_RE:-Capacity:}
export DEAD_RE=${DEAD_RE:-Capacity: 0/}

# The tail of the pane, scrollback included. Empty when the tmux session does not exist.
pane=$("$TMUX_BIN" capture-pane -p -S "-$TAIL_LINES" -t "$SESSION" 2>/dev/null) || pane=""

reason=$(printf '%s\n' "$pane" | python3 -c '
import os, re, sys

lines = [l for l in sys.stdin.read().splitlines() if l.strip()]
if not lines:
    print("no tmux session")
    sys.exit()

def last(pattern):
    hits = [i for i, l in enumerate(lines) if re.search(pattern, l)]
    return hits[-1] if hits else -1

fail, ok, status = last(os.environ["FAIL_RE"]), last(os.environ["OK_RE"]), last(os.environ["STATUS_RE"])
if fail > ok:
    print("link failed: " + lines[fail].strip()[:120])
elif status >= 0 and re.search(os.environ["DEAD_RE"], lines[status]):
    print("no session capacity left")
')

[ -z "$reason" ] && exit 0
echo "$(date '+%F %T') restart: $reason" >> "$LOG"
eval "$RESTART_CMD"
