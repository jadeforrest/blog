#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const EXTRACTED_DIR = './extracted-content';
const SENT_TRACKING_FILE = './linkedin-sent.json';
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

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
 * Make HTTP request to LinkedIn API
 */
function makeLinkedInRequest(endpoint, data, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.linkedin.com',
      port: 443,
      path: `/v2${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const jsonResponse = responseData ? JSON.parse(responseData) : {};
            resolve(jsonResponse);
          } else {
            let errorMessage;
            try {
              const errorData = JSON.parse(responseData);
              errorMessage = errorData.message || errorData.error_description || JSON.stringify(errorData);
            } catch {
              errorMessage = responseData || `HTTP ${res.statusCode}`;
            }
            
            if (res.statusCode === 401) {
              reject(new Error(`LinkedIn API authentication failed. Token may be expired. Please re-authenticate. Details: ${errorMessage}`));
            } else {
              reject(new Error(`LinkedIn API error ${res.statusCode}: ${errorMessage}`));
            }
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
 * Get LinkedIn Person URN for the authenticated user
 */
async function getPersonUrn(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.linkedin.com',
      port: 443,
      path: '/v2/people/(id~)',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const profile = JSON.parse(responseData);
            resolve(profile.id);
          } else {
            if (res.statusCode === 401) {
              reject(new Error('LinkedIn API authentication failed. Token may be expired. Please re-authenticate.'));
            } else {
              reject(new Error(`Failed to get profile: HTTP ${res.statusCode}`));
            }
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Post an article share to LinkedIn
 */
async function postToLinkedIn(post, accessToken, options = {}) {
  const { dryRun = false } = options;
  
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Posting: "${post.text.substring(0, 50)}..."`);
  
  if (dryRun) {
    console.log(`  Would post to LinkedIn with URL: ${post.url}`);
    return { success: true, dryRun: true };
  }

  try {
    // Get the person URN for the authenticated user
    const personId = await getPersonUrn(accessToken);
    const authorUrn = `urn:li:person:${personId}`;

    // Create the LinkedIn post data for article share
    const postData = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.text
          },
          shareMediaCategory: 'ARTICLE',
          media: [
            {
              status: 'READY',
              originalUrl: post.url
            }
          ]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await makeLinkedInRequest('/ugcPosts', postData, accessToken);
    console.log(`  ✓ Posted successfully (ID: ${response.id || 'unknown'})`);
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
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN; // Optional - we'll fetch it if not provided

  if (!accessToken) {
    throw new Error('LINKEDIN_ACCESS_TOKEN environment variable is required');
  }

  return {
    accessToken,
    personUrn
  };
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log(dryRun ? 'Starting LinkedIn posting in DRY RUN mode...' : 'Starting LinkedIn posting (single post)...');

  try {
    // Get configuration
    const { accessToken } = getConfig();

    // Load sent tracking
    const sentTracking = loadSentTracking();

    // Parse extracted content
    const allPosts = parseExtractedContent();
    console.log(`Found ${allPosts.length} extracted posts`);

    // Filter out already sent posts
    const unsentPosts = allPosts.filter(post => !sentTracking[post.id]);
    console.log(`${allPosts.length - unsentPosts.length} already sent, ${unsentPosts.length} remaining`);

    if (unsentPosts.length === 0) {
      console.log('All posts have already been sent!');
      return;
    }

    // Always process only the first unsent post (daily posting behavior)
    const postToProcess = unsentPosts[0];
    console.log(`Processing: "${postToProcess.text.substring(0, 50)}..." from ${postToProcess.sourceFile}`);

    try {
      const result = await postToLinkedIn(postToProcess, accessToken, { dryRun });
      
      if (!dryRun) {
        // Mark as sent in tracking
        sentTracking[postToProcess.id] = {
          sentAt: new Date().toISOString(),
          text: postToProcess.text,
          url: postToProcess.url,
          sourceFile: postToProcess.sourceFile,
          dryRun: false
        };
        
        // Save tracking after successful post
        saveSentTracking(sentTracking);
      }
      
      console.log('\n=== Summary ===');
      console.log(`${dryRun ? 'Dry run: ' : ''}Posted 1 update successfully`);
      console.log(`Tracking file: ${SENT_TRACKING_FILE}`);
      console.log(`Total posts sent to date: ${Object.keys(sentTracking).length}`);
      console.log(`Remaining posts in queue: ${unsentPosts.length - 1}`);

    } catch (error) {
      console.error(`Failed to post "${postToProcess.text.substring(0, 30)}...": ${error.message}`);
      
      // Provide helpful guidance for common errors
      if (error.message.includes('authentication failed') || error.message.includes('expired')) {
        console.error('\n💡 Authentication Help:');
        console.error('Your LinkedIn access token may have expired (tokens last ~60 days).');
        console.error('Please re-authenticate and update your LINKEDIN_ACCESS_TOKEN environment variable.');
      }
      
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.message.includes('LINKEDIN_ACCESS_TOKEN')) {
      console.error('\n💡 Setup Help:');
      console.error('1. Get a LinkedIn access token with "w_member_social" scope');
      console.error('2. Set: export LINKEDIN_ACCESS_TOKEN="your_token_here"');
      console.error('3. Run the script again');
    }
    
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  parseExtractedContent,
  postToLinkedIn,
  loadSentTracking,
  saveSentTracking,
  getPersonUrn
};