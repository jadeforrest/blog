#!/usr/bin/env node
// Lighthouse budgets against production (see scripts/lib/perf-budget.js).
// Prints one line per alert that is due, like scripts/usage-watch.js, and a
// table of medians on stderr. Exits non-zero only if Lighthouse can't run.
//   npm run perf                  check against budgets.json
//   npm run perf:update           record today's medians (+ headroom) as budgets
//   node scripts/perf-check.js --base http://localhost:4321   check a preview
// Needs Google Chrome; Lighthouse itself comes via npx (not a site dependency).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dueAlerts } from "./lib/usage-watch.js";
import {
  PERF_PAGES,
  RUNS,
  assessPerf,
  confirmAlerts,
  inDarkWake,
  makePerfBudgets,
  medianRun,
  staleAlerts,
  summarize,
} from "./lib/perf-budget.js";

const args = process.argv.slice(2);
const update = args.includes("--update");
const PRODUCTION = "https://www.rubick.com";
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : PRODUCTION;
const budgetsFile = new URL("../budgets.json", import.meta.url);
const stateFile =
  process.env.PERF_CHECK_STATE ||
  path.join(os.homedir(), "Library/Application Support/rubick-usage-watch/perf-state.json");

function lighthouse(url) {
  const out = path.join(os.tmpdir(), `perf-check-${process.pid}.json`);
  execFileSync(
    "npx",
    ["--yes", "lighthouse@13.5.0", url, "--quiet", "--only-categories=performance",
      "--output=json", `--output-path=${out}`, "--chrome-flags=--headless=new"],
    { stdio: ["ignore", "ignore", "pipe"], timeout: 120000 },
  );
  try {
    return summarize(JSON.parse(fs.readFileSync(out, "utf8")));
  } finally {
    fs.rmSync(out, { force: true });
  }
}

// A failed run (Chrome crash, timeout, no network yet) is dropped; a page
// with no successful run becomes an "unavailable" alert.
function tryLighthouse(url) {
  try {
    return lighthouse(url);
  } catch (err) {
    console.error(`${url}: Lighthouse run failed: ${String(err.message).split("\n")[0]}`);
    return null;
  }
}

function systemstate() {
  try {
    return execFileSync("pmset", ["-g", "systemstate"], { encoding: "utf8" });
  } catch {
    return "";
  }
}

let state = { sent: {}, breached: [] };
try {
  state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, "utf8")) };
} catch {
  // first run, or unreadable: start fresh
}
const now = new Date().toISOString();
const saveState = (s) => {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(s, null, 2) + "\n");
};

// The daily job fires in Power Nap dark wakes when the lid is shut; skip
// rather than time out, and alert only if that goes on for days.
if (base === PRODUCTION && !update && inDarkWake(systemstate())) {
  const lastRun = state.lastRun ?? now;
  console.error(`Lighthouse skipped: Mac in dark wake (last run ${lastRun})`);
  const result = dueAlerts(staleAlerts(lastRun, now), state.sent, now);
  saveState({ ...state, sent: { ...state.sent, ...result.sent }, lastRun });
  for (const a of result.due) console.log(a.text);
  process.exit(0);
}

const medians = {};
const unavailable = [];
for (const page of PERF_PAGES) {
  const runs = Array.from({ length: RUNS }, () => tryLighthouse(new URL(page, base).href)).filter(Boolean);
  if (runs.length === 0) {
    unavailable.push({ key: `perf:${page}:unavailable`, text: `${page} Lighthouse could not run; see the log` });
    continue;
  }
  medians[page] = medianRun(runs);
  const m = medians[page];
  console.error(
    `${page}: score ${m.score}, LCP ${Math.round(m.lcpMs)} ms, TBT ${Math.round(m.tbtMs)} ms, ` +
      `CLS ${m.cls.toFixed(3)}, ${(m.bytes / 1024).toFixed(0)} KB`,
  );
}

const budgets = JSON.parse(fs.readFileSync(budgetsFile, "utf8"));
if (update) {
  if (unavailable.length) throw new Error("Lighthouse failed; budgets not updated");
  budgets.lighthouse = makePerfBudgets(medians);
  fs.writeFileSync(budgetsFile, JSON.stringify(budgets, null, 2) + "\n");
  console.error("budgets.json lighthouse section updated; commit it with a Cost: line saying why.");
  process.exit(0);
}

const alerts = [...assessPerf(medians, budgets.lighthouse ?? {}), ...unavailable];
// On-demand runs against a preview print everything; the daily run against
// production repeats a standing alert only every few days.
if (base !== PRODUCTION) {
  for (const a of alerts) console.log(a.text);
  process.exit(0);
}
const { confirmed, breached } = confirmAlerts(alerts, state.breached);
const result = dueAlerts(confirmed, state.sent, now);
const lastRun = Object.keys(medians).length ? now : state.lastRun;
saveState({ sent: result.sent, breached, lastRun });
for (const a of result.due) console.log(a.text);
