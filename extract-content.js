#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const BASE_URL = 'https://www.rubick.com';
const CONTENT_DIR = './content/posts';
const OUTPUT_DIR = './extracted-content';

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
      } else if (item === 'index.md') {
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
  const title = titleMatch ? titleMatch[1].replace(/['"]/g, '') : '';
  
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
function analyzeChunkWithClaudeCode(content, title, chunkIndex, totalChunks) {
  return new Promise((resolve, reject) => {
    const chunkInfo = totalChunks > 1 ? ` (Part ${chunkIndex + 1} of ${totalChunks})` : '';
    const prompt = `Analyze this blog post${chunkInfo} and extract 1-3 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Focus on:
- Actionable advice
- Surprising insights
- Memorable quotes or principles
- Practical frameworks or models

Title: ${title}${chunkInfo}

Content:
${content}

IMPORTANT: Return ONLY the exact text from the original blog post - no analysis, commentary, or introductory phrases. Do not include phrases like "Based on my analysis" or "here are the insights". Extract the actual sentences/passages verbatim from the source content. One extract per line, no quotes or additional formatting.`;

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
          .slice(0, 3); // Limit to 3 extracts per chunk
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
 * Use Claude Code to analyze content (handles chunking automatically)
 */
async function analyzeWithClaudeCode(content, title) {
  const chunks = splitContentIntoChunks(content);
  const allExtracts = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkExtracts = await analyzeChunkWithClaudeCode(chunks[i], title, i, chunks.length);
      allExtracts.push(...chunkExtracts);
    } catch (error) {
      console.log(`    ⚠ Failed to analyze chunk ${i + 1}/${chunks.length}: ${error.message}`);
      // Continue with other chunks even if one fails
    }
  }

  // For multiple chunks, allow up to 4 extracts per chunk
  // For single chunk, limit to 4 total
  const maxExtracts = chunks.length > 1 ? chunks.length * 4 : 4;
  return allExtracts.slice(0, maxExtracts);
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
 * Process a single markdown file
 */
async function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  const { title, content } = parseMarkdownFile(filePath);
  const url = generateUrl(filePath);
  
  let extracts;
  try {
    // Try to use Claude Code
    extracts = await analyzeWithClaudeCode(content, title);
    console.log(`  ✓ Analyzed with Claude Code`);
  } catch (error) {
    console.log(`  ⚠ Claude Code failed, using fallback: ${error.message}`);
    extracts = fallbackAnalysis(content, title);
  }
  
  // Generate output content
  const output = extracts
    .filter(extract => extract && extract.trim().length > 10)
    .map(extract => `${extract}\n${url}`)
    .join('\n\n');
  
  // Create output file
  const fileName = path.basename(path.dirname(filePath)) + '.txt';
  const outputPath = path.join(OUTPUT_DIR, fileName);
  
  fs.writeFileSync(outputPath, output);
  console.log(`  ✓ Created: ${outputPath}`);
  
  return { filePath, outputPath, extractCount: extracts.length };
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test-mode');
  
  console.log(testMode ? 'Starting content extraction in TEST MODE (first file only)...' : 'Starting content extraction with Claude Code...');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Find all markdown files
  const allMarkdownFiles = findMarkdownFiles();
  
  // Filter out already processed files unless in test mode
  const unprocessedFiles = testMode ? allMarkdownFiles : allMarkdownFiles.filter(file => !isFileProcessed(file));
  const markdownFiles = testMode ? allMarkdownFiles.slice(0, 1) : unprocessedFiles;
  
  const skippedCount = allMarkdownFiles.length - unprocessedFiles.length;
  console.log(`Found ${allMarkdownFiles.length} markdown files${testMode ? `, processing first 1 in test mode` : `, ${skippedCount} already processed, ${unprocessedFiles.length} to process`}`);
  
  if (!testMode && unprocessedFiles.length === 0) {
    console.log('All files have already been processed!');
    return;
  }
  
  // Process each file
  const results = [];
  for (const file of markdownFiles) {
    try {
      const result = await processFile(file);
      results.push(result);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${results.length} files${testMode ? ' (test mode)' : ''}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total extracts: ${results.reduce((sum, r) => sum + r.extractCount, 0)}`);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  findMarkdownFiles,
  parseMarkdownFile,
  generateUrl,
  analyzeWithClaudeCode,
  fallbackAnalysis,
  processFile,
  isFileProcessed
};