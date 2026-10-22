#!/usr/bin/env node
// Daily cost check for rubick.com: records Netlify account bandwidth, checks
// production headers, and prints one line per alert that is due (the caller,
// scripts/usage-watch.sh, turns each into a notification). Exits non-zero only
// when the check itself could not run. See scripts/lib/usage-watch.js.
//
// Env: NETLIFY_AUTH_TOKEN (required), NETLIFY_ACCOUNT (default jadeforrest),
// NETLIFY_SITE_ID (default: www.rubick.com's),
// USAGE_WATCH_STATE (default ~/Library/Application Support/rubick-usage-watch/state.json),
// USAGE_WATCH_SITE (default https://www.rubick.com).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendSnapshot,
  assessBandwidth,
  assessHeaders,
  dueAlerts,
  overrideAlerts,
  snapshotFrom,
} from "./lib/usage-watch.js";

const token = process.env.NETLIFY_AUTH_TOKEN;
if (!token) throw new Error("NETLIFY_AUTH_TOKEN is not set");
const account = process.env.NETLIFY_ACCOUNT || "jadeforrest";
const site = process.env.USAGE_WATCH_SITE || "https://www.rubick.com";
const siteId = process.env.NETLIFY_SITE_ID || "d0df175b-1808-4f90-b865-e5a3ec9e626b";
const stateFile =
  process.env.USAGE_WATCH_STATE ||
  path.join(os.homedir(), "Library/Application Support/rubick-usage-watch/state.json");

const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const PAGES = ["/", "/about/", "/posts/", "/tags/", "/wiki/", "/newsletter/"];

// The 08:30 run often fires as the Mac wakes, before the network is up, so
// each request gets a few attempts.
async function get(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
}

async function bandwidth() {
  const res = await get(`https://api.netlify.com/api/v1/accounts/${account}/bandwidth`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Netlify bandwidth API: HTTP ${res.status}`);
  return snapshotFrom(await res.json());
}

// Names of the site's Netlify environment variables; [] if unreadable (the
// override check is a convenience, not worth failing the run over).
async function envKeys() {
  try {
    const res = await get(`https://api.netlify.com/api/v1/accounts/${account}/env?site_id=${siteId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return res.ok ? (await res.json()).map((e) => e.key) : [];
  } catch {
    return [];
  }
}

// The newest post's URL, so a post page is probed too; null if not found.
async function latestPost() {
  const res = await get(`${site}/rss.xml`);
  if (!res.ok) return null;
  const link = (await res.text()).match(/<item>[\s\S]*?<link>([^<]+)<\/link>/)?.[1];
  return link ? new URL(link.trim(), site).href : null;
}

async function probe(name, url, markdown) {
  try {
    const res = await get(url, {
      headers: { accept: markdown ? "text/markdown" : BROWSER_ACCEPT, "user-agent": "rubick-usage-watch" },
      redirect: "manual",
    });
    await res.body?.cancel();
    return { name, markdown, status: res.status, headers: Object.fromEntries(res.headers) };
  } catch (err) {
    return { name, error: err.cause?.code || err.name || String(err) };
  }
}

// Load state; a corrupt file is moved aside (and reported) instead of
// failing every run from now on.
function loadState() {
  const empty = { history: [], sent: {} };
  let text;
  try {
    text = fs.readFileSync(stateFile, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return { state: empty, alerts: [] };
    throw err;
  }
  try {
    return { state: { ...empty, ...JSON.parse(text) }, alerts: [] };
  } catch {
    const aside = `${stateFile}.corrupt-${Date.now()}`;
    fs.renameSync(stateFile, aside);
    return {
      state: empty,
      alerts: [{ key: "state:reset", text: `usage-watch state was corrupt; moved to ${aside}` }],
    };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  const tmp = `${stateFile}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  fs.renameSync(tmp, stateFile);
}

const now = new Date().toISOString();
const loaded = loadState();
const state = loaded.state;

// Record bandwidth before anything else can fail.
state.history = appendSnapshot(state.history, await bandwidth());
saveState(state);

const post = await latestPost().catch(() => null);
const results = await Promise.all([
  ...PAGES.map((p) => probe(p, new URL(p, site).href, false)),
  ...(post ? [probe("latest post", post, false)] : []),
  probe("/about/ (markdown)", new URL("/about/", site).href, true),
]);
const missingPost = post
  ? []
  : [{ key: "headers:latest-post:missing", text: "No post link found in rss.xml; post pages unchecked" }];

const alerts = [
  ...loaded.alerts,
  ...assessBandwidth(state.history, now),
  ...assessHeaders(results),
  ...missingPost,
  ...overrideAlerts(await envKeys()),
];
const { due, sent } = dueAlerts(alerts, state.sent, now);
saveState({ ...state, sent });

const latest = state.history.at(-1);
console.error(
  `bandwidth ${(latest.used / 1e9).toFixed(1)}/${(latest.included / 1e9).toFixed(0)} GB ` +
    `(updated ${latest.updatedAt}); ${alerts.length} alert(s), ${due.length} due`,
);
for (const a of due) console.log(a.text);
