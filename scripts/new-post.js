#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get slug from command line argument
const slug = process.argv[2];

if (!slug) {
  console.error('Usage: node scripts/new-post.js <slug>');
  console.error('Example: node scripts/new-post.js my-new-post');
  process.exit(1);
}

// Get today's date in YYYY-MM-DD format
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const datePrefix = `${year}-${month}-${day}`;

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
console.log(`  1. Add a cover image named placeholder.jpg (or update the cover field)`);
console.log(`  2. Update the title field`);
console.log(`  3. Add tags`);
console.log(`  4. Write your description`);
console.log(`  5. Start writing your content!`);
