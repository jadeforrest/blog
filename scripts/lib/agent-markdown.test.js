import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fc from "fast-check";
import {
  buildLlmsTxt,
  decodeEntities,
  extractPage,
  htmlToMarkdown,
  injectAlternateLink,
  markdownPathFor,
  notFoundMarkdown,
  pageToMarkdown,
  urlPathForHtmlFile,
} from "./agent-markdown.js";
import { buildAgentFiles } from "../build-agent-files.js";

const PAGE = `<!doctype html><html><head>
<title>Tom &amp; Jerry&#39;s &#x201C;plan&#x201D; | Jade Rubick - Engineering Leadership</title>
<meta name="description" content="A &quot;quoted&quot; description">
<link rel="canonical" href="https://www.rubick.com/plan/">
</head><body><header><nav><a href="/posts/">Blog</a></nav></header>
<main class="site-main"><article class="blog-post"><h1>Plan</h1>
<div class="post-meta"><time>Sep 1, 2026</time><span>by Jade</span></div>
<p>See <a href="/other/">other</a> and <a href="https://example.com/x">ext</a> or <a href="#top">top</a> or <a href="mailto:a@b.c">mail</a>.</p>
<img src="/_astro/a.webp" alt="An [odd]
alt">
<img alt="no src">
<a href="/empty/"></a>
<form><h2>Subscribe</h2><input></form>
<script>evil()</script><style>.x{}</style>
<div class="talkyard-comments"><noscript>Enable JS</noscript></div>
</article></main><footer>Last updated</footer></body></html>`;

test("markdownPathFor", () => {
  assert.equal(markdownPathFor("/"), "/index.md");
  assert.equal(markdownPathFor("/foo/"), "/foo/index.md");
  assert.equal(markdownPathFor("/foo"), "/foo/index.md");
  assert.equal(markdownPathFor("/wiki/a/b/"), "/wiki/a/b/index.md");
});

test("urlPathForHtmlFile", () => {
  assert.equal(urlPathForHtmlFile("index.html"), "/");
  assert.equal(urlPathForHtmlFile("foo/index.html"), "/foo/");
  assert.equal(urlPathForHtmlFile("wiki\\a\\index.html"), "/wiki/a/");
  assert.equal(urlPathForHtmlFile("404.html"), null);
  assert.equal(urlPathForHtmlFile("foo/bar.html"), null);
});

test("decodeEntities", () => {
  assert.equal(decodeEntities("&amp;&lt;&gt;&quot;&apos;&nbsp;&#39;&#x41;&#65;"), "&<>\"'\u00a0'AA");
  assert.equal(decodeEntities("&bogus; &#0; &#x110000;"), "&bogus; &#0; &#x110000;");
});

test("extractPage reads metadata and main content", () => {
  const page = extractPage(PAGE);
  assert.equal(page.title, "Tom & Jerry's “plan”");
  assert.equal(page.description, 'A "quoted" description');
  assert.equal(page.canonical, "https://www.rubick.com/plan/");
  assert.equal(page.redirect, false);
  assert.equal(page.isPost, true);
  assert.match(page.mainHtml, /<h1>Plan<\/h1>/);
  assert.doesNotMatch(page.mainHtml, /Last updated|<nav>/);
});

test("extractPage on a redirect stub and on empty input", () => {
  const stub = extractPage('<html><head><meta http-equiv="refresh" content="0;url=/x/"></head></html>');
  assert.equal(stub.redirect, true);
  assert.equal(stub.mainHtml, "");
  assert.deepEqual(extractPage(""), {
    title: "",
    description: "",
    canonical: "",
    redirect: false,
    isPost: false,
    mainHtml: "",
  });
});

test("htmlToMarkdown: absolute links and images, chrome removed", () => {
  const md = htmlToMarkdown(extractPage(PAGE).mainHtml);
  assert.match(md, /^# Plan/);
  assert.match(md, /Sep 1, 2026 by Jade/);
  assert.match(md, /\[other\]\(https:\/\/www\.rubick\.com\/other\/\)/);
  assert.match(md, /\[ext\]\(https:\/\/example\.com\/x\)/);
  assert.match(md, /\[top\]\(#top\)/);
  assert.match(md, /\[mail\]\(mailto:a@b\.c\)/);
  assert.match(md, /!\[An  odd  alt\]\(https:\/\/www\.rubick\.com\/_astro\/a\.webp\)/);
  for (const gone of ["Subscribe", "evil", ".x{}", "Enable JS", "no src", "/empty/"]) {
    assert.ok(!md.includes(gone), gone);
  }
  assert.doesNotMatch(md, /\n{3,}/);
  assert.equal(htmlToMarkdown(undefined), "");
});

test("pageToMarkdown writes YAML-safe frontmatter", () => {
  const md = pageToMarkdown({ ...extractPage(PAGE), title: 'a "b"\n: c' });
  assert.ok(md.startsWith('---\ntitle: "a \\"b\\"\\n: c"\ndescription: "A \\"quoted\\" description"\nurl: "https://www.rubick.com/plan/"\n---\n\n# Plan'));
  const bare = pageToMarkdown({ title: "T", description: "", canonical: "", mainHtml: "<p>x</p>" });
  assert.equal(bare, '---\ntitle: "T"\n---\n\nx\n');
});

test("property: frontmatter title survives any string", () => {
  fc.assert(
    fc.property(fc.string(), (title) => {
      const md = pageToMarkdown({ title, description: "", canonical: "", mainHtml: "" });
      const line = md.split("\n")[1];
      assert.equal(JSON.parse(line.slice("title: ".length)), title);
    })
  );
});

test("property: htmlToMarkdown never throws and never leaks script bodies", () => {
  const fragment = fc.constantFrom(
    "<p>", "</p>", "<a href=\"/x/\">", "</a>", "<script>SECRET()</script>", "<img src=\"/i.png\" alt=\"[\">",
    "<h2>", "</h2>", "text", "&amp;", "<span>", "</span>", "<time>t</time>", "<ul><li>i</li></ul>", "<", ">"
  );
  fc.assert(
    fc.property(fc.array(fragment, { maxLength: 30 }), (parts) => {
      const md = htmlToMarkdown(parts.join(""));
      assert.ok(!md.includes("SECRET"));
    })
  );
});

test("notFoundMarkdown points at recovery resources", () => {
  const md = notFoundMarkdown();
  assert.match(md, /^# Page not found/);
  assert.match(md, /https:\/\/www\.rubick\.com\/llms\.txt/);
  assert.match(md, /https:\/\/www\.rubick\.com\/sitemap-index\.xml/);
  assert.match(md, /Accept: text\/markdown/);
});

test("buildLlmsTxt follows the llmstxt.org layout", () => {
  const pages = [
    { path: "/about/", title: "About", description: "Who", isPost: false },
    { path: "/zeta/", title: "Zeta [draft]", description: "  multi\n line ", isPost: true },
    { path: "/alpha/", title: "Alpha", description: "", isPost: true },
    { path: "/wiki/", title: "Wiki", description: "", isPost: false },
    { path: "/wiki/b/", title: "B", description: "", isPost: false },
    { path: "/wiki/a/", title: "A", description: "", isPost: false },
    { path: "/tags/x/", title: "Tag x", description: "", isPost: false },
  ];
  const txt = buildLlmsTxt(pages);
  const lines = txt.split("\n");
  assert.equal(lines[0], "# Jade Rubick — Engineering Leadership");
  assert.match(lines[2], /^> /);
  assert.ok(txt.includes("## Key pages\n\n- [About](https://www.rubick.com/about/index.md): Who\n"));
  assert.ok(txt.includes("- [Wiki](https://www.rubick.com/wiki/index.md)\n"));
  assert.ok(
    txt.includes(
      "## Posts\n\n- [Alpha](https://www.rubick.com/alpha/index.md)\n- [Zeta draft](https://www.rubick.com/zeta/index.md): multi line\n"
    )
  );
  assert.ok(txt.indexOf("/wiki/a/index.md") < txt.indexOf("/wiki/b/index.md"));
  assert.ok(!txt.includes("/tags/x/"));
  assert.match(txt, /## Optional\n\n- \[Sitemap\]/);
});

test("buildLlmsTxt with no posts or wiki omits those sections", () => {
  const txt = buildLlmsTxt([]);
  assert.ok(!txt.includes("## Posts"));
  assert.ok(!txt.includes("## Key pages"));
  assert.ok(txt.includes("## Optional"));
});

test("injectAlternateLink adds the link once, only when there is a head", () => {
  const once = injectAlternateLink("<html><head></head></html>", "/foo/");
  assert.equal(once, '<html><head><link rel="alternate" type="text/markdown" href="/foo/index.md"></head></html>');
  assert.equal(injectAlternateLink(once, "/foo/"), once);
  assert.equal(injectAlternateLink("<p>x</p>", "/foo/"), "<p>x</p>");
});

test("buildAgentFiles writes twins, llms.txt and 404.md", () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "agent-files-"));
  const write = (rel, body) => {
    fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true });
    fs.writeFileSync(path.join(dist, rel), body);
  };
  write("index.html", PAGE.replace("/plan/", "/"));
  write("plan/index.html", PAGE);
  write("tag/x/index.html", '<html><head><meta http-equiv="refresh" content="0;url=/tags/x/"></head></html>');
  write("pagefind/index.html", PAGE);
  write("404.html", PAGE);
  write("empty/index.html", "<html><head></head><body>no main</body></html>");

  const pages = buildAgentFiles(dist);
  assert.deepEqual(pages.map((p) => p.path).sort(), ["/", "/plan/"]);
  assert.match(fs.readFileSync(path.join(dist, "plan/index.md"), "utf8"), /# Plan/);
  assert.match(fs.readFileSync(path.join(dist, "plan/index.html"), "utf8"), /href="\/plan\/index\.md"/);
  for (const skipped of ["tag/x/index.md", "pagefind/index.md", "empty/index.md"]) {
    assert.equal(fs.existsSync(path.join(dist, skipped)), false, skipped);
  }
  assert.match(fs.readFileSync(path.join(dist, "llms.txt"), "utf8"), /plan\/index\.md/);
  assert.match(fs.readFileSync(path.join(dist, "404.md"), "utf8"), /# Page not found/);
  fs.rmSync(dist, { recursive: true });
});
