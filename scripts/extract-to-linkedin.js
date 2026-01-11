#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EXTRACTED_DIR = './extracted-content';
const SENT_TRACKING_FILE = path.join(__dirname, 'linkedin-sent.json');
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
 * Make HTTP request to LinkedIn API
 */
function makeLinkedInRequest(endpoint, data, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'api.linkedin.com',
      port: 443,
      path: `/rest${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202501'
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
 * Fetch URL content and extract metadata for page titles
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
          'User-Agent': 'Mozilla/5.0 (compatible; LinkedInBot/1.0)',
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
          resolve({ title: url, description: '' });
          return;
        }

        // Only process successful responses
        if (res.statusCode < 200 || res.statusCode >= 300) {
          req.destroy();
          resolve({ title: url, description: '' });
          return;
        }

        // Only process HTML content
        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
          req.destroy();
          resolve({ title: url, description: '' });
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
              resolve({ title: url, description: '' });
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
            resolve({ title: url, description: '' });
          }
        });

        res.on('error', () => {
          if (finished) return;
          finished = true;
          resolve({ title: url, description: '' });
        });
      });

      req.on('error', () => {
        resolve({ title: url, description: '' });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ title: url, description: '' });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ title: url, description: '' });
      });

      req.end();
    } catch (error) {
      resolve({ title: url, description: '' });
    }
  });
}

/**
 * Extract meta tags from HTML content
 */
function extractMetaTags(html, baseUrl) {
  const metadata = { title: baseUrl, description: '', image: '' };

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
  const contentImageMatch = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);

  if (ogImageMatch) {
    metadata.image = ogImageMatch[1].trim();
  } else if (contentImageMatch) {
    metadata.image = contentImageMatch[1].trim();
  }

  return metadata;
}

/**
 * Download image from URL
 */
function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(imageUrl);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.request(imageUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadImage(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Image download failed: ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Image download timeout'));
      });
      req.end();
    } catch (error) {
      reject(error);
    }
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
      path: '/v2/userinfo',
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
            const userInfo = JSON.parse(responseData);
            // userinfo endpoint returns 'sub' field containing the person ID
            resolve(userInfo.sub);
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
 * Upload image to LinkedIn Images API
 */
async function uploadImageToLinkedIn(imageBuffer, personId, accessToken) {
  // Step 1: Initialize upload
  const initData = {
    initializeUploadRequest: {
      owner: `urn:li:person:${personId}`
    }
  };

  const initResponse = await makeLinkedInRequest(
    '/images?action=initializeUpload',
    initData,
    accessToken
  );

  const { uploadUrl, image: imageUrn } = initResponse.value;

  // Step 2: Upload binary data to signed URL
  await new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(uploadUrl);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': imageBuffer.length
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.write(imageBuffer);
      req.end();
    } catch (error) {
      reject(error);
    }
  });

  return imageUrn;
}

/**
 * Post an article share to LinkedIn using Posts API
 */
async function postToLinkedIn(post, accessToken, options = {}) {
  const { dryRun = false } = options;

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Posting: "${post.text.substring(0, 50)}..."`);

  try {
    // Fetch URL metadata for page title
    console.log(`  Fetching metadata for: ${post.url}`);
    let metadata;
    try {
      // Add a Promise race with timeout
      metadata = await Promise.race([
        fetchUrlMetadata(post.url),
        new Promise((resolve) => setTimeout(() => {
          resolve({ title: post.url, description: '', image: '' });
        }, 8000))
      ]);
    } catch (error) {
      console.log(`  Metadata fetch failed, using fallback`);
      metadata = { title: post.url, description: '', image: '' };
    }

    if (dryRun) {
      if (metadata.image) {
        console.log(`  [DRY RUN] Found og:image: ${metadata.image}`);
        console.log(`  [DRY RUN] Would download and upload image to LinkedIn`);
      } else {
        console.log(`  [DRY RUN] No og:image found, would post without thumbnail`);
      }
      console.log(`  [DRY RUN] Would post to LinkedIn with title: "${metadata.title}"`);
      return { success: true, dryRun: true };
    }

    // Get the person URN for the authenticated user
    const personId = await getPersonUrn(accessToken);
    const authorUrn = `urn:li:person:${personId}`;

    // Upload image if og:image is present
    let imageUrn = null;
    if (metadata.image) {
      try {
        console.log(`  Downloading image: ${metadata.image}`);
        const imageBuffer = await downloadImage(metadata.image);
        console.log(`  Image downloaded: ${imageBuffer.length} bytes`);

        console.log(`  Uploading image to LinkedIn...`);
        imageUrn = await uploadImageToLinkedIn(imageBuffer, personId, accessToken);
        console.log(`  ✓ Image uploaded: ${imageUrn}`);
      } catch (error) {
        console.log(`  ⚠ Image upload failed: ${error.message}`);
        console.log(`  Continuing without image...`);
      }
    }

    // Create the LinkedIn post data using Posts API format
    const postData = {
      author: authorUrn,
      commentary: post.text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content: {
        article: {
          source: post.url,
          title: metadata.title || post.url,
          description: metadata.description || post.text,
          ...(imageUrn && { thumbnail: imageUrn })
        }
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };

    const response = await makeLinkedInRequest('/posts', postData, accessToken);
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

    // Randomly select an unsent post
    const randomIndex = Math.floor(Math.random() * unsentPosts.length);
    const postToProcess = unsentPosts[randomIndex];
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
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  parseExtractedContent,
  postToLinkedIn,
  loadSentTracking,
  saveSentTracking,
  getPersonUrn,
  fetchUrlMetadata,
  extractMetaTags,
  downloadImage,
  uploadImageToLinkedIn
};
