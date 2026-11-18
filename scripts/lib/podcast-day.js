/**
 * Decisions for scripts/podcast-day.js, kept free of I/O so they can be tested.
 *
 * /decoding-leadership/ lists episodes from the podcast RSS feed at build time, so a newly
 * released episode only appears after a build. Spotify keeps a scheduled episode out of the feed
 * until it is released, so the feed itself is the schedule: an episode in the feed whose link is
 * not on the live page needs a build.
 *
 * State shape: { builds: { [guid]: { count: number, last: ISO time } } } — builds triggered for
 * an episode that was missing. Entries are dropped once the episode is on the page.
 */

/** Episodes shown on the page (MAX_EPISODES in src/pages/decoding-leadership.astro). */
export const PAGE_EPISODES = 20;
/** Give a triggered build this long to deploy before triggering another. */
export const RETRY_AFTER_MS = 60 * 60_000;
/** Builds per episode before giving up and only reporting it. */
export const MAX_BUILDS = 3;

/** @typedef {{ guid?: string, link?: string, title?: string }} Episode */

/** True when the page's HTML links to `link` (attribute values may have `&amp;`). */
export function pageHasLink(html, link) {
  return html.replaceAll("&amp;", "&").includes(link);
}

/**
 * Feed episodes the live page should show but doesn't. Episodes without a link or guid can't be
 * checked and are skipped.
 * @param {Episode[]} items feed items, newest first
 * @param {string} html the live page
 */
export function missingEpisodes(items, html) {
  return items
    .slice(0, PAGE_EPISODES)
    .filter((e) => e.link && e.guid && !pageHasLink(html, e.link));
}

/**
 * What to do this run.
 * - `build`: trigger a build (an episode is missing and no recent build is pending for it).
 * - `errors`: missing episodes that a build already failed to bring in, or a missing hook.
 * - `state`: the state to save (attempt counts; episodes now on the page are dropped).
 * @param {{ missing: Episode[], state: { builds?: Record<string, { count: number, last: string }> },
 *   now: Date, hasHook: boolean }} input
 */
export function plan({ missing, state, now, hasHook }) {
  const builds = Object.fromEntries(
    missing.filter((e) => state.builds?.[e.guid]).map((e) => [e.guid, state.builds[e.guid]]),
  );
  if (missing.length && !hasHook) {
    return {
      build: false,
      errors: ["NETLIFY_BUILD_HOOK is not set, so new episodes will not appear"],
      state: { builds },
    };
  }
  const due = missing.filter(
    (e) => !builds[e.guid] || now - new Date(builds[e.guid].last) >= RETRY_AFTER_MS,
  );
  const errors = due
    .filter((e) => builds[e.guid])
    .map((e) => `"${e.title}" is still not on the page after ${builds[e.guid].count} build(s)`);
  const toBuild = due.filter((e) => (builds[e.guid]?.count ?? 0) < MAX_BUILDS);
  for (const e of toBuild)
    builds[e.guid] = { count: (builds[e.guid]?.count ?? 0) + 1, last: now.toISOString() };
  const build = toBuild.length > 0;
  return { build, errors, state: { builds } };
}
