#!/bin/bash
# launchd: com.jade.podcast-day, hourly. Runs scripts/podcast-day.js with the repo's .env:
# rebuilds the site when a new podcast episode appears in the feed but not on /decoding-leadership/.
# Failures are recorded and notified by job-wrapper via error-reporting, a missed
# run by its heartbeat.
JOB_WRAPPER_LIB="${JOB_WRAPPER_LIB:-$HOME/.local/lib/job-wrapper.sh}"
[ -r "$JOB_WRAPPER_LIB" ] || { echo "FATAL: job-wrapper missing" >&2; exit 78; }
. "$JOB_WRAPPER_LIB"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
job_init podcast-day "$HOME/Library/Logs/podcast-day.log" 1d
job_log "--- started ---"

job_setup_node || { JOB_FAIL_REASON="node not found on PATH"; exit 127; }

cd "$REPO_DIR"
# .env holds export lines; source it with -eu off so an odd value can't abort.
set +eu
# shellcheck disable=SC1091
source .env
set -eu

# Arguments (e.g. --dry-run) pass through to node; a manual run with
# arguments is not the schedule's success, so it writes no heartbeat.
if [ $# -gt 0 ]; then JOB_NO_HEARTBEAT=1; fi
code=0
node "scripts/podcast-day.js" "$@" >> "$JOB_LOG_FILE" 2>&1 || code=$?
if (( code != 0 )); then
    JOB_FAIL_REASON="podcast-day.js failed (exit $code); see ~/Library/Logs/podcast-day.log"
fi
job_log "--- finished (exit $code) ---"
exit "$code"
