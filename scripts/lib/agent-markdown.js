// Turns the built HTML pages into the Markdown variants served to agents
// (Accept: text/markdown, see netlify/edge-functions/agent-negotiation.js),
// plus /llms.txt and the Markdown 404 body. Input is our own Astro output, so
// metadata is read with targeted regexes rather than a full DOM.
import TurndownService from "turndown";
import { SITE, markdownPathFor } from "./agent-paths.js";

export { SITE, markdownPathFor };
const SITE_TITLE_SUFFIX = / \| Jade Rubick - Engineering Leadership$/;

// Relative dist path of a page ("foo/index.html") -> its URL path ("/foo/"),
// or null for files that are not directory-index pages (404.html etc).
export function urlPathForHtmlFile(relPath) {
  const normalized = relPath.split("\\").join("/");
  if (normalized === "index.html") return "/";
  if (!normalized.endsWith("/index.html")) return null;
  return `/${normalized.slice(0, -"index.html".length)}`;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, ref) => {
    if (ref[0] === "#") {
      const code = ref[1].toLowerCase() === "x" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[ref.toLowerCase()] ?? m;
  });
}

function metaContent(html, attr, name) {
  const tag = html.match(new RegExp(`<meta[^>]*\\b${attr}="${name}"[^>]*>`, "i"));
  const content = tag && tag[0].match(/\bcontent="([^"]*)"/i);
  return content ? decodeEntities(content[1]) : "";
}

// Pulls what the Markdown variant needs out of a built page. `redirect` marks
// Astro's meta-refresh stubs (from `redirects` in astro.config.mjs), which get
// no Markdown twin.
export function extractPage(html) {
  const title = html.match(/<title>([^<]*)<\/title>/i);
  const main = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i);
  return {
    title: title ? decodeEntities(title[1]).replace(SITE_TITLE_SUFFIX, "").trim() : "",
    description: metaContent(html, "name", "description"),
    canonical: (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || "",
    redirect: /<meta http-equiv="refresh"/i.test(html),
    isPost: /<article class="blog-post"/i.test(html),
    mainHtml: main ? main[1] : "",
  };
}

function absolutize(url) {
  if (!url || /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(url)) return url;
  try {
    return new URL(url, SITE).href;
  } catch {
    return url;
  }
}

let turndown;
function converter() {
  if (turndown) return turndown;
  turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  // Chrome and interactivity that carries no content for a reader.
  turndown.remove(["script", "style", "noscript", "form", "button", "svg", "iframe", "template"]);
  turndown.remove((node) => /\btalkyard-comments\b/.test(node.getAttribute?.("class") || ""));
  turndown.addRule("absoluteLinks", {
    filter: (node) => node.nodeName === "A" && node.getAttribute("href"),
    replacement: (content, node) => {
      const text = content.trim();
      if (!text) return "";
      return `[${text}](${absolutize(node.getAttribute("href"))})`;
    },
  });
  turndown.addRule("absoluteImages", {
    filter: "img",
    replacement: (_content, node) => {
      const src = node.getAttribute("src");
      if (!src) return "";
      const alt = (node.getAttribute("alt") || "").replace(/[\[\]\n]/g, " ").trim();
      return `![${alt}](${absolutize(src)})`;
    },
  });
  return turndown;
}

// Flex layouts put adjacent inline elements (date + author, tag chips, CTA
// buttons) side by side with CSS gaps but no whitespace, which would run their
// text together in Markdown.
const ADJACENT_INLINE = /<\/(a|time|span)>(?=<(?:a|time|span)\b)/g;

export function htmlToMarkdown(html) {
  return converter()
    .turndown((html || "").replace(ADJACENT_INLINE, "</$1> "))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// YAML double-quoted scalars accept JSON string syntax, so JSON.stringify
// gives correct escaping for quotes, backslashes and newlines.
function yamlString(s) {
  return JSON.stringify(String(s));
}

export function pageToMarkdown(page) {
  const front = ["---", `title: ${yamlString(page.title)}`];
  if (page.description) front.push(`description: ${yamlString(page.description)}`);
  if (page.canonical) front.push(`url: ${yamlString(page.canonical)}`);
  front.push("---", "");
  return `${front.join("\n")}\n${htmlToMarkdown(page.mainHtml)}\n`;
}

// Body for 404s requested as Markdown: where an agent should go instead.
export function notFoundMarkdown() {
  return [
    "# Page not found",
    "",
    "There is no page at this address on rubick.com.",
    "",
    "## Where to look next",
    "",
    `- [Home](${SITE}/) — engineering leadership writing by Jade Rubick`,
    `- [All posts](${SITE}/posts/)`,
    `- [Wiki](${SITE}/wiki/)`,
    `- [About / work with Jade](${SITE}/about/)`,
    `- [llms.txt](${SITE}/llms.txt) — index of every page, with Markdown links`,
    `- [Sitemap](${SITE}/sitemap-index.xml)`,
    "",
    "Any page on this site is available as Markdown: request it with `Accept: text/markdown`, or append `index.md` to its path.",
    "",
  ].join("\n");
}

const KEY_PAGES = ["/about/", "/newsletter/", "/course/", "/decoding-leadership/", "/contact/", "/posts/", "/wiki/"];

function linkLine(page) {
  const label = page.title.replace(/[\[\]]/g, "");
  const note = page.description ? `: ${page.description.replace(/\s+/g, " ").trim()}` : "";
  return `- [${label}](${SITE}${markdownPathFor(page.path)})${note}`;
}

// https://llmstxt.org: H1, blockquote summary, then H2 sections of links.
// Links point at the Markdown variants. Pagination, tag and utility pages are
// left out; they are reachable from the sitemap.
export function buildLlmsTxt(pages) {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const keyPages = KEY_PAGES.map((p) => byPath.get(p)).filter(Boolean);
  const posts = pages.filter((p) => p.isPost).sort((a, b) => a.title.localeCompare(b.title));
  const wiki = pages
    .filter((p) => p.path.startsWith("/wiki/") && p.path !== "/wiki/")
    .sort((a, b) => a.path.localeCompare(b.path));
  const lines = [
    "# Jade Rubick — Engineering Leadership",
    "",
    "> Writing, courses and advising on building humane, effective engineering organizations, by Jade Rubick (Jade Rubick Consulting, LLC).",
    "",
    "Every page is also served as Markdown: send `Accept: text/markdown` to its URL, or use the `index.md` links below.",
    "",
  ];
  const section = (heading, items) => {
    if (items.length === 0) return;
    lines.push(`## ${heading}`, "", ...items.map(linkLine), "");
  };
  section("Key pages", keyPages);
  section("Posts", posts);
  section("Wiki", wiki);
  lines.push("## Optional", "", `- [Sitemap](${SITE}/sitemap-index.xml): every URL on the site`, "");
  return lines.join("\n");
}

// Advertises the Markdown twin from the HTML page itself.
export function injectAlternateLink(html, pathname) {
  const tag = `<link rel="alternate" type="text/markdown" href="${markdownPathFor(pathname)}">`;
  if (html.includes(tag) || !html.includes("</head>")) return html;
  return html.replace("</head>", `${tag}</head>`);
}
