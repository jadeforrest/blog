// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import remarkSmartypants from "remark-smartypants";

// https://astro.build/config
export default defineConfig({
  site: "https://www.rubick.com",
  integrations: [react(), sitemap(), mdx()],
  markdown: {
    // Astro 7 defaults to the Sätteri engine; switch back to the unified
    // (remark/rehype) processor so remark-smartypants keeps running.
    processor: unified({ remarkPlugins: [remarkSmartypants] }),
    shikiConfig: { theme: "github-dark" },
  },
  redirects: {
    "/tag/[tag]": "/tags/[tag]",
  },
});
