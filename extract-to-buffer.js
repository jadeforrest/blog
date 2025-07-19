#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

// Configuration
const EXTRACTED_DIR = './extracted-content';
const SENT_TRACKING_FILE = './buffer-sent.json';
const BUFFER_API_BASE = 'https://api.bufferapp.com/1';

/**
 * Load tracking data for sent posts
 */
function loadSentTracking() {
  if (!fs.existsSync(SENT_TRACKING_FILE)) {
    return {};
  }
  
  try {
    const data = fs.readFileSync(SENT_TRACKING_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Warning: Could not parse tracking file: ${error.message}`);
    return {};
  }
}

/**
 * Save tracking data for sent posts
 */
function saveSentTracking(tracking) {
  fs.writeFileSync(SENT_TRACKING_FILE, JSON.stringify(tracking, null, 2));
}

/**
 * Parse extracted content files into text/URL pairs
 */
function parseExtractedContent() {
  const files = fs.readdirSync(EXTRACTED_DIR)
    .filter(file => file.endsWith('.txt') && file !== 'all-extracts.txt')
    .sort();

  const allPosts = [];

  for (const file of files) {
    const filePath = path.join(EXTRACTED_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8').trim();
    
    if (!content) continue;

    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    // Parse alternating text/URL pairs
    for (let i = 0; i < lines.length; i += 2) {
      if (i + 1 < lines.length) {
        const text = lines[i];
        const url = lines[i + 1];
        
        // Create unique ID for this post
        const postId = `${file}_${i}`;
        
        allPosts.push({
          id: postId,
          text: text,
          url: url,
          sourceFile: file
        });
      }
    }
  }

  return allPosts;
}

/**
 * Make HTTP request to Buffer API
 */
function makeBufferRequest(endpoint, data, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    
    const options = {
      hostname: 'api.bufferapp.com',
      port: 443,
      path: `/1${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonResponse);
          } else {
            reject(new Error(`Buffer API error ${res.statusCode}: ${JSON.stringify(jsonResponse)}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Post an update to Buffer
 */
async function postToBuffer(post, profileIds, accessToken, options = {}) {
  const { testMode = false, shorten = true } = options;
  
  console.log(`${testMode ? '[TEST MODE] ' : ''}Posting: "${post.text.substring(0, 50)}..."`);
  
  if (testMode) {
    console.log(`  Would post to Buffer with URL: ${post.url}`);
    return { success: true, test: true };
  }

  const updateData = {
    text: post.text,
    'profile_ids[]': profileIds,
    shorten: shorten,
    'media[link]': post.url
  };

  try {
    const response = await makeBufferRequest('/updates/create.json', updateData, accessToken);
    console.log(`  ✓ Posted successfully (ID: ${response.updates?.[0]?.id || 'unknown'})`);
    return { success: true, response };
  } catch (error) {
    console.error(`  ✗ Failed to post: ${error.message}`);
    throw error;
  }
}

/**
 * Get environment variables with validation
 */
function getConfig() {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;
  const profileIds = process.env.BUFFER_PROFILE_IDS;

  if (!accessToken) {
    throw new Error('BUFFER_ACCESS_TOKEN environment variable is required');
  }

  if (!profileIds) {
    throw new Error('BUFFER_PROFILE_IDS environment variable is required (comma-separated list)');
  }

  return {
    accessToken,
    profileIds: profileIds.split(',').map(id => id.trim())
  };
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test-mode');
  
  console.log(testMode ? 'Starting Buffer posting in TEST MODE (first post only)...' : 'Starting Buffer posting...');

  try {
    // Get configuration
    const { accessToken, profileIds } = getConfig();
    console.log(`Using ${profileIds.length} Buffer profile(s)`);

    // Load sent tracking
    const sentTracking = loadSentTracking();

    // Parse extracted content
    const allPosts = parseExtractedContent();
    console.log(`Found ${allPosts.length} extracted posts`);

    // Filter out already sent posts
    const unsentPosts = allPosts.filter(post => !sentTracking[post.id]);
    console.log(`${allPosts.length - unsentPosts.length} already sent, ${unsentPosts.length} to post`);

    if (unsentPosts.length === 0) {
      console.log('All posts have already been sent!');
      return;
    }

    // In test mode, only process the first post
    const postsToProcess = testMode ? unsentPosts.slice(0, 1) : unsentPosts;

    // Post each update
    const results = [];
    for (const post of postsToProcess) {
      try {
        const result = await postToBuffer(post, profileIds, accessToken, { testMode });
        results.push({ post, success: true, result });
        
        // Mark as sent in tracking
        sentTracking[post.id] = {
          sentAt: new Date().toISOString(),
          text: post.text,
          url: post.url,
          sourceFile: post.sourceFile,
          testMode: testMode
        };
        
        // Save tracking after each successful post
        saveSentTracking(sentTracking);
        
        // Rate limiting: wait 1 second between posts to stay under 60/minute
        if (!testMode && postsToProcess.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Failed to post "${post.text.substring(0, 30)}...": ${error.message}`);
        results.push({ post, success: false, error: error.message });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n=== Summary ===');
    console.log(`${testMode ? 'Test mode: ' : ''}Posted ${successful} update(s), ${failed} failed`);
    console.log(`Tracking file: ${SENT_TRACKING_FILE}`);
    console.log(`Total posts sent to date: ${Object.keys(sentTracking).length}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  parseExtractedContent,
  postToBuffer,
  loadSentTracking,
  saveSentTracking
};