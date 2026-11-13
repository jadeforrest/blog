import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  datePrefix,
  dayBefore,
  isPublished,
  liveExtracts,
  liveQueue,
  postSlug,
  publishedSince,
  siteToday,
} from "./publish-dates.js";

const isoDate = fc
  .date({ min: new Date("2000-01-01T00:00:00Z"), max: new Date("2099-12-31T00:00:00Z"), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10));
const slug = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,30}$/);

test("siteToday uses Portland, not UTC", () => {
  // 2026-12-01 03:00 UTC is still Nov 30 in Portland.
  assert.equal(siteToday(new Date("2026-12-01T03:00:00Z")), "2026-11-30");
  assert.equal(siteToday(new Date("2026-12-01T08:00:00Z")), "2026-12-01");
  assert.equal(siteToday(new Date("2026-12-01T03:00:00Z"), "UTC"), "2026-12-01");
});

test("datePrefix and postSlug split post ids, directories and extract files", () => {
  assert.equal(datePrefix("2026-12-01--the-ratchet/index.mdx"), "2026-12-01");
  assert.equal(datePrefix("2026-12-01--the-ratchet.txt"), "2026-12-01");
  assert.equal(datePrefix("undated/index.md", "2020-01-01"), "2020-01-01");
  assert.equal(datePrefix("undated/index.md"), "");
  assert.equal(postSlug("2026-12-01--the-ratchet/index.mdx"), "the-ratchet");
  assert.equal(postSlug("2026-12-01--the-ratchet/index.md"), "the-ratchet");
  assert.equal(postSlug("2026-12-01--the-ratchet"), "the-ratchet");
});

test("property: id round-trips through datePrefix/postSlug", () => {
  fc.assert(
    fc.property(isoDate, slug, fc.constantFrom("index.md", "index.mdx"), (d, s, f) => {
      const id = `${d}--${s}/${f}`;
      return datePrefix(id) === d && postSlug(id) === s;
    }),
  );
});

test("property: isPublished agrees with comparing real dates", () => {
  fc.assert(
    fc.property(isoDate, isoDate, (date, today) => isPublished(date, today) === Date.parse(date) <= Date.parse(today)),
  );
});

test("undated posts count as published", () => {
  assert.equal(isPublished("", "2026-11-13"), true);
});

test("dayBefore handles month, year and leap-day edges", () => {
  assert.equal(dayBefore("2026-03-01"), "2026-02-28");
  assert.equal(dayBefore("2028-03-01"), "2028-02-29");
  assert.equal(dayBefore("2027-01-01"), "2026-12-31");
});

test("property: dayBefore is exactly one day earlier", () => {
  fc.assert(fc.property(isoDate, (d) => Date.parse(d) - Date.parse(dayBefore(d)) === 86_400_000));
});

test("property: publishedSince over consecutive days covers each item exactly once", () => {
  fc.assert(
    fc.property(fc.array(isoDate, { maxLength: 20 }), isoDate, fc.integer({ min: 1, max: 40 }), (dates, start, days) => {
      const items = dates.map((date, i) => ({ date, i }));
      let last = start;
      const seen = [];
      for (let n = 0; n < days; n++) {
        const today = new Date(Date.parse(`${last}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
        seen.push(...publishedSince(items, last, today));
        last = today;
      }
      const expected = items.filter((it) => it.date > start && it.date <= last);
      return seen.length === expected.length && new Set(seen).size === seen.length;
    }),
  );
});

test("publishedSince catches up a skipped day", () => {
  const items = [{ date: "2026-12-01" }, { date: "2026-12-02" }, { date: "2026-12-04" }];
  assert.deepEqual(publishedSince(items, "2026-11-30", "2026-12-03"), items.slice(0, 2));
});

test("liveExtracts holds back extracts from future-dated posts", () => {
  const extracts = [
    { sourceFile: "2026-11-13--today.txt" },
    { sourceFile: "2026-11-14--tomorrow.txt" },
    { sourceFile: "no-date.txt" },
  ];
  assert.deepEqual(
    liveExtracts(extracts, "2026-11-13").map((e) => e.sourceFile),
    ["2026-11-13--today.txt", "no-date.txt"],
  );
});

test("liveQueue filters and reports what it held back", () => {
  const logs = [];
  const out = liveQueue([{ sourceFile: "2026-11-13--a.txt" }, { sourceFile: "2026-12-01--b.txt" }], "2026-11-13", (m) => logs.push(m));
  assert.equal(out.length, 1);
  assert.deepEqual(logs, ["Found 1 extracted posts (1 from scheduled posts held back)"]);
});
