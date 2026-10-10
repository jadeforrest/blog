import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  MAX_EXTRACTS_PER_CHUNK,
  buildExtractionPrompt,
  parseModelOutput,
  parseExtractFile,
  formatExtracts,
  appendExtracts,
  removeDuplicates,
  unverifiedFragments,
  parseSelection,
} from "./extract-content-lib.js";

// A single trimmed, non-empty line — what an extract or URL looks like in a file.
const line = fc
  .string({ minLength: 1, maxLength: 40 })
  .map((s) => s.replace(/\s+/g, " ").trim())
  .filter((s) => s.length > 0);
const pair = fc.record({ text: line, url: line }).map((p) => ({ ...p }));

test("prompt asks for 1-10 extracts and the new emphasis", () => {
  const prompt = buildExtractionPrompt({ title: "T", content: "Body text." });
  assert.match(prompt, /extract 0-10 sentences/);
  assert.match(prompt, /JSON array of strings/);
  assert.match(prompt, /Contrarian/);
  assert.match(prompt, /pattern/);
  assert.match(prompt, /comprehensible in isolation/);
  assert.match(prompt, /\[John Smith\] said managers should have 20 direct reports/);
  assert.doesNotMatch(prompt, /already selected/);
});

test("prompt lists already-selected extracts in append mode", () => {
  const prompt = buildExtractionPrompt({
    title: "T",
    content: "Body.",
    chunkInfo: " (Part 1 of 2)",
    alreadySelected: ["First old one.", "Second old one."],
  });
  assert.match(prompt, /already selected/);
  assert.match(prompt, /- First old one\.\n- Second old one\./);
  assert.match(prompt, /Title: T \(Part 1 of 2\)/);
});

test("model output: only strings in the JSON array count as extracts", () => {
  const output = [
    "Here are the extracts:",
    "```json",
    '["[John Smith] said managers should have 20 direct reports.", "Two\\n  lines.", "  "]',
    "```",
    "Part 2 only contains one usable idea, which duplicates an already-selected quote.",
  ].join("\n");

  assert.deepEqual(parseModelOutput(output), [
    "[John Smith] said managers should have 20 direct reports.",
    "Two lines.",
  ]);
});

test("model output: an empty array means no extracts", () => {
  assert.deepEqual(parseModelOutput("[]"), []);
  assert.deepEqual(parseModelOutput("Nothing new here [see above].\n[]"), []);
});

test("model output: prose without a JSON array is an error, not an extract", () => {
  assert.throws(
    () => parseModelOutput("This passage is too short and context-dependent. No new qualifying extracts found."),
    /No JSON array/,
  );
  assert.throws(() => parseModelOutput('[1, 2] ["unterminated'), /No JSON array/);
});

test("model output: caps the count", () => {
  const many = Array.from({ length: 15 }, (_, i) => `Extract ${i}.`);
  assert.equal(parseModelOutput(JSON.stringify(many)).length, MAX_EXTRACTS_PER_CHUNK);
});

test("property: any array of strings round-trips through surrounding commentary", () => {
  const extract = fc.string({ minLength: 1, maxLength: 60 }).filter((t) => t.trim().length > 0);
  const prose = fc.string({ maxLength: 40 }).map((t) => t.replace(/[[\]]/g, ""));
  fc.assert(
    fc.property(fc.array(extract, { maxLength: MAX_EXTRACTS_PER_CHUNK }), prose, prose, (items, before, after) => {
      const expected = items.map((t) => t.replace(/\s+/g, " ").trim());
      assert.deepEqual(parseModelOutput(`${before}\n${JSON.stringify(items)}\n${after}`), expected);
    }),
  );
});

test("appending matches the formatting of a freshly generated file", () => {
  const a = [{ text: "One.", url: "https://x/a/" }];
  const b = [{ text: "Two.", url: "https://x/a/" }];
  assert.equal(appendExtracts(formatExtracts(a), b), formatExtracts([...a, ...b]));
  // Existing files may or may not end in a newline.
  assert.equal(appendExtracts(formatExtracts(a) + "\n", b), formatExtracts([...a, ...b]));
  assert.equal(appendExtracts("", b), formatExtracts(b));
  assert.equal(appendExtracts(" \n", b), formatExtracts(b));
  assert.equal(appendExtracts("One.\nu", []), "One.\nu");
});

test("property: parse(append(existing, new)) is existing followed by new", () => {
  fc.assert(
    fc.property(fc.array(pair), fc.array(pair), fc.constantFrom("", "\n", "\n\n"), (old, added, trailing) => {
      const existing = formatExtracts(old) + trailing;
      assert.deepEqual(parseExtractFile(appendExtracts(existing, added)), [...old, ...added]);
    }),
  );
});

test("property: appending never changes the existing content", () => {
  fc.assert(
    fc.property(fc.array(pair, { minLength: 1 }), fc.array(pair), (old, added) => {
      const existing = formatExtracts(old);
      assert.ok(appendExtracts(existing, added).startsWith(existing));
    }),
  );
});

test("parseExtractFile ignores a dangling text line without a URL", () => {
  assert.deepEqual(parseExtractFile("a\nu\n\nb"), [{ text: "a", url: "u" }]);
});

test("removeDuplicates drops existing and repeated extracts, ignoring quote style and spacing", () => {
  const result = removeDuplicates(
    ["It’s new.", "Brand  new.", "it's NEW.", "Old one."],
    ["Old  one."],
  );
  assert.deepEqual(result, ["It’s new.", "Brand  new."]);
});

const SOURCE = `---
title: x
---
He said managers should have **20 direct reports**. Most [reorgs](https://example.com) fail
because nobody owns the transition.

> Quoted line from a guest.

<Image src={img} alt="x" />
Don't "fix" it — rewrite it.`;

test("verbatim extracts and bracket-marked edits verify against the source", () => {
  assert.deepEqual(unverifiedFragments("Most reorgs fail because nobody owns the transition.", SOURCE), []);
  assert.deepEqual(
    unverifiedFragments("[John Smith] said managers should have 20 direct reports.", SOURCE),
    [],
  );
  assert.deepEqual(unverifiedFragments("[M]ost reorgs fail [...] the transition.", SOURCE), []);
  assert.deepEqual(unverifiedFragments("Quoted line from a guest.", SOURCE), []);
  assert.deepEqual(unverifiedFragments("Don’t “fix” it—rewrite it.", SOURCE), []);
  assert.deepEqual(unverifiedFragments("Don't \"fix\" it -- rewrite it.", SOURCE), []);
});

test("unbracketed rewording is reported", () => {
  assert.deepEqual(unverifiedFragments("Most reorgs collapse because nobody owns the transition.", SOURCE), [
    "most reorgs collapse because nobody owns the transition",
  ]);
});

test("property: any substring of the source, with bracketed insertions, verifies", () => {
  const prose = "Teams that skip retros repeat their mistakes, and then they blame the process instead of the habit.";
  fc.assert(
    fc.property(fc.nat(prose.length), fc.nat(prose.length), fc.string({ maxLength: 8 }), (i, j, insert) => {
      const [start, end] = i <= j ? [i, j] : [j, i];
      const quote = prose.slice(start, end);
      const edit = `[${insert.replace(/[[\]]/g, "")}]`;
      assert.deepEqual(unverifiedFragments(quote, prose), []);
      assert.deepEqual(unverifiedFragments(`${edit} ${quote}`, prose), []);
    }),
  );
});

test("parseSelection: shortcuts", () => {
  assert.deepEqual(parseSelection("", 3), { action: "keep", indices: [0, 1, 2] });
  assert.deepEqual(parseSelection(" ALL ", 2), { action: "keep", indices: [0, 1] });
  assert.deepEqual(parseSelection("a", 1), { action: "keep", indices: [0] });
  assert.deepEqual(parseSelection("n", 3), { action: "keep", indices: [] });
  assert.deepEqual(parseSelection("none", 3), { action: "keep", indices: [] });
  assert.deepEqual(parseSelection("q", 3), { action: "quit", indices: [] });
  assert.deepEqual(parseSelection("quit", 3), { action: "quit", indices: [] });
});

test("parseSelection: numbers and ranges", () => {
  assert.deepEqual(parseSelection("3, 1 5-6,1", 6), { action: "keep", indices: [0, 2, 4, 5] });
  assert.match(parseSelection("7", 6).error, /outside 1-6/);
  assert.match(parseSelection("0", 6).error, /outside/);
  assert.match(parseSelection("4-2", 6).error, /outside/);
  assert.match(parseSelection("x", 6).error, /Not a number/);
});

test("property: selected indices are sorted, unique, and in range", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 12 }), fc.array(fc.nat(15)), (count, picks) => {
      const result = parseSelection(picks.map((n) => n + 1).join(","), count);
      if (result.error) {
        assert.ok(picks.some((n) => n + 1 > count));
        return;
      }
      const { indices } = result;
      assert.deepEqual(indices, [...new Set(indices)].sort((a, b) => a - b));
      assert.ok(indices.every((i) => i >= 0 && i < count));
    }),
  );
});
