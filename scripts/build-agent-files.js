#!/usr/bin/env node
// Post-build step (runs after `astro build`, before pagefind): writes a
// Markdown twin next to every built page (foo/index.html -> foo/index.md),
// links it from the page's <head>, and emits /llms.txt and /404.md. The
// Netlify edge function serves these when a client sends Accept: text/markdown.
//
// Usage: node scripts/build-agent-files.js [distDir]
import fs from "node:fs";
import path from "node:path";
import {
  buildLlmsTxt,
  extractPage,
  injectAlternateLink,
  notFoundMarkdown,
  pageToMarkdown,
  urlPathForHtmlFile,
} from "./lib/agent-markdown.js";

// Search index assets, not pages.
const SKIP_DIRS = new Set(["pagefind", "_astro"]);

function* htmlFiles(dir, root = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* htmlFiles(full, root);
    } else if (entry.name === "index.html") {
      yield path.relative(root, full);
    }
  }
}

export function buildAgentFiles(distDir) {
  const pages = [];
  for (const rel of htmlFiles(distDir)) {
    const urlPath = urlPathForHtmlFile(rel);
    const file = path.join(distDir, rel);
    const html = fs.readFileSync(file, "utf8");
    const page = extractPage(html);
    if (!urlPath || page.redirect || !page.mainHtml) continue;
    fs.writeFileSync(path.join(path.dirname(file), "index.md"), pageToMarkdown(page));
    fs.writeFileSync(file, injectAlternateLink(html, urlPath));
    pages.push({ ...page, path: urlPath });
  }
  fs.writeFileSync(path.join(distDir, "llms.txt"), buildLlmsTxt(pages));
  fs.writeFileSync(path.join(distDir, "404.md"), notFoundMarkdown());
  return pages;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const distDir = path.resolve(process.argv[2] || "dist");
  const pages = buildAgentFiles(distDir);
  console.log(`agent files: ${pages.length} Markdown pages, llms.txt, 404.md in ${distDir}`);
}
