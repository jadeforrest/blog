import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const allPosts = await getCollection("posts");

  // Sort posts by date (newest first) and extract metadata
  const posts = allPosts
    .map((post) => {
      // Parse YYYY-MM-DD--slug format
      const dateMatch = post.id.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})--/);
      const date = dateMatch ? dateMatch[1] : post.data.date || "";

      const slug = post.id
        .replace(/^[0-9]{4}-[0-9]{2}-[0-9]{2}--/, "")
        .replace(/\/index\.(md|mdx)$/, "");

      return {
        ...post,
        date,
        slug,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return rss({
    title: "Jade Rubick - Engineering Leadership",
    description: "Engineering leadership blog by Jade Rubick",
    site: context.site || "https://www.rubick.com",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description || "",
      pubDate: new Date(post.date),
      link: `/${post.slug}/`,
      content: post.body,
    })),
    customData: `<language>en-us</language>`,
  });
}
