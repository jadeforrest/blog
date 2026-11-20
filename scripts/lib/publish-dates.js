/**
 * Publish-date rules shared by the Astro build and the Node scripts.
 *
 * A post's date is the YYYY-MM-DD prefix of its directory
 * (`src/content/posts/2026-12-01--slug/`), or frontmatter `date` when there is
 * no prefix. A post stays off the site, out of RSS and out of the social queues
 * until that date has arrived in Portland. The site is static, so "arrived"
 * means "on the day the build runs": scripts/blog-post-day.js triggers that build.
 *
 * Plain JS with no dependencies so launchd scripts and Astro pages can both
 * import it.
 */

export const SITE_TIME_ZONE = "America/Los_Angeles";

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})--/;

/**
 * Today's date as YYYY-MM-DD in the site's time zone. Netlify builds run in
 * UTC, so without the zone a post would appear at 4-5 PM the day before.
 * @param {Date} [now]
 * @param {string} [timeZone]
 */
export function siteToday(now = new Date(), timeZone = SITE_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The date prefix of a post id, directory or extract file name, or `fallback`.
 * @param {string} name e.g. "2026-12-01--slug/index.mdx" or "2026-12-01--slug.txt"
 * @param {string} [fallback]
 */
export function datePrefix(name, fallback = "") {
  return name.match(DATE_PREFIX)?.[1] ?? fallback;
}

/**
 * The URL slug of a post id or directory name.
 * @param {string} name
 */
export function postSlug(name) {
  return name.replace(DATE_PREFIX, "").replace(/\/index\.mdx?$/, "");
}

/**
 * YYYY-MM-DD strings compare correctly as text. An undated post counts as
 * published, matching how the site treated it before scheduling existed.
 * @param {string} date
 * @param {string} today
 */
export function isPublished(date, today) {
  return date <= today;
}

/**
 * Collection entries with their date and slug, newest first, leaving out the ones dated after
 * `today` unless `showAll` (the dev server, so scheduled posts can be previewed). Every page,
 * listing, tag page and the RSS feed get their posts through this, via src/utils/posts.ts.
 * @template {{ id: string, data: { date?: string } }} T
 * @param {T[]} entries
 * @param {{ today: string, showAll?: boolean }} options
 * @returns {(T & { date: string, slug: string })[]}
 */
export function publishedPosts(entries, { today, showAll = false }) {
  return entries
    .map((entry) => ({ ...entry, date: datePrefix(entry.id, entry.data.date || ""), slug: postSlug(entry.id) }))
    .filter((post) => showAll || isPublished(post.date, today))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * A YYYY-MM-DD date `days` later (earlier when negative).
 * @param {string} date
 * @param {number} days
 */
export function addDays(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The day before a YYYY-MM-DD date.
 * @param {string} date
 */
export function dayBefore(date) {
  return addDays(date, -1);
}

/**
 * Items dated after `lastChecked` and on or before `today`: the ones that went
 * live since the last check.
 * @template {{ date: string }} T
 * @param {T[]} items
 * @param {string} lastChecked
 * @param {string} today
 * @returns {T[]}
 */
export function publishedSince(items, lastChecked, today) {
  return items.filter((item) => item.date > lastChecked && isPublished(item.date, today));
}

/**
 * Social-queue extracts whose source post is live. Extract files are named
 * after the post directory, so the date comes from `sourceFile`.
 * @template {{ sourceFile: string }} T
 * @param {T[]} extracts
 * @param {string} today
 * @returns {T[]}
 */
export function liveExtracts(extracts, today) {
  return extracts.filter((e) => isPublished(datePrefix(e.sourceFile), today));
}

/**
 * The social queue as the excerpt scripts post from it: extracts from scheduled posts are held
 * back, since their links would 404.
 * @template {{ sourceFile: string }} T
 * @param {T[]} extracts
 * @param {string} [today]
 * @param {(msg: string) => void} [log]
 * @returns {T[]}
 */
export function liveQueue(extracts, today = siteToday(), log = console.log) {
  const live = liveExtracts(extracts, today);
  log(`Found ${live.length} extracted posts (${extracts.length - live.length} from scheduled posts held back)`);
  return live;
}
