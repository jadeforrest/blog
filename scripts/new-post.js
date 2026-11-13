#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPublished, siteToday } from './lib/publish-dates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Slug, and an optional publish date (default today). A future date schedules the post:
// it stays off the site until then, and scripts/blog-post-day.js builds it on the day.
const slug = process.argv[2];
const datePrefix = process.argv[3] || siteToday();

if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(datePrefix)) {
  console.error('Usage: node scripts/new-post.js <slug> [YYYY-MM-DD]');
  console.error('Example: node scripts/new-post.js my-new-post 2026-12-01');
  process.exit(1);
}
const scheduled = !isPublished(datePrefix, siteToday());

// Create directory name with date prefix
const dirName = `${datePrefix}--${slug}`;
const postDir = path.join(__dirname, '..', 'src', 'content', 'posts', dirName);

// Check if directory already exists
if (fs.existsSync(postDir)) {
  console.error(`Error: Directory already exists: ${dirName}`);
  process.exit(1);
}

// Create the directory
fs.mkdirSync(postDir, { recursive: true });

// Create frontmatter template
const frontmatter = `---
title: TODO: Add title
tags: []
cover: ./placeholder.jpg
author: Jade Rubick
discussionId: "${slug}"
description: "TODO: Add description"
kitEditUrls: ""
kitSyncHash: ""
---

import { Image } from 'astro:assets';

Your content goes here.
`;

// Write index.mdx file
const indexPath = path.join(postDir, 'index.mdx');
fs.writeFileSync(indexPath, frontmatter);

console.log(`\nSuccessfully created new blog post:`);
console.log(`  Directory: ${dirName}`);
console.log(`  File: ${indexPath}`);
console.log(`\nNext steps:`);
console.log(`  1. Add a cover image to: src/content/posts/${dirName}/`);
console.log(`     - Name it placeholder.jpg (or update the cover field in the frontmatter)`);
console.log(`     - Ratio: 2.22:1 (e.g. 1110x500px)`);
console.log(`     - Accepted formats: jpg, png, webp`);
console.log(`  2. Add references to images:`);
console.log(`     import { Image } from 'astro:assets';`);
console.log(`     import landscapeImage from './landscape.jpg';`);
console.log(`     <Image src={landscapeImage} alt="Unrelated picture of nighttime landscape" width={800} />`);
console.log(`  3. Update the title field`);
console.log(`  4. Add tags`);
console.log(`  5. Write your description`);
console.log(`  6. Add the content`);
console.log(scheduled
  ? `  7. Commit and push before ${datePrefix}. It stays hidden (npm run dev shows it) until the\n     6 AM blog-post-day job builds it that day and announces it on Bluesky and LinkedIn.\n     Steps 8-10 can wait until it's live.`
  : `  7. Commit to git and push, wait three minutes`);
console.log(`  8. Go to kit.com, and add in the URL for the new post to KitEditUrls`);
console.log(`  9. run node scripts/kit-sync.js`);
console.log(`  10. run node scripts/extract-content.js`);
console.log(`  11. post in Rands #i-wrote-something`);
