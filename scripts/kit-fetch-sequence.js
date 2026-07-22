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
 * Snippets: Kit lets emails embed reusable content via Liquid tags like
 * `{{ snippet.engineering-manager }}`. Those pass through verbatim by default.
 * With `--expand-snippets` each tag is replaced inline with the snippet's content
 * (fetched from the v4 /snippets API and converted to Markdown). Note this is a
 * one-way convenience: an expanded file no longer references the shared snippet,
 * so pushing it back to Kit would inline the content there too.
 *
 * Images: external images (anything not already on rubick.com — chiefly Kit's
 * ephemeral embed.filekitcdn.com CDN) are mirrored into public/kit-images/<seq>/
 * and the Markdown refs rewritten to their stable https://www.rubick.com/... URLs.
 * public/ is this site, so the mirror is both version-controlled AND a public URL
 * an email can still load after a push back to Kit. Disable with --no-mirror-images.
 *
 * Usage:
 *   source .env && node scripts/kit-fetch-sequence.js            # default sequence 2684721
 *   node scripts/kit-fetch-sequence.js 2684721
 *   node scripts/kit-fetch-sequence.js --dry-run                 # list only, no writes
 *   node scripts/kit-fetch-sequence.js --prune                   # remove orphan folders
 *   node scripts/kit-fetch-sequence.js --expand-snippets         # inline {{ snippet.* }} tags
 *   node scripts/kit-fetch-sequence.js --no-mirror-images        # leave external images remote
 *   # Update a single email in place (folder derived from the file), e.g. to refresh snippets:
 *   node scripts/kit-fetch-sequence.js <path/to/index.md> --expand-snippets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { loadApiKey, apiGet } from './lib/kit-api.js';
import {
  folderName,
  buildFrontmatter,
  htmlToMarkdown,
  nextCursor,
  extractImageUrls,
  isRubickUrl,
  isImageContentType,
  imageUrlHash,
  mirroredImageName,
  rewriteImageUrls,
  snippetKeysIn,
  applySnippets,
} from './lib/kit-fetch-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const DEFAULT_SEQUENCE_ID = '2684721';
// public/ is served at the site root, so a file at public/<X> is reachable at
// https://www.rubick.com/<X> — the stable, email-safe home for mirrored images.
const SITE_URL = 'https://www.rubick.com';
const IMAGES_SUBDIR = 'kit-images';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const prune = args.includes('--prune');
const expandSnippets = args.includes('--expand-snippets');
// Mirror external (non-rubick.com) images into public/ by default; --no-mirror-images
// keeps them as remote references instead.
const mirrorImages = !args.includes('--no-mirror-images');
// A non-flag, non-numeric argument is a path to a single email's index.md to
// update in place (sequence + email id come from its frontmatter).
const singleFile = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a));
const sequenceId = args.find((a) => /^\d+$/.test(a)) || DEFAULT_SEQUENCE_ID;

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

/** List every snippet on the account as a `key → id` map (content omitted here). */
async function listAllSnippets(apiKey) {
  const map = new Map();
  let cursor = null;
  do {
    const q = new URLSearchParams({ per_page: '500' });
    if (cursor) q.set('after', cursor);
    const data = await apiGet(`/snippets?${q.toString()}`, apiKey);
    for (const s of data.snippets || []) map.set(s.key, s.id);
    cursor = nextCursor(data.pagination, cursor);
  } while (cursor);
  return map;
}

/**
 * Lazily resolve snippet keys → Markdown. The account's `key → id` index and each
 * snippet's converted body are fetched on first use and cached, so a bulk run
 * hits `/snippets` at most once and each referenced snippet at most once. An
 * unknown key resolves to `null` (left as its tag by `applySnippets`).
 */
function makeSnippetResolver(apiKey) {
  let index = null;
  const cache = new Map(); // key → Markdown string | null
  return async function resolve(keys) {
    const out = new Map();
    for (const key of keys) {
      if (!cache.has(key)) {
        if (!index) index = await listAllSnippets(apiKey);
        const id = index.get(key);
        if (id == null) {
          cache.set(key, null);
        } else {
          const data = await apiGet(`/snippets/${id}`, apiKey);
          const snip = data.snippet || data;
          cache.set(key, htmlToMarkdown(snip.content).trim());
        }
      }
      out.set(key, cache.get(key));
    }
    return out;
  };
}

/**
 * Inline `{{ snippet.* }}` tags in `body` using `resolver`, logging what was
 * expanded or left as an unknown tag. Returns the (possibly unchanged) body.
 */
async function expandSnippetsIn(body, resolver, label) {
  const keys = snippetKeysIn(body);
  if (!keys.length) return body;
  const resolved = await resolver(keys);
  const { text, replaced, missing } = applySnippets(body, resolved);
  if (replaced.length) console.log(`  expanded snippet(s) in ${label}: ${replaced.join(', ')}`);
  if (missing.length) {
    console.warn(`  ⚠ unknown snippet key(s) in ${label} (left as tag): ${missing.join(', ')}`);
  }
  return text;
}

/**
 * Download one external image into public/kit-images/<seq>/ and return its
 * rubick.com URL. Idempotent: a URL is content-addressed by a short hash, so an
 * already-downloaded image (any extension) is reused without re-fetching. Throws
 * on a network error or a non-image response so the caller can leave it verbatim.
 */
async function mirrorOneImage(url, seqId) {
  const destDir = path.join(REPO_ROOT, 'public', IMAGES_SUBDIR, String(seqId));
  const urlFor = (name) => `${SITE_URL}/${IMAGES_SUBDIR}/${seqId}/${name}`;

  const hash = imageUrlHash(url);
  if (fs.existsSync(destDir)) {
    const existing = fs.readdirSync(destDir).find((f) => f.startsWith(`${hash}.`));
    if (existing) return urlFor(existing);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const contentType = res.headers.get('content-type') || '';
  if (!isImageContentType(contentType)) {
    throw new Error(`not an image (Content-Type: ${contentType || 'unknown'})`);
  }
  const name = mirroredImageName(url, contentType);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, name), Buffer.from(await res.arrayBuffer()));
  return urlFor(name);
}

/**
 * Mirror every external (non-rubick.com) image referenced in `body`, rewriting
 * refs to the mirrored rubick.com URLs. Failures are reported and left verbatim.
 * In `dryRun` mode nothing is downloaded — it only lists what would be mirrored.
 */
async function mirrorImagesIn(body, seqId, label, { dryRun }) {
  const urls = [...new Set(extractImageUrls(body).filter((u) => !isRubickUrl(u)))];
  if (!urls.length) return body;

  const mapping = new Map();
  for (const url of urls) {
    if (dryRun) {
      console.log(`  would mirror image in ${label}: ${url}`);
      continue;
    }
    try {
      const newUrl = await mirrorOneImage(url, seqId);
      mapping.set(url, newUrl);
      console.log(`  mirrored image in ${label}: ${path.basename(new URL(newUrl).pathname)}`);
    } catch (err) {
      console.warn(`  ⚠ could not mirror ${url} in ${label} (left verbatim): ${err.message}`);
    }
  }
  return rewriteImageUrls(body, mapping);
}

/** Report any non-rubick.com image URLs in `body` (used when mirroring is disabled). */
function reportExternalImages(body, label) {
  const external = extractImageUrls(body).filter((u) => !isRubickUrl(u));
  if (external.length) {
    console.log('\nNon-rubick.com image URLs (left verbatim, not downloaded):');
    for (const url of external) console.log(`  ${label}: ${url}`);
  }
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

/**
 * Update a single email's index.md in place. Sequence + email id come from the
 * file's own frontmatter, so this works regardless of the positional/default
 * sequence id and writes back to the exact path given (no folder renames).
 */
async function runSingleFile(apiKey, resolver) {
  const filePath = path.resolve(singleFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${singleFile}`);
    process.exit(1);
  }
  const { data: fm } = matter(fs.readFileSync(filePath, 'utf8'));
  if (!fm.kitEmailId || !fm.sequenceId) {
    console.error('Error: frontmatter must contain kitEmailId and sequenceId (is this a kit-sequence file?)');
    process.exit(1);
  }

  const label = path.basename(path.dirname(filePath));
  console.log(`Single email → ${path.relative(REPO_ROOT, filePath)}`);
  console.log(`Sequence ${fm.sequenceId}  Email id ${fm.kitEmailId}  — "${fm.subject || '(no subject)'}"`);
  if (dryRun) console.log('--- DRY RUN (no writes) ---');

  const data = await apiGet(`/sequences/${fm.sequenceId}/emails/${fm.kitEmailId}`, apiKey);
  const email = data.email || data;
  let body = htmlToMarkdown(email.content);
  if (expandSnippets) body = await expandSnippetsIn(body, resolver, label);
  if (mirrorImages) body = await mirrorImagesIn(body, fm.sequenceId, label, { dryRun });

  const fileContent = matter.stringify(body, buildFrontmatter(email));
  if (dryRun) {
    console.log('\nDry run complete. Nothing written.');
    return;
  }
  fs.writeFileSync(filePath, fileContent);
  console.log(`\n✓ Updated ${path.relative(REPO_ROOT, filePath)}`);
  if (!mirrorImages) reportExternalImages(body, label);
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Error: KIT_API_KEY not set. Add it to .env (export KIT_API_KEY="...") or the environment.');
    process.exit(1);
  }

  const resolver = makeSnippetResolver(apiKey);

  if (singleFile) {
    await runSingleFile(apiKey, resolver);
    return;
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
    let body = htmlToMarkdown(email.content);
    if (expandSnippets) body = await expandSnippetsIn(body, resolver, desiredName);
    if (mirrorImages) {
      body = await mirrorImagesIn(body, sequenceId, desiredName, { dryRun });
    } else {
      for (const url of extractImageUrls(body)) {
        if (!isRubickUrl(url)) externalImages.push({ email: desiredName, url });
      }
    }
    const fileContent = matter.stringify(body, buildFrontmatter({ ...meta, ...email }));
    fs.writeFileSync(path.join(desiredDir, 'index.md'), fileContent);
    written++;
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
