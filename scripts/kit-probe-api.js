#!/usr/bin/env node

/**
 * Probes various Kit API endpoint + auth permutations to find one that works.
 */

import fs from 'fs';
import https from 'https';
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

const API_KEY = process.env.KIT_API_KEY;
const DOC_ID = process.env.KIT_TEST_DOCUMENT_ID || '69350613';

if (!API_KEY) {
  console.error('KIT_API_KEY not set in .env');
  process.exit(1);
}

function request(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers,
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function probe(label, method, url, headers, body = null) {
  try {
    const res = await request(method, url, headers, body);
    const snippet = res.body.substring(0, 120).replace(/\n/g, ' ');
    console.log(`[${res.status}] ${label}`);
    console.log(`       ${snippet}`);
    return res;
  } catch (e) {
    console.log(`[ERR] ${label}: ${e.message}`);
    return null;
  }
}

async function main() {
  const bearer = { 'Authorization': `Bearer ${API_KEY}` };
  const token  = { 'Authorization': `Token token=${API_KEY}` };
  const xApiKey = { 'X-Kit-Api-Key': API_KEY };

  console.log(`API key: ${API_KEY.substring(0, 12)}...`);
  console.log(`Document ID: ${DOC_ID}\n`);

  // 1. Official V4 API — sanity check that the key works at all
  console.log('=== V4 API sanity check ===');
  await probe('GET v4/account', 'GET', 'https://api.kit.com/v4/account', bearer);
  await probe('GET v4/sequences', 'GET', 'https://api.kit.com/v4/sequences', bearer);

  // 2. Try document_versions on api.kit.com (v4 base)
  console.log('\n=== api.kit.com/v4 document_versions ===');
  await probe('GET v4/document_versions/:id (bearer)', 'GET', `https://api.kit.com/v4/editor/document_versions/${DOC_ID}`, bearer);
  await probe('GET v4/document_versions/:id (token)', 'GET', `https://api.kit.com/v4/editor/document_versions/${DOC_ID}`, token);

  // 3. Try on app.kit.com with API key auth
  console.log('\n=== app.kit.com/editor with API key ===');
  await probe('GET app/editor/document_versions/:id (bearer)', 'GET', `https://app.kit.com/editor/document_versions/${DOC_ID}`, bearer);
  await probe('GET app/editor/document_versions/:id (token)', 'GET', `https://app.kit.com/editor/document_versions/${DOC_ID}`, token);
  await probe('GET app/editor/document_versions/:id (x-api-key)', 'GET', `https://app.kit.com/editor/document_versions/${DOC_ID}`, xApiKey);

  // 4. Try different URL shapes on app.kit.com
  console.log('\n=== URL shape variations (bearer) ===');
  await probe('GET /api/v4/document_versions/:id', 'GET', `https://app.kit.com/api/v4/document_versions/${DOC_ID}`, bearer);
  await probe('GET /api/document_versions/:id', 'GET', `https://app.kit.com/api/document_versions/${DOC_ID}`, bearer);
  await probe('GET /editor/emails/:id', 'GET', `https://app.kit.com/editor/emails/${DOC_ID}`, bearer);
  await probe('GET /editor/documents/:id', 'GET', `https://app.kit.com/editor/documents/${DOC_ID}`, bearer);

  // 5. If any GET returned 200, try a PATCH
  console.log('\n=== PATCH attempts on most promising endpoints ===');
  for (const [authLabel, authHeaders] of [['bearer', bearer], ['token', token]]) {
    for (const url of [
      `https://app.kit.com/editor/document_versions/${DOC_ID}`,
      `https://api.kit.com/v4/editor/document_versions/${DOC_ID}`,
    ]) {
      await probe(
        `PATCH ${url.replace('https://', '')} (${authLabel})`,
        'PATCH',
        url,
        authHeaders,
        { content: '<p>API test</p>' }
      );
    }
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
