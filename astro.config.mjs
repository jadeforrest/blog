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
  // The files are fontsource's latin variable fonts trimmed by
  // scripts/build-fonts.py to the design space the CSS uses: weight 400-700,
  // Open Sans width pinned, Newsreader split into a display cut (optical size
  // 28-56) and a text cut (pinned at 20). Per page that cut font bytes by about two thirds (Nov
  // 2026): they load at high priority next to the LCP image, so on slow
  // connections they delayed it. Using another weight, a width, or Newsreader
  // at a new size range means rerunning that script.
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Open Sans",
      cssVariable: "--font-open-sans",
      fallbacks: ["Arial", "sans-serif"],
      display: "swap",
      options: {
        variants: [
          { src: ["./src/assets/fonts/open-sans-normal.woff2"], weight: "400 700", style: "normal" },
          { src: ["./src/assets/fonts/open-sans-italic.woff2"], weight: "400 700", style: "italic" },
        ],
      },
    },
    {
      // Display sizes (28-56 px).
      provider: fontProviders.local(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      fallbacks: ["Georgia", "Times New Roman", "serif"],
      display: "swap",
      options: {
        variants: [
          { src: ["./src/assets/fonts/newsreader-display.woff2"], weight: "400 700", style: "normal" },
        ],
      },
    },
    {
      // Quote and lead sizes (19-21 px).
      provider: fontProviders.local(),
      name: "Newsreader Text",
      cssVariable: "--font-newsreader-text",
      fallbacks: ["Georgia", "Times New Roman", "serif"],
      display: "swap",
      options: {
        variants: [
          { src: ["./src/assets/fonts/newsreader-text-normal.woff2"], weight: "400 700", style: "normal" },
          { src: ["./src/assets/fonts/newsreader-text-italic.woff2"], weight: "400 700", style: "italic" },
        ],
      },
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
});
