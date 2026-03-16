#!/usr/bin/env node

/**
 * Kit API Capture Script
 *
 * Opens a browser, lets you log in (including 2FA/email verification),
 * then navigates to your sequence and intercepts network requests.
 * Make a small edit and save — the script captures the API call.
 *
 * Usage:
 *   node scripts/kit-capture-api.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
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

const KIT_EMAIL = process.env.KIT_EMAIL;
const KIT_PASSWORD = process.env.KIT_PASSWORD;
const SEQUENCE_URL = 'https://app.kit.com/sequences/2684721';
const OUTPUT_FILE = path.join(__dirname, 'kit-captured-requests.json');

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Pre-fill login
  console.log('Opening Kit login...');
  await page.goto('https://app.kit.com/users/login');
  if (KIT_EMAIL) await page.fill('input[type="email"]', KIT_EMAIL).catch(() => {});
  if (KIT_PASSWORD) await page.fill('input[type="password"]', KIT_PASSWORD).catch(() => {});

  console.log('\nComplete login in the browser window (including any 2FA or email verification).');
  await waitForEnter('Press ENTER here once you are on the Kit dashboard → ');

  // Set up request interception before navigating
  const capturedRequests = [];

  page.on('request', (request) => {
    const method = request.method();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      capturedRequests.push({
        method,
        url: request.url(),
        headers: request.headers(),
        postData: request.postData() || null,
        timestamp: new Date().toISOString(),
      });
      console.log(`[${method}] ${request.url()}`);
    }
  });

  page.on('response', async (response) => {
    const method = response.request().method();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const entry = capturedRequests.findLast(r => r.url === response.url() && r.method === method && !r.status);
      if (entry) {
        entry.status = response.status();
        try { entry.responseBody = await response.text(); } catch {}
      }
      console.log(`  → ${response.status()} ${response.url()}`);
    }
  });

  console.log(`\nNavigating to sequence...`);
  await page.goto(SEQUENCE_URL, { waitUntil: 'domcontentloaded' });

  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. Click into any email in the sequence to open the editor');
  console.log('2. Make a small edit (add a space, change a word)');
  console.log('3. Wait a moment for autosave to fire');
  console.log('====================\n');

  await waitForEnter('Press ENTER after the autosave has fired (watch for the POST above) → ');

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(capturedRequests, null, 2));
  console.log(`\nSaved ${capturedRequests.length} captured requests to ${OUTPUT_FILE}`);

  const saveRequests = capturedRequests.filter(r => ['PATCH', 'PUT'].includes(r.method));
  if (saveRequests.length > 0) {
    console.log('\n=== LIKELY SAVE ENDPOINTS ===');
    for (const r of saveRequests) {
      console.log(`\n${r.method} ${r.url}`);
      console.log('Status:', r.status);
      const keyHeaders = Object.entries(r.headers)
        .filter(([k]) => ['x-csrf-token', 'x-xsrf-token', 'authorization', 'content-type', 'x-kit-api-key'].includes(k.toLowerCase()))
        .map(([k, v]) => `  ${k}: ${v.substring(0, 120)}`);
      if (keyHeaders.length) console.log('Key headers:\n' + keyHeaders.join('\n'));
      if (r.postData) console.log('Request body:', r.postData.substring(0, 500));
    }
  } else {
    console.log('\nNo PATCH/PUT requests captured. All captured requests are in:', OUTPUT_FILE);
  }

  await browser.close();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
