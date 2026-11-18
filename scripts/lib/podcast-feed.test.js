import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { FEED_URL, fetchFeedItems, freshFeedUrl } from "./podcast-feed.js";

test("property: freshFeedUrl only changes the case of podcast/rss", () => {
  fc.assert(
    fc.property(
      fc.array(fc.double({ min: 0, max: 0.999, noNaN: true }), { minLength: 9 }),
      (rolls) => {
        let i = 0;
        const url = freshFeedUrl(() => rolls[i++ % rolls.length]);
        assert.equal(url.toLowerCase(), FEED_URL);
        assert.equal(url.slice(0, -11), FEED_URL.slice(0, -11));
      },
    ),
  );
});

test("freshFeedUrl uses the random roll per letter", () => {
  assert.equal(
    freshFeedUrl(() => 0),
    FEED_URL.replace("podcast/rss", "PODCAST/RSS"),
  );
  assert.equal(
    freshFeedUrl(() => 0.9),
    FEED_URL,
  );
});

test("fetchFeedItems reads the fresh URL, falling back to the canonical one", async () => {
  const seen = [];
  const ok = await fetchFeedItems(
    async (url) => (seen.push(url), { items: [1] }),
    () => 0,
  );
  assert.deepEqual(ok, [1]);
  assert.match(seen[0], /PODCAST\/RSS$/);

  const fallback = await fetchFeedItems(async (url) => {
    if (url !== FEED_URL) throw new Error("404");
    return {};
  });
  assert.deepEqual(fallback, []);
});
