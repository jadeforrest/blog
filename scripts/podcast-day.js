#!/usr/bin/env node
/**
 * podcast-day.js — rebuild the site when a new Decoding Leadership episode is released.
 *
 * /decoding-leadership/ reads the podcast RSS feed at build time. Spotify keeps a scheduled
 * episode out of the feed until its release, so this compares the feed with the live page and
 * POSTs the Netlify build hook when an episode is missing. Run hourly by launchd; a run with
 * nothing new fetches the feed and the page and does nothing else. A build that doesn't bring the
 * episode in is retried after an hour (up to 3 builds per episode) and reported.
 *
 * Usage:
 *   node scripts/podcast-day.js [--dry-run]
 *
 * Env: NETLIFY_BUILD_HOOK. PODCAST_DAY_STATE overrides the state file
 * (default ~/Library/Application Support/podcast-day/state.json).
 */

import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { loadJsonState, saveJsonState } from "./lib/json-state.js";
import { fetchFeedItems } from "./lib/podcast-feed.js";
import { missingEpisodes, plan } from "./lib/podcast-day.js";

export const PAGE_URL = "https://www.rubick.com/decoding-leadership/";
const STATE_FILE =
  process.env.PODCAST_DAY_STATE ||
  path.join(os.homedir(), "Library/Application Support/podcast-day/state.json");

async function fetchText(url, fetchFn) {
  const res = await fetchFn(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

/**
 * One run. Side effects are passed in, so tests drive it with fakes.
 * @returns {Promise<string[]>} errors; empty on success
 */
export async function run({ args, hook, state, now, fetchFn, loadFeed, saveState, log }) {
  const dryRun = args.includes("--dry-run");
  const items = await loadFeed();
  const html = await fetchText(PAGE_URL, fetchFn);
  const missing = missingEpisodes(items, html);
  if (!missing.length) {
    if (!dryRun) saveState({ builds: {} });
    return [];
  }
  log(`Not on the page yet: ${missing.map((e) => e.title).join("; ")}`);
  const decision = plan({ missing, state, now, hasHook: Boolean(hook) });
  if (!decision.build) {
    if (!decision.errors.length) log("A build was triggered recently; waiting for it to deploy.");
  } else if (dryRun) {
    log("[Dry run] Would trigger a Netlify build.");
  } else {
    const res = await fetchFn(hook, { method: "POST" });
    if (!res.ok) return [...decision.errors, `Netlify build hook returned ${res.status}`];
    log("Triggered a Netlify build.");
  }
  if (!dryRun) saveState(decision.state);
  return decision.errors;
}

async function main() {
  const { default: Parser } = await import("rss-parser");
  const parser = new Parser();
  const errors = await run({
    args: process.argv.slice(2),
    hook: process.env.NETLIFY_BUILD_HOOK,
    state: loadJsonState(STATE_FILE, () => ({ builds: {} })),
    now: new Date(),
    fetchFn: fetch,
    loadFeed: () => fetchFeedItems((url) => parser.parseURL(url)),
    saveState: (state) => saveJsonState(STATE_FILE, state),
    log: (msg) => console.log(`${new Date().toISOString()} ${msg}`),
  });
  for (const e of errors) console.error(e);
  process.exitCode = errors.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
