#!/usr/bin/env node

/**
 * Kit Push Email — upload ONE sequence email Markdown file back to Kit (kit.com)
 * via the v4 API. The inverse of `scripts/kit-fetch-sequence.js`.
 *
 * One file per run; `scripts/kit-push-sequence.js` pushes a whole sequence folder
 * with the same steps (scripts/lib/kit-push-run.js). Safety properties:
 *   - Backs up the current remote email JSON to scripts/kit-backups/ before any PUT
 *   - Writes the outgoing HTML alongside the backup for eyeballing/diffing
 *   - PUT sends subject / preview_text / content plus the scheduling fields
 *     delay_value / delay_unit / send_days from frontmatter — never position (the v4
 *     endpoint leaves omitted fields untouched)
 *   - The email's draft/published state is left untouched unless --publish is given,
 *     which additionally sends published:true to flip a draft live (one-directional:
 *     a push never unpublishes a live email)
 *   - Interactive [y/N] confirmation before the PUT (skippable with --yes)
 *   - kitSyncHash frontmatter gate skips files already in sync (override: --force)
 *
 * Usage:
 *   node scripts/kit-push-email.js <path-to-index.md> [--dry-run] [--force] [--yes] [--publish]
 */

import fs from 'fs';
import { loadApiKey } from './lib/kit-api.js';
import { askYesNo } from './lib/ask-yes-no.js';
import { BACKUP_DIR, pushOne } from './lib/kit-push-run.js';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const filePath = args.find((a) => !a.startsWith('--'));

async function main() {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node scripts/kit-push-email.js <path-to-index.md> [--dry-run] [--force] [--yes] [--publish]');
    process.exit(1);
  }
  if (args.includes('--dry-run')) console.log('--- DRY RUN (no PUT will be issued) ---');
  await pushOne(filePath, {
    getApiKey: loadApiKey,
    backupDir: BACKUP_DIR,
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    publish: args.includes('--publish'),
    confirm: () => (yes ? Promise.resolve(true) : askYesNo('Push to Kit? [y/N]: ')),
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
