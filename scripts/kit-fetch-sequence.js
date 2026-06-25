#!/usr/bin/env node

/**
 * Kit Fetch Sequence — download all emails from a Kit (kit.com) sequence via the
 * v4 API into per-email Markdown folders under `src/content/kit-sequence-<id>/`.
 *
 * This is the inverse of `scripts/kit-sync.js` (which pushes blog posts TO Kit via
 * clipboard + browser). Here we PULL email content down via the v4 API so it can be
 * version-controlled and (in a later phase) edited locally and pushed back.
 *
 * Auth: reads KIT_API_KEY from the environment (or from blog/.env). Never logged.
 *
 * Usage:
 *   source .env && node scripts/kit-fetch-sequence.js            # default sequence 2684721
 *   node scripts/kit-fetch-sequence.js 2684721
 *   node scripts/kit-fetch-sequence.js --dry-run                 # list only, no writes
 *   node scripts/kit-fetch-sequence.js --prune                   # remove orphan folders
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import {
  folderName,
  buildFrontmatter,
  htmlToMarkdown,
  nextCursor,
  extractImageUrls,
  isRubickUrl,
} from './lib/kit-fetch-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const API_BASE = 'https://api.kit.com/v4';
const DEFAULT_SEQUENCE_ID = '2684721';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const prune = args.includes('--prune');
const sequenceId = args.find((a) => /^\d+$/.test(a)) || DEFAULT_SEQUENCE_ID;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadApiKey() {
  if (process.env.KIT_API_KEY) return process.env.KIT_API_KEY;
  // Fallback: parse blog/.env (uses `export KIT_API_KEY="..."`).
  const envPath = path.join(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const m = fs
      .readFileSync(envPath, 'utf8')
      .match(/^\s*(?:export\s+)?KIT_API_KEY\s*=\s*["']?([^"'\n]+)["']?/m);
    if (m) return m[1];
  }
  return null;
}

async function apiGet(pathAndQuery, apiKey, { retries = 3 } = {}) {
  const url = `${API_BASE}${pathAndQuery}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { 'X-Kit-Api-Key': apiKey, Accept: 'application/json' },
    });

    if (res.status === 429 && attempt < retries) {
      const wait = Number(res.headers.get('retry-after')) || 2 ** attempt;
      console.warn(`  Rate limited (429). Waiting ${wait}s before retry...`);
      await sleep(wait * 1000);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const hint =
        res.status === 401
          ? ' — check KIT_API_KEY is a valid v4 key'
          : res.status === 404
            ? ' — check the sequence id exists'
            : res.status === 429
              ? ' — rate limited, try again later'
              : '';
      throw new Error(`GET ${pathAndQuery} → ${res.status} ${res.statusText}${hint}\n${body.slice(0, 500)}`);
    }

    return res.json();
  }
}

/** Page through the sequence's emails (metadata only; bodies fetched separately). */
async function listAllEmails(apiKey) {
  const emails = [];
  let cursor = null;
  do {
    const q = new URLSearchParams({ per_page: '1000' });
    if (cursor) q.set('after', cursor);
    const data = await apiGet(`/sequences/${sequenceId}/emails?${q.toString()}`, apiKey);
    emails.push(...(data.emails || []));
    cursor = nextCursor(data.pagination, cursor);
  } while (cursor);
  return emails;
}

/** Fetch a single email with full `content` (the list endpoint's content is unreliable). */
async function fetchEmailBody(id, apiKey) {
  const data = await apiGet(`/sequences/${sequenceId}/emails/${id}`, apiKey);
  return data.email || data;
}

/** Map existing kitEmailId → folder name by reading each index.md's frontmatter. */
function scanExistingFolders(outDir) {
  const map = new Map();
  if (!fs.existsSync(outDir)) return map;
  for (const name of fs.readdirSync(outDir)) {
    const indexPath = path.join(outDir, name, 'index.md');
    if (!fs.existsSync(indexPath)) continue;
    try {
      const { data } = matter(fs.readFileSync(indexPath, 'utf8'));
      if (data.kitEmailId != null) map.set(data.kitEmailId, name);
    } catch {
      /* ignore unreadable folders */
    }
  }
  return map;
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Error: KIT_API_KEY not set. Add it to .env (export KIT_API_KEY="...") or the environment.');
    process.exit(1);
  }

  const outDir = path.join(REPO_ROOT, 'src', 'content', `kit-sequence-${sequenceId}`);
  console.log(`Kit sequence ${sequenceId} → ${path.relative(REPO_ROOT, outDir)}`);
  if (dryRun) console.log('--- DRY RUN (no writes) ---');

  const emails = await listAllEmails(apiKey);
  emails.sort((a, b) => a.position - b.position);
  console.log(`\nFound ${emails.length} emails:`);
  for (const e of emails) {
    console.log(`  [${String(e.position).padStart(2, '0')}] ${folderName(e)}  — "${e.subject || '(no subject)'}"`);
  }

  if (dryRun) {
    console.log('\nDry run complete. Nothing written.');
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const existing = scanExistingFolders(outDir);
  const currentIds = new Set(emails.map((e) => e.id));
  const externalImages = [];
  let written = 0;

  for (const meta of emails) {
    const email = await fetchEmailBody(meta.id, apiKey);
    const desiredName = folderName({ ...meta, ...email });
    const desiredDir = path.join(outDir, desiredName);

    // If we already have a folder for this email under a different name, rename it
    // (preserves any co-located images) rather than creating a duplicate.
    const priorName = existing.get(email.id);
    if (priorName && priorName !== desiredName) {
      const priorDir = path.join(outDir, priorName);
      if (fs.existsSync(priorDir) && !fs.existsSync(desiredDir)) {
        fs.renameSync(priorDir, desiredDir);
        console.log(`  renamed ${priorName} → ${desiredName}`);
      }
    }

    fs.mkdirSync(desiredDir, { recursive: true });
    const body = htmlToMarkdown(email.content);
    const fileContent = matter.stringify(body, buildFrontmatter({ ...meta, ...email }));
    fs.writeFileSync(path.join(desiredDir, 'index.md'), fileContent);
    written++;

    for (const url of extractImageUrls(body)) {
      if (!isRubickUrl(url)) externalImages.push({ email: desiredName, url });
    }
  }

  // Orphans: folders whose kitEmailId is no longer in the sequence.
  const orphans = [...existing.entries()].filter(([id]) => !currentIds.has(id));
  if (orphans.length) {
    console.log(`\n${orphans.length} orphan folder(s) (kitEmailId no longer in sequence):`);
    for (const [id, name] of orphans) {
      if (prune) {
        fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
        console.log(`  removed ${name} (id ${id})`);
      } else {
        console.log(`  ${name} (id ${id}) — keep (use --prune to remove)`);
      }
    }
  }

  console.log(`\nWrote ${written} email folder(s).`);
  if (externalImages.length) {
    console.log(`\nNon-rubick.com image URLs (left verbatim, not downloaded):`);
    for (const { email, url } of externalImages) console.log(`  ${email}: ${url}`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
