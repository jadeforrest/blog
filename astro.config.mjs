// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import remarkLcpImage from "./scripts/lib/remark-lcp-image.js";

// https://astro.build/config
export default defineConfig({
  site: "https://www.rubick.com",
  integrations: [react(), sitemap(), mdx()],
  markdown: {
    // Astro 7 defaults to the Sätteri engine; switch back to the unified
    // (remark/rehype) processor so remark-smartypants keeps running. Note that
    // both pipelines add smartypants themselves when `smartypants !== false`
    // (markdown-remark/index.js, mdx/plugins.js), so listing it here would just
    // run it twice. @astrojs/mdx inherits these plugins from the processor.
    processor: unified({ remarkPlugins: [remarkLcpImage] }),
    shikiConfig: { theme: "github-dark" },
  },
  redirects: {
    "/tag/[tag]": "/tags/[tag]",
  },
});
