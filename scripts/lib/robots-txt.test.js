// Structural check of public/robots.txt against RFC 9309 (plus the
// Content-Signal extension): every line is a
// comment, blank, or a known `field: value` record; rules sit inside a group
// opened by User-agent; the Sitemap is an absolute URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const robots = fs.readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");

test("robots.txt is well-formed per RFC 9309", () => {
  let inGroup = false;
  let groups = 0;
  const sitemaps = [];
  const signals = [];
  for (const raw of robots.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    assert.ok(m, `not a record: ${raw}`);
    const [, field, value] = m;
    switch (field.toLowerCase()) {
      case "user-agent":
        assert.ok(value, "empty user-agent");
        if (!inGroup) groups++;
        inGroup = true;
        break;
      case "allow":
      case "disallow":
        assert.ok(groups > 0, `${field} outside a group`);
        assert.ok(value === "" || value.startsWith("/"), `bad path: ${value}`);
        break;
      case "content-signal":
        assert.ok(groups > 0, "Content-Signal outside a group");
        signals.push(value);
        break;
      case "sitemap":
        sitemaps.push(value);
        break;
      default:
        assert.fail(`unknown field: ${field}`);
    }
    if (field.toLowerCase() !== "user-agent") inGroup = false;
  }
  assert.ok(groups >= 1, "no User-agent group");
  // contentsignals.org: comma-separated key=yes|no pairs, known keys only.
  assert.equal(signals.length, 1);
  const pairs = Object.fromEntries(signals[0].split(",").map((p) => p.trim().split("=")));
  assert.deepEqual(pairs, { "ai-train": "yes", search: "yes", "ai-input": "yes" });
  assert.deepEqual(sitemaps, ["https://www.rubick.com/sitemap-index.xml"]);
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
});
