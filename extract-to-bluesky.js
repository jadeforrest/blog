#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const EXTRACTED_DIR = './extracted-content';
const SENT_TRACKING_FILE = './bluesky-sent.json';
const BLUESKY_API_BASE = 'https://bsky.social/xrpc';

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
    .filter(file => file.endsWith('.txt'))
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
 * Make HTTP request to Bluesky API
 */
function makeBlueskyRequest(endpoint, data, accessToken, method = 'POST') {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: 'bsky.social',
      port: 443,
      path: `/xrpc/${endpoint}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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
              errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
            } catch {
              errorMessage = responseData || `HTTP ${res.statusCode}`;
            }
            
            if (res.statusCode === 401) {
              reject(new Error(`Bluesky API authentication failed. Token may be expired. Please re-authenticate. Details: ${errorMessage}`));
            } else {
              reject(new Error(`Bluesky API error ${res.statusCode}: ${errorMessage}`));
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

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Validate app password format (xxxx-xxxx-xxxx-xxxx)
 */
function isAppPasswordFormat(password) {
  return /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(password);
}

/**
 * Create a session with Bluesky (authenticate)
 */
async function createBlueskySession(identifier, appPassword) {
  // Validate app password format
  if (!isAppPasswordFormat(appPassword)) {
    throw new Error('Invalid app password format. App passwords should be in format: xxxx-xxxx-xxxx-xxxx');
  }

  const sessionData = {
    identifier: identifier,
    password: appPassword
  };

  try {
    const response = await makeBlueskyRequest('com.atproto.server.createSession', sessionData, null);
    return {
      accessJwt: response.accessJwt,
      refreshJwt: response.refreshJwt,
      did: response.did,
      handle: response.handle
    };
  } catch (error) {
    throw new Error(`Failed to create Bluesky session: ${error.message}`);
  }
}

/**
 * Refresh an existing Bluesky session
 */
async function refreshBlueskySession(refreshJwt) {
  try {
    const response = await makeBlueskyRequest('com.atproto.server.refreshSession', {}, refreshJwt);
    return {
      accessJwt: response.accessJwt,
      refreshJwt: response.refreshJwt,
      did: response.did,
      handle: response.handle
    };
  } catch (error) {
    throw new Error(`Failed to refresh Bluesky session: ${error.message}`);
  }
}

/**
 * Fetch URL content and extract metadata for website cards
 */
function fetchUrlMetadata(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BlueskyBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        let finished = false;
        
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          req.destroy();
          // Simple redirect - just use the URL as fallback for now
          resolve({ title: url, description: '', image: null });
          return;
        }
        
        // Only process successful responses
        if (res.statusCode < 200 || res.statusCode >= 300) {
          req.destroy();
          resolve({ title: url, description: '', image: null });
          return;
        }
        
        // Only process HTML content
        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
          req.destroy();
          resolve({ title: url, description: '', image: null });
          return;
        }

        res.on('data', (chunk) => {
          if (finished) return;
          data += chunk;
          // Stop collecting data once we have enough for meta tags
          if (data.length > 100000) {
            finished = true;
            res.destroy();
            try {
              const metadata = extractMetaTags(data, url);
              resolve(metadata);
            } catch (error) {
              resolve({ title: url, description: '', image: null });
            }
          }
        });
        
        res.on('end', () => {
          if (finished) return;
          finished = true;
          try {
            const metadata = extractMetaTags(data, url);
            resolve(metadata);
          } catch (error) {
            resolve({ title: url, description: '', image: null });
          }
        });

        res.on('error', () => {
          if (finished) return;
          finished = true;
          resolve({ title: url, description: '', image: null });
        });
      });

      req.on('error', () => {
        resolve({ title: url, description: '', image: null });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ title: url, description: '', image: null });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ title: url, description: '', image: null });
      });

      req.end();
    } catch (error) {
      resolve({ title: url, description: '', image: null });
    }
  });
}

/**
 * Extract meta tags from HTML content
 */
function extractMetaTags(html, baseUrl) {
  const metadata = { title: baseUrl, description: '', image: null };
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  
  if (ogTitleMatch) {
    metadata.title = ogTitleMatch[1].trim();
  } else if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Extract description
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  
  if (ogDescMatch) {
    metadata.description = ogDescMatch[1].trim();
  } else if (descMatch) {
    metadata.description = descMatch[1].trim();
  }
  
  // Extract image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  
  if (ogImageMatch) {
    const imageUrl = ogImageMatch[1].trim();
    // Convert relative URLs to absolute
    if (imageUrl.startsWith('//')) {
      metadata.image = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      metadata.image = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    } else if (imageUrl.startsWith('http')) {
      metadata.image = imageUrl;
    }
  }
  
  return metadata;
}

/**
 * Upload image blob to Bluesky
 */
function uploadBlob(imageUrl, session) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlueskyBot/1.0)'
      }
    };

    const req = client.request(options, (res) => {
      const chunks = [];
      let totalLength = 0;
      
      // Check content type
      const contentType = res.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        resolve(null);
        return;
      }

      res.on('data', (chunk) => {
        chunks.push(chunk);
        totalLength += chunk.length;
        
        // Limit image size to 1MB
        if (totalLength > 1024 * 1024) {
          res.destroy();
          resolve(null);
        }
      });
      
      res.on('end', () => {
        const imageBuffer = Buffer.concat(chunks);
        
        // Upload to Bluesky
        const uploadOptions = {
          hostname: 'bsky.social',
          port: 443,
          path: '/xrpc/com.atproto.repo.uploadBlob',
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            'Content-Length': imageBuffer.length,
            'Authorization': `Bearer ${session.accessJwt}`
          }
        };

        const uploadReq = https.request(uploadOptions, (uploadRes) => {
          let responseData = '';
          
          uploadRes.on('data', (chunk) => {
            responseData += chunk;
          });
          
          uploadRes.on('end', () => {
            try {
              if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
                const response = JSON.parse(responseData);
                resolve(response.blob);
              } else {
                resolve(null);
              }
            } catch (error) {
              resolve(null);
            }
          });
        });

        uploadReq.on('error', () => {
          resolve(null);
        });

        uploadReq.write(imageBuffer);
        uploadReq.end();
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Get or create Bluesky session using stored tokens or app password
 */
async function getBlueskySession(config) {
  // Option 1: Use stored access token if available
  if (config.accessToken && config.did) {
    console.log('Using stored access token...');
    return {
      accessJwt: config.accessToken,
      refreshJwt: config.refreshToken,
      did: config.did,
      handle: config.handle || 'unknown'
    };
  }

  // Option 2: Use refresh token to get new access token
  if (config.refreshToken) {
    console.log('Refreshing session with refresh token...');
    try {
      return await refreshBlueskySession(config.refreshToken);
    } catch (error) {
      console.warn(`Failed to refresh session: ${error.message}`);
      console.log('Falling back to app password authentication...');
    }
  }

  // Option 3: Create new session with app password
  if (config.identifier && config.appPassword) {
    console.log('Creating new session with app password...');
    return await createBlueskySession(config.identifier, config.appPassword);
  }

  throw new Error('No valid authentication method available. Provide either access token, refresh token, or identifier/app password.');
}

/**
 * Post to Bluesky with website card embed
 */
async function postToBluesky(post, session, options = {}) {
  const { dryRun = false } = options;
  
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Posting: "${post.text.substring(0, 50)}..."`);
  
  if (dryRun) {
    console.log(`  Would post to Bluesky with URL card: ${post.url}`);
    return { success: true, dryRun: true };
  }

  try {
    // Fetch URL metadata for website card with timeout
    console.log(`  Fetching metadata for: ${post.url}`);
    let metadata;
    try {
      // Add a Promise race with timeout
      metadata = await Promise.race([
        fetchUrlMetadata(post.url),
        new Promise((resolve) => setTimeout(() => {
          resolve({ title: post.url, description: '', image: null });
        }, 8000))
      ]);
    } catch (error) {
      console.log(`  Metadata fetch failed, using fallback`);
      metadata = { title: post.url, description: '', image: null };
    }
    
    // Upload thumbnail if available
    let thumbBlob = null;
    if (metadata.image) {
      console.log(`  Uploading thumbnail...`);
      try {
        thumbBlob = await Promise.race([
          uploadBlob(metadata.image, session),
          new Promise((resolve) => setTimeout(() => resolve(null), 10000))
        ]);
      } catch (error) {
        console.log(`  Thumbnail upload failed, continuing without image`);
        thumbBlob = null;
      }
    }
    
    // Create the post record with embed
    const record = {
      text: post.text,
      createdAt: new Date().toISOString(),
      langs: ['en'],
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          uri: post.url,
          title: metadata.title || post.url,
          description: metadata.description || ''
        }
      }
    };
    
    // Add thumbnail if available
    if (thumbBlob) {
      record.embed.external.thumb = thumbBlob;
    }

    // Create the post data for AT Protocol
    const postData = {
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: record
    };

    const response = await makeBlueskyRequest('com.atproto.repo.createRecord', postData, session.accessJwt);
    console.log(`  ✓ Posted successfully with card embed (URI: ${response.uri || 'unknown'})`);
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
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;
  const accessToken = process.env.BLUESKY_ACCESS_TOKEN;
  const refreshToken = process.env.BLUESKY_REFRESH_TOKEN;
  const did = process.env.BLUESKY_DID;
  const handle = process.env.BLUESKY_HANDLE;

  // Check if we have at least one valid authentication method
  const hasAppPassword = identifier && appPassword;
  const hasAccessToken = accessToken && did;
  const hasRefreshToken = refreshToken;

  if (!hasAppPassword && !hasAccessToken && !hasRefreshToken) {
    throw new Error('Authentication required: Set either BLUESKY_ACCESS_TOKEN+BLUESKY_DID, BLUESKY_REFRESH_TOKEN, or BLUESKY_IDENTIFIER+BLUESKY_APP_PASSWORD');
  }

  return {
    identifier,
    appPassword,
    accessToken,
    refreshToken,
    did,
    handle
  };
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log(dryRun ? 'Starting Bluesky posting in DRY RUN mode...' : 'Starting Bluesky posting (single post)...');

  try {
    // Get configuration
    const config = getConfig();

    // Get Bluesky session
    console.log('Authenticating with Bluesky...');
    const session = await getBlueskySession(config);
    console.log(`Authenticated as @${session.handle}`);

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

    // Randomly select an unsent post
    const randomIndex = Math.floor(Math.random() * unsentPosts.length);
    const postToProcess = unsentPosts[randomIndex];
    console.log(`Processing: "${postToProcess.text.substring(0, 50)}..." from ${postToProcess.sourceFile}`);

    try {
      const result = await postToBluesky(postToProcess, session, { dryRun });
      
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
        console.error('Your Bluesky credentials may be incorrect, expired, or your account may be suspended.');
        console.error('If using app password, verify it\'s in format: xxxx-xxxx-xxxx-xxxx');
        console.error('If using access token, it may have expired - try using refresh token instead.');
      }
      
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.message.includes('Authentication required')) {
      console.error('\n💡 Setup Help:');
      console.error('Choose one of these authentication methods:');
      console.error('');
      console.error('Method 1 - App Password (Recommended):');
      console.error('1. Create a Bluesky account at https://bsky.app');
      console.error('2. Generate an app password in Settings > Privacy and Security > App Passwords');
      console.error('3. Set: export BLUESKY_IDENTIFIER="your-handle.bsky.social"');
      console.error('4. Set: export BLUESKY_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"');
      console.error('');
      console.error('Method 2 - Access Token (Advanced):');
      console.error('1. Set: export BLUESKY_ACCESS_TOKEN="your_access_token"');
      console.error('2. Set: export BLUESKY_DID="your_did"');
      console.error('3. Optionally: export BLUESKY_REFRESH_TOKEN="your_refresh_token"');
      console.error('');
      console.error('Method 3 - Refresh Token:');
      console.error('1. Set: export BLUESKY_REFRESH_TOKEN="your_refresh_token"');
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
  postToBluesky,
  loadSentTracking,
  saveSentTracking,
  createBlueskySession,
  refreshBlueskySession,
  getBlueskySession,
  isAppPasswordFormat,
  fetchUrlMetadata,
  extractMetaTags,
  uploadBlob
};
