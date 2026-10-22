#!/usr/bin/env node
// Entry point for .githooks/commit-msg: `node scripts/cost-gate.js <msg-file>`.
// Reads the staged diff and exits 1 (blocking the commit) when it touches
// something cost-sensitive and the message has no `Cost:` line. See
// scripts/lib/cost-gate.js for the rules.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { checkCommit, dependencyTriggers, explain, parseDiff } from "./lib/cost-gate.js";

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
// For lookups that may legitimately fail (no HEAD yet, gitlinks, unmerged
// entries): a missing answer must never block a commit with a stack trace.
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return "";
  }
};

// Merges carry commits that were gated when they were made.
if (fs.existsSync(git("rev-parse", "--git-path", "MERGE_HEAD").trim())) process.exit(0);

const message = fs.readFileSync(process.argv[2], "utf8");
const diffArgs = ["diff", "--cached", "--no-renames", "--no-ext-diff", "--no-color"];
const lines = parseDiff(git("-c", "core.quotePath=false", ...diffArgs, "-U0", "-a"));
const names = (filter) => git(...diffArgs, "-z", "--name-only", `--diff-filter=${filter}`)
  .split("\0")
  .filter(Boolean);
const deleted = new Set(names("D"));
const changes = names("ACDMRTUX").map((path) => ({
  path,
  ...(lines[path] ?? {}),
  bytes: deleted.has(path) ? 0 : Number(tryGit("cat-file", "-s", `:${path}`).trim()) || 0,
}));
const deps = dependencyTriggers(tryGit("show", "HEAD:package.json"), tryGit("show", ":package.json"));

const { ok, triggers } = checkCommit(message, changes, deps);
if (!ok) {
  console.error(explain(triggers));
  process.exit(1);
}
