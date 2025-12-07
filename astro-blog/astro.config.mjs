// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import remarkSmartypants from "remark-smartypants";

// https://astro.build/config
export default defineConfig({
  site: "https://www.rubick.com",
  integrations: [react(), sitemap()],
  markdown: {
    shikiConfig: { theme: "github-dark" },
    remarkPlugins: [remarkSmartypants],
  },
});
