#!/bin/bash
# launchd: com.jade.blog-to-linkedin (moved from ~/Library/Scripts/blog-to-linkedin.sh so it is under git
# and the fix-reported-errors task can patch it on a branch). Runs
# scripts/extract-to-linkedin.js with the repo's .env; failures are recorded and notified by
# job-wrapper via error-reporting, a missed run by its heartbeat.
JOB_WRAPPER_LIB="${JOB_WRAPPER_LIB:-$HOME/.local/lib/job-wrapper.sh}"
[ -r "$JOB_WRAPPER_LIB" ] || { echo "FATAL: job-wrapper missing" >&2; exit 78; }
. "$JOB_WRAPPER_LIB"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
job_init blog-to-linkedin "$REPO_DIR/scripts/extract-linkedin.log" 4d
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
node "scripts/extract-to-linkedin.js" "$@" >> "$JOB_LOG_FILE" 2>&1 || code=$?
if (( code != 0 )); then
    JOB_FAIL_REASON="extract-to-linkedin.js failed (exit $code)"
fi
job_log "--- finished (exit $code) ---"
exit "$code"
