import rss from "@astrojs/rss";
import { getPublishedPosts } from "../utils/posts";
import type { APIContext } from "astro";
import { marked } from "marked";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

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
