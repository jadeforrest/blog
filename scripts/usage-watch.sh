#!/bin/bash
# Daily rubick.com cost check (launchd: com.jade.rubick-usage-watch). Runs
# scripts/usage-watch.js and turns each alert it prints into a notification.
# A failure of the check itself (bad token, API down) is reported by
# job-wrapper; a missed day is reported by its stale-heartbeat check.
JOB_WRAPPER_LIB="${JOB_WRAPPER_LIB:-/Users/jade/Developer/job-wrapper/job-wrapper.sh}"
[ -r "$JOB_WRAPPER_LIB" ] || { echo "FATAL: job-wrapper missing" >&2; exit 78; }
. "$JOB_WRAPPER_LIB"
job_init rubick-usage-watch "$HOME/Library/Logs/rubick-usage-watch.log" 4d

BLOG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
job_setup_node
# Only the token: sourcing all of .env under set -eu breaks on any odd value.
JOB_FAIL_REASON="NETLIFY_AUTH_TOKEN missing from $BLOG_DIR/.env"
NETLIFY_AUTH_TOKEN=$(sed -n 's/^[[:space:]]*\(export[[:space:]]\{1,\}\)\{0,1\}NETLIFY_AUTH_TOKEN=//p' "$BLOG_DIR/.env" | tail -1 | tr -d "\"'")
[ -n "$NETLIFY_AUTH_TOKEN" ] || exit 1
export NETLIFY_AUTH_TOKEN
unset JOB_FAIL_REASON

alerts=$(node "$BLOG_DIR/scripts/usage-watch.js" 2>>"$JOB_LOG_FILE") || {
    JOB_FAIL_REASON="usage-watch.js failed (exit $?)"
    exit 1
}
while IFS= read -r alert; do
    [ -n "$alert" ] || continue
    job_log "ALERT: $alert"
    job_notify "$alert" "rubick.com cost" "Basso"
done <<< "$alerts"
job_log "done"
