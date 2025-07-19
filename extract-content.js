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
 * Use Claude Code to analyze content
 */
function analyzeWithClaudeCode(content, title) {
  return new Promise((resolve, reject) => {
    const prompt = `Analyze this blog post and extract 2-4 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Focus on:
- Actionable advice
- Surprising insights
- Memorable quotes or principles
- Practical frameworks or models

Title: ${title}

Content:
${content}

Return only the extracted passages, one per line, without quotes or additional formatting. Each extract should be a complete thought that stands alone.`;

    const claude = spawn('claude', ['--no-cache'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('close', (code) => {
      if (code === 0) {
        const extracts = output
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 20) // Filter out short lines
          .slice(0, 4); // Limit to 4 extracts
        resolve(extracts);
      } else {
        reject(new Error(`Claude process exited with code ${code}: ${error}`));
      }
    });

    claude.stdin.write(prompt);
    claude.stdin.end();
  });
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
  console.log('Starting content extraction with Claude Code...');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Find all markdown files
  const markdownFiles = findMarkdownFiles();
  console.log(`Found ${markdownFiles.length} markdown files`);
  
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
  
  // Create a master file with all extracts
  const masterFile = path.join(OUTPUT_DIR, 'all-extracts.txt');
  const allExtracts = [];
  
  for (const result of results) {
    if (fs.existsSync(result.outputPath)) {
      const content = fs.readFileSync(result.outputPath, 'utf8');
      allExtracts.push(content);
    }
  }
  
  fs.writeFileSync(masterFile, allExtracts.join('\n\n---\n\n'));
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${results.length} files`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total extracts: ${results.reduce((sum, r) => sum + r.extractCount, 0)}`);
  console.log(`Master file: ${masterFile}`);
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
  processFile
};