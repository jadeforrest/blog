#!/usr/bin/env node

/**
 * Kit Push Sequence — push every changed email in a kit-sequence folder back to Kit,
 * using the same steps as `scripts/kit-push-email.js` (scripts/lib/kit-push-run.js):
 * each email's subject, preview text, content and scheduling (delay + send days).
 *
 *   1. Scan: report each file as in-sync / changed / new (by its kitSyncHash)
 *   2. Inspect: for each changed or new file, back up the remote email to
 *      scripts/kit-backups/ and show what a push would change
 *   3. Push (not with --dry-run): one [y/N] confirmation (skip with --yes), then a PUT
 *      per email, recording kitSyncHash/kitSyncedAt in each file
 *
 * Never changes publish state (use kit-push-email.js --publish for one email).
 * Failures are reported per email and don't stop the rest; the exit code is 1 if any.
 *
 * Usage:
 *   node scripts/kit-push-sequence.js <sequence-folder> [--dry-run] [--force] [--yes]
 */

import fs from 'fs';
import path from 'path';
import { loadApiKey } from './lib/kit-api.js';
import { askYesNo } from './lib/ask-yes-no.js';
import { BACKUP_DIR, listEmailFiles, pushSequence, summarizeSequence } from './lib/kit-push-run.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const yes = args.includes('--yes');
const dir = args.find((a) => !a.startsWith('--'));

function confirm(count) {
  return yes ? Promise.resolve(true) : askYesNo(`\nPush ${count} emails to Kit? [y/N]: `);
}

async function main() {
  if (!dir || !fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error('Usage: node scripts/kit-push-sequence.js <sequence-folder> [--dry-run] [--force] [--yes]');
    process.exit(1);
  }
  if (dryRun) console.log('--- DRY RUN (no PUT will be issued) ---');

  const result = await pushSequence(listEmailFiles(dir), {
    getApiKey: loadApiKey,
    backupDir: BACKUP_DIR,
    dryRun,
    force,
    confirm,
  });

  for (const line of summarizeSequence(result, (p) => path.relative(process.cwd(), p))) console.log(line);
  if (result.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
