import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fc from "fast-check";
import {
  LARGE_COMMIT_BYTES,
  LARGE_FILE_BYTES,
  checkCommit,
  costTriggers,
  dependencyTriggers,
  hasCostLine,
  parseDiff,
} from "./cost-gate.js";

test("the Oct 2026 edge function commit would have been stopped", () => {
  const { ok, triggers } = checkCommit("Make rubick.com agent-ready", [
    { path: "netlify/edge-functions/agent-negotiation.js", added: ['  path: "/*",'] },
    { path: "public/robots.txt", added: ["Content-Signal: ai-train=yes"] },
    { path: "scripts/lib/agent-edge.js", added: ['    vary: "Accept, Accept-Encoding",'] },
  ]);
  assert.equal(ok, false);
  // edge function path, robots.txt, and agent-edge.js by both path and Vary line
  assert.equal(triggers.length, 4);
});

test("ordinary content and code changes pass without a Cost line", () => {
  const { ok, triggers } = checkCommit("New post", [
    { path: "src/content/posts/2026-10-22--x/index.mdx", added: ["Vary your approach."] },
    { path: "src/components/Nav.astro", added: ["<nav>"] },
    { path: "public/_redirects", added: ["/old /new 301"] },
  ]);
  assert.deepEqual(triggers, []);
  assert.equal(ok, true);
});

test("line rules: caching headers, per-request rendering, islands, third parties", () => {
  const t = (line, path = "src/x.astro") => costTriggers([{ path, added: [line] }]).length;
  assert.equal(t('headers.set("Cache-Control", "no-store")'), 1);
  assert.equal(t('vary: "Accept, Accept-Encoding",', "scripts/lib/x.js"), 1);
  assert.equal(t('Cache-Control = "public"', "netlify.toml"), 2); // + the netlify.toml path rule
  assert.equal(t("export const prerender = false;"), 1);
  assert.equal(t("<Chart client:load />"), 1);
  assert.equal(t("<Chart client:only=\"react\" />", "src/content/posts/a/index.mdx"), 1);
  assert.equal(t('<script async src="https://example.com/a.js"></script>'), 1);
  assert.equal(t('<script src="//cdn.example.com/a.js"></script>'), 1);
  assert.equal(t('<link rel="stylesheet" href="https://fonts.googleapis.com/css2">'), 1);
  assert.equal(t('@import url("https://fonts.googleapis.com/x");', "src/styles/a.css"), 1);
  assert.equal(t('<iframe src="https://www.youtube.com/embed/x">'), 1);
  assert.equal(t('<script src="/local.js"></script>'), 0);
  assert.equal(t('<link rel="stylesheet" href="/local.css">'), 0);
  assert.equal(t("const variable = 1;"), 0);
});

test("line rules stay quiet on prose and data files", () => {
  const t = (line, path) => costTriggers([{ path, added: [line] }]).length;
  assert.equal(t("Results vary: some teams ...", "src/content/posts/a/index.mdx"), 0);
  assert.equal(t("// caches vary by Accept", "src/a.css"), 0);
  assert.equal(t('"cache-control": "x"', "src/data/a.json"), 0);
  assert.equal(t("// we vary the copy by season", "src/x.astro"), 0); // no header shape
  assert.equal(t("third-party `<script src>`, `<iframe>` (posts", "CLAUDE.md"), 0); // docs, not pages
});

test("embeds in posts are caught", () => {
  const post = "src/content/posts/2026-10-22--x/index.mdx";
  assert.equal(costTriggers([{ path: post, added: ['<iframe src="https://youtu.be/x">'] }]).length, 1);
  assert.equal(costTriggers([{ path: post, added: ['<script src="https://x.com/w.js">'] }]).length, 1);
});

test("edge function logic, middleware, 200 rewrites and the gate itself are path-gated", () => {
  for (const p of [
    "scripts/lib/agent-edge.js",
    "scripts/lib/accept.js",
    "src/middleware.ts",
    "src/middleware/index.js",
    "scripts/lib/cost-gate.js",
    ".githooks/commit-msg",
  ]) {
    assert.equal(costTriggers([{ path: p }]).length, 1, p);
  }
  assert.equal(costTriggers([{ path: "scripts/lib/agent-edge.test.js" }]).length, 0);
  const r = (line) => costTriggers([{ path: "public/_redirects", added: [line] }]).length;
  assert.equal(r("/api/*  https://api.example.com/:splat  200"), 1);
  assert.equal(r("/app/*  /index.html  200!"), 1);
  assert.equal(r("/old  /new  301"), 0);
  assert.equal(r("/a /b 2001"), 0);
});

test("removing caching headers counts too", () => {
  assert.equal(costTriggers([{ path: "src/x.js", removed: ['"cache-control": "public"'] }]).length, 1);
});

test("removing a third-party script or island is not a cost; removing caching headers is", () => {
  const t = (removed) => costTriggers([{ path: "src/x.astro", removed: [removed] }]).length;
  assert.equal(t('<script src="https://x.com/a.js"></script>'), 0);
  assert.equal(t("<Chart client:load />"), 0);
  assert.equal(t('headers.set("Vary", "Accept")'), 1);
});

test("build-time agent code is not edge logic", () => {
  assert.equal(costTriggers([{ path: "scripts/lib/agent-markdown.js" }]).length, 0);
});

test("tests are not line-scanned", () => {
  assert.deepEqual(costTriggers([{ path: "scripts/lib/a.test.js", added: ["vary: Accept"] }]), []);
});

test("large served files and large commits trigger; unserved ones do not", () => {
  const big = LARGE_FILE_BYTES + 1;
  assert.equal(costTriggers([{ path: "public/a/big.webp", bytes: big }]).length, 1);
  assert.equal(costTriggers([{ path: "public/a/ok.webp", bytes: LARGE_FILE_BYTES }]).length, 0);
  assert.equal(costTriggers([{ path: "scripts/kit-backups/x.json", bytes: big }]).length, 0);
  const many = Array.from({ length: 6 }, (_, i) => ({ path: `public/s/${i}.webp`, bytes: 900000 }));
  assert.deepEqual(costTriggers(many), ["this commit: 5.1 MB of files served to visitors"]);
  assert.equal(costTriggers(many.slice(0, 5)).length, 0);
  assert.ok(LARGE_COMMIT_BYTES > 5 * 900000 - 1);
});

test("runtime dependency changes trigger; dev dependency changes do not", () => {
  const pkg = (deps, dev = {}) => JSON.stringify({ dependencies: deps, devDependencies: dev });
  assert.deepEqual(dependencyTriggers(pkg({ a: "1" }), pkg({ a: "1" }, { vitest: "2" })), []);
  assert.deepEqual(dependencyTriggers(pkg({ a: "1" }), pkg({ a: "2", b: "1" })), [
    "package.json: runtime dependency a 1 -> 2",
    "package.json: runtime dependency b (new) -> 1",
  ]);
  assert.deepEqual(dependencyTriggers(pkg({ a: "1" }), pkg({})), [
    "package.json: runtime dependency a 1 -> (removed)",
  ]);
  assert.deepEqual(dependencyTriggers("", pkg({ a: "1" })), [
    "package.json: runtime dependency a (new) -> 1",
  ]);
  assert.deepEqual(dependencyTriggers("not json", "{}"), []);
  const blocked = checkCommit("Bump", [], dependencyTriggers(pkg({}), pkg({ react: "19" })));
  assert.equal(blocked.ok, false);
});

test("Cost line: any case, needs a reason, git comments and -v diff ignored", () => {
  assert.ok(hasCostLine("Subject\n\nCost: none; comment-only change"));
  assert.ok(hasCostLine("Subject\n\ncost: accepted, tiny traffic"));
  assert.ok(!hasCostLine("Subject\n\nCost: none"));
  assert.ok(!hasCostLine("Subject\n\nCost: accepted"));
  assert.ok(!hasCostLine("Subject\n\nCost: x y"));
  assert.ok(!hasCostLine("Subject\n\nCost:   \n"));
  const verbose = "Subject\n# ------------------------ >8 ------------------------\n Cost: in a diff context line";
  assert.ok(!hasCostLine(verbose));
  assert.ok(!hasCostLine("Subject\n# Cost: in a git comment"));
  assert.ok(!hasCostLine("Subject mentions Cost: inline")); // must start a line
});

test("parseDiff reads paths from headers and ignores look-alike content", () => {
  const diff = [
    "+stray line before any file header",
    "diff --git a/odd b/name.js b/odd b/name.js",
    "--- a/odd b/name.js",
    "+++ b/odd b/name.js",
    "@@ -1 +1 @@",
    "-- a/not-a-header",
    "+++ b/not-a-header",
    "diff --git a/new.js b/new.js",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/new.js",
    "@@ -0,0 +1 @@",
    "+added",
    "diff --git a/gone.js b/gone.js",
    "--- a/gone.js",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-removed",
  ].join("\n");
  assert.deepEqual(parseDiff(diff), {
    "odd b/name.js": { added: ["++ b/not-a-header"], removed: ["- a/not-a-header"] },
    "new.js": { added: ["added"], removed: [] },
    "gone.js": { added: [], removed: ["removed"] },
  });
});

const change = fc.record({
  path: fc.constantFrom(
    "netlify/edge-functions/a.js",
    "netlify.toml",
    "public/robots.txt",
    "src/pages/a.astro",
    "public/img.webp",
    "README.md",
  ),
  added: fc.array(fc.constantFrom("vary: Accept", "plain", "prerender = false"), { maxLength: 3 }),
  removed: fc.array(fc.constantFrom("Cache-Control", "plain"), { maxLength: 2 }),
  bytes: fc.integer({ min: 0, max: 3 * LARGE_FILE_BYTES }),
});
const message = fc.string().map((s) => s.replace(/cost:/gi, "x"));

test("property: a Cost line passes everything; without one, ok iff no triggers", () => {
  fc.assert(
    fc.property(fc.array(change, { maxLength: 6 }), message, (changes, msg) => {
      const triggers = costTriggers(changes);
      assert.equal(checkCommit(msg, changes).ok, triggers.length === 0);
      assert.equal(checkCommit(`${msg}\nCost: accepted for a reason`, changes).ok, true);
      // Order of changes never matters.
      assert.deepEqual(costTriggers([...changes].reverse()).sort(), [...triggers].sort());
    }),
  );
});

// End to end: the real hook in a throwaway repo.
const hooks = fileURLToDir("../../.githooks");
function fileURLToDir(rel) {
  return path.resolve(new URL(rel, import.meta.url).pathname);
}

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cost-gate-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  git("config", "core.hooksPath", hooks);
  const commit = (msg) =>
    spawnSync("git", ["commit", "-q", "-m", msg], { cwd: dir, encoding: "utf8" });
  const write = (p, s) => {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), s);
    git("add", "-A");
  };
  return { dir, git, commit, write };
}

test("hook: blocks an edge function commit without Cost, allows it with one", () => {
  const r = tempRepo();
  r.write("README", "x");
  assert.equal(r.commit("init").status, 0);
  r.write("netlify/edge-functions/a.js", "export default () => {};\n");
  const blocked = r.commit("Add edge function");
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /netlify\/edge-functions\/a\.js: edge function/);
  assert.equal(r.commit("Add edge function\n\nCost: runs on /api only; accepted").status, 0);
  fs.rmSync(r.dir, { recursive: true, force: true });
});

test("hook: deleting a cost-sensitive file and renaming one are both seen", () => {
  const r = tempRepo();
  r.write("public/robots.txt", "User-agent: *\n");
  assert.equal(r.commit("init\n\nCost: none; test fixture").status, 0);
  r.git("mv", "public/robots.txt", "public/robots.bak");
  assert.equal(r.commit("Move robots").status, 1);
  fs.rmSync(r.dir, { recursive: true, force: true });
});

test("hook: a new runtime dependency is blocked without Cost", () => {
  const r = tempRepo();
  r.write("package.json", JSON.stringify({ dependencies: {} }));
  assert.equal(r.commit("init\n\nCost: none; test fixture").status, 0);
  r.write("package.json", JSON.stringify({ dependencies: { react: "19.0.0" } }));
  const blocked = r.commit("Add react");
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /runtime dependency react \(new\) -> 19\.0\.0/);
  fs.rmSync(r.dir, { recursive: true, force: true });
});

// The gate only works if git actually runs it in this checkout.
test("this checkout has the cost gate installed", (t) => {
  const repo = fileURLToDir("../..");
  const res = spawnSync("git", ["config", "core.hooksPath"], { cwd: repo, encoding: "utf8" });
  if (spawnSync("git", ["rev-parse"], { cwd: repo }).status !== 0) return t.skip("not a git checkout");
  assert.equal(res.stdout.trim(), ".githooks", "run `npm install` (or `npm run prepare`)");
});
