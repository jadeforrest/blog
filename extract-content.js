#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BASE_URL = 'https://www.rubick.com';
const CONTENT_DIR = './content/posts';
const OUTPUT_DIR = './extracted-content';
const AI_PROVIDER = 'anthropic'; // Options: 'anthropic', 'openai', 'claude-code'

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
 * Use Claude Code API to analyze content
 */
async function analyzeWithClaudeCode(content, title) {
  const prompt = `Analyze this blog post and extract 2-4 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Title: ${title}

Content:
${content}

Return only the extracted passages, one per line, without quotes or additional formatting.`;

  try {
    // This would use the Claude Code API - for now, return a placeholder
    // In a real implementation, you'd make an API call here
    return [
      "Placeholder extract 1 from the content analysis.",
      "Placeholder extract 2 with valuable insight.",
      "Placeholder extract 3 showing practical advice."
    ];
  } catch (error) {
    console.error('Error with Claude Code analysis:', error);
    return [];
  }
}

/**
 * Use Anthropic API to analyze content
 */
async function analyzeWithAnthropic(content, title) {
  const prompt = `Analyze this blog post and extract 2-4 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Title: ${title}

Content:
${content}

Return only the extracted passages, one per line, without quotes or additional formatting.`;

  try {
    // This would use the Anthropic API
    // For now, return a simple extraction from the content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 50);
    return sentences.slice(0, 3).map(s => s.trim() + '.');
  } catch (error) {
    console.error('Error with Anthropic analysis:', error);
    return [];
  }
}

/**
 * Use OpenAI API to analyze content
 */
async function analyzeWithOpenAI(content, title) {
  const prompt = `Analyze this blog post and extract 2-4 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Title: ${title}

Content:
${content}

Return only the extracted passages, one per line, without quotes or additional formatting.`;

  try {
    // This would use the OpenAI API
    // For now, return a placeholder
    return [
      "Key insight extracted from the content.",
      "Practical advice or valuable observation.",
      "Thought-provoking idea from the post."
    ];
  } catch (error) {
    console.error('Error with OpenAI analysis:', error);
    return [];
  }
}

/**
 * Analyze content using the selected AI provider
 */
async function analyzeContent(content, title, provider = AI_PROVIDER) {
  switch (provider) {
    case 'claude-code':
      return await analyzeWithClaudeCode(content, title);
    case 'anthropic':
      return await analyzeWithAnthropic(content, title);
    case 'openai':
      return await analyzeWithOpenAI(content, title);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Process a single markdown file
 */
async function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  const { title, content } = parseMarkdownFile(filePath);
  const url = generateUrl(filePath);
  
  // Analyze content with AI
  const extracts = await analyzeContent(content, title);
  
  // Generate output content
  const output = extracts.map(extract => `${extract}\n${url}`).join('\n\n');
  
  // Create output file
  const fileName = path.basename(path.dirname(filePath)) + '.txt';
  const outputPath = path.join(OUTPUT_DIR, fileName);
  
  fs.writeFileSync(outputPath, output);
  console.log(`Created: ${outputPath}`);
  
  return { filePath, outputPath, extractCount: extracts.length };
}

/**
 * Main function
 */
async function main() {
  console.log('Starting content extraction...');
  
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
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${results.length} files`);
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
  analyzeContent,
  processFile
};