#!/usr/bin/env node

/**
 * Kit Sync — interactive script to sync blog posts to Kit email sequences.
 *
 * For each post with a non-blank kitEditUrls field where content has changed
 * (or never been synced), it:
 *   1. Converts the post MDX to email HTML
 *   2. Copies the HTML to clipboard (as text/html via Swift)
 *   3. Opens the Kit editor URL in your browser
 *   4. Waits for you to paste and confirm
 *   5. Updates kitSyncHash in the post frontmatter
 *
 * A post scheduled more than 13 days out, or one linking to such a post, is refused
 * (scripts/lib/kit-schedule-guard.js): Kit could send it before the post is live.
 *
 * Usage:
 *   node scripts/kit-sync.js
 *   node scripts/kit-sync.js --dry-run
 *   node scripts/kit-sync.js --force
 *   node scripts/kit-sync.js --post <slug>
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { mdxToEmailHtml } from './kit-mdx-to-html.js';
import { readPosts } from './lib/blog-post-day.js';
import { pendingTableImages, readSyncPosts, runSync, withHash } from './lib/kit-sync-run.js';
import { kitScheduleProblems } from './lib/kit-schedule-guard.js';
import { datePrefix, siteToday } from './lib/publish-dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(REPO_ROOT, 'src', 'content', 'posts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const postFilter = args.includes('--post') ? args[args.indexOf('--post') + 1] : null;

const TEMP_HTML_FILE = '/tmp/kit-sync-clipboard.html';

function copyHtmlToClipboard(html) {
  // Write HTML to a temp file, then have Swift read and copy it.
  // This avoids all escaping issues with inline Swift strings.
  fs.writeFileSync(TEMP_HTML_FILE, html, 'utf8');

  const swift = `
import Cocoa
import Foundation
let html = try! String(contentsOfFile: "${TEMP_HTML_FILE}", encoding: .utf8)
let pb = NSPasteboard.general
pb.clearContents()
pb.setString(html, forType: .html)
`;
  execSync(`echo '${swift}' | swift -`, { stdio: 'pipe' });
}

function openUrl(url) {
  exec(`open "${url}"`);
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
  } catch {
    return ''; // no upstream configured, not a repo, etc. — never block the sync
  }
}


async function main() {
  const allPosts = readSyncPosts(POSTS_DIR);
  const blogPosts = readPosts(POSTS_DIR);
  const today = siteToday();
  await runSync(
    {
      posts: allPosts,
      force,
      postFilter,
      dryRun,
      problems: (post) => kitScheduleProblems({ text: post.raw, date: datePrefix(post.dirName) }, blogPosts, today),
    },
    {
      log: (msg) => console.log(msg),
      warn: (msg) => console.error(msg),
      toHtml: (post) => mdxToEmailHtml(post.raw, post.slug, path.dirname(post.file)),
      pendingTableImages: (html, post) =>
        pendingTableImages(html, post, { exists: (p) => fs.existsSync(path.join(REPO_ROOT, p)), git }),
      copyHtml: copyHtmlToClipboard,
      openUrl,
      prompt,
      writeHash(post, hash) {
        const updated = withHash(fs.readFileSync(post.file, 'utf8'), hash);
        // Missing field shouldn't happen if kit-add-frontmatter was run.
        if (updated === null) console.warn('  Warning: could not update kitSyncHash in frontmatter');
        else fs.writeFileSync(post.file, updated);
      },
    }
  );
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
