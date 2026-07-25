// @ts-check
import { defineConfig, fontProviders } from "astro/config";
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
  // Self-hosted so no render-blocking request to fonts.googleapis.com sits ahead
  // of the LCP element. Astro inlines the @font-face rules, emits the preload
  // link, and (via optimizedFallbacks, on by default) generates metric-matched
  // fallback faces so the swap does not shift layout.
  //
  // Use the fontsource provider rather than npm: the npm one reads the package's
  // index.css, which carries every unicode-range subset, so `subsets` cannot
  // filter it and italics live in files it never reads. That produced 10 preload
  // links and no real italic. fontsource honours `subsets` and resolves both
  // styles, giving one latin file per family per style.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Open Sans",
      cssVariable: "--font-open-sans",
      weights: ["300 800"],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["Arial", "sans-serif"],
      display: "swap",
    },
    {
      provider: fontProviders.fontsource(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      weights: ["200 800"],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["Georgia", "Times New Roman", "serif"],
      display: "swap",
    },
  ],
  // `prefetchAll` opts every internal link in; `defaultStrategy` decides when.
  // "hover" fetches on mouseenter/focus (touchstart/mousedown on mobile), one
  // page at a time on genuine intent - not a bulk fetch on load. Astro dedupes
  // and skips prefetching entirely under save-data or a 2g effectiveType.
  // Deliberately not "viewport": /posts/ has ~20 internal links and would fire
  // ~20 HTML requests on load.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },

  // Removes a render-blocking round trip on the path that gates LCP paint. The
  // tradeoff is that repeat visitors no longer get a cached BaseLayout.css; for
  // a blog where most sessions arrive cold from search or social, the
  // first-visit win dominates. Compounds with prefetch, since prefetched HTML
  // then carries its own CSS.
  build: { inlineStylesheets: "always" },

  redirects: {
    "/tag/[tag]": "/tags/[tag]",
  },
});
