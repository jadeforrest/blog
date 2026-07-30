import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  BLUESKY_MAX_GRAPHEMES,
  graphemeCount,
  byteLength,
  fitsBlueskyLimit,
  trimToWholeSentences,
  enforceLimits,
  escapeForAppleScript,
} from "./text-limits.js";

test("counts graphemes, not UTF-16 code units", () => {
  assert.equal(graphemeCount("👨‍👩‍👧‍👦"), 1);
  assert.equal("👨‍👩‍👧‍👦".length, 11); // what the old code would have measured
  assert.equal(graphemeCount("café"), 4);
  assert.equal(graphemeCount("café"), 4); // combining accent
  assert.equal(graphemeCount(""), 0);
});

test("the byte limit rejects text the grapheme limit would allow", () => {
  // 300 simple emoji: at the grapheme limit, well under the byte limit.
  const simple = "🎉".repeat(300);
  assert.equal(graphemeCount(simple), 300);
  assert.equal(byteLength(simple), 1200);
  assert.equal(fitsBlueskyLimit(simple), true);

  // 300 family emoji: same grapheme count, but 25 bytes each blows the byte cap.
  const heavy = "👨‍👩‍👧‍👦".repeat(300);
  assert.equal(graphemeCount(heavy), 300);
  assert.ok(byteLength(heavy) > 3000);
  assert.equal(fitsBlueskyLimit(heavy), false);
});

test("keeps text that already fits, unchanged", () => {
  const text = "Short and sweet. Nothing to do here.";
  assert.equal(trimToWholeSentences(text), text);
});

test("drops trailing sentences to fit, staying verbatim", () => {
  // The extract that shipped the (238 characters) bug.
  const source =
    "For example, an engineer may decide to make a breaking change to save their team a month of work. " +
    "If ten other teams each spend two weeks adapting to that change, the organization loses five months of engineering time. " +
    "It is an inexpensive decision for the team member, but an expensive decision for the whole organization, due to externalized costs.";

  assert.equal(fitsBlueskyLimit(source), false);
  const trimmed = trimToWholeSentences(source);

  assert.ok(trimmed);
  assert.ok(fitsBlueskyLimit(trimmed));
  assert.ok(source.startsWith(trimmed), "must remain a verbatim prefix");
  assert.match(trimmed, /engineering time\.$/);
});

test("returns null when even the first sentence is too long", () => {
  assert.equal(trimToWholeSentences("y".repeat(400)), null);
});

test("does not split on common abbreviations", () => {
  const text = "See e.g. the docs. " + "x".repeat(400);
  assert.equal(trimToWholeSentences(text, 40), "See e.g. the docs.");
});

test("keeps closing quotes with the sentence they end", () => {
  const text = 'She said "this matters." ' + "x".repeat(400);
  assert.equal(trimToWholeSentences(text, 40), 'She said "this matters."');
});

test("enforceLimits trims, keeps, and drops appropriately", () => {
  const fits = "A short extract.";
  const trimmable = "First sentence here. " + "b".repeat(320) + ".";
  const unsalvageable = "c".repeat(400);

  const { kept, dropped } = enforceLimits([fits, trimmable, unsalvageable]);

  assert.deepEqual(kept, [fits, "First sentence here."]);
  assert.deepEqual(dropped, [unsalvageable]);
});

test("enforceLimits ignores empty and whitespace-only entries", () => {
  const { kept, dropped } = enforceLimits(["", "   ", null, undefined, "Real one."]);
  assert.deepEqual(kept, ["Real one."]);
  assert.deepEqual(dropped, []);
});

test("escapes AppleScript string literals", () => {
  assert.equal(escapeForAppleScript('say "hi"'), 'say \\"hi\\"');
  assert.equal(escapeForAppleScript("back\\slash"), "back\\\\slash");
});

// --- Property tests -------------------------------------------------------
// The verbatim guarantee is the property that must never regress: a trimmed
// extract is still an exact quote of the source post, only shorter.

const sentenceArb = fc
  .tuple(
    fc.stringMatching(/^[A-Za-z][A-Za-z ,;'-]{0,120}$/),
    fc.constantFrom(".", "!", "?", '."', ".'")
  )
  .map(([body, end]) => body.trim() + end)
  .filter((s) => s.length > 2);

const proseArb = fc
  .array(sentenceArb, { minLength: 1, maxLength: 12 })
  .map((sentences) => sentences.join(" "));

test("property: output is always a verbatim prefix within the limit", () => {
  fc.assert(
    fc.property(proseArb, (prose) => {
      const result = trimToWholeSentences(prose);
      if (result === null) {
        // Only legal when no sentence boundary yields something that fits.
        return !fitsBlueskyLimit(prose);
      }
      return (
        prose.startsWith(result) && // (b) verbatim prefix
        fitsBlueskyLimit(result) && // (a) within the limit
        /[.!?]["'”’»)\]]*$/.test(result) // (c) ends at a sentence terminator
      );
    }),
    { numRuns: 2000 }
  );
});

test("property: never exceeds the grapheme limit on arbitrary unicode", () => {
  fc.assert(
    fc.property(fc.string({ unit: "grapheme", maxLength: 900 }), (text) => {
      const result = trimToWholeSentences(text);
      return result === null || graphemeCount(result) <= BLUESKY_MAX_GRAPHEMES;
    }),
    { numRuns: 2000 }
  );
});

test("property: enforceLimits output is always postable and verbatim", () => {
  fc.assert(
    fc.property(fc.array(proseArb, { maxLength: 6 }), (extracts) => {
      const { kept } = enforceLimits(extracts);
      return kept.every(
        (k) =>
          fitsBlueskyLimit(k) &&
          extracts.some((original) => original.trim().startsWith(k))
      );
    }),
    { numRuns: 1000 }
  );
});
