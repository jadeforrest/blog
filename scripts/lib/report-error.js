// Route a job's alerts through error-reporting's report-error CLI
// (installed at ~/.local/bin/report-error by its install.sh) so they are
// recorded in its errors.jsonl (for the fix-reported-errors task) and
// throttled like every other job's. Falls back to a plain osascript
// notification when the CLI is absent or fails, and never throws: an alert
// failing must not break posting.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

export const REPORT_ERROR_CLI =
  process.env.REPORT_ERROR_CLI || path.join(os.homedir(), '.local', 'bin', 'report-error');

/**
 * argv for `report-error report` (exported for tests). Values use --opt=VALUE
 * so text starting with "-" can't be mistaken for an option.
 * opts.log: the job log whose tail is stored with the record; opts.script: the
 * script the fixer should look at.
 */
export function reportArgs(job, message, { severity = 'warning', sound = false, log = '', script = '' } = {}) {
  return ['report', `--job=${job}`, `--severity=${severity}`, `--reason=${message}`,
    `--sound=${sound ? 'Basso' : ''}`, `--log=${log}`, `--script=${script}`];
}

/** argv for the fallback notification; text is passed as argv, never spliced. */
export function osascriptArgs(title, message, sound) {
  const line = 'display notification (item 2 of argv) with title (item 1 of argv)' +
    (sound ? ' sound name "Basso"' : '');
  return ['-e', 'on run argv', '-e', line, '-e', 'end run', title, message];
}

function tryRun(exec, cmd, args, timeout) {
  try {
    exec(cmd, args, { stdio: 'ignore', timeout });
    return true;
  } catch (error) {
    console.warn(`  (${cmd.split('/').pop()} failed: ${error.message})`);
    return false;
  }
}

export function reportAlert(job, message, opts = {}, exec = execFileSync, exists = fs.existsSync) {
  if (exists(REPORT_ERROR_CLI) && tryRun(exec, REPORT_ERROR_CLI, reportArgs(job, message, opts), 15000)) {
    return 'reported';
  }
  if (process.platform !== 'darwin') return 'skipped';
  return tryRun(exec, 'osascript', osascriptArgs(job, message, opts.sound), 10000) ? 'notified' : 'failed';
}
