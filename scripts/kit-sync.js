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
 * Usage:
 *   node scripts/kit-sync.js
 *   node scripts/kit-sync.js --dry-run
 *   node scripts/kit-sync.js --force
 *   node scripts/kit-sync.js --post <slug>
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { execSync, exec } from 'child_process';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { mdxToEmailHtml } from './kit-mdx-to-html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(REPO_ROOT, 'src', 'content', 'posts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const postFilter = args.includes('--post') ? args[args.indexOf('--post') + 1] : null;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function hashableContent(raw) {
  // Exclude the kitSyncHash line itself so writing the hash doesn't invalidate it.
  return raw.replace(/^kitSyncHash:.*\n?/m, '');
}

function cleanSlug(dirName) {
  return dirName.replace(/^\d{4}-\d{2}-\d{2}--/, '');
}

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

/**
 * Markdown tables are rendered to PNGs (see kit-mdx-to-html.js) and referenced
 * by absolute rubick.com URL, so they only reach the email once the PNG is live
 * on the site. Find the table images this email depends on and report the ones
 * that haven't shipped yet — uncommitted, or committed but not pushed.
 *
 * Returns { count, paths }: how many tables became images, and the repo-relative
 * files that still need to go out. Empty paths means they're already deployed.
 */
function pendingTableImages(html, post) {
  const files = [...html.matchAll(/src="[^"]*\/(kit-table-\d+\.png)"/g)].map(m => m[1]);
  if (files.length === 0) return { count: 0, paths: [] };

  // Each table lives twice: in the post source dir and in public/ (see CLAUDE.md).
  const paths = files
    .flatMap(f => [
      path.join('public', post.slug, f),
      path.join('src', 'content', 'posts', post.dirName, f),
    ])
    .filter(p => fs.existsSync(path.join(REPO_ROOT, p)));

  const pathspec = paths.map(p => `'${p}'`).join(' ');
  const shipped = git(`status --porcelain -- ${pathspec}`) === ''
    && git(`log --oneline @{u}..HEAD -- ${pathspec}`) === '';

  return { count: files.length, paths: shipped ? [] : paths };
}

function warnAboutTableImages({ count, paths }, slug) {
  const one = count === 1;
  const w = {
    subject: one ? 'The table in this post was' : `The ${count} tables in this post were`,
    image: one ? 'an image' : 'images',
    images: one ? 'image' : 'images',
    theyAre: one ? "it isn't" : "they aren't",
    it: one ? 'it' : 'them',
    broken: one ? 'a broken image' : 'broken images',
    fills: one ? 'the image fills in by itself' : 'the images fill in by themselves',
  };

  console.log(`\n  ⚠ ${w.subject} rendered as ${w.image}, and ${w.theyAre} on rubick.com yet.`);
  console.log(`    Kit loads ${w.it} from the live site, so the Kit preview and any test send will`);
  console.log(`    show ${w.broken} until you ship ${w.it}:`);
  console.log(`\n      git add ${paths.join(' ')}`);
  console.log(`      git commit -m "Add table ${w.images} for ${slug}"`);
  console.log('      git push\n');
  console.log(`    Pasting into Kit now is fine — ${w.fills} once the deploy finishes.`);
  console.log(`    Just don't send the email until then.`);
}

/**
 * Repeat the table-image warning at the end of the run, so it isn't lost in the
 * scrollback above a long sync.
 */
function remindAboutUnshippedImages(paths) {
  if (paths.length === 0) return;
  const unique = [...new Set(paths)];
  console.log('\n⚠ Before sending: these table images still need to reach the live site,');
  console.log('  or the emails you just pasted will go out with broken images.');
  console.log(`\n    git add ${unique.join(' ')}`);
  console.log('    git commit -m "Add table images for Kit emails"');
  console.log('    git push');
}

function updateFrontmatterHash(filePath, newHash) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Replace existing kitSyncHash value
  const updated = content.replace(/^kitSyncHash:.*$/m, `kitSyncHash: "${newHash}"`);
  if (updated === content) {
    // Field not found — shouldn't happen if kit-add-frontmatter was run
    console.warn('  Warning: could not update kitSyncHash in frontmatter');
    return;
  }
  fs.writeFileSync(filePath, updated);
}

async function main() {
  if (dryRun) console.log('--- DRY RUN MODE ---\n');

  // Collect all posts
  const files = fs.readdirSync(POSTS_DIR)
    .map(dir => path.join(POSTS_DIR, dir, 'index.mdx'))
    .filter(f => fs.existsSync(f))
    .sort();

  const allPosts = files.map(file => {
    const raw = fs.readFileSync(file, 'utf8');
    const { data } = matter(raw);
    const dirName = path.basename(path.dirname(file));
    const slug = cleanSlug(dirName);
    return { file, raw, data, slug, dirName };
  });

  // Separate mapped from unmapped
  const mapped = allPosts.filter(p => p.data.kitEditUrls && p.data.kitEditUrls.trim() !== '');
  const unmapped = allPosts.filter(p => !p.data.kitEditUrls || p.data.kitEditUrls.trim() === '');

  console.log(`Posts: ${allPosts.length} total, ${mapped.length} mapped, ${unmapped.length} unmapped\n`);

  if (unmapped.length > 0) {
    console.log(`Unmapped posts (no kitEditUrls):`);
    for (const p of unmapped) console.log(`  - ${p.slug}`);
    console.log();
  }

  // Filter to posts that need syncing
  let toSync = mapped.filter(p => {
    if (postFilter && !p.slug.includes(postFilter)) return false;
    if (force) return true;
    const currentHash = md5(hashableContent(p.raw));
    return !p.data.kitSyncHash || p.data.kitSyncHash !== currentHash;
  });

  if (toSync.length === 0) {
    console.log('All mapped posts are up to date. Nothing to sync.');
    return;
  }

  console.log(`Posts to sync: ${toSync.length}`);
  for (const p of toSync) {
    const currentHash = md5(hashableContent(p.raw));
    const status = !p.data.kitSyncHash ? 'never synced' : 'content changed';
    console.log(`  - ${p.slug} (${status})`);
  }
  console.log();

  if (dryRun) {
    console.log('Dry run complete. No changes made.');
    return;
  }

  // Interactive sync loop
  let synced = 0, skipped = 0;
  const unshippedImages = [];

  for (const post of toSync) {
    const urls = post.data.kitEditUrls.split(',').map(u => u.trim()).filter(Boolean);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Post: ${post.slug}`);
    console.log(`URLs: ${urls.length}`);

    let html;
    try {
      html = await mdxToEmailHtml(post.raw, post.slug, path.dirname(post.file));
    } catch (err) {
      console.error(`  Error converting MDX: ${err.message}`);
      skipped++;
      continue;
    }

    // Warn before the paste, not after — the missing image is the first thing
    // you'd notice in the Kit preview, and this explains it up front.
    const tableImages = pendingTableImages(html, post);
    if (tableImages.paths.length > 0) {
      warnAboutTableImages(tableImages, post.slug);
      unshippedImages.push(...tableImages.paths);
    }

    let allConfirmed = true;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] ${url}`);

      // Copy HTML to clipboard
      try {
        copyHtmlToClipboard(html);
        console.log('  ✓ HTML copied to clipboard');
      } catch (err) {
        console.error(`  Error copying to clipboard: ${err.message}`);
        allConfirmed = false;
        skipped++;
        continue;
      }

      // Open the URL
      openUrl(url);
      console.log('  ✓ Opened in browser');
      console.log('  → Paste (Cmd+V) into the Kit editor');

      const answer = await prompt('  Done? [y]es / [s]kip / [q]uit: ');

      if (answer === 'q') {
        console.log('\nQuitting. Progress saved for completed posts.');
        console.log(`Summary: ${synced} synced, ${skipped} skipped`);
        remindAboutUnshippedImages(unshippedImages);
        process.exit(0);
      }

      if (answer !== 'y') {
        console.log('  Skipped.');
        allConfirmed = false;
        skipped++;
      }
    }

    // Only update hash if all URLs were confirmed
    if (allConfirmed) {
      const newHash = md5(hashableContent(post.raw));
      updateFrontmatterHash(post.file, newHash);
      console.log(`  ✓ Hash updated`);
      synced++;
    } else {
      console.log(`  Hash not updated (some URLs were skipped).`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done. Synced: ${synced}, Skipped: ${skipped}`);
  remindAboutUnshippedImages(unshippedImages);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
