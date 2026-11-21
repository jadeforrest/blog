/**
 * Keeps Kit from getting ahead of the blog. Kit can send an email the moment it's in a sequence
 * (subscribers past its delay get it on the next send day), and a post only goes live at some
 * point on its date (the 6 AM build, or later if the Mac was off), so an email reaching Kit on
 * or before that date could arrive with links that 404. kit-sync.js and the kit-push scripts
 * therefore refuse a post, or an email linking to a post, until the post's date has passed in
 * Portland: the day after its date is the first day it can go to Kit.
 */

import { addDays } from "./publish-dates.js";

// Absolute rubick.com links, and Markdown links to a site-relative path.
const POST_LINK = /(?:rubick\.com|\]\()\/([a-z0-9][a-z0-9-]*)/gi;

/**
 * True when a post dated `date` may not be live yet on `today` (both YYYY-MM-DD, Portland).
 * Undated posts count as live, as they do on the site.
 */
export function tooSoonForKit(date, today) {
  return Boolean(date) && date >= today;
}

/** The first day a post dated `date` can go to Kit, or null for an undated post. */
export function kitReadyDate(date) {
  return date ? addDays(date, 1) : null;
}

/** Slugs linked from `text`, in order, without repeats. */
export function linkedSlugs(text) {
  return [...new Set([...text.matchAll(POST_LINK)].map((m) => m[1].toLowerCase()))];
}

const wait = (date) => `it can go to Kit from ${kitReadyDate(date)}`;

/**
 * Why `text` (and its own post `date`, if it is a post) can't go to Kit yet, as messages;
 * empty when it can.
 * @param {{ text: string, date?: string, slug?: string }} item the post's own slug, so a link
 *   to itself isn't reported twice
 * @param {{ slug: string, date: string }[]} posts every post, with its date
 * @param {string} today YYYY-MM-DD in the site's time zone
 */
export function kitScheduleProblems({ text, date, slug: self }, posts, today) {
  const problems = [];
  if (tooSoonForKit(date, today)) problems.push(`this post goes live ${date}; ${wait(date)}`);
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  for (const slug of linkedSlugs(text).filter((s) => s !== self)) {
    const post = bySlug.get(slug);
    if (post && tooSoonForKit(post.date, today)) {
      problems.push(`it links to /${slug}/, scheduled for ${post.date}; ${wait(post.date)}`);
    }
  }
  return problems;
}
