#!/usr/bin/env node

/**
 * Kit Push Email — upload ONE sequence email Markdown file back to Kit (kit.com)
 * via the v4 API. The inverse of `scripts/kit-fetch-sequence.js`.
 *
 * Deliberately single-file (no bulk mode yet) while we build trust in the
 * round-trip. Safety properties:
 *   - Backs up the current remote email JSON to scripts/kit-backups/ before any PUT
 *   - Writes the outgoing HTML alongside the backup for eyeballing/diffing
 *   - PUT sends only subject / preview_text / content — never position, published,
 *     delays, or send_days (the v4 endpoint leaves omitted fields untouched)
 *   - Interactive [y/N] confirmation before the PUT (skippable with --yes)
 *   - kitSyncHash frontmatter gate skips files already in sync (override: --force)
 *
 * Usage:
 *   node scripts/kit-push-email.js <path-to-index.md> [--dry-run] [--force] [--yes]
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { loadApiKey, apiGet, apiPut } from './lib/kit-api.js';
import { markdownToHtml, contentHash, buildUpdatePayload } from './lib/kit-push-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'kit-backups');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const yes = args.includes('--yes');
const filePath = args.find((a) => !a.startsWith('--'));

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  if (!filePath) {
    console.error('Usage: node scripts/kit-push-email.js <path-to-index.md> [--dry-run] [--force] [--yes]');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: fm, content: body } = matter(raw);

  if (!fm.kitEmailId || !fm.sequenceId) {
    console.error('Error: frontmatter must contain kitEmailId and sequenceId (is this a kit-sequence file?)');
    process.exit(1);
  }

  console.log(`Email:    ${fm.subject || '(no subject)'}`);
  console.log(`Sequence: ${fm.sequenceId}   Email id: ${fm.kitEmailId}`);
  if (dryRun) console.log('--- DRY RUN (no PUT will be issued) ---');

  // Hash gate: skip if the file hasn't changed since the last recorded push.
  const localHash = contentHash(raw);
  if (fm.kitSyncHash === localHash && !force) {
    console.log(`\nAlready in sync (kitSyncHash matches, last pushed ${fm.kitSyncedAt || 'unknown'}).`);
    console.log('Nothing to push. Use --force to push anyway.');
    return;
  }
  console.log(fm.kitSyncHash ? '\nContent changed since last push.' : '\nNever pushed before.');

  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Error: KIT_API_KEY not set. Add it to .env (export KIT_API_KEY="...") or the environment.');
    process.exit(1);
  }

  // Backup the current remote state before anything else. If this fails, abort —
  // never push without a safety copy.
  console.log('\nFetching current remote email for backup...');
  const remote = await apiGet(`/sequences/${fm.sequenceId}/emails/${fm.kitEmailId}`, apiKey);
  const remoteEmail = remote.email || remote;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(BACKUP_DIR, `${fm.sequenceId}-${fm.kitEmailId}-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(remote, null, 2));
  console.log(`  ✓ Remote backup: ${path.relative(process.cwd(), `${base}.json`)}`);

  // Convert and stage the outgoing HTML for inspection.
  const html = await markdownToHtml(body);
  fs.writeFileSync(`${base}-outgoing.html`, html);
  console.log(`  ✓ Outgoing HTML: ${path.relative(process.cwd(), `${base}-outgoing.html`)}`);

  // Drift check: warn if the remote subject no longer matches the frontmatter's.
  console.log(`\nLocal subject:  "${fm.subject ?? ''}"`);
  console.log(`Remote subject: "${remoteEmail.subject ?? ''}"`);
  if ((remoteEmail.subject ?? '') !== (fm.subject ?? '')) {
    console.warn('  ⚠ SUBJECT DRIFT: the email was changed on Kit since it was fetched.');
    console.warn('  ⚠ Pushing will overwrite the remote subject and content.');
  }
  console.log(`Remote content: ${(remoteEmail.content ?? '').length} chars → outgoing: ${html.length} chars`);

  if (dryRun) {
    console.log('\nDry run complete. No changes made to Kit.');
    console.log('Inspect the outgoing HTML against the backup, then rerun without --dry-run.');
    return;
  }

  const payload = buildUpdatePayload(fm, html);
  console.log('\nWill PUT only: subject, preview_text, content (scheduling fields untouched).');
  if (!yes) {
    const answer = await prompt('Push to Kit? [y/N]: ');
    if (answer !== 'y') {
      console.log('Aborted. Nothing pushed.');
      return;
    }
  }

  const result = await apiPut(`/sequences/${fm.sequenceId}/emails/${fm.kitEmailId}`, payload, apiKey);
  const updated = result.email || result;
  console.log(`\n✓ Pushed. Kit now has subject "${updated.subject ?? ''}" (${(updated.content ?? '').length} chars).`);

  // Record push state in frontmatter. The stored hash is computed from the file
  // exactly as written here (matter.stringify may normalize hand-edited YAML), and
  // hashableContent excludes the kitSyncHash/kitSyncedAt lines themselves — so the
  // next run's contentHash(raw) matches and correctly reports "already in sync".
  const newFm = { ...fm, kitSyncHash: 'pending', kitSyncedAt: new Date().toISOString() };
  let out = matter.stringify(body, newFm);
  out = out.replace(/^kitSyncHash: .*$/m, `kitSyncHash: ${contentHash(out)}`);
  fs.writeFileSync(filePath, out);
  console.log('✓ Recorded kitSyncHash + kitSyncedAt in frontmatter.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
