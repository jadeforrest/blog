import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import fc from "fast-check";
import {
  editUrls,
  pendingTableImages,
  readSyncPosts,
  runSync,
  syncHash,
  syncPlan,
  syncPost,
  syncStatus,
  tableImageWarning,
  unshippedReminder,
  withHash,
} from "./kit-sync-run.js";

const raw = (fm, body = "Body") =>
  `---\n${Object.entries(fm).map(([k, v]) => `${k}: "${v}"`).join("\n")}\n---\n${body}\n`;

/** A post as readSyncPosts returns it. `synced` stores the current hash. */
function post(slug, { urls = "https://kit/1", synced = false, body = "Body", date = "2026-11-01" } = {}) {
  let text = raw({ title: slug, kitEditUrls: urls, kitSyncHash: "" }, body);
  if (synced) text = withHash(text, syncHash(text));
  const hash = synced ? syncHash(text) : "";
  return {
    file: `/posts/${date}--${slug}/index.mdx`,
    raw: text,
    data: { title: slug, kitEditUrls: urls, kitSyncHash: hash },
    slug,
    dirName: `${date}--${slug}`,
  };
}

/** Fake deps: `answers` are the prompt replies in order; `copyFails` throws on copy. */
function fakeDeps({ answers = [], copyFails = false, htmlFails = false, images = { count: 0, paths: [] } } = {}) {
  const calls = { logs: [], warns: [], opened: [], copied: [], hashes: [] };
  const queue = [...answers];
  const deps = {
    log: (m) => calls.logs.push(m),
    warn: (m) => calls.warns.push(m),
    toHtml: async (p) => {
      if (htmlFails) throw new Error("bad mdx");
      return `<p>${p.slug}</p>`;
    },
    pendingTableImages: () => images,
    copyHtml: (html) => {
      if (copyFails) throw new Error("no swift");
      calls.copied.push(html);
    },
    openUrl: (u) => calls.opened.push(u),
    prompt: async () => queue.shift() ?? "y",
    writeHash: (p, h) => calls.hashes.push([p.slug, h]),
  };
  return { calls, deps };
}

// --- hashing and frontmatter ---

test("syncHash ignores the kitSyncHash line, so writing it keeps the post in sync", () => {
  const p = post("a", { synced: true });
  assert.equal(syncStatus(p), null);
  assert.equal(syncHash(p.raw), syncHash(withHash(p.raw, "something-else")));
});

test("property: withHash then syncHash is stable for any hash value", () => {
  fc.assert(
    fc.property(fc.stringMatching(/^[0-9a-f]{0,32}$/), fc.string({ maxLength: 50 }), (hash, body) => {
      const text = raw({ title: "t", kitSyncHash: "" }, body.replace(/^kitSyncHash:/gm, ""));
      return syncHash(withHash(text, hash)) === syncHash(text);
    }),
  );
});

test("withHash returns null when the file has no kitSyncHash line", () => {
  assert.equal(withHash("---\ntitle: x\n---\n", "h"), null);
  assert.match(withHash('---\nkitSyncHash: ""\n---\n', "abc"), /^kitSyncHash: "abc"$/m);
});

test("withHash: writing the hash a file already has (a --force re-sync) is not a failure", () => {
  const text = '---\nkitSyncHash: "abc"\n---\n';
  assert.equal(withHash(text, "abc"), text);
});

test("syncStatus distinguishes never synced, changed and in sync", () => {
  assert.equal(syncStatus(post("a")), "never synced");
  const p = post("a", { synced: true });
  assert.equal(syncStatus({ ...p, raw: `${p.raw}more` }), "content changed");
});

test("editUrls splits and trims, and treats blank or missing as unmapped", () => {
  assert.deepEqual(editUrls(post("a", { urls: " https://k/1 , ,https://k/2" })), ["https://k/1", "https://k/2"]);
  assert.deepEqual(editUrls(post("a", { urls: "  " })), []);
  assert.deepEqual(editUrls({ data: {} }), []);
});

test("readSyncPosts reads index.mdx posts, sorted, with slugs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kit-sync-"));
  for (const d of ["2026-02-01--b", "2026-01-01--a", "no-mdx"]) fs.mkdirSync(path.join(dir, d));
  fs.writeFileSync(path.join(dir, "2026-02-01--b", "index.mdx"), raw({ title: "B", kitEditUrls: "u" }));
  fs.writeFileSync(path.join(dir, "2026-01-01--a", "index.mdx"), raw({ title: "A" }));
  fs.writeFileSync(path.join(dir, "no-mdx", "index.md"), raw({ title: "C" }));
  const posts = readSyncPosts(dir);
  assert.deepEqual(posts.map((p) => [p.slug, p.dirName, p.data.title]), [
    ["a", "2026-01-01--a", "A"],
    ["b", "2026-02-01--b", "B"],
  ]);
});

// --- planning ---

test("syncPlan: unmapped, in-sync, changed, filtered, forced and refused posts", () => {
  const posts = [
    post("unmapped", { urls: "" }),
    post("current", { synced: true }),
    post("new-one"),
    post("far-off"),
  ];
  const problems = (p) => (p.slug === "far-off" ? ["too far"] : []);
  const plan = syncPlan(posts, { problems });
  assert.deepEqual(plan.unmapped.map((p) => p.slug), ["unmapped"]);
  assert.equal(plan.mapped.length, 3);
  assert.deepEqual(plan.toSync.map((c) => [c.post.slug, c.status]), [["new-one", "never synced"]]);
  assert.deepEqual(plan.refused.map((c) => [c.post.slug, c.problems]), [["far-off", ["too far"]]]);

  const forced = syncPlan(posts, { force: true, problems });
  assert.deepEqual(forced.toSync.map((c) => [c.post.slug, c.status]), [["current", "forced"], ["new-one", "never synced"]]);
  assert.deepEqual(syncPlan(posts, { force: true, postFilter: "curr" }).toSync.map((c) => c.post.slug), ["current"]);
});

// --- sequence order: a new post is appended to its Kit sequence, so it can't go before an
// earlier post in the same sequence that hasn't been synced yet ---

const AHEAD = "/interviewing/, an earlier post in the same sequence that isn't synced yet";
const refusedSlugs = (plan) => plan.refused.map((c) => [c.post.slug, c.problems]);
const syncSlugs = (plan) => plan.toSync.map((c) => c.post.slug);

test("syncPlan order: a refused unsynced post holds back every later new post in its sequence", () => {
  const posts = [post("interviewing", { date: "2026-11-27" }), post("resumes", { date: "2026-12-04" }), post("advice", { date: "2026-12-11" })];
  const plan = syncPlan(posts, { problems: (p) => (p.slug === "interviewing" ? ["not live"] : []) });
  assert.deepEqual(syncSlugs(plan), []);
  assert.deepEqual(refusedSlugs(plan), [
    ["interviewing", ["not live"]],
    ["resumes", [`it would land in Kit ahead of ${AHEAD}`]],
    ["advice", [`it would land in Kit ahead of ${AHEAD}`]],
  ]);
});

test("syncPlan order: its own problems come first, then the order problem", () => {
  const posts = [post("interviewing"), post("resumes")];
  const plan = syncPlan(posts, { problems: () => ["not live"] });
  assert.deepEqual(refusedSlugs(plan)[1], ["resumes", ["not live", `it would land in Kit ahead of ${AHEAD}`]]);
});

test("syncPlan order: an unsynced post left out by --post holds back the later one asked for", () => {
  const plan = syncPlan([post("interviewing"), post("resumes")], { postFilter: "resumes" });
  assert.deepEqual(syncSlugs(plan), []);
  assert.deepEqual(refusedSlugs(plan), [["resumes", [`it would land in Kit ahead of ${AHEAD}`]]]);
});

test("syncPlan order: earlier posts in this run, already in Kit, or in another sequence don't hold anything back", () => {
  const posts = [
    post("already-in-kit", { synced: true }),
    post("edited", { body: "changed later" }),
    post("other-sequence", { urls: "https://kit/2" }),
    post("first-new"),
    post("second-new"),
  ];
  // "edited" has a stale hash: it's in Kit already, so only its content changed.
  posts[1].data.kitSyncHash = "stale";
  const plan = syncPlan(posts, { problems: (p) => (p.slug === "other-sequence" ? ["not live"] : []) });
  assert.deepEqual(syncSlugs(plan), ["edited", "first-new", "second-new"]);
  assert.deepEqual(refusedSlugs(plan), [["other-sequence", ["not live"]]]);
});

test("syncPlan order: an edited post already in Kit is never held back by an unsynced one before it", () => {
  const edited = post("edited", { body: "changed later" });
  edited.data.kitSyncHash = "stale";
  const plan = syncPlan([post("interviewing"), edited], { problems: (p) => (p.slug === "interviewing" ? ["not live"] : []) });
  assert.deepEqual(syncSlugs(plan), ["edited"]);
});

test("syncPlan order: a post mapped to two sequences is held back by either", () => {
  const posts = [post("interviewing", { urls: "https://kit/2" }), post("both", { urls: "https://kit/1, https://kit/2" })];
  const plan = syncPlan(posts, { problems: (p) => (p.slug === "interviewing" ? ["not live"] : []) });
  assert.deepEqual(refusedSlugs(plan)[1], ["both", [`it would land in Kit ahead of ${AHEAD}`]]);
});

test("syncPlan order: a held-back post on two sequences holds back later posts on the other one", () => {
  const posts = [
    post("interviewing", { urls: "https://kit/1" }),
    post("both", { urls: "https://kit/1, https://kit/2" }),
    post("second-only", { urls: "https://kit/2" }),
  ];
  const plan = syncPlan(posts, { problems: (p) => (p.slug === "interviewing" ? ["not live"] : []) });
  assert.deepEqual(syncSlugs(plan), []);
  assert.match(refusedSlugs(plan)[2][1][0], /ahead of \/both\//);
});

test("syncPlan order: names the earlier post once when it holds back both of a post's sequences", () => {
  const urls = "https://kit/1, https://kit/2";
  const plan = syncPlan([post("interviewing", { urls }), post("resumes", { urls })], { problems: (p) => (p.slug === "interviewing" ? ["not live"] : []) });
  assert.deepEqual(refusedSlugs(plan)[1], ["resumes", [`it would land in Kit ahead of ${AHEAD}`]]);
});

test("property: syncPlan never lets a new post through ahead of an unsynced earlier one in its sequence", () => {
  const spec = fc.record({ seq: fc.constantFrom("https://kit/1", "https://kit/2"), synced: fc.boolean(), bad: fc.boolean() });
  fc.assert(
    fc.property(fc.array(spec, { maxLength: 8 }), fc.option(fc.nat(7), { nil: null }), (specs, pick) => {
      const posts = specs.map((s, i) => post(`p${i}-`, { urls: s.seq, synced: s.synced }));
      const bad = new Set(specs.flatMap((s, i) => (s.bad ? [`p${i}-`] : [])));
      const postFilter = pick === null ? null : `p${pick}-`;
      const plan = syncPlan(posts, { postFilter, problems: (p) => (bad.has(p.slug) ? ["x"] : []) });
      const going = new Set(syncSlugs(plan));
      return posts.every((p, i) => {
        if (!going.has(p.slug) || p.data.kitSyncHash) return true;
        // Every earlier unsynced post in the same sequence is going too.
        return posts.slice(0, i).every((q) => q.data.kitSyncHash || q.data.kitEditUrls !== p.data.kitEditUrls || going.has(q.slug));
      });
    }),
  );
});

// --- messages ---

test("tableImageWarning: singular and plural wording", () => {
  const one = tableImageWarning({ count: 1, paths: ["p/a.png"] }, "slug").join("\n");
  assert.match(one, /The table in this post was rendered as an image, and it isn't on rubick.com yet/);
  assert.match(one, /show a broken image until you ship it:/);
  assert.match(one, /git commit -m "Add table image for slug"/);
  assert.match(one, /the image fills in by itself/);
  const two = tableImageWarning({ count: 2, paths: ["a", "b"] }, "slug").join("\n");
  assert.match(two, /The 2 tables in this post were rendered as images, and they aren't/);
  assert.match(two, /git add a b/);
  assert.match(two, /the images fill in by themselves/);
});

test("unshippedReminder: nothing when shipped, de-duplicated paths otherwise", () => {
  assert.deepEqual(unshippedReminder([]), []);
  assert.ok(unshippedReminder(["a", "b", "a"]).includes("\n    git add a b"));
});

// --- table images ---

const TABLE_HTML = '<img src="https://www.rubick.com/x/kit-table-1.png"><img src="https://www.rubick.com/x/kit-table-2.png">';

test("pendingTableImages: no tables means nothing to check", () => {
  const git = () => assert.fail("git should not run");
  assert.deepEqual(pendingTableImages("<p>hi</p>", post("x"), { exists: () => true, git }), { count: 0, paths: [] });
});

test("pendingTableImages: shipped tables need nothing; uncommitted or unpushed ones are listed", () => {
  const p = post("x");
  const exists = (f) => f.startsWith("public/");
  const gitWith = (status, log) => (cmd) => (cmd.startsWith("status") ? status : log);
  assert.deepEqual(pendingTableImages(TABLE_HTML, p, { exists, git: gitWith("", "") }), { count: 2, paths: [] });
  const expected = { count: 2, paths: ["public/x/kit-table-1.png", "public/x/kit-table-2.png"] };
  assert.deepEqual(pendingTableImages(TABLE_HTML, p, { exists, git: gitWith("?? f", "") }), expected);
  assert.deepEqual(pendingTableImages(TABLE_HTML, p, { exists, git: gitWith("", "abc commit") }), expected);
});

test("pendingTableImages: checks both copies of each table", () => {
  const seen = [];
  pendingTableImages(TABLE_HTML.split("><")[0] + ">", post("x"), { exists: (f) => seen.push(f) && true, git: () => "" });
  assert.deepEqual(seen, ["public/x/kit-table-1.png", "src/content/posts/2026-11-01--x/kit-table-1.png"]);
});

// --- syncing one post ---

test("syncPost: every URL confirmed records the hash", async () => {
  const { calls, deps } = fakeDeps({ answers: ["y", "y"] });
  const p = post("a", { urls: "https://k/1,https://k/2" });
  const r = await syncPost(p, deps);
  assert.deepEqual(r, { skipped: 0, unshipped: [], quit: false, synced: true });
  assert.deepEqual(calls.opened, ["https://k/1", "https://k/2"]);
  assert.deepEqual(calls.copied, ["<p>a</p>", "<p>a</p>"]);
  assert.deepEqual(calls.hashes, [["a", syncHash(p.raw)]]);
  assert.ok(calls.logs.includes("[2/2] https://k/2".replace(/^/, "\n")));
});

test("syncPost: a skipped URL leaves the hash alone", async () => {
  const { calls, deps } = fakeDeps({ answers: ["s", "y"] });
  const r = await syncPost(post("a", { urls: "u1,u2" }), deps);
  assert.deepEqual(r, { skipped: 1, unshipped: [], quit: false, synced: false });
  assert.deepEqual(calls.hashes, []);
  assert.ok(calls.logs.includes("  Hash not updated (some URLs were skipped)."));
});

test("syncPost: a clipboard failure skips that URL without opening or asking", async () => {
  const { calls, deps } = fakeDeps({ copyFails: true });
  deps.prompt = async () => assert.fail("should not ask");
  const r = await syncPost(post("a"), deps);
  assert.equal(r.skipped, 1);
  assert.deepEqual(calls.opened, []);
  assert.deepEqual(calls.warns, ["  Error copying to clipboard: no swift"]);
});

test("syncPost: an MDX conversion error skips the post", async () => {
  const { calls, deps } = fakeDeps({ htmlFails: true });
  assert.deepEqual(await syncPost(post("a"), deps), { skipped: 1, unshipped: [], quit: false, synced: false });
  assert.deepEqual(calls.warns, ["  Error converting MDX: bad mdx"]);
  assert.deepEqual(calls.opened, []);
});

test("syncPost: quit stops at once and keeps the unshipped images for the reminder", async () => {
  const images = { count: 1, paths: ["public/a/kit-table-1.png"] };
  const { calls, deps } = fakeDeps({ answers: ["s", "q"], images });
  const r = await syncPost(post("a", { urls: "u1,u2,u3" }), deps);
  assert.deepEqual(r, { skipped: 1, unshipped: images.paths, quit: true, synced: false });
  assert.deepEqual(calls.opened, ["u1", "u2"]);
  assert.ok(calls.logs.some((l) => l.includes("The table in this post was rendered as an image")));
});

// --- whole runs ---

const runPosts = () => [post("unmapped", { urls: "" }), post("current", { synced: true }), post("b"), post("c")];

test("runSync: nothing to sync", async () => {
  const { calls, deps } = fakeDeps();
  assert.deepEqual(await runSync({ posts: [post("current", { synced: true })] }, deps), { synced: 0, skipped: 0, quit: false });
  assert.ok(calls.logs.includes("All mapped posts are up to date. Nothing to sync."));
});

test("runSync: dry run lists the plan and changes nothing", async () => {
  const { calls, deps } = fakeDeps();
  const problems = (p) => (p.slug === "c" ? ["scheduled too far out"] : []);
  await runSync({ posts: runPosts(), dryRun: true, problems }, deps);
  assert.deepEqual(calls.logs, [
    "--- DRY RUN MODE ---\n",
    "Posts: 4 total, 3 mapped, 1 unmapped\n",
    "Unmapped posts (no kitEditUrls):",
    "  - unmapped",
    "",
    "  ✗ Not syncing c: scheduled too far out",
    "Posts to sync: 1",
    "  - b (never synced)",
    "",
    "Dry run complete. No changes made.",
  ]);
  assert.deepEqual(calls.opened, []);
});

test("runSync: --force lists in-sync posts as changed", async () => {
  const { calls, deps } = fakeDeps();
  await runSync({ posts: runPosts(), dryRun: true, force: true }, deps);
  assert.ok(calls.logs.includes("  - current (content changed)"));
});

test("runSync: syncs each post and totals the results", async () => {
  const images = { count: 1, paths: ["img"] };
  const { calls, deps } = fakeDeps({ answers: ["y", "s"], images });
  assert.deepEqual(await runSync({ posts: runPosts() }, deps), { synced: 1, skipped: 1, quit: false });
  assert.deepEqual(calls.hashes.map(([s]) => s), ["b"]);
  assert.ok(calls.logs.includes("Done. Synced: 1, Skipped: 1"));
  assert.ok(calls.logs.includes("\n    git add img"));
});

test("runSync: quit stops before later posts and prints the summary", async () => {
  const { calls, deps } = fakeDeps({ answers: ["q"] });
  assert.deepEqual(await runSync({ posts: runPosts() }, deps), { synced: 0, skipped: 0, quit: true });
  assert.deepEqual(calls.opened, ["https://kit/1"]);
  assert.ok(calls.logs.includes("\nQuitting. Progress saved for completed posts."));
  assert.ok(calls.logs.includes("Summary: 0 synced, 0 skipped"));
});
