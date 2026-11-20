/**
 * Keeps Kit from getting ahead of the blog. Kit sequence emails are scheduled relative to
 * signup ("N days after the previous email"), not to a post's date, so anything pasted or
 * pushed to Kit can reach subscribers before a scheduled post is live, with links that 404.
 * kit-sync.js and the kit-push scripts refuse a post, or an email linking to a post, dated
 * more than KIT_MAX_DAYS_AHEAD days out. Closer than that is allowed: it's the window for
 * lining up an email with a post that's about to go live.
 */

import { addDays } from "./publish-dates.js";

export const KIT_MAX_DAYS_AHEAD = 13;

// Absolute rubick.com links, and Markdown links to a site-relative path.
const POST_LINK = /(?:rubick\.com|\]\()\/([a-z0-9][a-z0-9-]*)/gi;

/** True when `date` is more than KIT_MAX_DAYS_AHEAD days after `today`. */
export function tooFarAheadForKit(date, today) {
  return date > addDays(today, KIT_MAX_DAYS_AHEAD);
}

/** Slugs linked from `text`, in order, without repeats. */
export function linkedSlugs(text) {
  return [...new Set([...text.matchAll(POST_LINK)].map((m) => m[1].toLowerCase()))];
}

/**
 * Why `text` (and its own post `date`, if it is a post) can't go to Kit yet, as messages;
 * empty when it can.
 * @param {{ text: string, date?: string }} item
 * @param {{ slug: string, date: string }[]} posts every post, with its date
 * @param {string} today YYYY-MM-DD in the site's time zone
 */
export function kitScheduleProblems({ text, date }, posts, today) {
  const limit = `more than ${KIT_MAX_DAYS_AHEAD} days out`;
  const problems = [];
  if (date && tooFarAheadForKit(date, today)) problems.push(`this post is scheduled for ${date}, ${limit}`);
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  for (const slug of linkedSlugs(text)) {
    const post = bySlug.get(slug);
    if (post && tooFarAheadForKit(post.date, today)) {
      problems.push(`it links to /${slug}/, scheduled for ${post.date}, ${limit}`);
    }
  }
  return problems;
}
