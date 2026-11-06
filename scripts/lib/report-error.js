// Route a job's alerts through ~/Developer/error-reporting so they are
// recorded in its errors.jsonl (for the fix-reported-errors task) and
// throttled like every other job's. Falls back to a plain osascript
// notification when the CLI is absent (e.g. on another machine), and never
// throws: an alert failing must not break posting.
import fs from 'fs';
import { execFileSync } from 'child_process';

export const REPORT_ERROR_CLI =
  process.env.REPORT_ERROR_CLI || '/Users/jade/Developer/error-reporting/bin/report-error';

/** argv for `report-error report` (exported for tests). */
export function reportArgs(job, message, { severity = 'warning', sound = false } = {}) {
  return ['report', '--job', job, '--severity', severity, '--reason', message,
    '--sound', sound ? 'Basso' : ''];
}

/** argv for the fallback notification; text is passed as argv, never spliced. */
export function osascriptArgs(title, message, sound) {
  const line = 'display notification (item 2 of argv) with title (item 1 of argv)' +
    (sound ? ' sound name "Basso"' : '');
  return ['-e', 'on run argv', '-e', line, '-e', 'end run', title, message];
}

export function reportAlert(job, message, opts = {}, exec = execFileSync, exists = fs.existsSync) {
  try {
    if (exists(REPORT_ERROR_CLI)) {
      exec(REPORT_ERROR_CLI, reportArgs(job, message, opts), { stdio: 'ignore', timeout: 15000 });
      return 'reported';
    }
    if (process.platform !== 'darwin') return 'skipped';
    exec('osascript', osascriptArgs(job, message, opts.sound), { stdio: 'ignore', timeout: 10000 });
    return 'notified';
  } catch (error) {
    console.warn(`  (alert failed: ${error.message})`);
    return 'failed';
  }
}
