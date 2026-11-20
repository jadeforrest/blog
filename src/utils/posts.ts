import { getCollection, type CollectionEntry } from "astro:content";
import { publishedPosts, siteToday } from "../../scripts/lib/publish-dates.js";

export type DatedPost = CollectionEntry<"posts"> & { date: string; slug: string };

/**
 * Posts with their date and slug, newest first. A post dated in the future is
 * left out of the build (no page, listing, tag, RSS item or sitemap entry)
 * until a build runs on its date; scripts/blog-post-day.js triggers that build.
 * The dev server shows everything so scheduled posts can be previewed.
 * The rules are in publishedPosts() (scripts/lib/publish-dates.js), which is unit-tested.
 */
export async function getPublishedPosts(): Promise<DatedPost[]> {
  return publishedPosts(await getCollection("posts"), {
    today: siteToday(),
    showAll: import.meta.env.DEV,
  });
}
