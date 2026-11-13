#!/bin/bash
# launchd: com.jade.blog-post-day, daily at 6:00 AM. Runs scripts/blog-post-day.js with the repo's
# .env: builds the site on a scheduled post's date and announces new posts on Bluesky/LinkedIn.
# Failures are recorded and notified by job-wrapper via ~/Developer/error-reporting, a missed
# run by its heartbeat.
JOB_WRAPPER_LIB="${JOB_WRAPPER_LIB:-/Users/jade/Developer/job-wrapper/job-wrapper.sh}"
[ -r "$JOB_WRAPPER_LIB" ] || { echo "FATAL: job-wrapper missing" >&2; exit 78; }
. "$JOB_WRAPPER_LIB"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
job_init blog-post-day "$HOME/Library/Logs/blog-post-day.log" 3d
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
node "scripts/blog-post-day.js" "$@" >> "$JOB_LOG_FILE" 2>&1 || code=$?
if (( code != 0 )); then
    JOB_FAIL_REASON="blog-post-day.js failed (exit $code); see ~/Library/Logs/blog-post-day.log"
fi
job_log "--- finished (exit $code) ---"
exit "$code"
