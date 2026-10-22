// Checks the agent-negotiation routing in netlify.toml: ordinary page views
// must never invoke the edge function (it is billed per invocation), while
// every request the handler would answer with Markdown still reaches it.
// Netlify's matching is simulated from the declared patterns.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fc from "fast-check";
import { MARKDOWN, negotiate, parseAccept } from "./accept.js";

const toml = fs.readFileSync(new URL("../../netlify.toml", import.meta.url), "utf8");

// Each [[edge_functions]] block for agent-negotiation, as plain fields.
const declarations = toml
  .split("[[edge_functions]]")
  .slice(1)
  .map((block) => {
    const field = (name) => block.match(new RegExp(`^\\s*${name} = '([^']*)'`, "m"))?.[1];
    return {
      function: block.match(/function = "([^"]+)"/)?.[1],
      pattern: field("pattern"),
      excludedPattern: field("excludedPattern"),
      accept: field("accept"),
    };
  })
  .filter((d) => d.function === "agent-negotiation");

function invoked(pathname, accept) {
  return declarations.some(
    (d) =>
      new RegExp(d.pattern).test(pathname) &&
      !(d.excludedPattern && new RegExp(d.excludedPattern).test(pathname)) &&
      (!d.accept || (accept !== undefined && new RegExp(d.accept).test(accept))),
  );
}

const BROWSER = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

test("netlify.toml declares the function twice and nothing inline", () => {
  assert.equal(declarations.length, 2);
  const source = fs.readFileSync(
    new URL("../../netlify/edge-functions/agent-negotiation.js", import.meta.url),
    "utf8",
  );
  // An inline config would be merged over these declarations.
  assert.doesNotMatch(source, /export const config/);
});

test("browser and bare requests for pages skip the function", () => {
  for (const accept of [BROWSER, "*/*", "text/html", "", undefined]) {
    assert.equal(invoked("/", accept), false, `accept: ${accept}`);
    assert.equal(invoked("/some-post/", accept), false, `accept: ${accept}`);
  }
});

test("markdown requests for pages reach the function", () => {
  for (const accept of ["text/markdown", "Text/Markdown", "text/markdown, text/html;q=0.9"]) {
    assert.equal(invoked("/some-post/", accept), true, `accept: ${accept}`);
    assert.equal(invoked("/missing", accept), true, `accept: ${accept}`);
  }
});

test("direct .md requests reach the function whatever Accept says", () => {
  for (const accept of [BROWSER, "*/*", undefined]) {
    assert.equal(invoked("/some-post/index.md", accept), true);
    assert.equal(invoked("/404.md", accept), true);
  }
});

test("static assets skip the function even when markdown is accepted", () => {
  for (const path of ["/a/b.webp", "/_astro/x.css", "/llms.txt", "/rss.xml"]) {
    assert.equal(invoked(path, "text/markdown"), false, path);
  }
});

const mediaRange = fc.constantFrom(
  "text/markdown",
  "text/html",
  "application/xhtml+xml",
  "application/json",
  "text/plain",
  "text/*",
  "*/*",
);
const randomCase = (s) =>
  fc
    .array(fc.boolean(), { minLength: s.length, maxLength: s.length })
    .map((flips) => [...s].map((c, i) => (flips[i] ? c.toUpperCase() : c)).join(""));
const entry = fc
  .tuple(mediaRange.chain(randomCase), fc.option(fc.integer({ min: 0, max: 1000 })))
  .map(([range, q]) => (q === null ? range : `${range};q=${q / 1000}`));
const acceptHeader = fc.array(entry, { maxLength: 5 }).map((parts) => parts.join(", "));
const pagePath = fc
  .array(fc.stringMatching(/^[a-z0-9-]{1,12}$/), { maxLength: 3 })
  .chain((segs) => fc.constantFrom("/" + segs.join("/"), "/" + segs.join("/") + "/"));

test("property: any page the handler answers in Markdown for an explicit request is routed to it", () => {
  fc.assert(
    fc.property(acceptHeader, pagePath, (accept, path) => {
      const explicit = parseAccept(accept).some((e) => e.type === "text" && e.subtype === "markdown");
      if (explicit && negotiate(accept) === MARKDOWN) assert.ok(invoked(path, accept));
      // And a header that never names text/markdown never costs an invocation.
      if (!explicit) assert.equal(invoked(path, accept), false);
    }),
  );
});
