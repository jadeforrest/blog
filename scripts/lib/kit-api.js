/**
 * Shared Kit (kit.com) v4 API client used by both directions of the sync:
 * `scripts/kit-fetch-sequence.js` (pull) and `scripts/kit-push-email.js` (push).
 *
 * Auth: reads KIT_API_KEY from the environment (or from blog/.env). Never logged.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');

export const API_BASE = 'https://api.kit.com/v4';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function loadApiKey() {
  if (process.env.KIT_API_KEY) return process.env.KIT_API_KEY;
  // Fallback: parse blog/.env (uses `export KIT_API_KEY="..."`).
  const envPath = path.join(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const m = fs
      .readFileSync(envPath, 'utf8')
      .match(/^\s*(?:export\s+)?KIT_API_KEY\s*=\s*["']?([^"'\n]+)["']?/m);
    if (m) return m[1];
  }
  return null;
}

async function apiRequest(method, pathAndQuery, apiKey, { body, retries = 3 } = {}) {
  const url = `${API_BASE}${pathAndQuery}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        'X-Kit-Api-Key': apiKey,
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (res.status === 429 && attempt < retries) {
      const wait = Number(res.headers.get('retry-after')) || 2 ** attempt;
      console.warn(`  Rate limited (429). Waiting ${wait}s before retry...`);
      await sleep(wait * 1000);
      continue;
    }

    if (!res.ok) {
      const resBody = await res.text().catch(() => '');
      const hint =
        res.status === 401
          ? ' — check KIT_API_KEY is a valid v4 key'
          : res.status === 404
            ? ' — check the id exists'
            : res.status === 422
              ? ' — Kit rejected the request parameters'
              : res.status === 429
                ? ' — rate limited, try again later'
                : '';
      throw new Error(
        `${method} ${pathAndQuery} → ${res.status} ${res.statusText}${hint}\n${resBody.slice(0, 500)}`
      );
    }

    return res.json();
  }
}

export function apiGet(pathAndQuery, apiKey, opts = {}) {
  return apiRequest('GET', pathAndQuery, apiKey, opts);
}

export function apiPut(pathAndQuery, body, apiKey, opts = {}) {
  return apiRequest('PUT', pathAndQuery, apiKey, { ...opts, body });
}
