import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.js";

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/content");

// Expected values below were checked by hand against gray-matter 4.0.3 before it was
// removed, alongside a one-off differential property run; these tests can't re-check that.

test("parse: splits data and body", () => {
  assert.deepEqual(parseFrontmatter("---\ntitle: Hi\nn: 2\n---\nBody\n"), {
    data: { title: "Hi", n: 2 },
    content: "Body\n",
  });
});

test("parse: strips exactly one newline after the closing delimiter", () => {
  assert.equal(parseFrontmatter("---\na: 1\n---\n\nBody").content, "\nBody");
  assert.equal(parseFrontmatter("---\na: 1\n---\r\n\r\nBody").content, "\r\nBody");
  assert.equal(parseFrontmatter("---\na: 1\n---").content, "");
});

test("parse: CRLF files, a BOM, and trailing spaces on delimiter lines", () => {
  assert.deepEqual(parseFrontmatter("﻿---\r\na: 1\r\n---\r\nB"), { data: { a: 1 }, content: "B" });
  assert.deepEqual(parseFrontmatter("--- \na: 1\n---\t\nB"), { data: { a: 1 }, content: "B" });
});

test("parse: empty and comment-only blocks give {}", () => {
  assert.deepEqual(parseFrontmatter("---\n---\nB"), { data: {}, content: "B" });
  assert.deepEqual(parseFrontmatter("---\n\n---\nB"), { data: {}, content: "B" });
  assert.deepEqual(parseFrontmatter("---\n# note\n---\nB"), { data: {}, content: "B" });
});

test("parse: the first closing delimiter ends the block", () => {
  assert.deepEqual(parseFrontmatter("---\n---\n---"), { data: {}, content: "---" });
  assert.deepEqual(parseFrontmatter("---\na: 1\n---\nx\n---\ny"), {
    data: { a: 1 },
    content: "x\n---\ny",
  });
});

test("parse: text that is not a frontmatter block is all body", () => {
  for (const raw of ["", "Body", "----\na: 1\n----\n", "---yaml\na: 1\n---\n", " ---\na: 1\n---\n"]) {
    assert.deepEqual(parseFrontmatter(raw), { data: {}, content: raw }, JSON.stringify(raw));
  }
});

test("parse: an unterminated block is body, not frontmatter (gray-matter ate the file)", () => {
  assert.deepEqual(parseFrontmatter("---\na: 1\nBody"), { data: {}, content: "---\na: 1\nBody" });
  assert.deepEqual(parseFrontmatter("---\na: 1\n----\nB"), { data: {}, content: "---\na: 1\n----\nB" });
});

test("parse: YAML types the Kit files rely on", () => {
  const { data } = parseFrontmatter(
    "---\nid: 4640022\nsubject: Use plans, not specs\nempty: ''\npublished: true\n" +
      "emailTemplateId: null\nsendDays:\n  - monday\nkitSyncHash: 90cf4ef5ce10fd003ce0f95521b23f28\n" +
      "kitSyncedAt: '2026-07-09T22:49:29.260Z'\n---\n",
  );
  assert.deepEqual(data, {
    id: 4640022,
    subject: "Use plans, not specs",
    empty: "",
    published: true,
    emailTemplateId: null,
    sendDays: ["monday"],
    kitSyncHash: "90cf4ef5ce10fd003ce0f95521b23f28",
    kitSyncedAt: "2026-07-09T22:49:29.260Z",
  });
});

test("parse: rejects a block that is not a mapping, and invalid YAML", () => {
  assert.throws(() => parseFrontmatter("---\njust text\n---\n"), /must be a YAML mapping/);
  assert.throws(() => parseFrontmatter("---\n- a\n- b\n---\n"), TypeError);
  assert.throws(() => parseFrontmatter("---\na: [\n---\n"), { name: "YAMLException" });
  // js-yaml 3 read `k: ?` as { k: null, null: null }; js-yaml 4 rejects it.
  assert.throws(() => parseFrontmatter("---\nk: ?\n---\n"), { name: "YAMLException" });
});

test("parse: errors name the file when given one", () => {
  assert.throws(() => parseFrontmatter("---\na: [\n---\n", "x/index.md"), /in "x\/index\.md"/);
  assert.throws(() => parseFrontmatter("---\ntext\n---\n", "x/index.md"), /mapping in x\/index\.md$/);
  assert.throws(() => parseFrontmatter("---\ntext\n---\n"), /mapping$/);
});

test("parse: results are independent objects (gray-matter's cache shared them)", () => {
  const raw = "---\na: 1\n---\n";
  parseFrontmatter(raw).data.a = 99;
  assert.equal(parseFrontmatter(raw).data.a, 1);
});

test("stringify: block, closing delimiter, body with a trailing newline", () => {
  assert.equal(stringifyFrontmatter("Body", { a: 1, b: "x" }), "---\na: 1\nb: x\n---\nBody\n");
  assert.equal(stringifyFrontmatter("Body\n", { a: 1 }), "---\na: 1\n---\nBody\n");
  assert.equal(stringifyFrontmatter("", { a: 1 }), "---\na: 1\n---\n\n");
});

test("stringify: empty data writes no block", () => {
  assert.equal(stringifyFrontmatter("Body", {}), "Body\n");
  assert.equal(stringifyFrontmatter("", {}), "\n");
});

test("stringify: quotes strings that would read back as another type", () => {
  const data = { s: "2026-07-09T22:49:29.260Z", t: "true", n: "08", z: "null", h: "123e4" };
  assert.deepEqual(parseFrontmatter(stringifyFrontmatter("", data)).data, data);
});

test("stringify: keeps a body that looks like frontmatter as body", () => {
  const out = stringifyFrontmatter("---\nnot: data\n---\n", { a: 1 });
  assert.deepEqual(parseFrontmatter(out), { data: { a: 1 }, content: "---\nnot: data\n---\n" });
});

test("stringify: refuses undefined values at any depth rather than dropping them", () => {
  for (const data of [{ a: undefined }, { a: [1, undefined] }, { a: { b: undefined } }]) {
    assert.throws(() => stringifyFrontmatter("", data), TypeError, JSON.stringify(data));
  }
  assert.throws(() => stringifyFrontmatter("", { kitEmailId: undefined }), /"kitEmailId" is undefined/);
});

const yamlValue = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small" },
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: false }),
    fc.boolean(),
    fc.constant(null),
    fc.constantFrom("", "---", "yes", "~", "0x1F", "08", "0_0", "1e3", "a: b", "# x", " pad "),
    fc.array(tie("value"), { maxLength: 3 }),
    fc.dictionary(fc.string({ maxLength: 6 }), tie("value"), { maxKeys: 3, noNullPrototype: true }),
  ),
})).value;
const frontmatterData = fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), yamlValue, {
  maxKeys: 8,
  noNullPrototype: true,
});
const body = fc.oneof(
  fc.string(),
  fc.array(fc.constantFrom("---", "\n", "\r\n", "a: 1", "﻿", "text", " "), { maxLength: 12 }).map(
    (a) => a.join(""),
  ),
);
const withNewline = (s) => (s.endsWith("\n") ? s : `${s}\n`);

test("property: stringify then parse returns the data and the body", () => {
  fc.assert(
    fc.property(body, frontmatterData, (content, data) => {
      fc.pre(Object.keys(data).length > 0);
      assert.deepEqual(parseFrontmatter(stringifyFrontmatter(content, data)), {
        data,
        content: withNewline(content),
      });
    }),
    { numRuns: 2000 },
  );
});

test("property: rewriting a written file is a no-op", () => {
  fc.assert(
    fc.property(body, frontmatterData, (content, data) => {
      // With no block written, the body is the whole file: a leading BOM is the file's BOM
      // and a leading `---` block reads as frontmatter. The Kit scripts never write {}.
      fc.pre(Object.keys(data).length > 0 || !/^(\uFEFF|---)/.test(content));
      const once = stringifyFrontmatter(content, data);
      const parsed = parseFrontmatter(once);
      assert.equal(stringifyFrontmatter(parsed.content, parsed.data), once);
    }),
    { numRuns: 2000 },
  );
});

test("property: text without a leading --- line is returned untouched", () => {
  fc.assert(
    fc.property(fc.string(), (raw) => {
      fc.pre(!/^﻿?---/.test(raw));
      assert.deepEqual(parseFrontmatter(raw), { data: {}, content: raw.replace(/^﻿/, "") });
    }),
    { numRuns: 2000 },
  );
});

test("property: arbitrary input either parses to a mapping or throws a clean error", () => {
  const piece = fc.oneof(
    fc.constantFrom("---", "--- ", "\n", "\r\n", "a: 1", "k: ?", "- x", "[", "'", "#", "﻿", ":"),
    fc.string({ maxLength: 5 }),
  );
  fc.assert(
    fc.property(fc.array(piece, { maxLength: 20 }).map((a) => a.join("")), (raw) => {
      try {
        const { data, content } = parseFrontmatter(raw);
        assert.equal(typeof data, "object");
        assert.ok(data !== null && !Array.isArray(data));
        assert.ok(raw.replace(/^﻿/, "").endsWith(content));
      } catch (err) {
        assert.ok(["YAMLException", "TypeError"].includes(err.name), err.stack);
      }
    }),
    { numRuns: 3000 },
  );
});

function contentFiles() {
  return fs
    .readdirSync(CONTENT_DIR, { recursive: true })
    .filter((f) => /^(kit-sequence-\d+|posts)\/[^/]+\/index\.mdx?$/.test(f.split(path.sep).join("/")))
    .map((f) => path.join(CONTENT_DIR, f));
}

test("corpus: every Kit email and post parses, and rewriting keeps its data and body", () => {
  const files = contentFiles();
  assert.ok(files.length > 100, `expected the repo's content files, found ${files.length}`);
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = parseFrontmatter(raw);
    assert.ok(Object.keys(parsed.data).length > 0, `${file}: no frontmatter`);
    if (file.includes("kit-sequence-")) {
      assert.ok(parsed.data.kitEmailId && parsed.data.sequenceId, `${file}: missing Kit ids`);
    }
    const rewritten = parseFrontmatter(stringifyFrontmatter(parsed.content, parsed.data));
    assert.deepEqual(rewritten, { data: parsed.data, content: withNewline(parsed.content) }, file);
  }
});
