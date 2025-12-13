import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { marked } from "marked";

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

  // Convert MDX/Markdown content to HTML for RSS
  const processedPosts = posts.map((post) => {
    // Strip import statements and JSX components to get clean markdown
    let content = post.body;

    // Remove import statements
    content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");

    // Remove <Image> components and convert to simple markdown image syntax
    content = content.replace(
      /<Image\s+src=\{([^}]+)\}\s+alt=["']([^"']*)["'][^>]*\/>/g,
      "![$2]($1)"
    );

    // Remove other JSX/HTML-style tags but keep their content
    content = content.replace(/<\/?\w+[^>]*>/g, "");

    // Convert markdown to HTML
    const html = marked.parse(content);

    return {
      ...post,
      html,
    };
  });

  return rss({
    title: "Jade Rubick - Engineering Leadership",
    description: "Engineering leadership blog by Jade Rubick",
    site: context.site || "https://www.rubick.com",
    items: processedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description || "",
      pubDate: new Date(post.date),
      link: `/${post.slug}/`,
      content: post.html,
    })),
    customData: `<language>en-us</language>`,
  });
}
