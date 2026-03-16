#!/usr/bin/env node

/**
 * One-time setup: adds blank kitEditUrls and kitSyncHash fields to all posts
 * that don't already have them.
 *
 * Usage:
 *   node scripts/kit-add-frontmatter.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, '..', 'src', 'content', 'posts');

function getPostFiles() {
  return fs.readdirSync(POSTS_DIR)
    .map(dir => path.join(POSTS_DIR, dir, 'index.mdx'))
    .filter(f => fs.existsSync(f))
    .sort();
}

async function main() {
  const files = getPostFiles();

  let added = 0, skipped = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('kitEditUrls:') || content.includes('kitSyncHash:')) {
      skipped++;
      continue;
    }

    // Insert before the closing --- of the frontmatter
    const updated = content.replace(/^(---\n[\s\S]*?)\n---\n/, '$1\nkitEditUrls: ""\nkitSyncHash: ""\n---\n');

    if (updated === content) {
      console.warn(`Warning: could not find frontmatter in ${file}`);
      skipped++;
      continue;
    }

    fs.writeFileSync(file, updated);
    const slug = path.basename(path.dirname(file));
    console.log(`Added fields: ${slug}`);
    added++;
  }

  console.log(`\nDone. Added to ${added} posts, skipped ${skipped} (already had fields or no frontmatter).`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
