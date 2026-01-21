#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RSS_URL = 'https://anchor.fm/s/f420aba8/podcast/rss';
const DEFAULT_OUTPUT_DIR = './extracted-content';
let OUTPUT_DIR = DEFAULT_OUTPUT_DIR; // Will be set from command line args

/**
 * Strip HTML tags from text
 */
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, ' ');
}

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text) {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate output file name from episode data
 */
function generateOutputFileName(episode) {
  const date = formatDate(episode.isoDate || episode.pubDate);
  const episodeNum = episode.itunes?.episode || 'unknown';
  return `podcast-${date}--episode-${episodeNum}.txt`;
}

/**
 * Check if episode has already been processed
 */
function isEpisodeProcessed(fileName) {
  const outputPath = path.join(OUTPUT_DIR, fileName);

  if (!fs.existsSync(outputPath)) {
    return false;
  }

  // Check if the file has content (more than just empty/whitespace)
  const content = fs.readFileSync(outputPath, 'utf8');
  return content.trim().length > 0;
}

/**
 * Fetch and parse podcast RSS feed
 */
async function fetchPodcastFeed() {
  const parser = new Parser({
    customFields: {
      item: [
        ['itunes:episode', 'episode'],
        ['itunes:duration', 'duration']
      ]
    }
  });

  try {
    const feed = await parser.parseURL(RSS_URL);

    // Sort by pubDate (oldest first)
    const episodes = (feed.items || []).sort((a, b) => {
      const dateA = new Date(a.isoDate || a.pubDate);
      const dateB = new Date(b.isoDate || b.pubDate);
      return dateA - dateB;
    });

    return episodes;
  } catch (error) {
    throw new Error(`Failed to fetch podcast feed: ${error.message}`);
  }
}

/**
 * Extract content from episode
 */
function extractEpisodeContent(episode) {
  // Get description and clean it
  const description = episode.description || episode.contentSnippet || '';
  const cleanText = normalizeWhitespace(stripHtml(description));

  return {
    title: episode.title || 'Untitled episode',
    content: cleanText,
    url: episode.link || '',
    episodeNumber: episode.itunes?.episode || 'unknown',
    pubDate: episode.isoDate || episode.pubDate
  };
}

/**
 * Use Claude Code to analyze episode content
 */
function analyzeEpisodeWithClaudeCode(content, title) {
  return new Promise((resolve, reject) => {
    const prompt = `You are a text extraction tool. Copy 1-3 compelling sentences word-for-word from the podcast episode description below.

Episode: ${title}

Description:
${content}

Instructions:
- Copy sentences exactly as they appear in the description
- Select sentences that highlight interesting topics, insights, or what listeners will learn
- Output only the extracted sentences, one per line
- No commentary, no analysis, no meta-text
- Just the sentences themselves`;

    const claude = spawn('claude', ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';
    let stdinClosed = false;

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('error', (err) => {
      reject(new Error(`Claude spawn error: ${err.message}`));
    });

    claude.on('close', (code) => {
      if (code === 0) {
        const extracts = output
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 20) // Filter out short lines
          .slice(0, 3); // Limit to 3 extracts

        resolve(extracts);
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

    // Timeout after 30 seconds
    setTimeout(() => {
      claude.kill('SIGTERM');
      reject(new Error('Claude analysis timed out after 30 seconds'));
    }, 30000);
  });
}

/**
 * Fallback analysis using simple heuristics
 */
function fallbackAnalysis(content, title) {
  // Split into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const extracts = [];

  // Look for sentences with key words that indicate interesting content
  const keyWords = ['discusses', 'explores', 'shares', 'explains', 'reveals', 'talks about'];

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const hasKeyWord = keyWords.some(word => lowerSentence.includes(word));

    if (hasKeyWord && extracts.length < 3) {
      extracts.push(sentence.trim() + '.');
    }
  }

  // If we don't have enough, grab first 2-3 substantial sentences
  if (extracts.length < 2) {
    extracts.push(...sentences.slice(0, 3).map(s => s.trim() + '.'));
  }

  return extracts.slice(0, 3);
}

/**
 * Process a single episode
 */
async function processEpisode(episode) {
  const episodeContent = extractEpisodeContent(episode);

  // Skip if no content
  if (!episodeContent.content || episodeContent.content.length < 50) {
    console.log(`  ⚠ Skipping: empty or too short description`);
    return null;
  }

  let extracts;
  try {
    // Try to use Claude Code
    extracts = await analyzeEpisodeWithClaudeCode(episodeContent.content, episodeContent.title);
    console.log(`  ✓ Analyzed with Claude Code`);
  } catch (error) {
    console.log(`  ⚠ Claude Code failed, using fallback: ${error.message}`);
    extracts = fallbackAnalysis(episodeContent.content, episodeContent.title);
  }

  // Generate output content
  const output = extracts
    .filter(extract => extract && extract.trim().length > 10)
    .map(extract => `${extract}\n${episodeContent.url}`)
    .join('\n\n');

  // Create output file
  const fileName = generateOutputFileName(episode);
  const outputPath = path.join(OUTPUT_DIR, fileName);

  fs.writeFileSync(outputPath, output);
  console.log(`  ✓ Created: ${outputPath}`);

  return { fileName, outputPath, extractCount: extracts.length };
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test-mode');
  const forceMode = args.includes('--force');

  // Check for --output-dir argument
  const outputDirIndex = args.indexOf('--output-dir');
  if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
    OUTPUT_DIR = args[outputDirIndex + 1];
  }

  console.log(testMode ? 'Starting podcast content extraction in TEST MODE (first episode only)...' : 'Starting podcast content extraction...');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Fetch podcast feed
  let episodes;
  try {
    episodes = await fetchPodcastFeed();
    console.log(`Fetched ${episodes.length} episodes from RSS feed`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  // Filter episodes based on processing status
  let episodesToProcess;
  if (testMode) {
    episodesToProcess = episodes.slice(0, 1);
  } else if (forceMode) {
    episodesToProcess = episodes;
  } else {
    episodesToProcess = episodes.filter(ep => {
      const fileName = generateOutputFileName(ep);
      return !isEpisodeProcessed(fileName);
    });
  }

  const alreadyProcessed = episodes.length - episodesToProcess.length;
  console.log(`Found ${episodes.length} episodes, ${alreadyProcessed} already processed, ${episodesToProcess.length} to process`);

  if (!testMode && !forceMode && episodesToProcess.length === 0) {
    console.log('All episodes have already been processed!');
    return;
  }

  // Process each episode
  const results = [];
  for (const episode of episodesToProcess) {
    try {
      console.log(`Processing: ${episode.title}`);
      const result = await processEpisode(episode);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error processing episode "${episode.title}":`, error.message);
      // Continue with other episodes
    }
  }

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${results.length} episodes${testMode ? ' (test mode)' : ''}${forceMode ? ' (force mode)' : ''}`);
  console.log(`Total extracts: ${results.reduce((sum, r) => sum + r.extractCount, 0)}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  stripHtml,
  normalizeWhitespace,
  formatDate,
  generateOutputFileName,
  isEpisodeProcessed,
  fetchPodcastFeed,
  extractEpisodeContent,
  analyzeEpisodeWithClaudeCode,
  fallbackAnalysis,
  processEpisode
};
