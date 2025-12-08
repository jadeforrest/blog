#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const RSSParser = require("rss-parser");

const RSS_URL = "https://anchor.fm/s/f420aba8/podcast/rss";
const MAX_EPISODES = 5;
const START_MARKER = "<!-- PODCAST-LIST:START";
const END_MARKER = "<!-- PODCAST-LIST:END -->";

const PODCAST_PAGE_PATH = path.join(
  __dirname,
  "..",
  "content",
  "pages",
  "4--decoding-leadership",
  "index.md"
);

(async () => {
  const parser = new RSSParser({
    customFields: {
      item: [["content:encoded", "contentEncoded"]]
    }
  });

  const feed = await parser.parseURL(RSS_URL);
  const episodes = (feed.items || []).slice(0, MAX_EPISODES);

  if (episodes.length === 0) {
    throw new Error("No podcast episodes found in the RSS feed.");
  }

  const html = buildHtml(episodes);

  const fileContent = await fs.readFile(PODCAST_PAGE_PATH, "utf8");
  const updatedContent = injectHtmlBlock(fileContent, html);

  await fs.writeFile(PODCAST_PAGE_PATH, updatedContent, "utf8");
  console.log(`Updated podcast page with ${episodes.length} episode(s).`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function buildHtml(episodes) {
  const styles = [
    "<style>",
    ".podcast-episode-grid {",
    "  display: grid;",
    "  gap: 1.5rem;",
    "  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));",
    "  margin: 2rem 0;",
    "}",
    ".podcast-episode-card {",
    "  background: #ffffff;",
    "  border: 1px solid #e2e8f0;",
    "  border-radius: 12px;",
    "  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);",
    "  padding: 1.5rem;",
    "  display: flex;",
    "  flex-direction: column;",
    "  gap: 0.75rem;",
    "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
    "}",
    ".podcast-episode-card:hover {",
    "  transform: translateY(-4px);",
    "  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);",
    "}",
    ".podcast-episode-card h3 {",
    "  margin: 0;",
    "  font-size: 1.1rem;",
    "  line-height: 1.4;",
    "}",
    ".podcast-episode-card time {",
    "  font-size: 0.9rem;",
    "  color: #64748b;",
    "}",
    ".podcast-episode-card p {",
    "  margin: 0;",
    "  color: #334155;",
    "  line-height: 1.6;",
    "}",
    ".podcast-episode-card a {",
    "  align-self: flex-start;",
    "  margin-top: auto;",
    "  display: inline-flex;",
    "  align-items: center;",
    "  gap: 0.5rem;",
    "  padding: 0.55rem 1rem;",
    "  border-radius: 9999px;",
    "  background: #0f172a;",
    "  color: #ffffff;",
    "  text-decoration: none;",
    "  font-weight: 600;",
    "}",
    ".podcast-episode-card a:hover {",
    "  background: #1e293b;",
    "}",
    "@media (max-width: 640px) {",
    "  .podcast-episode-grid {",
    "    grid-template-columns: 1fr;",
    "  }",
    "}",
    "</style>"
  ].join("\n");

  const cards = episodes
    .map((episode) => buildEpisodeCard(episode))
    .join("\n");

  return [
    styles,
    '<section class="podcast-episode-section">',
    '  <h2 style="margin-top: 0;">Latest Episodes</h2>',
    '  <div class="podcast-episode-grid">',
    cards,
    "  </div>",
    "</section>"
  ].join("\n");
}

function buildEpisodeCard(episode) {
  const title = escapeHtml(episode.title || "Untitled episode");
  const link = escapeAttribute(episode.link || "#");
  const isoDate = episode.isoDate || episode.pubDate || new Date().toISOString();
  const formattedDate = formatDate(isoDate);
  const descriptionSource = episode.contentSnippet || episode.content || episode.contentEncoded || "";
  const description = escapeHtml(normalizeWhitespace(stripHtml(descriptionSource)));

  return [
    '    <article class="podcast-episode-card">',
    `      <h3>${title}</h3>`,
    `      <time datetime="${escapeAttribute(new Date(isoDate).toISOString())}">${formattedDate}</time>`,
    `      <p>${description}</p>`,
    `      <a href="${link}" target="_blank" rel="noopener noreferrer">Listen now</a>`,
    "    </article>"
  ].join("\n");
}

function injectHtmlBlock(fileContent, html) {
  const startMarkerIndex = fileContent.indexOf(START_MARKER);

  if (startMarkerIndex === -1) {
    throw new Error("Start marker not found in podcast page.");
  }

  const startCommentClose = fileContent.indexOf("-->", startMarkerIndex);

  if (startCommentClose === -1) {
    throw new Error("Start marker comment is not closed.");
  }

  const endMarkerIndex = fileContent.indexOf(END_MARKER, startCommentClose);

  if (endMarkerIndex === -1) {
    throw new Error("End marker not found in podcast page.");
  }

  const before = fileContent.slice(0, startCommentClose + 3).replace(/\s*$/, "");
  const after = fileContent.slice(endMarkerIndex);

  return `${before}\n\n${html}\n\n${after}`;
}

function formatDate(dateInput) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.valueOf())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, " ");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value));
}

function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}
