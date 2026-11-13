/**
 * Decisions for scripts/post-day.js, kept free of I/O so they can be tested.
 *
 * State shape:
 *   lastChecked   YYYY-MM-DD; the last day a build was considered
 *   announceFrom  YYYY-MM-DD; posts dated before this are never announced (set on first run,
 *                 so installing the job doesn't announce the whole archive)
 *   announced     { [slug]: { bluesky?: ISO time, linkedin?: ISO time } }
 */

import fs from "fs";
import path from "path";
import { fitsBlueskyLimit } from "./text-limits.js";
import { parseFrontmatter } from "./frontmatter.js";
import { datePrefix, dayBefore, isPublished, postSlug, publishedSince } from "./publish-dates.js";

export const SITE = "https://www.rubick.com";
export const PLATFORMS = ["bluesky", "linkedin"];

/** @typedef {{ dir: string, date: string, slug: string, title: string, description: string, url: string }} Post */

/**
 * Posts under `postsDir`, from directory names and frontmatter.
 * @param {string} postsDir
 * @returns {Post[]}
 */
export function readPosts(postsDir) {
  return fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const file = ["index.mdx", "index.md"].map((f) => path.join(postsDir, d.name, f)).find(fs.existsSync);
      if (!file) return [];
      const { data } = parseFrontmatter(fs.readFileSync(file, "utf8"), file);
      const slug = postSlug(d.name);
      return [{
        dir: d.name,
        date: datePrefix(d.name, frontmatterDate(data.date)),
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        url: `${SITE}/${slug}/`,
      }];
    });
}

/** YAML reads an unquoted 2020-01-02 as a Date; keep it a YYYY-MM-DD string either way. */
function frontmatterDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ? String(value) : "";
}

/** @param {string} today */
export function initialState(today) {
  return { lastChecked: dayBefore(today), announceFrom: today, announced: {} };
}

/**
 * Platforms a post still needs announcing on.
 * @param {Post} post
 * @param {{ announced: Record<string, Record<string, string>> }} state
 */
export function missingPlatforms(post, state) {
  const done = state.announced[post.slug] ?? {};
  return PLATFORMS.filter((p) => !done[p]);
}

/**
 * What to do today.
 * - `due`: posts that went live since the last check; a build is needed for them to appear.
 * - `toAnnounce`: live posts (on or after announceFrom) not yet announced everywhere. Retried
 *   daily until they are, so a LinkedIn outage doesn't lose the announcement.
 * - `missingHook`: a post is due or scheduled and there is no build hook, so it would never go
 *   live by itself. Reported before the date as well as on it.
 * @param {{ posts: Post[], state: ReturnType<typeof initialState>, today: string, hasHook: boolean }} input
 */
export function plan({ posts, state, today, hasHook }) {
  const due = publishedSince(posts, state.lastChecked, today);
  const upcoming = posts.filter((p) => !isPublished(p.date, today));
  const toAnnounce = posts.filter(
    (p) => p.date >= state.announceFrom && isPublished(p.date, today) && missingPlatforms(p, state).length > 0,
  );
  return { due, upcoming, toAnnounce, missingHook: !hasHook && due.length + upcoming.length > 0 };
}

/**
 * The announcement text. The link goes in the card, so it isn't repeated in the text. The
 * description is dropped on Bluesky when it would push the post over the limit, and the title
 * is never altered: if even that doesn't fit, it's returned as is and the caller refuses it.
 * @param {Post} post
 * @param {"bluesky" | "linkedin"} platform
 */
export function announcementText(post, platform) {
  const headline = `New post: ${post.title}`;
  const full = post.description ? `${headline}\n\n${post.description}` : headline;
  if (platform === "linkedin" || fitsBlueskyLimit(full)) return full;
  return headline;
}
