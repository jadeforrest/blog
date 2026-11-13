import { getCollection, type CollectionEntry } from "astro:content";
import { datePrefix, isPublished, postSlug, siteToday } from "../../scripts/lib/publish-dates.js";

export type DatedPost = CollectionEntry<"posts"> & { date: string; slug: string };

/**
 * Posts with their date and slug, newest first. A post dated in the future is
 * left out of the build (no page, listing, tag, RSS item or sitemap entry)
 * until a build runs on its date; scripts/blog-post-day.js triggers that build.
 * The dev server shows everything so scheduled posts can be previewed.
 */
export async function getPublishedPosts(): Promise<DatedPost[]> {
  const today = siteToday();
  return (await getCollection("posts"))
    .map((post) => ({
      ...post,
      date: datePrefix(post.id, post.data.date || ""),
      slug: postSlug(post.id),
    }))
    .filter((post) => import.meta.env.DEV || isPublished(post.date, today))
    .sort((a, b) => b.date.localeCompare(a.date));
}
