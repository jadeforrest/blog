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
const POSTS_DIR = path.join(__dirname, '..', 'src', 'content', 'posts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const postFilter = args.includes('--post') ? args[args.indexOf('--post') + 1] : null;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
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
    const currentHash = md5(p.raw);
    return !p.data.kitSyncHash || p.data.kitSyncHash !== currentHash;
  });

  if (toSync.length === 0) {
    console.log('All mapped posts are up to date. Nothing to sync.');
    return;
  }

  console.log(`Posts to sync: ${toSync.length}`);
  for (const p of toSync) {
    const currentHash = md5(p.raw);
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

  for (const post of toSync) {
    const urls = post.data.kitEditUrls.split(',').map(u => u.trim()).filter(Boolean);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Post: ${post.slug}`);
    console.log(`URLs: ${urls.length}`);

    let html;
    try {
      html = await mdxToEmailHtml(post.raw, post.slug);
    } catch (err) {
      console.error(`  Error converting MDX: ${err.message}`);
      skipped++;
      continue;
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
      const newHash = md5(post.raw);
      updateFrontmatterHash(post.file, newHash);
      console.log(`  ✓ Hash updated`);
      synced++;
    } else {
      console.log(`  Hash not updated (some URLs were skipped).`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done. Synced: ${synced}, Skipped: ${skipped}`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
