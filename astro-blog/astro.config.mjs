// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkSmartypants from "remark-smartypants";
import { remarkReimg } from "./src/plugins/remark-reimg.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://www.rubick.com",
  integrations: [
    react(),
    sitemap(),
    mdx({
      remarkPlugins: [remarkReimg, remarkSmartypants],
    }),
  ],
  markdown: {
    shikiConfig: { theme: "github-dark" },
    remarkPlugins: [remarkReimg, remarkSmartypants],
  },
});
