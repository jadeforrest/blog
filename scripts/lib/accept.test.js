import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { HTML, MARKDOWN, isAcceptable, matchQuality, negotiate, parseAccept } from "./accept.js";

const CHROME =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";

// Test vectors from https://acceptmarkdown.com/guides/accept-parsing, plus
// real client headers.
const VECTORS = [
  ["text/markdown", MARKDOWN],
  ["text/markdown, text/html;q=0.8", MARKDOWN],
  ["text/html", HTML],
  ["text/markdown;q=0, text/html", HTML],
  [undefined, HTML],
  ["", HTML],
  ["*/*", HTML],
  [CHROME, HTML],
  ["text/markdown, text/html, */*", MARKDOWN],
  ["text/html;q=0.9, text/markdown", MARKDOWN],
  ["text/markdown;q=0.5, text/html", HTML],
  ["text/*", HTML],
  ["text/*, text/markdown;q=0", HTML],
  ["TEXT/MARKDOWN", MARKDOWN],
  ["text/markdown; charset=utf-8; variant=GFM", MARKDOWN],
  ["text/markdown;q=0", null],
  ["application/pdf", null],
  ["application/json, image/*", null],
  ["*/*;q=0", null],
  [",,,", HTML],
  ["garbage", HTML],
];

for (const [header, expected] of VECTORS) {
  test(`negotiate(${JSON.stringify(header)}) -> ${expected}`, () => {
    assert.equal(negotiate(header), expected);
  });
}

test("parseAccept reads types, params and q", () => {
  assert.deepEqual(parseAccept(" Text/HTML ;level=1; q=0.5 , */*"), [
    { type: "text", subtype: "html", q: 0.5 },
    { type: "*", subtype: "*", q: 1 },
  ]);
});

test("malformed or out-of-range q values are clamped, not dropped", () => {
  assert.equal(parseAccept("text/markdown;q=high")[0].q, 1);
  assert.equal(parseAccept("text/markdown;q=")[0].q, 1);
  assert.equal(parseAccept("text/markdown;q=7")[0].q, 1);
  assert.equal(parseAccept("text/markdown;q=-1")[0].q, 0);
});

test("the most specific entry sets q, even when a wildcard is higher", () => {
  const entries = parseAccept("*/*;q=1, text/*;q=0.5, text/markdown;q=0.1");
  assert.deepEqual(matchQuality(entries, MARKDOWN), { q: 0.1, specificity: 2 });
  assert.deepEqual(matchQuality(entries, HTML), { q: 0.5, specificity: 1 });
  assert.equal(matchQuality(parseAccept("image/png"), HTML), null);
});

test("isAcceptable", () => {
  assert.equal(isAcceptable(undefined, HTML), true);
  assert.equal(isAcceptable(" ", HTML), true);
  assert.equal(isAcceptable(",", HTML), true);
  assert.equal(isAcceptable("text/markdown", HTML), false);
  assert.equal(isAcceptable("text/markdown, */*;q=0.1", HTML), true);
  assert.equal(isAcceptable("text/html;q=0", HTML), false);
});

// Property: whatever the header, the chosen type is one the client accepts,
// and no other offered type has a strictly higher q.
const mediaRange = fc.constantFrom(
  "text/html", "text/markdown", "text/*", "*/*", "application/json", "image/webp", "text/plain"
);
const qValue = fc.oneof(fc.constant(""), fc.constantFrom("0", "0.1", "0.5", "0.8", "1", "1.0", "x"));
const entry = fc.tuple(mediaRange, qValue).map(([r, q]) => (q === "" ? r : `${r};q=${q}`));
const header = fc.array(entry, { minLength: 1, maxLength: 6 }).map((e) => e.join(", "));

test("property: negotiation never picks a refused or dominated type", () => {
  fc.assert(
    fc.property(header, (h) => {
      const entries = parseAccept(h);
      const q = (t) => matchQuality(entries, t)?.q ?? 0;
      const choice = negotiate(h);
      if (choice === null) {
        assert.equal(q(HTML), 0);
        assert.equal(q(MARKDOWN), 0);
        return;
      }
      assert.ok(q(choice) > 0, `chose ${choice} with q=0 for ${h}`);
      const other = choice === HTML ? MARKDOWN : HTML;
      assert.ok(q(other) <= q(choice), `${other} preferred for ${h}`);
    })
  );
});

test("property: arbitrary strings never throw", () => {
  fc.assert(
    fc.property(fc.string({ unit: "binary", maxLength: 200 }), (s) => {
      const out = negotiate(s);
      assert.ok(out === HTML || out === MARKDOWN || out === null);
      isAcceptable(s, HTML);
    })
  );
});

test("only the q parameter sets quality; params may have spaces", () => {
  assert.equal(parseAccept("text/html;level=0")[0].q, 1);
  assert.equal(parseAccept("text/html; q = 0.4 ")[0].q, 0.4);
  assert.equal(negotiate("text/html; q = 0.4, text/markdown;level=0"), MARKDOWN);
});

test("a */subtype range is malformed and matches nothing", () => {
  assert.equal(matchQuality(parseAccept("*/markdown"), MARKDOWN), null);
  assert.equal(negotiate("*/markdown"), null);
});

test("repeated entries: the higher q wins regardless of order", () => {
  for (const h of ["text/markdown;q=0.9, text/markdown;q=0.2", "text/markdown;q=0.2, text/markdown;q=0.9"]) {
    assert.deepEqual(matchQuality(parseAccept(h), MARKDOWN), { q: 0.9, specificity: 2 });
  }
});

test("a later, less specific entry never overrides a more specific one", () => {
  const entries = parseAccept("text/markdown;q=0.1, text/*;q=0.5, */*");
  assert.deepEqual(matchQuality(entries, MARKDOWN), { q: 0.1, specificity: 2 });
});
