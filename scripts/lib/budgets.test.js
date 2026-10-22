import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { FLOORS, HEADROOM, compare, explainFailure, makeBudgets, measurePage, measureSite } from "./budgets.js";

const sizes = { "/_astro/page.js": 4000, "/_astro/a.webp": 20000, "/_astro/lazy.webp": 90000, "/s.css": 1500 };
const sizeOf = (p) => sizes[p] ?? null;

test("measurePage counts what a page ships", () => {
  const html = [
    '<script type="application/ld+json">{"big":"ignored"}</script>',
    '<script defer src="https://plausible.io/js/script.js"></script>',
    '<script type="module" src="/_astro/page.js?v=1"></script>',
    "<script>let a=1;</script>",
    '<script src="https://f.convertkit.com/ckjs/ck.5.js" defer></script>',
    "<style>body{color:red}</style>",
    '<link rel="stylesheet" href="/s.css">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css">',
    '<img src="/_astro/a.webp" loading="eager">',
    "<img src='/_astro/a.webp'>",
    '<img src="/_astro/lazy.webp" loading="lazy">',
    '<img src="data:image/png;base64,AAAA">',
    '<img src="/missing.webp">',
  ].join("\n");
  const m = measurePage(html, sizeOf);
  assert.equal(m.html, Buffer.byteLength(html));
  assert.equal(m.js, 4000 + "let a=1;".length);
  assert.equal(m.css, "body{color:red}".length + 1500);
  assert.equal(m.eagerImages, 40000); // two eager refs; lazy, data: and missing add nothing
  assert.equal(m.thirdParty, 3); // plausible.io, f.convertkit.com, fonts.googleapis.com
});

test("measureSite averages per page, ignoring images' bytes and the search index", () => {
  const files = [
    { path: "index.html", bytes: 100 },
    { path: "a/index.html", bytes: 100 },
    { path: "a/index.md", bytes: 50 },
    { path: "_astro/x.webp", bytes: 1000 },
    { path: "a/photo.JPG", bytes: 5000 },
    { path: "pagefind/pagefind.js", bytes: 99999 },
  ];
  assert.deepEqual(measureSite(files), { filesPerPage: 2.5, nonImageBytesPerPage: 125 });
  assert.deepEqual(measureSite([]), { filesPerPage: 0, nonImageBytesPerPage: 0 });
});

test("new posts with images don't move the site budget", () => {
  const site = (n) =>
    measureSite(
      Array.from({ length: n }, (_, i) => [
        { path: `p${i}/index.html`, bytes: 5000 },
        { path: `p${i}/hero.webp`, bytes: 400000 + i * 1000 },
      ]).flat(),
    );
  assert.deepEqual(compare({ site: site(150), pages: {} }, makeBudgets({ site: site(100), pages: {} })), []);
});

test("a bigger cover on a listing page stays within the floor; a new script doesn't", () => {
  const today = { site: {}, pages: { "/posts/": { html: 60000, eagerImages: 6600, js: 3700, thirdParty: 1 } } };
  const b = makeBudgets(today);
  const newCover = { site: {}, pages: { "/posts/": { ...today.pages["/posts/"], eagerImages: 90000, html: 64000 } } };
  assert.deepEqual(compare(newCover, b), []);
  const newScript = { site: {}, pages: { "/posts/": { ...today.pages["/posts/"], js: 3700 + FLOORS.js + 1 } } };
  assert.deepEqual(compare(newScript, b).map((v) => v.metric), ["js"]);
});

test("a Markdown twin for every page breaks the files-per-page budget (the Oct 2 change)", () => {
  const pages = Array.from({ length: 100 }, (_, i) => ({ path: `p${i}/index.html`, bytes: 5000 }));
  const assets = Array.from({ length: 400 }, (_, i) => ({ path: `_astro/${i}.webp`, bytes: 20000 }));
  const before = { site: measureSite([...pages, ...assets]), pages: {} };
  const twins = pages.map((p) => ({ path: p.path.replace(".html", ".md"), bytes: 3000 }));
  const after = { site: measureSite([...pages, ...assets, ...twins]), pages: {} };
  const violations = compare(after, makeBudgets(before));
  assert.deepEqual(violations.map((v) => v.metric), ["filesPerPage", "nonImageBytesPerPage"]);
});

test("compare reports over-budget and missing pages; under-budget is quiet", () => {
  const budgets = { site: { filesPerPage: 5 }, pages: { "/": { js: 100, thirdParty: 1 }, "/gone/": { html: 1 } } };
  const measured = { site: { filesPerPage: 5 }, pages: { "/": { js: 101, thirdParty: 1 } } };
  assert.deepEqual(compare(measured, budgets), [
    { where: "/", metric: "js", actual: 101, budget: 100 },
    { where: "/gone/", metric: "html", actual: "missing", budget: 1 },
  ]);
  assert.deepEqual(compare({ site: {}, pages: {} }, {}), []);
});

test("makeBudgets: 10% or the floor, whichever is larger; exact for third-party origins", () => {
  const b = makeBudgets({
    site: { filesPerPage: 6.111, nonImageBytesPerPage: 1000 },
    pages: { "/": { js: 1000, css: 100000, thirdParty: 2 } },
  });
  assert.deepEqual(b, {
    site: { filesPerPage: 6.73, nonImageBytesPerPage: 1100 },
    pages: { "/": { js: 1000 + FLOORS.js, css: 110000, thirdParty: 2 } },
  });
});

test("the failure message says how to fix, accept, or override", () => {
  const text = explainFailure([
    { where: "/", metric: "js", actual: 2048, budget: 1024 },
    { where: "/", metric: "thirdParty", actual: 3, budget: 2 },
    { where: "/gone/", metric: "html", actual: "missing", budget: 1 },
  ]);
  assert.match(text, /\/ js: 2\.0 KB \(budget 1\.0 KB\)/);
  assert.match(text, /\/ thirdParty: 3 \(budget 2\)/);
  assert.match(text, /\/gone\/ html: missing/);
  assert.match(text, /update KEY_PAGES/);
  assert.doesNotMatch(explainFailure([{ where: "/", metric: "js", actual: 2, budget: 1 }]), /KEY_PAGES/);
  assert.match(text, /npm run budgets:update/);
  assert.match(text, /BUDGETS_WARN_ONLY=1/);
});

test("property: a fresh build always passes the budgets made from it", () => {
  const metrics = fc.record({
    html: fc.nat(1e6),
    css: fc.nat(1e6),
    js: fc.nat(1e6),
    eagerImages: fc.nat(1e7),
    thirdParty: fc.nat(10),
  });
  const measured = fc.record({
    site: fc.record({ filesPerPage: fc.double({ min: 0, max: 50, noNaN: true }), nonImageBytesPerPage: fc.nat(1e7) }),
    pages: fc.dictionary(fc.constantFrom("/", "/a/", "/b/"), metrics),
  });
  fc.assert(
    fc.property(measured, (m) => {
      assert.deepEqual(compare(m, makeBudgets(m)), []);
      // and growth beyond the headroom on any size metric is caught
      for (const [page, pm] of Object.entries(m.pages)) {
        if (pm.js === 0) continue;
        const js = Math.ceil(Math.max(pm.js * (1 + HEADROOM), pm.js + FLOORS.js)) + 1;
        const grown = { ...m, pages: { ...m.pages, [page]: { ...pm, js } } };
        assert.ok(compare(grown, makeBudgets(m)).some((v) => v.where === page && v.metric === "js"));
      }
    }),
  );
});
