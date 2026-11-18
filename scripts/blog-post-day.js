#!/usr/bin/env node
/**
 * blog-post-day.js — make scheduled posts go live on their date, and announce new posts.
 *
 * A post dated in the future is left out of the build (src/utils/posts.ts) and out of the
 * Bluesky/LinkedIn excerpt queues. The site is static, so something has to build it on the day:
 * when a post's date has arrived since the last run, this POSTs to the Netlify build hook. Then,
 * once each new post's page returns 200, it posts a "New post: <title>" announcement to Bluesky
 * and LinkedIn (once per platform; a failed platform is retried on the next run).
 *
 * Usage:
 *   node scripts/blog-post-day.js [--dry-run] [--today YYYY-MM-DD] [--no-announce]
 *
 * Env: NETLIFY_BUILD_HOOK (fails when a post is due or scheduled and it's missing), plus the
 * Bluesky and LinkedIn variables the excerpt scripts use. BLOG_POST_DAY_STATE overrides the state
 * file (default ~/Library/Application Support/blog-post-day/state.json).
 *
 * Netlify builds master, so push a scheduled post before its date. If it isn't pushed, the
 * page never returns 200 and the run fails, naming it.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { announcementText, initialState, missingPlatforms, plan, readPosts } from "./lib/blog-post-day.js";
import { loadJsonState, saveJsonState } from "./lib/json-state.js";
import { siteToday } from "./lib/publish-dates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.join(ROOT, "src", "content", "posts");
const STATE_FILE =
  process.env.BLOG_POST_DAY_STATE ||
  path.join(os.homedir(), "Library/Application Support/blog-post-day/state.json");

// A Netlify build of this site takes 3-6 minutes; allow for a queue.
const LIVE_TIMEOUT_MS = 25 * 60_000;
const LIVE_POLL_MS = 30_000;

function argValue(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

/** True once `url` returns 200. Polls until `timeoutMs` (0 = check once). */
export async function waitUntilLive(url, { fetchFn, sleep, timeoutMs, pollMs = LIVE_POLL_MS }) {
  for (let waited = 0; ; waited += pollMs) {
    const res = await fetchFn(url, { method: "HEAD", redirect: "manual" }).catch(() => null);
    if (res?.status === 200) return true;
    if (waited >= timeoutMs) return false;
    await sleep(pollMs);
  }
}

/** Post each missing announcement; record successes in `state`. Returns error messages. */
async function announcePost(post, state, { announcers, saveState, log }) {
  const errors = [];
  for (const platform of missingPlatforms(post, state)) {
    try {
      await announcers[platform]({ text: announcementText(post, platform), url: post.url });
      state.announced[post.slug] = { ...state.announced[post.slug], [platform]: new Date().toISOString() };
      saveState(state);
      log(`Announced ${post.slug} on ${platform}.`);
    } catch (err) {
      errors.push(`${platform} announcement of ${post.slug} failed: ${err.message}`);
    }
  }
  return errors;
}

/** POST the build hook when posts went live. Returns an error message, or null. */
async function triggerBuild(due, { hook, dryRun, fetchFn, log, lastChecked }) {
  if (!due.length) return null;
  log(`Live since ${lastChecked}: ${due.map((p) => p.slug).join(", ")}`);
  if (dryRun) {
    log("[Dry run] Not triggering a build.");
    return null;
  }
  const res = await fetchFn(hook, { method: "POST" });
  if (!res.ok) return `Netlify build hook returned ${res.status}`;
  log("Triggered a Netlify build.");
  return null;
}

/** Announce each post once its page is live; a just-built post gets time to deploy. */
async function announceAll(toAnnounce, due, state, deps) {
  const errors = [];
  for (const post of toAnnounce) {
    const timeoutMs = due.includes(post) ? LIVE_TIMEOUT_MS : 0;
    if (!(await waitUntilLive(post.url, { ...deps, timeoutMs }))) {
      errors.push(`${post.url} is not live, so it was not announced (is it pushed to master?)`);
      continue;
    }
    errors.push(...(await announcePost(post, state, deps)));
  }
  return errors;
}

/**
 * One run. Everything with side effects is passed in, so tests drive it with fakes.
 * @returns {Promise<string[]>} errors; empty on success
 */
export async function run({ args, hook, posts, state, ...deps }) {
  const dryRun = args.includes("--dry-run");
  const today = argValue(args, "--today") ?? siteToday();
  const { due, upcoming, toAnnounce, missingHook } = plan({ posts, state, today, hasHook: Boolean(hook) });
  if (upcoming.length) deps.log(`Scheduled: ${upcoming.map((p) => `${p.slug} (${p.date})`).join(", ")}`);
  if (missingHook) return ["NETLIFY_BUILD_HOOK is not set, so scheduled posts will not go live on their date"];

  const buildError = await triggerBuild(due, { ...deps, hook, dryRun, lastChecked: state.lastChecked });
  if (buildError) return [buildError];
  state.lastChecked = today;
  if (dryRun) {
    for (const post of toAnnounce) deps.log(`[Dry run] Would announce ${post.slug} on ${missingPlatforms(post, state).join(", ")}.`);
    return [];
  }
  deps.saveState(state);
  return args.includes("--no-announce") ? [] : announceAll(toAnnounce, due, state, deps);
}

/** The saved state, or a fresh one on the first run. */
export function loadState(file, today) {
  return loadJsonState(file, () => initialState(today));
}

/** Announcers built lazily, so a run with nothing to announce needs no credentials. */
async function realAnnouncers() {
  const bluesky = await import("./extract-to-bluesky.js");
  const linkedin = await import("./extract-to-linkedin.js");
  const { fitsBlueskyLimit } = await import("./lib/text-limits.js");
  return {
    async bluesky(post) {
      if (!fitsBlueskyLimit(post.text)) throw new Error("title is over Bluesky's 300-grapheme limit");
      const session = await bluesky.getBlueskySession(bluesky.getConfig());
      await bluesky.postToBluesky(post, session);
    },
    async linkedin(post) {
      await linkedin.postToLinkedIn(post, linkedin.getConfig().accessToken);
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const errors = await run({
    args,
    hook: process.env.NETLIFY_BUILD_HOOK,
    posts: readPosts(POSTS_DIR),
    state: loadState(STATE_FILE, siteToday()),
    saveState: (state) => saveJsonState(STATE_FILE, state),
    fetchFn: fetch,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    announcers: await realAnnouncers(),
    log: (msg) => console.log(msg),
  });
  errors.forEach((e) => console.error(e));
  process.exitCode = errors.length && 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
