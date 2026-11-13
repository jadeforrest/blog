import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import fc from "fast-check";
import { announcementText, initialState, missingPlatforms, plan, readPosts } from "./post-day.js";
import { fitsBlueskyLimit } from "./text-limits.js";
import { loadState, run, waitUntilLive } from "../post-day.js";

const post = (date, slug, extra = {}) => ({
  dir: `${date}--${slug}`,
  date,
  slug,
  title: slug,
  description: "",
  url: `https://www.rubick.com/${slug}/`,
  ...extra,
});

test("readPosts reads dates, slugs and frontmatter", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "post-day-"));
  fs.mkdirSync(path.join(dir, "2026-12-01--soon"));
  fs.writeFileSync(path.join(dir, "2026-12-01--soon", "index.mdx"), '---\ntitle: "Soon"\ndescription: "D"\n---\nBody');
  fs.mkdirSync(path.join(dir, "undated"));
  fs.writeFileSync(path.join(dir, "undated", "index.md"), "---\ntitle: U\ndate: 2020-01-02\n---\n");
  fs.mkdirSync(path.join(dir, "empty"));
  fs.writeFileSync(path.join(dir, "stray.txt"), "");
  const posts = readPosts(dir).sort((a, b) => a.slug.localeCompare(b.slug));
  assert.deepEqual(posts, [
    { dir: "2026-12-01--soon", date: "2026-12-01", slug: "soon", title: "Soon", description: "D", url: "https://www.rubick.com/soon/" },
    { dir: "undated", date: "2020-01-02", slug: "undated", title: "U", description: "", url: "https://www.rubick.com/undated/" },
  ]);
});

test("readPosts reads the real posts directory", () => {
  const posts = readPosts("src/content/posts");
  assert.ok(posts.length > 100);
  assert.ok(posts.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.title));
});

test("plan: a post dated today is due, one tomorrow is upcoming", () => {
  const posts = [post("2026-11-01", "old"), post("2026-11-13", "today"), post("2026-11-14", "tomorrow")];
  const state = initialState("2026-11-13");
  const out = plan({ posts, state, today: "2026-11-13", hasHook: true });
  assert.deepEqual(out.due.map((p) => p.slug), ["today"]);
  assert.deepEqual(out.upcoming.map((p) => p.slug), ["tomorrow"]);
  assert.deepEqual(out.toAnnounce.map((p) => p.slug), ["today"]);
  assert.equal(out.missingHook, false);
});

test("plan: missing hook only matters when something is due or scheduled", () => {
  const state = initialState("2026-11-13");
  assert.equal(plan({ posts: [post("2026-11-01", "old")], state, today: "2026-11-13", hasHook: false }).missingHook, false);
  assert.equal(plan({ posts: [post("2026-12-01", "x")], state, today: "2026-11-13", hasHook: false }).missingHook, true);
});

test("plan: a post announced on one platform is retried for the other only", () => {
  const p = post("2026-11-13", "today");
  const state = { ...initialState("2026-11-13"), lastChecked: "2026-11-13", announced: { today: { bluesky: "t" } } };
  const out = plan({ posts: [p], state, today: "2026-11-14", hasHook: true });
  assert.deepEqual(out.due, []);
  assert.deepEqual(out.toAnnounce, [p]);
  assert.deepEqual(missingPlatforms(p, state), ["linkedin"]);
});

test("announcementText includes the description when it fits", () => {
  const p = post("2026-11-13", "x", { title: "The ratchet", description: "A tool." });
  assert.equal(announcementText(p, "bluesky"), "New post: The ratchet\n\nA tool.");
  assert.equal(announcementText({ ...p, description: "" }, "linkedin"), "New post: The ratchet");
});

test("property: Bluesky text fits whenever the headline does, and never alters the title", () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 200 }), fc.string({ maxLength: 400 }), (title, description) => {
      const text = announcementText(post("2026-11-13", "x", { title, description }), "bluesky");
      const headline = `New post: ${title}`;
      return text.startsWith(headline) && (!fitsBlueskyLimit(headline) || fitsBlueskyLimit(text));
    }),
  );
});

function harness({ posts, state = initialState("2026-11-13"), hook = "https://hook", statuses = [200], failOn = [] }) {
  const calls = { fetch: [], posted: [], saved: [], logs: [] };
  let n = 0;
  const fetchFn = async (url, opts) => {
    calls.fetch.push([url, opts.method]);
    if (opts.method === "POST") return { ok: true, status: 200 };
    return { status: statuses[Math.min(n++, statuses.length - 1)] };
  };
  const announcer = (platform) => async (p) => {
    if (failOn.includes(platform)) throw new Error("boom");
    calls.posted.push([platform, p.text, p.url]);
  };
  const deps = {
    hook,
    posts,
    state,
    saveState: (s) => calls.saved.push(structuredClone(s)),
    fetchFn,
    sleep: async () => {},
    announcers: { bluesky: announcer("bluesky"), linkedin: announcer("linkedin") },
    log: (m) => calls.logs.push(m),
  };
  return { calls, deps };
}

test("run: on the post's date, builds, waits until live, announces on both", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-13", "x", { title: "X" })], statuses: [404, 404, 200] });
  const errors = await run({ ...deps, args: ["--today", "2026-11-13"] });
  assert.deepEqual(errors, []);
  assert.deepEqual(calls.fetch.filter(([, m]) => m === "POST"), [["https://hook", "POST"]]);
  assert.deepEqual(calls.posted.map(([p]) => p), ["bluesky", "linkedin"]);
  const last = calls.saved.at(-1);
  assert.equal(last.lastChecked, "2026-11-13");
  assert.ok(last.announced.x.bluesky && last.announced.x.linkedin);
});

test("run: nothing due means no build and no announcements", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-01", "old"), post("2026-12-01", "later")] });
  assert.deepEqual(await run({ ...deps, args: ["--today", "2026-11-13"] }), []);
  assert.deepEqual(calls.fetch, []);
  assert.deepEqual(calls.posted, []);
  assert.ok(calls.logs.some((l) => l.includes("later (2026-12-01)")));
});

test("run: missing hook with a scheduled post fails before doing anything", async () => {
  const { calls, deps } = harness({ posts: [post("2026-12-01", "later")], hook: "" });
  const errors = await run({ ...deps, args: ["--today", "2026-11-13"] });
  assert.match(errors[0], /NETLIFY_BUILD_HOOK/);
  assert.deepEqual(calls.saved, []);
});

test("run: a page that never goes live is reported, not announced", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-13", "x")], statuses: [404] });
  const errors = await run({ ...deps, args: ["--today", "2026-11-13"] });
  assert.match(errors[0], /not live.*pushed to master/);
  assert.deepEqual(calls.posted, []);
});

test("run: one platform failing still records the other, and is retried next run", async () => {
  const first = harness({ posts: [post("2026-11-13", "x")], failOn: ["linkedin"] });
  const errors = await run({ ...first.deps, args: ["--today", "2026-11-13"] });
  assert.match(errors[0], /linkedin announcement of x failed: boom/);
  const state = first.calls.saved.at(-1);
  assert.ok(state.announced.x.bluesky && !state.announced.x.linkedin);

  const second = harness({ posts: [post("2026-11-13", "x")], state });
  assert.deepEqual(await run({ ...second.deps, args: ["--today", "2026-11-14"] }), []);
  assert.deepEqual(second.calls.posted.map(([p]) => p), ["linkedin"]);
  assert.deepEqual(second.calls.fetch.filter(([, m]) => m === "POST"), []);
});

test("run: --dry-run changes nothing", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-13", "x")] });
  assert.deepEqual(await run({ ...deps, args: ["--dry-run", "--today", "2026-11-13"] }), []);
  assert.deepEqual(calls.fetch, []);
  assert.deepEqual(calls.saved, []);
  assert.deepEqual(calls.posted, []);
});

test("run: --no-announce builds but posts nothing", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-13", "x")] });
  assert.deepEqual(await run({ ...deps, args: ["--no-announce", "--today", "2026-11-13"] }), []);
  assert.equal(calls.fetch.length, 1);
  assert.deepEqual(calls.posted, []);
});

test("run: a failing build hook is an error and no announcement is attempted", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-13", "x")] });
  deps.fetchFn = async () => ({ ok: false, status: 500 });
  assert.deepEqual(await run({ ...deps, args: ["--today", "2026-11-13"] }), ["Netlify build hook returned 500"]);
  assert.deepEqual(calls.posted, []);
});

test("waitUntilLive checks once with no timeout, and survives network errors", async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls++;
    throw new Error("offline");
  };
  assert.equal(await waitUntilLive("u", { fetchFn, sleep: async () => {}, timeoutMs: 0 }), false);
  assert.equal(calls, 1);
  calls = 0;
  assert.equal(await waitUntilLive("u", { fetchFn, sleep: async () => {}, timeoutMs: 90, pollMs: 30 }), false);
  assert.equal(calls, 4);
});

test("loadState starts fresh when there is no file, reads it when there is, and throws on corruption", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "post-day-state-"));
  const file = path.join(dir, "state.json");
  assert.deepEqual(loadState(file, "2026-11-13"), initialState("2026-11-13"));
  fs.writeFileSync(file, JSON.stringify({ lastChecked: "2026-11-01", announceFrom: "2026-10-01", announced: {} }));
  assert.equal(loadState(file, "2026-11-13").lastChecked, "2026-11-01");
  fs.writeFileSync(file, "{");
  assert.throws(() => loadState(file, "2026-11-13"), SyntaxError);
});

test("run: --dry-run lists what it would announce", async () => {
  const { calls, deps } = harness({ posts: [post("2026-11-13", "x")] });
  await run({ ...deps, args: ["--dry-run", "--today", "2026-11-13"] });
  assert.ok(calls.logs.includes("[Dry run] Would announce x on bluesky, linkedin."));
  assert.ok(calls.logs.includes("[Dry run] Not triggering a build."));
});
