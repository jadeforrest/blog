#!/usr/bin/env node

/**
 * Kit API Validation Script (Phase 1b)
 *
 * Uses a saved Playwright session to make fetch requests from inside the browser,
 * so auth (cookies, CSRF) is handled automatically.
 *
 * Usage:
 *   node scripts/kit-validate-api.js
 *
 * Requires:
 *   - scripts/kit-session.json (run kit-capture-api.js --save-session first)
 *   - KIT_TEST_DOCUMENT_ID in .env (default: 69350613)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

loadEnv();

const SESSION_FILE = path.join(__dirname, 'kit-session.json');
const DOCUMENT_ID = process.env.KIT_TEST_DOCUMENT_ID || '69350613';

if (!fs.existsSync(SESSION_FILE)) {
  console.error(`No saved session found at ${SESSION_FILE}`);
  console.error('Run: node scripts/kit-capture-api.js --save-session');
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  // Navigate to Kit so the session cookies are active
  console.log('Loading Kit dashboard...');
  await page.goto('https://app.kit.com', { waitUntil: 'domcontentloaded' });

  const baseUrl = `https://app.kit.com/editor/document_versions/${DOCUMENT_ID}`;

  // Step 1: GET
  console.log(`\n--- GET ${baseUrl} ---`);
  const getResult = await page.evaluate(async (url) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
    });
    const body = await res.text();
    return { status: res.status, body };
  }, baseUrl);

  console.log('Status:', getResult.status);
  try {
    const parsed = JSON.parse(getResult.body);
    console.log('Response keys:', Object.keys(parsed));
    console.log('Full response (truncated):\n', JSON.stringify(parsed, null, 2).substring(0, 1000));
  } catch {
    console.log('Response:', getResult.body.substring(0, 500));
  }

  if (getResult.status !== 200) {
    console.log('\nGET failed. Trying PATCH anyway to see if endpoint only accepts writes...');
  }

  // Step 2: PATCH — get the CSRF token from the page meta tag first
  console.log(`\n--- PATCH ${baseUrl} ---`);

  const csrfToken = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : null;
  });
  console.log('CSRF token from page meta:', csrfToken ? csrfToken.substring(0, 30) + '...' : 'not found');

  const testMarker = `<!-- kit-sync-test-${Date.now()} -->`;

  // Try both flat and nested body shapes
  for (const body of [
    { content: `<p>Validation test</p>${testMarker}` },
    { document_version: { content: `<p>Validation test</p>${testMarker}` } },
    { body: `<p>Validation test</p>${testMarker}` },
  ]) {
    const label = JSON.stringify(body).substring(0, 60);
    console.log(`\nTrying body: ${label}...`);

    const patchResult = await page.evaluate(async ({ url, bodyData, csrf }) => {
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (csrf) headers['X-CSRF-Token'] = csrf;

      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(bodyData),
      });
      const text = await res.text();
      return { status: res.status, body: text };
    }, { url: baseUrl, bodyData: body, csrf: csrfToken });

    console.log('Status:', patchResult.status);
    console.log('Response:', patchResult.body.substring(0, 300));

    if (patchResult.status >= 200 && patchResult.status < 300) {
      console.log('\n✓ Success! This body shape works.');
      console.log('Test marker added:', testMarker);
      console.log('Verify in Kit dashboard that the email content updated.');
      break;
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
