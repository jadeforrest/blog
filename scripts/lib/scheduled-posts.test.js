/**
 * Several posts scheduled in the future at once, end to end across the pieces that hide and
 * release them: the build's post list (pages, listings, tags, RSS), the Bluesky/LinkedIn excerpt
 * queues, and the daily go-live job (build hook + "New post" announcements).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import fc from "fast-check";
import { liveQueue, publishedPosts } from "./publish-dates.js";
import { initialState } from "./blog-post-day.js";
import { run } from "../blog-post-day.js";

const DAY = 86_400_000;
const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const daysFrom = (start, count) => Array.from({ length: count }, (_, i) => addDays(start, i));

// Today is 2026-11-19: one published post, then two scheduled on different days and two
// sharing a day.
const TODAY = "2026-11-19";
const DATES = { old: "2026-11-05", first: "2026-12-01", second: "2026-12-08", twinA: "2026-12-15", twinB: "2026-12-15" };
const SLUGS = Object.keys(DATES);
const entries = SLUGS.map((slug) => ({ id: `${DATES[slug]}--${slug}/index.mdx`, data: {} }));
const visibleOn = (today) => publishedPosts(entries, { today }).map((p) => p.slug);

test("build: scheduled posts stay out until their own date, newest first", () => {
  assert.deepEqual(visibleOn(TODAY), ["old"]);
  assert.deepEqual(visibleOn("2026-11-30"), ["old"]);
  assert.deepEqual(visibleOn("2026-12-01"), ["first", "old"]);
  assert.deepEqual(visibleOn("2026-12-14"), ["second", "first", "old"]);
  assert.deepEqual(visibleOn("2026-12-15").slice(0, 2).sort(), ["twinA", "twinB"]);
  assert.equal(visibleOn("2026-12-15").length, 5);
});

test("build: the dev server shows every scheduled post", () => {
  assert.equal(publishedPosts(entries, { today: TODAY, showAll: true }).length, 5);
});

test("build: an undated post with a future frontmatter date is scheduled too", () => {
  const posts = [{ id: "undated/index.mdx", data: { date: "2026-12-01" } }];
  assert.deepEqual(publishedPosts(posts, { today: TODAY }), []);
  assert.equal(publishedPosts(posts, { today: "2026-12-01" })[0].slug, "undated");
});

const isoDate = fc
  .date({ min: new Date("2026-01-01T00:00:00Z"), max: new Date("2027-12-31T00:00:00Z"), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10));

test("property: build list is exactly the posts dated on or before today, sorted, and only grows", () => {
  fc.assert(
    fc.property(fc.uniqueArray(isoDate, { maxLength: 12 }), isoDate, (dates, today) => {
      const posts = dates.map((d, i) => ({ id: `${d}--p${i}/index.mdx`, data: {} }));
      const out = publishedPosts(posts, { today });
      const tomorrow = new Set(publishedPosts(posts, { today: addDays(today, 1) }).map((p) => p.slug));
      return (
        out.length === dates.filter((d) => d <= today).length &&
        out.every((p, i) => p.date <= today && (i === 0 || out[i - 1].date >= p.date)) &&
        out.every((p) => tomorrow.has(p.slug))
      );
    }),
  );
});

test("every page and the RSS feed get posts from getPublishedPosts, never the raw collection", () => {
  const files = fs.readdirSync("src", { recursive: true }).filter((f) => /\.(astro|ts|tsx|js|jsx|mdx)$/.test(f));
  const raw = files.filter((f) => /getCollection\(\s*["']posts["']/.test(fs.readFileSync(path.join("src", f), "utf8")));
  assert.deepEqual(raw, [path.join("utils", "posts.ts")]);
  assert.match(fs.readFileSync("src/pages/rss.xml.ts", "utf8"), /getPublishedPosts\(\)/);
});

// --- Social excerpt queues (extract-to-bluesky.js / extract-to-linkedin.js) ---

const extracts = SLUGS.flatMap((slug) =>
  [1, 2].map((n) => ({ id: `${slug}-${n}`, sourceFile: `${DATES[slug]}--${slug}.txt` })),
);
const queueOn = (today) => liveQueue(extracts, today, () => {}).map((e) => e.id);

test("social queues: excerpts from each scheduled post are held back until that post's date", () => {
  assert.deepEqual(queueOn(TODAY), ["old-1", "old-2"]);
  assert.deepEqual(queueOn("2026-12-01"), ["old-1", "old-2", "first-1", "first-2"]);
  assert.equal(queueOn("2026-12-14").length, 6);
  assert.equal(queueOn("2026-12-15").length, 10);
});

test("social queues: the log counts every held-back excerpt", () => {
  const logs = [];
  liveQueue(extracts, TODAY, (m) => logs.push(m));
  assert.deepEqual(logs, ["Found 2 extracted posts (8 from scheduled posts held back)"]);
});

test("property: the social queue agrees with the build about which posts are live", () => {
  fc.assert(
    fc.property(fc.uniqueArray(isoDate, { maxLength: 10 }), isoDate, (dates, today) => {
      const posts = dates.map((d, i) => ({ id: `${d}--p${i}/index.mdx`, data: {} }));
      const queue = dates.map((d, i) => ({ id: `p${i}`, sourceFile: `${d}--p${i}.txt` }));
      const live = new Set(publishedPosts(posts, { today }).map((p) => p.slug));
      const queued = new Set(liveQueue(queue, today, () => {}).map((e) => e.id));
      return live.size === queued.size && [...live].every((s) => queued.has(s));
    }),
  );
});

// --- The daily go-live job (blog-post-day.js), run day after day ---

/**
 * A fake Netlify site: a page returns 200 only once a build has run on or after its date,
 * so an announcement before the build (or before the date) would show up as a failure.
 * Runs the job on each of `runDays` with a shared state, as launchd would.
 */
async function simulate(posts, runDays, { hook = "https://hook" } = {}) {
  let today;
  let lastBuild = "";
  const builds = [];
  const announced = [];
  const errorsByDay = {};
  const byUrl = new Map(posts.map((p) => [p.url, p]));
  let state = initialState(runDays[0]);
  const fetchFn = async (url, { method }) => {
    if (method === "POST") {
      builds.push(today);
      lastBuild = today;
      return { ok: true, status: 200 };
    }
    const p = byUrl.get(url);
    return { status: p && p.date <= lastBuild ? 200 : 404 };
  };
  const announcer = (platform) => async ({ url }) => announced.push({ day: today, platform, post: byUrl.get(url) });
  for (const day of runDays) {
    today = day;
    const errors = await run({
      args: ["--today", day],
      hook,
      posts,
      state,
      saveState: (s) => (state = structuredClone(s)),
      fetchFn,
      sleep: async () => {},
      announcers: { bluesky: announcer("bluesky"), linkedin: announcer("linkedin") },
      log: () => {},
    });
    if (errors.length) errorsByDay[day] = errors;
  }
  return { builds, announced, errorsByDay, state };
}

const jobPosts = SLUGS.map((slug) => ({
  dir: `${DATES[slug]}--${slug}`,
  date: DATES[slug],
  slug,
  title: slug,
  description: "",
  url: `https://www.rubick.com/${slug}/`,
}));
const announcedOn = (announced) =>
  Object.fromEntries(announced.map(({ day, platform, post }) => [`${post.slug}/${platform}`, day]));

test("go-live job, daily runs: one build per release day, each post announced once on its date", async () => {
  const { builds, announced, errorsByDay } = await simulate(jobPosts, daysFrom(TODAY, 32));
  assert.deepEqual(errorsByDay, {});
  assert.deepEqual(builds, ["2026-12-01", "2026-12-08", "2026-12-15"]);
  assert.equal(announced.length, 8);
  assert.deepEqual(announcedOn(announced), {
    "first/bluesky": "2026-12-01",
    "first/linkedin": "2026-12-01",
    "second/bluesky": "2026-12-08",
    "second/linkedin": "2026-12-08",
    "twinA/bluesky": "2026-12-15",
    "twinA/linkedin": "2026-12-15",
    "twinB/bluesky": "2026-12-15",
    "twinB/linkedin": "2026-12-15",
  });
});

test("go-live job: the Mac off across two release dates catches both up with one build", async () => {
  const runDays = [TODAY, "2026-11-30", "2026-12-10"];
  const { builds, announced, errorsByDay } = await simulate(jobPosts, runDays);
  assert.deepEqual(errorsByDay, {});
  assert.deepEqual(builds, ["2026-12-10"]);
  assert.deepEqual(
    announced.map((a) => `${a.post.slug}/${a.platform}@${a.day}`).sort(),
    ["first/bluesky@2026-12-10", "first/linkedin@2026-12-10", "second/bluesky@2026-12-10", "second/linkedin@2026-12-10"],
  );
});

test("go-live job: the published post from before the job started is never announced", async () => {
  const { announced } = await simulate(jobPosts, daysFrom(TODAY, 32));
  assert.ok(!announced.some((a) => a.post.slug === "old"));
});

test("go-live job: no build hook fails every run while posts are scheduled, and announces nothing", async () => {
  const runDays = daysFrom(TODAY, 3);
  const { builds, announced, errorsByDay } = await simulate(jobPosts, runDays, { hook: "" });
  assert.deepEqual(Object.keys(errorsByDay), runDays);
  assert.deepEqual(builds, []);
  assert.deepEqual(announced, []);
});

test("property: any schedule, any run days: never early, never twice, everything out after the last date", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 2, maxLength: 6 }),
      fc.array(fc.boolean(), { minLength: 40, maxLength: 40 }),
      async (offsets, ranOn) => {
        const posts = offsets.map((o, i) => ({ ...jobPosts[0], date: addDays(TODAY, o), slug: `p${i}`, url: `u/p${i}` }));
        // The first and last days always run; the Mac may be off on any day in between.
        const runDays = daysFrom(TODAY, 40).filter((_, i) => i === 0 || i === 39 || ranOn[i]);
        const { builds, announced, errorsByDay } = await simulate(posts, runDays);
        const keys = announced.map((a) => `${a.post.slug}/${a.platform}`);
        return (
          Object.keys(errorsByDay).length === 0 &&
          announced.every((a) => a.day >= a.post.date) &&
          new Set(keys).size === keys.length &&
          keys.length === posts.length * 2 &&
          builds.every((day) => posts.some((p) => p.date <= day)) &&
          new Set(builds).size === builds.length
        );
      },
    ),
    { numRuns: 200 },
  );
});
