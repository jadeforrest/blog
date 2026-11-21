#!/usr/bin/env node

/**
 * Kit Sync — push blog posts to their Kit sequence emails through the v4 API.
 *
 * Every post is checked (scripts/lib/kit-sync-run.js):
 *   1. Index Kit: list each post sequence's emails and work out which post each is a copy of
 *      from its share link (scripts/lib/kit-post-index.js). Slugs are cached per email id in
 *      scripts/.kit-email-index.json, so only new emails are fetched.
 *   2. Plan: per post, push (kitSyncHash out of date), not in Kit, refused, excluded or in sync,
 *      plus email ids found in Kit that the post's `kitEmails` doesn't list yet.
 *   3. Record the found ids (one [y/N]).
 *   4. Push: convert each changed post (kit-mdx-to-html.js), back up its Kit emails to
 *      scripts/kit-backups/, show what changes, then after one [y/N] PUT the content and record
 *      kitSyncHash. Only content is sent; subject, preview text and schedule stay as Kit has
 *      them. Kit keeps a change to a published email unpublished unless --publish is given.
 *   5. Offer each post without an email as a new draft at the end of the "Engineering leadership
 *      weekly" sequence, scheduled like its last email: [y]es / [n]o / [x] kitExclude / [q]uit.
 *
 * A post, or one linking to a post, is refused until the day after that post's date
 * (scripts/lib/kit-schedule-guard.js): Kit could send it before the post is live.
 *
 * Usage:
 *   node scripts/kit-sync.js [--dry-run] [--publish] [--force] [--post <slug>] [--yes]
 *     --dry-run   plan and inspect only (backups and table PNGs are still written)
 *     --publish   make pushed changes and new emails live (refused while table images aren't)
 *     --force     push posts whose hash is current too (with --post, just that one)
 *     --yes       skip the record-ids and push confirmations (never the create prompts)
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { mdxToEmailHtml } from './kit-mdx-to-html.js';
import { readPosts } from './lib/blog-post-day.js';
import { apiGet, apiPost, apiPut, loadApiKey } from './lib/kit-api.js';
import { askYesNo } from './lib/ask-yes-no.js';
import { emailsBySlug, loadKitIndex, newEmailSchedule, postSequences } from './lib/kit-post-index.js';
import { BACKUP_DIR, saveBackup } from './lib/kit-push-run.js';
import { pendingTableImages, readSyncPosts, runSync, syncPlan } from './lib/kit-sync-run.js';
import { kitScheduleProblems } from './lib/kit-schedule-guard.js';
import { datePrefix, siteToday } from './lib/publish-dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(REPO_ROOT, 'src', 'content', 'posts');
const CONTENT_DIR = path.join(REPO_ROOT, 'src', 'content');
const INDEX_CACHE = path.join(__dirname, '.kit-email-index.json');

/** Where new post emails go: "Engineering leadership weekly". */
const NEW_EMAIL_SEQUENCE = 1031459;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opts = {
  dryRun: flag('--dry-run'),
  publish: flag('--publish'),
  force: flag('--force'),
  yes: flag('--yes'),
  postFilter: flag('--post') ? args[args.indexOf('--post') + 1] : null,
};

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  } catch {
    return ''; // no upstream configured, not a repo, etc. — never block the sync
  }
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_CACHE, 'utf8'));
  } catch {
    return {}; // missing or corrupt: rebuild it
  }
}

/** Sequence ids with a local src/content/kit-sequence-<id>/ folder (owned by kit-push-sequence). */
function localSequenceIds() {
  return fs.readdirSync(CONTENT_DIR).flatMap((d) => d.match(/^kit-sequence-(\d+)$/)?.slice(1) ?? []);
}

async function indexKit(get) {
  const { sequences } = await get('/sequences?per_page=100');
  const scanned = postSequences(sequences, localSequenceIds());
  const cache = readCache();
  const { emails, fetched } = await loadKitIndex({ sequences: scanned, get, cache });
  fs.writeFileSync(INDEX_CACHE, `${JSON.stringify(cache, null, 2)}\n`);
  console.log(`Kit: ${emails.length} emails in ${scanned.map((s) => `"${s.name}"`).join(', ')} (${fetched} fetched, the rest cached)\n`);
  return emails;
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) throw new Error('KIT_API_KEY not set. Add it to .env or the environment.');
  const get = (p) => apiGet(p, apiKey);
  const emails = await indexKit(get);

  const blogPosts = readPosts(POSTS_DIR);
  const today = siteToday();
  const plan = syncPlan(readSyncPosts(POSTS_DIR), {
    index: emailsBySlug(emails),
    force: opts.force,
    postFilter: opts.postFilter,
    problems: (post) => kitScheduleProblems({ text: post.raw, date: datePrefix(post.dirName), slug: post.slug }, blogPosts, today),
  });

  const result = await runSync(
    { plan, ...opts, sequenceId: NEW_EMAIL_SEQUENCE, schedule: newEmailSchedule(emails, NEW_EMAIL_SEQUENCE) },
    {
      log: (msg) => console.log(msg),
      toHtml: (post) => mdxToEmailHtml(post.raw, post.slug, path.dirname(post.file)),
      pendingTableImages: (html, post) =>
        pendingTableImages(html, post, { exists: (p) => fs.existsSync(path.join(REPO_ROOT, p)), git }),
      kit: { get, put: (p, body) => apiPut(p, body, apiKey), post: (p, body) => apiPost(p, body, apiKey) },
      backup: (pair, remote, html) => saveBackup(pair, remote, html, { backupDir: BACKUP_DIR }),
      confirm: askYesNo,
      choose: prompt,
      writeFile: (file, text) => fs.writeFileSync(file, text),
    }
  );
  if (result.failed.length > 0) process.exit(1);
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });
