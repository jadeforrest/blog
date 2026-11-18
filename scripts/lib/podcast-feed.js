/**
 * The Decoding Leadership RSS feed, fetched past its CDN cache.
 *
 * anchor.fm serves the feed through Fastly with `s-maxage` of about a week and ignores query
 * strings in the cache key, so a build can get a copy from before the latest release (Nov 18
 * 2026: the build saw episode 39 two hours after 40 was out). The path is case-insensitive at the
 * origin but not in the cache key, so a random letter case is a cache miss and returns the
 * current feed. If that ever stops working, the canonical URL is the fallback.
 */

export const FEED_URL = "https://anchor.fm/s/f420aba8/podcast/rss";

/** FEED_URL with the letters of "podcast/rss" in random case. `random` returns [0, 1). */
export function freshFeedUrl(random = Math.random) {
  const tail = "podcast/rss".replace(/[a-z]/g, (c) => (random() < 0.5 ? c.toUpperCase() : c));
  return FEED_URL.replace(/podcast\/rss$/, tail);
}

/**
 * Feed items, newest first: the fresh URL, or the canonical one if that fails.
 * @param {(url: string) => Promise<{ items?: object[] }>} parseURL e.g. rss-parser's parseURL
 */
export async function fetchFeedItems(parseURL, random = Math.random) {
  try {
    return (await parseURL(freshFeedUrl(random))).items ?? [];
  } catch {
    return (await parseURL(FEED_URL)).items ?? [];
  }
}
