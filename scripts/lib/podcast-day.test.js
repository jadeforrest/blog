import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  MAX_BUILDS,
  PAGE_EPISODES,
  RETRY_AFTER_MS,
  missingEpisodes,
  pageHasLink,
  plan,
} from "./podcast-day.js";
import { run } from "../podcast-day.js";

const ep = (n) => ({
  guid: `g${n}`,
  title: `Episode ${n}`,
  link: `https://pod.example/ep-${n}?a=1&b=2`,
});
const pageWith = (...eps) =>
  eps.map((e) => `<a href="${e.link.replaceAll("&", "&amp;")}">x</a>`).join("");
const now = new Date("2026-11-18T16:00:00Z");
const ago = (ms) => new Date(now - ms).toISOString();

test("pageHasLink matches entity-escaped hrefs", () => {
  assert.ok(pageHasLink(pageWith(ep(1)), ep(1).link));
  assert.ok(!pageHasLink(pageWith(ep(1)), ep(2).link));
});

test("missingEpisodes finds feed episodes not on the page, within the page's window", () => {
  const items = Array.from({ length: PAGE_EPISODES + 5 }, (_, i) => ep(i));
  assert.deepEqual(missingEpisodes(items, pageWith(...items.slice(1))), [items[0]]);
  assert.deepEqual(missingEpisodes(items, pageWith(...items.slice(0, PAGE_EPISODES))), []);
  assert.deepEqual(missingEpisodes([{ guid: "x" }, { link: "y" }], ""), []);
});

test("property: an episode on the page is never missing, one absent always is", () => {
  fc.assert(
    fc.property(
      fc.uniqueArray(fc.nat(1000), { maxLength: PAGE_EPISODES }),
      fc.array(fc.boolean()),
      (ids, shown) => {
        const items = ids.map(ep);
        const onPage = items.filter((_, i) => shown[i]);
        const missing = missingEpisodes(items, pageWith(...onPage));
        assert.deepEqual(
          missing,
          items.filter((_, i) => !shown[i]),
        );
      },
    ),
  );
});

test("plan builds for a newly missing episode and records it", () => {
  const r = plan({ missing: [ep(1)], state: { builds: {} }, now, hasHook: true });
  assert.equal(r.build, true);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.state.builds.g1, { count: 1, last: now.toISOString() });
});

test("plan waits while a recent build deploys", () => {
  const state = { builds: { g1: { count: 1, last: ago(RETRY_AFTER_MS - 1) } } };
  const r = plan({ missing: [ep(1)], state, now, hasHook: true });
  assert.equal(r.build, false);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.state, state);
});

test("plan retries and reports after a build didn't bring the episode in", () => {
  const state = { builds: { g1: { count: 1, last: ago(RETRY_AFTER_MS) } } };
  const r = plan({ missing: [ep(1)], state, now, hasHook: true });
  assert.equal(r.build, true);
  assert.match(r.errors[0], /Episode 1.*after 1 build/);
  assert.equal(r.state.builds.g1.count, 2);
});

test("plan stops building after MAX_BUILDS but keeps reporting", () => {
  const state = { builds: { g1: { count: MAX_BUILDS, last: ago(RETRY_AFTER_MS) } } };
  const r = plan({ missing: [ep(1)], state, now, hasHook: true });
  assert.equal(r.build, false);
  assert.equal(r.errors.length, 1);
  assert.equal(r.state.builds.g1.count, MAX_BUILDS);
});

test("plan drops state for episodes no longer missing, and fails without a hook", () => {
  const state = { builds: { g1: { count: 1, last: ago(0) }, g2: { count: 1, last: ago(0) } } };
  assert.deepEqual(
    Object.keys(plan({ missing: [ep(2)], state, now, hasHook: true }).state.builds),
    ["g2"],
  );
  const r = plan({ missing: [ep(1)], state: {}, now, hasHook: false });
  assert.equal(r.build, false);
  assert.match(r.errors[0], /NETLIFY_BUILD_HOOK/);
});

function fakeRun({
  items,
  html,
  hookStatus = 200,
  args = [],
  state = { builds: {} },
  hook = "https://hook",
}) {
  const calls = [];
  const saved = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, method: opts?.method ?? "GET" });
    if (url === hook) return { ok: hookStatus < 400, status: hookStatus };
    return { ok: true, status: 200, text: async () => (url.includes("anchor") ? "feed" : html) };
  };
  const done = run({
    args,
    hook,
    state,
    now,
    fetchFn,
    loadFeed: async () => items,
    saveState: (s) => saved.push(s),
    log: () => {},
  });
  return done.then((errors) => ({
    errors,
    calls,
    saved,
    posts: calls.filter((c) => c.method === "POST"),
  }));
}

test("run: nothing new means no build and a cleared state", async () => {
  const r = await fakeRun({ items: [ep(1)], html: pageWith(ep(1)) });
  assert.deepEqual(r.errors, []);
  assert.equal(r.posts.length, 0);
  assert.deepEqual(r.saved, [{ builds: {} }]);
});

test("run: a missing episode triggers the hook once", async () => {
  const r = await fakeRun({ items: [ep(2), ep(1)], html: pageWith(ep(1)) });
  assert.deepEqual(r.errors, []);
  assert.equal(r.posts.length, 1);
  assert.equal(r.saved[0].builds.g2.count, 1);
});

test("run: --dry-run neither builds nor saves", async () => {
  const r = await fakeRun({ items: [ep(2)], html: "", args: ["--dry-run"] });
  assert.equal(r.posts.length, 0);
  assert.equal(r.saved.length, 0);
  const quiet = await fakeRun({ items: [], html: "", args: ["--dry-run"] });
  assert.equal(quiet.saved.length, 0);
});

test("run: a failing hook is an error and isn't recorded as a build", async () => {
  const r = await fakeRun({ items: [ep(2)], html: "", hookStatus: 500 });
  assert.match(r.errors.at(-1), /returned 500/);
  assert.equal(r.saved.length, 0);
});

test("run: a recent build means waiting, not building", async () => {
  const state = { builds: { g2: { count: 1, last: ago(0) } } };
  const r = await fakeRun({ items: [ep(2)], html: "", state });
  assert.deepEqual(r.errors, []);
  assert.equal(r.posts.length, 0);
});

test("run: a failed page fetch throws", async () => {
  const fetchFn = async () => ({ ok: false, status: 503 });
  await assert.rejects(
    run({
      args: [],
      hook: "h",
      state: {},
      now,
      fetchFn,
      loadFeed: async () => [],
      saveState() {},
      log() {},
    }),
    /503/,
  );
});
