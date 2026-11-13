/**
 * The steps of pushing one Kit sequence email file, shared by the single-file CLI
 * (`scripts/kit-push-email.js`) and the whole-sequence one (`scripts/kit-push-sequence.js`):
 *
 *   readEmailFile   parse the file and work out whether it needs pushing (no I/O but fs)
 *   inspectRemote   GET the remote email, back it up, stage the outgoing HTML
 *   describePush    the lines to show for an inspected email (pure)
 *   applyPush       PUT the payload and record kitSyncHash/kitSyncedAt in the file
 *
 * I/O comes in through `deps` ({ fs, apiGet, apiPut, now }) so tests can fake it.
 */

import nodeFs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiGet, apiPut } from './kit-api.js';
import { parseFrontmatter } from './frontmatter.js';
import {
  markdownToHtml,
  buildUpdatePayload,
  recordPushState,
  scheduleChange,
  syncStatus,
} from './kit-push-lib.js';

/** Where pushes save the remote email and outgoing HTML first (gitignored). */
export const BACKUP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kit-backups');

export const defaultDeps = { fs: nodeFs, apiGet, apiPut, now: () => new Date() };

const emailPath = (fm) => `/sequences/${fm.sequenceId}/emails/${fm.kitEmailId}`;

/** Parse an email file. Throws if it isn't a kit-sequence file. */
export function readEmailFile(filePath, { fs } = defaultDeps) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: fm, content: body } = parseFrontmatter(raw, filePath);
  if (!fm.kitEmailId || !fm.sequenceId) {
    throw new Error(`${filePath}: frontmatter must contain kitEmailId and sequenceId`);
  }
  return { filePath, raw, fm, body, status: syncStatus(raw, fm) };
}

/**
 * Fetch the remote email and save it, plus the HTML a push would send, under
 * `backupDir`. Never push without having done this: the backup is the undo.
 */
export async function inspectRemote(email, { apiKey, backupDir, deps = defaultDeps }) {
  const { fs, now } = deps;
  const remote = await deps.apiGet(emailPath(email.fm), apiKey);
  const remoteEmail = remote.email || remote;
  const html = await markdownToHtml(email.body);

  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = now().toISOString().replace(/[:.]/g, '-');
  const base = path.join(backupDir, `${email.fm.sequenceId}-${email.fm.kitEmailId}-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(remote, null, 2));
  fs.writeFileSync(`${base}-outgoing.html`, html);
  return { remoteEmail, html, backupBase: base };
}

/** What a push of this inspected email would change, as lines to print. */
export function describePush(email, { remoteEmail, html }) {
  const localSubject = email.fm.subject ?? '';
  const remoteSubject = remoteEmail.subject ?? '';
  const lines = [];
  if (localSubject !== remoteSubject) {
    lines.push(`subject drift: Kit has "${remoteSubject}", pushing "${localSubject}"`);
  }
  lines.push(`content: ${(remoteEmail.content ?? '').length} → ${html.length} chars`);
  const schedule = scheduleChange(remoteEmail, email.fm);
  lines.push(schedule ? `schedule: ${schedule.from} → ${schedule.to}` : 'schedule: unchanged');
  lines.push(`state: ${remoteEmail.published ? 'published' : 'draft'}`);
  return lines;
}

/** PUT the email and record the push in its file. Returns Kit's updated email. */
export async function applyPush(email, inspection, { apiKey, publish = false, deps = defaultDeps }) {
  const payload = buildUpdatePayload(email.fm, inspection.html, { publish });
  const result = await deps.apiPut(emailPath(email.fm), payload, apiKey);
  const updated = result.email || result;
  const published = updated.published ?? (publish || Boolean(inspection.remoteEmail.published));
  const out = recordPushState(email.body, email.fm, {
    published,
    syncedAt: deps.now().toISOString(),
  });
  deps.fs.writeFileSync(email.filePath, out);
  return { ...updated, published };
}

/** The `<NN>--slug/index.md` email files in a sequence folder, in position order. */
export function listEmailFiles(dir, { fs } = defaultDeps) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.md')))
    .map((d) => path.join(dir, d.name, 'index.md'))
    .sort();
}

const counter = (i, n) => `[${String(i + 1).padStart(String(n).length)}/${n}]`;
const label = (filePath) => path.basename(path.dirname(filePath));

/** Run `step` on each item with a progress prefix; a throw is logged and collected. */
async function eachWithProgress(items, log, step) {
  const ok = [];
  const failed = [];
  for (const [i, item] of items.entries()) {
    const prefix = `${counter(i, items.length)} ${label(item.filePath ?? item.email.filePath)}`;
    try {
      ok.push(await step(item, prefix));
    } catch (err) {
      log(`${prefix}  ✗ ${err.message}`);
      failed.push({ filePath: item.filePath ?? item.email.filePath, error: err.message });
    }
  }
  return { ok, failed };
}

/**
 * Push every out-of-sync email in `files`: scan (status of each file), inspect (GET +
 * backup + what would change), then — unless `dryRun`, and only after `confirm(count)`
 * resolves true — PUT each one. One failure doesn't stop the others; all are returned.
 */
export async function pushSequence(
  files,
  { getApiKey, backupDir, dryRun = false, force = false, confirm, log = console.log, deps = defaultDeps }
) {
  log(`Scanning ${files.length} emails...`);
  const scan = await eachWithProgress(
    files.map((filePath) => ({ filePath })),
    log,
    ({ filePath }, prefix) => {
      const email = readEmailFile(filePath, deps);
      log(`${prefix}  ${email.status}`);
      return email;
    }
  );
  const pending = scan.ok.filter((e) => force || e.status !== 'in-sync');
  const result = { scanned: files.length, pending: pending.length, pushed: 0, failed: scan.failed };
  if (pending.length === 0) {
    log('\nNothing to push.');
    return result;
  }

  const apiKey = requireApiKey(getApiKey);

  log(`\nFetching ${pending.length} remote emails (backups go to ${backupDir})...`);
  const inspected = await eachWithProgress(
    pending.map((email) => ({ email })),
    log,
    async ({ email }, prefix) => {
      const inspection = await inspectRemote(email, { apiKey, backupDir, deps });
      log(`${prefix}  ${email.status}`);
      for (const line of describePush(email, inspection)) log(`      ${line}`);
      return { email, inspection };
    }
  );
  result.failed.push(...inspected.failed);

  if (dryRun) {
    log(`\nDry run: ${inspected.ok.length} emails would be pushed. No changes made to Kit.`);
    return result;
  }
  if (inspected.ok.length === 0 || !(await confirm(inspected.ok.length))) {
    log('\nNothing pushed.');
    return result;
  }

  log(`\nPushing ${inspected.ok.length} emails...`);
  const pushed = await eachWithProgress(inspected.ok, log, async ({ email, inspection }, prefix) => {
    const updated = await applyPush(email, inspection, { apiKey, deps });
    log(`${prefix}  ✓ pushed (${updated.published ? 'published' : 'draft'})`);
    return updated;
  });
  result.pushed = pushed.ok.length;
  result.failed.push(...pushed.failed);
  return result;
}

function publishNote(publish, remotePublished) {
  if (!publish) return null;
  return remotePublished
    ? 'ℹ Already published on Kit — --publish is a no-op for state.'
    : '→ --publish set: this push will publish the email (draft → published).';
}

function logHeader(email, log) {
  const { fm, status } = email;
  log(`Email:    ${fm.subject || '(no subject)'}`);
  log(`Sequence: ${fm.sequenceId}   Email id: ${fm.kitEmailId}`);
  if (status === 'in-sync') {
    log(`\nStatus: in-sync (kitSyncHash matches, last pushed ${fm.kitSyncedAt || 'unknown'}).`);
  } else {
    log(status === 'new' ? '\nNever pushed before.' : '\nContent changed since last push.');
  }
}

function logInspection(email, inspection, publish, log) {
  log(`  ✓ Remote backup: ${inspection.backupBase}.json`);
  log(`  ✓ Outgoing HTML: ${inspection.backupBase}-outgoing.html\n`);
  for (const line of describePush(email, inspection)) log(`  ${line}`);
  const note = publishNote(publish, inspection.remoteEmail.published);
  if (note) log(`  ${note}`);
}

function logPushed(updated, log) {
  const chars = (updated.content ?? '').length;
  const state = updated.published ? 'published' : 'draft';
  log(`\n✓ Pushed. Kit now has subject "${updated.subject ?? ''}" (${chars} chars, ${state}).`);
  log('✓ Recorded kitSyncHash + kitSyncedAt in frontmatter.');
}

function requireApiKey(getApiKey) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('KIT_API_KEY not set. Add it to .env or the environment.');
  return apiKey;
}

/**
 * Push one email file, reporting through `log`: skip it when in sync (unless `force`),
 * else back up the remote, show what would change, and — unless `dryRun`, and only
 * after `confirm()` resolves true — PUT it. Resolves to 'in-sync', 'dry-run',
 * 'aborted' or 'pushed'.
 */
export async function pushOne(filePath, opts) {
  const { getApiKey, backupDir, dryRun, force, publish = false, confirm, log = console.log } = opts;
  const deps = opts.deps ?? defaultDeps;
  const email = readEmailFile(filePath, deps);
  logHeader(email, log);
  if (email.status === 'in-sync' && !force) {
    log('Nothing to push. Use --force to push anyway.');
    return 'in-sync';
  }
  const apiKey = requireApiKey(getApiKey);

  log('\nFetching current remote email for backup...');
  const inspection = await inspectRemote(email, { apiKey, backupDir, deps });
  logInspection(email, inspection, publish, log);
  if (dryRun) {
    log('\nDry run complete. No changes made to Kit.');
    log('Inspect the outgoing HTML against the backup, then rerun without --dry-run.');
    return 'dry-run';
  }
  log(`\nWill PUT: subject, preview_text, content, delay/send days${publish ? ', published:true' : ''}.`);
  if (!(await confirm())) {
    log('Aborted. Nothing pushed.');
    return 'aborted';
  }
  logPushed(await applyPush(email, inspection, { apiKey, publish, deps }), log);
  return 'pushed';
}

/** The closing lines for a pushSequence result. */
export function summarizeSequence(result, relative = (p) => p) {
  const { scanned, pending, pushed, failed } = result;
  return [
    `\nDone: ${scanned} scanned, ${pending} out of sync, ${pushed} pushed, ${failed.length} failed.`,
    ...failed.map((f) => `  ✗ ${relative(f.filePath)}: ${f.error}`),
  ];
}
