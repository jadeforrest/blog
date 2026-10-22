// Commit-time cost gate (run by .githooks/commit-msg via scripts/cost-gate.js).
// A change that can add per-request work, weaken caching, invite more crawler
// traffic or ship large files must say what that costs in a `Cost:` line of the
// commit message: what runs on how many requests, roughly what it costs, and
// whether it is being fixed or accepted. `Cost: none` with a reason is fine;
// the point is that someone decided. Born from the Oct 2026 edge function that
// ran on every page view for 19 days unnoticed.

export const LARGE_FILE_BYTES = 1024 * 1024;
export const LARGE_COMMIT_BYTES = 5 * 1024 * 1024;

const PATH_RULES = [
  [/^netlify\/edge-functions\//, "edge function code: billed per invocation"],
  [/^netlify\/functions\//, "serverless function code: billed per invocation"],
  [/^scripts\/lib\/(agent-edge|agent-paths|accept)\.js$/, "logic the edge function runs per request"],
  [/^src\/middleware(\.[a-z]+$|\/)/, "middleware: runs per request"],
  [/^netlify\.toml$/, "netlify.toml: routing, headers or function declarations"],
  [/^public\/_headers$/, "_headers: response headers can change caching"],
  [/^public\/robots\.txt$/, "robots.txt: crawler access changes how much bots fetch"],
  [/^astro\.config\.(mjs|js|ts)$/, "astro.config: output mode can move work to request time"],
  [/^scripts\/build-agent-files\.js$/, "build-agent-files: files published for every page"],
  [/^(\.githooks\/|scripts\/(lib\/)?cost-gate\.js$)/, "the cost gate itself changed"],
];

// Line rules apply only to the file types where the pattern means something,
// so prose ("vary your approach") and data files stay quiet. Only added lines
// count, except for caching headers, where removing one changes cost too.
const CODE = /\.(m?js|cjs|jsx?|tsx?|astro|toml)$|^public\/_headers$/;
const STYLE = /\.(css|astro|m?js|tsx?|jsx)$/;
const PAGES = /\.(astro|html|tsx?|jsx)$|^src\/.*\.mdx?$/;
const ISLANDS = /\.(astro|mdx)$/;
const THIRD_PARTY = String.raw`\s*=\s*["']?(https?:)?\/\/`;

const CACHING = [/\b(vary|cache-control)\b["']?\s*[:=,]/i, CODE, "caching headers (Vary / Cache-Control)"];
const LINE_RULES = [
  [/\bprerender\s*=\s*false\b/, CODE, "a page rendered per request instead of at build"],
  [/\bclient:(load|idle|visible|media|only)\b/, ISLANDS, "a hydrated island: ships JS to visitors"],
  [new RegExp(String.raw`<script\b[^>]*\bsrc` + THIRD_PARTY, "i"), PAGES, "a third-party script"],
  [/<iframe\b/i, PAGES, "an embedded iframe"],
  [
    new RegExp(String.raw`<link\b[^>]*\bhref` + THIRD_PARTY + String.raw`|@import\s+url\(\s*["']?(https?:)?\/\/`, "i"),
    STYLE,
    "a third-party stylesheet or font",
  ],
  [/^\s*\S+\s+\S+\s+200!?(\s|$)/, /^public\/_redirects$/, "a 200 rewrite/proxy in _redirects"],
];

// Never line-scanned: tests, and the gate (its rules would match themselves).
const UNSCANNED = [/\.test\.js$/, /^scripts\/(lib\/)?cost-gate\.js$/];

const SERVED = /^(public|src)\//;

// `git diff --cached -U0 --no-renames` output -> { path: { added: [], removed: [] } }.
// Paths come from the ---/+++ header lines (the `diff --git` line is ambiguous
// when a path contains " b/"), and only before a file's first hunk, so a
// removed line that reads "-- a/x" is not mistaken for a header. Files with
// no hunks (binary, mode-only) are absent; callers add them by name.
export function parseDiff(text) {
  const files = {};
  let current = null;
  let inHeader = false;
  for (const line of String(text).split("\n")) {
    if (line.startsWith("diff --git ")) {
      current = null;
      inHeader = true;
      continue;
    }
    if (inHeader) {
      const name = line.match(/^(?:--- a|\+\+\+ b)\/(.*)$/);
      if (name) current = files[name[1]] ??= { added: [], removed: [] };
      if (line.startsWith("@@")) inHeader = false;
      continue;
    }
    if (!current) {
      continue;
    } else if (line.startsWith("+")) {
      current.added.push(line.slice(1));
    } else if (line.startsWith("-")) {
      current.removed.push(line.slice(1));
    }
  }
  return files;
}

const reasons = (rules, matches) => rules.filter((r) => matches(...r)).map((r) => r.at(-1));
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

// changes: [{ path, added, removed, bytes }] -> unique "path: reason" strings.
export function costTriggers(changes) {
  const found = new Set();
  let served = 0;
  for (const { path, added = [], removed = [], bytes = 0 } of changes) {
    const why = reasons(PATH_RULES, (re) => re.test(path));
    if (!UNSCANNED.some((re) => re.test(path))) {
      const scan = (lines) => (re, scope) => scope.test(path) && lines.some((l) => re.test(l));
      why.push(...reasons([CACHING], scan([...added, ...removed])));
      why.push(...reasons(LINE_RULES, scan(added)));
    }
    if (SERVED.test(path)) {
      served += bytes;
      if (bytes > LARGE_FILE_BYTES) why.push(`large file (${mb(bytes)}) served to visitors`);
    }
    for (const w of why) found.add(`${path}: ${w}`);
  }
  if (served > LARGE_COMMIT_BYTES) found.add(`this commit: ${mb(served)} of files served to visitors`);
  return [...found];
}

// Runtime dependencies (not devDependencies) added, removed or re-versioned
// between two package.json texts. Missing or unparseable input -> none.
export function dependencyTriggers(beforeText, afterText) {
  const deps = (text) => {
    try {
      return JSON.parse(text).dependencies ?? {};
    } catch {
      return {};
    }
  };
  const before = deps(beforeText);
  const after = deps(afterText);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((name) => before[name] !== after[name])
    .sort()
    .map((name) => `package.json: runtime dependency ${name} ${before[name] ?? "(new)"} -> ${after[name] ?? "(removed)"}`);
}

const SCISSORS = /^# -+ >8 -+$/m;

// A line starting `Cost:` followed by at least three words, so a bare
// "Cost: none" or "Cost: x" doesn't pass: say why. Text below git's scissors
// line (the diff that `git commit -v` appends) is ignored.
export function hasCostLine(message) {
  const text = String(message).split(SCISSORS)[0];
  return /^[ \t]*cost:[ \t]*\S+[ \t,;:]+\S+[ \t,;:]+\S/im.test(text);
}

export function checkCommit(message, changes, extraTriggers = []) {
  const triggers = [...costTriggers(changes), ...extraTriggers];
  return { ok: triggers.length === 0 || hasCostLine(message), triggers };
}

export function explain(triggers) {
  return [
    "Commit blocked: this change may add cost (bandwidth, invocations, load time).",
    "",
    ...triggers.map((t) => `  - ${t}`),
    "",
    "Add a line to the commit message saying what it costs and whether you accept it, e.g.",
    "  Cost: runs on every page view (~N/day); accepted because ... / fixed by ...",
    "  Cost: none; only a comment in netlify.toml changed",
    "(at least three words: say why, not just 'none')",
    "Bypass in an emergency with git commit --no-verify.",
  ].join("\n");
}
