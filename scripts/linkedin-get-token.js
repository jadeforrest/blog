#!/usr/bin/env node

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { exec } from 'child_process';

/**
 * LinkedIn OAuth Token Generator
 *
 * This script helps you generate a LinkedIn access token by:
 * 1. Starting a local server to receive OAuth callbacks
 * 2. Opening your browser to authorize the app
 * 3. Exchanging the authorization code for an access token
 *
 * Usage:
 *   node scripts/linkedin-get-token.js
 *
 * Required environment variables:
 *   LINKEDIN_CLIENT_ID - Your LinkedIn app's Client ID
 *   LINKEDIN_CLIENT_SECRET - Your LinkedIn app's Client Secret
 *
 * Setup:
 * 1. Go to https://www.linkedin.com/developers/apps
 * 2. Select your app → Auth tab
 * 3. Add redirect URL: http://localhost:3000/callback
 * 4. Copy your Client ID and Client Secret
 * 5. Set environment variables and run this script
 */

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = 'openid profile w_member_social';

// Configuration
const config = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET
};

/**
 * Open URL in default browser
 */
function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} "${url}"`, (error) => {
    if (error) {
      console.error(`Could not open browser automatically. Please open this URL manually:\n${url}`);
    }
  });
}

/**
 * Exchange authorization code for access token
 */
function getAccessToken(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: config.clientId,
      client_secret: config.clientSecret
    }).toString();

    const options = {
      hostname: 'www.linkedin.com',
      port: 443,
      path: '/oauth/v2/accessToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
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
            const tokenData = JSON.parse(responseData);
            resolve(tokenData);
          } else {
            reject(new Error(`Token exchange failed: ${res.statusCode} - ${responseData}`));
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
 * Start local server to receive OAuth callback
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
                <p><strong>Error:</strong> ${error}</p>
                <p><strong>Description:</strong> ${errorDescription || 'No description provided'}</p>
                <p>You can close this window and try again.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(`Authorization failed: ${error} - ${errorDescription}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d32f2f;">❌ No Authorization Code</h1>
                <p>No authorization code received from LinkedIn.</p>
                <p>You can close this window and try again.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        // Exchange code for token
        try {
          console.log('\n🔄 Exchanging authorization code for access token...');
          const tokenData = await getAccessToken(code);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #4caf50;">✅ Success!</h1>
                <p>Access token generated successfully. Check your terminal for details.</p>
                <p style="color: #666; margin-top: 30px;">You can close this window now.</p>
              </body>
            </html>
          `);

          server.close();
          resolve(tokenData);
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #d32f2f;">❌ Token Exchange Failed</h1>
                <p>${error.message}</p>
                <p>Check your terminal for more details.</p>
              </body>
            </html>
          `);
          server.close();
          reject(error);
        }
      } else if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
              <h1>LinkedIn OAuth Token Generator</h1>
              <p>Waiting for authorization callback...</p>
              <p style="color: #666;">If you haven't been redirected to LinkedIn, <a href="/start">click here</a>.</p>
            </body>
          </html>
        `);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(PORT, () => {
      console.log(`✅ Local server started on port ${PORT}`);
    });

    server.on('error', (error) => {
      reject(new Error(`Server error: ${error.message}`));
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🔐 LinkedIn OAuth Token Generator\n');

  // Validate configuration
  if (!config.clientId || !config.clientSecret) {
    console.error('❌ Missing required environment variables:\n');
    console.error('Please set the following:');
    console.error('  export LINKEDIN_CLIENT_ID="your_client_id"');
    console.error('  export LINKEDIN_CLIENT_SECRET="your_client_secret"\n');
    console.error('Get these from: https://www.linkedin.com/developers/apps');
    console.error('Select your app → Auth tab\n');
    console.error('⚠️  IMPORTANT: Add this redirect URL to your app:');
    console.error(`  ${REDIRECT_URI}`);
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`  Client ID: ${config.clientId}`);
  console.log(`  Client Secret: ${config.clientSecret.substring(0, 8)}...`);
  console.log(`  Redirect URI: ${REDIRECT_URI}`);
  console.log(`  Scopes: ${SCOPES}\n`);

  console.log('⚠️  Make sure you\'ve added this redirect URL to your LinkedIn app:');
  console.log(`  ${REDIRECT_URI}\n`);

  try {
    // Start local server
    console.log('🚀 Starting local server...');
    const tokenPromise = startServer();

    // Build authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);

    console.log('🌐 Opening browser for authorization...');
    console.log(`\nIf browser doesn't open, visit:\n${authUrl.toString()}\n`);

    // Open browser
    setTimeout(() => openBrowser(authUrl.toString()), 1000);

    // Wait for token
    const tokenData = await tokenPromise;

    console.log('\n' + '='.repeat(80));
    console.log('🎉 SUCCESS! Access Token Generated');
    console.log('='.repeat(80));
    console.log('\n📝 Access Token:');
    console.log(tokenData.access_token);
    console.log('\n⏰ Expires in:', tokenData.expires_in, 'seconds (approx', Math.floor(tokenData.expires_in / 86400), 'days)');
    console.log('\n💾 Save your token by running:');
    console.log(`\nexport LINKEDIN_ACCESS_TOKEN="${tokenData.access_token}"\n`);
    console.log('Or add to your ~/.bashrc or ~/.zshrc for persistence:\n');
    console.log(`echo 'export LINKEDIN_ACCESS_TOKEN="${tokenData.access_token}"' >> ~/.bashrc\n`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('EADDRINUSE')) {
      console.error(`\n💡 Port ${PORT} is already in use. Please:`);
      console.error('  1. Stop any other process using this port');
      console.error('  2. Or change the PORT constant in this script');
    }

    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { getAccessToken, startServer };
