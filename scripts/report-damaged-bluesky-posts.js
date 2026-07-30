#!/usr/bin/env node

/**
 * Report Bluesky posts that were published with text the old shortening path damaged.
 *
 * Two signatures, both from the since-removed processContentLength():
 *   1. A trailing "(N characters)" annotation — Claude's own commentary, published verbatim.
 *   2. A mid-sentence "..." — the blunt substring(0, 297) truncation fallback.
 *
 * READ-ONLY. This script never calls the Bluesky API and never modifies
 * bluesky-sent.json, so nothing is deleted and nothing gets re-queued. AT Protocol
 * posts cannot be edited; removing one means deleting it in the Bluesky app.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { graphemeCount } from './lib/text-limits.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SENT_TRACKING_FILE = path.join(__dirname, 'bluesky-sent.json');

const ANNOTATION_PATTERN = /\(\d+\s*characters?\)/i;

function classify(text) {
  if (ANNOTATION_PATTERN.test(text)) return 'annotation';
  if (text.endsWith('...')) return 'truncated';
  return null;
}

function main() {
  if (!fs.existsSync(SENT_TRACKING_FILE)) {
    console.error(`No tracking file at ${SENT_TRACKING_FILE}`);
    process.exit(1);
  }

  const tracking = JSON.parse(fs.readFileSync(SENT_TRACKING_FILE, 'utf8'));

  const damaged = Object.entries(tracking)
    .map(([id, entry]) => ({ id, ...entry, kind: classify(entry.text || '') }))
    .filter(entry => entry.kind)
    .sort((a, b) => (a.sentAt || '').localeCompare(b.sentAt || ''));

  const total = Object.keys(tracking).length;

  if (damaged.length === 0) {
    console.log(`No damaged posts found across ${total} sent posts.`);
    return;
  }

  const annotated = damaged.filter(entry => entry.kind === 'annotation');
  const truncated = damaged.filter(entry => entry.kind === 'truncated');

  console.log(`Found ${damaged.length} damaged posts out of ${total} sent ` +
    `(${((damaged.length / total) * 100).toFixed(1)}%)`);
  console.log(`  ${annotated.length} with a "(N characters)" annotation`);
  console.log(`  ${truncated.length} truncated mid-sentence\n`);

  for (const entry of damaged) {
    const label = entry.kind === 'annotation' ? 'ANNOTATION' : 'TRUNCATED ';
    console.log(`${label}  ${entry.sentAt || 'unknown date'}`);
    console.log(`  source : ${entry.sourceFile}`);
    console.log(`  url    : ${entry.url}`);
    console.log(`  post   : ${entry.postUri || '(not recorded — predates postUri tracking)'}`);
    console.log(`  length : ${graphemeCount(entry.text || '')} graphemes`);
    console.log(`  text   : ${JSON.stringify(entry.text)}`);
    console.log('');
  }

  console.log('These posts cannot be edited via the AT Protocol. To remove one, open it');
  console.log('on https://bsky.app/profile/jaderubick.bsky.social and delete it there.');
  console.log('\nNothing was modified by this script.');
}

main();
