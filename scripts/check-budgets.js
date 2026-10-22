#!/usr/bin/env node
// Size budgets for the built site (see scripts/lib/budgets.js). Runs at the
// end of `npm run build`; exits 1 when over budget, failing the deploy, unless
// BUDGETS_WARN_ONLY=1. `--update` rewrites budgets.json from this build.
//   node scripts/check-budgets.js [dist] [--update]
import fs from "node:fs";
import path from "node:path";
import { KEY_PAGES, compare, explainFailure, fmt, makeBudgets, measurePage, measureSite } from "./lib/budgets.js";

const args = process.argv.slice(2);
const update = args.includes("--update");
const dist = path.resolve(args.find((a) => !a.startsWith("--")) ?? "dist");
const budgetsFile = new URL("../budgets.json", import.meta.url);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [{ path: path.relative(dist, full), bytes: fs.statSync(full).size }];
  });
}
const sizeOf = (url) => {
  try {
    return fs.statSync(path.join(dist, decodeURIComponent(url))).size;
  } catch {
    return null;
  }
};

const measured = { site: measureSite(walk(dist)), pages: {} };
for (const page of KEY_PAGES) {
  const file = path.join(dist, page, "index.html");
  if (fs.existsSync(file)) measured.pages[page] = measurePage(fs.readFileSync(file, "utf8"), sizeOf);
}

if (update) {
  // Keep the Lighthouse section, which scripts/perf-check.js owns.
  const previous = fs.existsSync(budgetsFile) ? JSON.parse(fs.readFileSync(budgetsFile, "utf8")) : {};
  const next = { ...previous, ...makeBudgets(measured) };
  fs.writeFileSync(budgetsFile, JSON.stringify(next, null, 2) + "\n");
  console.log("budgets.json updated from this build; commit it with a Cost: line saying why.");
  process.exit(0);
}

const budgets = JSON.parse(fs.readFileSync(budgetsFile, "utf8"));
const violations = compare(measured, budgets);
const warnOnly = process.env.BUDGETS_WARN_ONLY === "1";
if (warnOnly) console.warn("*** BUDGETS_WARN_ONLY=1: size budgets are not enforced. Remove it. ***");
// Measured vs budget on every build, so Netlify's log shows the margins.
for (const [where, m] of [["site", measured.site], ...Object.entries(measured.pages)]) {
  const limits = where === "site" ? budgets.site : budgets.pages?.[where];
  const cells = Object.entries(m).map(([k, v]) => `${k} ${fmt(k, k === "filesPerPage" ? Number(v.toFixed(2)) : v)}/${fmt(k, limits?.[k] ?? "-")}`);
  console.log(`  ${where}: ${cells.join(", ")}`);
}
if (violations.length === 0) {
  console.log("Size budgets: OK");
} else if (warnOnly) {
  console.warn(`${explainFailure(violations)}\n\nBUDGETS_WARN_ONLY=1 is set: deploying anyway.`);
} else {
  console.error(explainFailure(violations));
  process.exit(1);
}
