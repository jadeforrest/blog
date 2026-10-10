#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { enforceLimits, graphemeCount } from './lib/text-limits.js';
import {
  buildExtractionPrompt,
  parseModelOutput,
  parseExtractFile,
  formatExtracts,
  appendExtracts,
  removeDuplicates,
  unverifiedFragments,
  parseSelection
} from './lib/extract-content-lib.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Updated for Astro structure
const BASE_URL = 'https://www.rubick.com';
const CONTENT_DIR = './src/content/posts';
const OUTPUT_DIR = './extracted-content';
// Overridable so tests don't touch the real report.
const QUARANTINE_FILE =
  process.env.EXTRACT_QUARANTINE_FILE || path.join(__dirname, 'extract-quarantine.json');
const CLAUDE_TIMEOUT_MS = 180000;

// Passages that could not be kept within the post-length limit, reported at the end
// of a run so they can be hand-edited rather than silently disappearing.
const quarantined = [];

/**
 * Find all markdown files in the content directory
 */
function findMarkdownFiles() {
  const files = [];

  function traverse(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item === 'index.md' || item === 'index.mdx') {
        files.push(fullPath);
      }
    }
  }

  traverse(CONTENT_DIR);
  return files;
}

/**
 * Extract front matter and content from markdown file
 */
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let frontMatterEnd = -1;
  let inFrontMatter = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontMatter) {
        inFrontMatter = true;
      } else {
        frontMatterEnd = i;
        break;
      }
    }
  }

  const markdownContent = lines.slice(frontMatterEnd + 1).join('\n');
  const frontMatter = lines.slice(1, frontMatterEnd).join('\n');

  // Extract title from front matter
  const titleMatch = frontMatter.match(/title:\s*(.+)/);
  const title = titleMatch ? titleMatch[1].replace(/['\"]/g, '') : '';

  return {
    title,
    content: markdownContent,
    frontMatter
  };
}

/**
 * Generate URL from file path
 */
function generateUrl(filePath) {
  const dirName = path.basename(path.dirname(filePath));
  // Remove date prefix (YYYY-MM-DD--) if present
  const slug = dirName.replace(/^\d{4}-\d{2}-\d{2}--/, '');
  return `${BASE_URL}/${slug}/`;
}

/**
 * Split content into chunks of reasonable size
 */
function splitContentIntoChunks(content, maxChunkSize = 6000) {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks = [];
  const paragraphs = content.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit, start a new chunk
    if (currentChunk.length + paragraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Use Claude Code to analyze a single chunk of content
 */
function analyzeChunkWithClaudeCode(content, title, chunkIndex, totalChunks, alreadySelected = []) {
  return new Promise((resolve, reject) => {
    const chunkInfo = totalChunks > 1 ? ` (Part ${chunkIndex + 1} of ${totalChunks})` : '';
    const prompt = buildExtractionPrompt({ title, content, chunkInfo, alreadySelected });

    const claude = spawn('claude', ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';
    let stdinClosed = false;

    // Choosing up to 10 extracts takes longer than the old 1-3 did.
    const timer = setTimeout(() => {
      claude.kill('SIGTERM');
      reject(new Error(`Claude analysis timed out after ${CLAUDE_TIMEOUT_MS / 1000} seconds`));
    }, CLAUDE_TIMEOUT_MS);

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude spawn error: ${err.message}`));
    });

    claude.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(parseModelOutput(output));
      } else {
        reject(new Error(`Claude process exited with code ${code}: ${error || 'No error details'}`));
      }
    });

    // Handle stdin errors gracefully
    claude.stdin.on('error', (err) => {
      if (!stdinClosed && err.code !== 'EPIPE') {
        reject(new Error(`Claude stdin error: ${err.message}`));
      }
    });

    try {
      claude.stdin.write(prompt);
      claude.stdin.end();
      stdinClosed = true;
    } catch (err) {
      reject(new Error(`Failed to write to Claude: ${err.message}`));
    }
  });
}

/**
 * Use Claude Code to analyze content (handles chunking automatically)
 */
async function analyzeWithClaudeCode(content, title, alreadySelected = []) {
  const chunks = splitContentIntoChunks(content);
  const allExtracts = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkExtracts = await analyzeChunkWithClaudeCode(
        chunks[i], title, i, chunks.length, alreadySelected
      );
      allExtracts.push(...chunkExtracts);
    } catch (error) {
      console.log(`    ⚠ Failed to analyze chunk ${i + 1}/${chunks.length}: ${error.message}`);
      // Continue with other chunks even if one fails
    }
  }

  return allExtracts;
}

/**
 * Fallback analysis using simple heuristics
 */
function fallbackAnalysis(content, title) {
  // Simple extraction based on paragraph structure and key phrases
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 100);
  const extracts = [];

  // Look for paragraphs with actionable language
  const actionWords = ['should', 'can', 'will', 'use', 'try', 'make', 'create', 'implement', 'focus', 'approach'];
  const insightWords = ['insight', 'key', 'important', 'crucial', 'surprising', 'learned', 'discovered'];

  for (const paragraph of paragraphs) {
    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 30);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const hasActionWord = actionWords.some(word => lowerSentence.includes(word));
      const hasInsightWord = insightWords.some(word => lowerSentence.includes(word));

      if ((hasActionWord || hasInsightWord) && extracts.length < 4) {
        extracts.push(sentence.trim() + '.');
      }
    }

    if (extracts.length >= 4) break;
  }

  // If we don't have enough, grab first few substantial sentences
  if (extracts.length < 2) {
    const allSentences = content.split(/[.!?]+/).filter(s => s.trim().length > 50);
    extracts.push(...allSentences.slice(0, 3).map(s => s.trim() + '.'));
  }

  return extracts.slice(0, 4);
}

/**
 * Check if a file has already been processed
 */
function isFileProcessed(filePath) {
  const fileName = path.basename(path.dirname(filePath)) + '.txt';
  const outputPath = path.join(OUTPUT_DIR, fileName);

  if (!fs.existsSync(outputPath)) {
    return false;
  }

  // Check if the file has content (more than just empty/whitespace)
  const content = fs.readFileSync(outputPath, 'utf8');
  return content.trim().length > 0;
}

/**
 * Show candidate extracts and ask which to keep. Returns { action, kept } where
 * action is 'keep' or 'quit'. `ask` is readline's question(), injectable for tests.
 */
async function approveExtracts(candidates, { label, source, ask }) {
  console.log(`\n  Candidates for ${label}:`);
  candidates.forEach((text, i) => {
    console.log(`\n  ${String(i + 1).padStart(2)}. ${text}  (${graphemeCount(text)} chars)`);
    for (const fragment of unverifiedFragments(text, source)) {
      console.log(`      ⚠ not found verbatim in the post: "${fragment}"`);
    }
  });

  for (;;) {
    const selection = parseSelection(
      await ask('\n  Keep which? [Enter]=all, n=none, q=quit, or numbers like 1,3,5-7: '),
      candidates.length
    );
    if (!selection.error) {
      return { action: selection.action, kept: selection.indices.map(i => candidates[i]) };
    }
    console.log(`  ${selection.error}`);
  }
}

/**
 * Record extracts that could not be kept within the length limit.
 */
function quarantine(dropped, sourceFile, url) {
  if (dropped.length === 0) return;
  console.log(`  ⚠ ${dropped.length} extract(s) too long to keep verbatim, quarantined`);
  quarantined.push(...dropped.map(text => ({
    sourceFile,
    graphemes: graphemeCount(text),
    reason: 'single sentence exceeds limit; cannot shorten without rewording',
    text,
    url
  })));
}

/**
 * Write extracts to a post's output file, after `existing` content when appending
 * (pass null to replace the file).
 */
function writeExtracts(outputPath, pairs, existing) {
  const appending = existing !== null;
  fs.writeFileSync(outputPath, appending ? appendExtracts(existing, pairs) : formatExtracts(pairs));
  const plural = pairs.length === 1 ? '' : 's';
  console.log(`  ✓ ${appending ? 'Appended to' : 'Created'}: ${outputPath} (${pairs.length} extract${plural})`);
}

/**
 * Process a single markdown file.
 *
 * With `append`, new extracts are added after the ones already in the output file
 * (skipping duplicates) instead of replacing it. With `ask`, candidates go through
 * approval first; without it everything that passes the length limit is written.
 * Returns null when the user quits.
 */
async function processFile(filePath, {
  append = false,
  ask = null,
  outputDir = OUTPUT_DIR,
  analyze = analyzeWithClaudeCode
} = {}) {
  console.log(`Processing: ${filePath}`);

  const { title, content } = parseMarkdownFile(filePath);
  const url = generateUrl(filePath);
  const fileName = path.basename(path.dirname(filePath)) + '.txt';
  const outputPath = path.join(outputDir, fileName);

  const existing = append && fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  const existingTexts = parseExtractFile(existing).map(pair => pair.text);

  let extracts;
  try {
    // Try to use Claude Code
    extracts = await analyze(content, title, existingTexts);
    console.log(`  ✓ Analyzed with Claude Code`);
  } catch (error) {
    console.log(`  ⚠ Claude Code failed, using fallback: ${error.message}`);
    extracts = fallbackAnalysis(content, title);
  }

  const substantial = extracts.filter(extract => extract && extract.trim().length > 10);

  // Enforce the post-length limit here rather than inside the Claude call, so the
  // heuristic fallback path is covered too. Over-long extracts are trimmed to whole
  // sentences or dropped — never reworded.
  const { kept, dropped } = enforceLimits(substantial);

  quarantine(dropped, fileName, url);

  const candidates = removeDuplicates(kept, existingTexts);
  const decision = ask && candidates.length > 0
    ? await approveExtracts(candidates, { label: `${title} (${url})`, source: content, ask })
    : { action: 'keep', kept: candidates };
  if (decision.action === 'quit') return null;
  const approved = decision.kept;

  if (approved.length === 0) {
    // Better to flag this loudly than to let a post vanish from the queue unnoticed.
    // Nothing is written, so a new post is picked up again on the next run.
    console.log(`  ⚠ ${fileName}: no extracts ${candidates.length > 0 ? 'approved' : 'produced'}, file left unchanged`);
    return { filePath, outputPath, extractCount: 0 };
  }

  writeExtracts(outputPath, approved.map(text => ({ text, url })), append ? existing : null);
  return { filePath, outputPath, extractCount: approved.length };
}

/**
 * Resolve --append targets to post files. A target may be a post directory or its
 * index file, an extracted-content .txt file, the directory name, or the bare slug.
 */
function resolvePostTargets(targets, allFiles) {
  return targets.map(target => {
    const base = path.basename(target).replace(/\.(txt|mdx?)$/, '');
    const name = base === 'index' ? path.basename(path.dirname(target)) : base;
    const matches = allFiles.filter(file => {
      const dirName = path.basename(path.dirname(file));
      return dirName === name || dirName.endsWith(`--${name}`);
    });
    if (matches.length !== 1) {
      throw new Error(`--append target "${target}" matched ${matches.length} posts`);
    }
    return matches[0];
  });
}

/**
 * Write the quarantine report for a run, or clear a stale one.
 */
function writeQuarantineReport() {
  if (quarantined.length > 0) {
    fs.writeFileSync(QUARANTINE_FILE, JSON.stringify(quarantined, null, 2));
    console.log(`\n⚠ ${quarantined.length} extract(s) quarantined — see ${QUARANTINE_FILE}`);
  } else if (fs.existsSync(QUARANTINE_FILE)) {
    fs.unlinkSync(QUARANTINE_FILE);
  }
}

/**
 * Re-apply the length limit to the existing queue, in place.
 *
 * Covers every file in the shared extracted-content/ directory — blog and podcast
 * alike, since they share a format and a queue — so the backlog is fixed with one
 * pass and no Claude calls. Extracts are only ever trimmed to whole sentences or
 * dropped, so what remains is still verbatim.
 */
function revalidateExistingExtracts() {
  console.log('Revalidating existing extracts against the post-length limit...\n');

  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.endsWith('.txt') && file !== 'all-extracts.txt')
    .sort();

  let filesChanged = 0;
  let trimmedCount = 0;
  let droppedCount = 0;

  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file);
    const lines = fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);

    // Files are alternating text/URL pairs.
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      pairs.push({ text: lines[i], url: lines[i + 1] });
    }

    const rebuilt = [];
    let changed = false;

    for (const pair of pairs) {
      const { kept, dropped } = enforceLimits([pair.text]);

      if (dropped.length > 0) {
        droppedCount++;
        changed = true;
        quarantined.push({
          sourceFile: file,
          graphemes: graphemeCount(pair.text),
          reason: 'single sentence exceeds limit; cannot shorten without rewording',
          text: pair.text,
          url: pair.url
        });
        continue;
      }

      if (kept[0] !== pair.text) {
        trimmedCount++;
        changed = true;
      }
      rebuilt.push({ text: kept[0], url: pair.url });
    }

    if (!changed) continue;

    filesChanged++;
    if (rebuilt.length === 0) {
      console.log(`  ⚠ ${file} has no postable extracts left`);
    }
    fs.writeFileSync(filePath, rebuilt.map(p => `${p.text}\n${p.url}`).join('\n\n'));
  }

  console.log(`\n=== Revalidation Summary ===`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files changed: ${filesChanged}`);
  console.log(`Extracts trimmed to whole sentences: ${trimmedCount}`);
  console.log(`Extracts dropped (unsalvageable): ${droppedCount}`);
  writeQuarantineReport();
}

/**
 * Choose which post files this run covers.
 */
function selectFiles({ testMode, appendTargets }) {
  const allMarkdownFiles = findMarkdownFiles();

  if (appendTargets.length > 0) {
    console.log(`Appending extracts for ${appendTargets.length} post(s)`);
    return resolvePostTargets(appendTargets, allMarkdownFiles);
  }

  // Filter out already processed files unless in test mode
  const unprocessedFiles = testMode ? allMarkdownFiles : allMarkdownFiles.filter(file => !isFileProcessed(file));
  const skippedCount = allMarkdownFiles.length - unprocessedFiles.length;
  console.log(`Found ${allMarkdownFiles.length} markdown files${testMode ? `, processing first 1 in test mode` : `, ${skippedCount} already processed, ${unprocessedFiles.length} to process`}`);

  return testMode ? allMarkdownFiles.slice(0, 1) : unprocessedFiles;
}

/**
 * Explain why these command-line options can't run, or return null if they can.
 */
function usageError({ append, appendTargets, autoApprove }) {
  if (append && appendTargets.length === 0) {
    return '--append needs at least one post (slug, post directory, or extracted-content .txt file)';
  }
  if (!autoApprove && !process.stdin.isTTY) {
    return 'Approval needs an interactive terminal; pass --yes to keep every extract without asking.';
  }
  return null;
}

/**
 * Process each file in turn, stopping early if the user quits during approval.
 */
async function processAll(files, options) {
  const results = [];
  for (const file of files) {
    try {
      const result = await processFile(file, options);
      if (result === null) {
        console.log('\nStopped; remaining posts were not processed.');
        break;
      }
      results.push(result);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  return results;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test-mode');
  const append = args.includes('--append');
  const autoApprove = args.includes('--yes');
  const appendTargets = append ? args.filter(arg => !arg.startsWith('--')) : [];

  if (args.includes('--revalidate')) {
    revalidateExistingExtracts();
    return;
  }

  const error = usageError({ append, appendTargets, autoApprove });
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }

  console.log(testMode ? 'Starting content extraction in TEST MODE (first file only)...' : 'Starting content extraction with Claude Code...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const markdownFiles = selectFiles({ testMode, appendTargets });
  if (markdownFiles.length === 0) {
    console.log('All files have already been processed!');
    return;
  }

  const rl = autoApprove ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  let results;
  try {
    results = await processAll(markdownFiles, { append, ask: rl && (question => rl.question(question)) });
  } finally {
    rl?.close();
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${results.length} files${testMode ? ' (test mode)' : ''}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total extracts ${append ? 'appended' : 'written'}: ${results.reduce((sum, r) => sum + r.extractCount, 0)}`);
  writeQuarantineReport();
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  findMarkdownFiles,
  parseMarkdownFile,
  generateUrl,
  analyzeChunkWithClaudeCode,
  analyzeWithClaudeCode,
  fallbackAnalysis,
  approveExtracts,
  processFile,
  resolvePostTargets,
  isFileProcessed
};
