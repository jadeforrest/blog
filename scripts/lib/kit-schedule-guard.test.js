import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { kitReadyDate, kitScheduleProblems, linkedSlugs, tooSoonForKit } from "./kit-schedule-guard.js";
import { addDays, siteToday } from "./publish-dates.js";

// The rule: a post goes live at some point on its date (the 6 AM build, or later if the Mac is
// off), and Kit could send on any day, so nothing about a post reaches Kit until its date has
// fully passed in Portland: the day after the post's date at the earliest.

const TODAY = "2026-11-21"; // a Saturday
const posts = [
  { slug: "live", date: "2026-11-01" },
  { slug: "yesterday", date: "2026-11-20" },
  { slug: "today", date: TODAY },
  { slug: "friday", date: "2026-11-27" },
  { slug: "tuesday", date: "2026-12-01" },
  { slug: "undated", date: "" },
];

const isoDate = fc
  .date({ min: new Date("2020-01-01T00:00:00Z"), max: new Date("2030-12-31T00:00:00Z"), noInvalidDate: true })
  .map((d) => d.toISOString().slice(0, 10));

test("a post can go to Kit the day after its date, never on it", () => {
  assert.equal(tooSoonForKit("2026-11-20", TODAY), false);
  assert.equal(tooSoonForKit(TODAY, TODAY), true);
  assert.equal(tooSoonForKit("2026-11-22", TODAY), true);
  assert.equal(kitReadyDate("2026-11-27"), "2026-11-28");
});

test("Jade's examples: a Friday 11-27 post from 11-28, a Tuesday 12-01 post from 12-02", () => {
  for (const day of ["2026-11-21", "2026-11-26", "2026-11-27"]) assert.equal(tooSoonForKit("2026-11-27", day), true, day);
  assert.equal(tooSoonForKit("2026-11-27", "2026-11-28"), false);
  for (const day of ["2026-11-21", "2026-11-28", "2026-12-01"]) assert.equal(tooSoonForKit("2026-12-01", day), true, day);
  assert.equal(tooSoonForKit("2026-12-01", "2026-12-02"), false);
});

test("month, year and leap-day boundaries", () => {
  assert.equal(kitReadyDate("2026-11-30"), "2026-12-01");
  assert.equal(kitReadyDate("2026-12-31"), "2027-01-01");
  assert.equal(kitReadyDate("2028-02-28"), "2028-02-29");
  assert.equal(kitReadyDate("2028-02-29"), "2028-03-01");
  assert.equal(kitReadyDate("2027-02-28"), "2027-03-01");
  assert.equal(tooSoonForKit("2026-12-31", "2027-01-01"), false);
  assert.equal(tooSoonForKit("2026-12-31", "2026-12-31"), true);
});

test("undated posts count as live, as they do on the site", () => {
  assert.equal(tooSoonForKit("", TODAY), false);
  assert.equal(tooSoonForKit(undefined, TODAY), false);
  assert.equal(kitReadyDate(""), null);
});

test("'today' is Portland's: late on the post's date in Portland is still too soon", () => {
  // 2026-11-28 05:00 UTC is 2026-11-27 21:00 in Portland.
  assert.equal(tooSoonForKit("2026-11-27", siteToday(new Date("2026-11-28T05:00:00Z"))), true);
  // 2026-11-28 08:30 UTC is 00:30 on the 28th in Portland.
  assert.equal(tooSoonForKit("2026-11-27", siteToday(new Date("2026-11-28T08:30:00Z"))), false);
});

test("property: too soon exactly when the date is today or later", () => {
  fc.assert(fc.property(isoDate, isoDate, (date, today) => tooSoonForKit(date, today) === Date.parse(date) >= Date.parse(today)));
});

test("property: the ready date is the first allowed day, and it stays allowed", () => {
  fc.assert(
    fc.property(isoDate, fc.nat(400), (date, later) => {
      const ready = kitReadyDate(date);
      return tooSoonForKit(date, addDays(ready, -1)) && !tooSoonForKit(date, addDays(ready, later));
    }),
  );
});

test("linkedSlugs finds absolute, www, utm-tagged and site-relative Markdown links", () => {
  const text = [
    "[a](https://www.rubick.com/friday/)",
    "[b](https://rubick.com/Today?utm_source=x)",
    "[c](/tuesday/)",
    "see rubick.com/friday again",
    "[d](https://example.com/friday/)",
  ].join("\n");
  assert.deepEqual(linkedSlugs(text), ["friday", "today", "tuesday"]);
});

test("kitScheduleProblems: a live post linking to live, undated and unknown pages is fine", () => {
  const text = "[x](https://www.rubick.com/live/) [y](/yesterday/) [u](/undated/) [z](/wiki/people/)";
  assert.deepEqual(kitScheduleProblems({ text, date: "2026-11-20" }, posts, TODAY), []);
});

test("kitScheduleProblems: refuses a post dated today, naming the day it can go", () => {
  assert.deepEqual(kitScheduleProblems({ text: "", date: TODAY }, posts, TODAY), [
    "this post goes live 2026-11-21; it can go to Kit from 2026-11-22",
  ]);
});

test("kitScheduleProblems: names each linked post not live yet, once, after the post's own problem", () => {
  const text = "[a](https://www.rubick.com/friday/) [b](/today/) [c](https://www.rubick.com/friday/) [d](/live/)";
  assert.deepEqual(kitScheduleProblems({ text, date: "2026-11-27" }, posts, TODAY), [
    "this post goes live 2026-11-27; it can go to Kit from 2026-11-28",
    "it links to /friday/, scheduled for 2026-11-27; it can go to Kit from 2026-11-28",
    "it links to /today/, scheduled for 2026-11-21; it can go to Kit from 2026-11-22",
  ]);
});

test("kitScheduleProblems: a post linking to itself is reported once, for its own date", () => {
  const text = "[me](/friday/) [other](/today/)";
  assert.deepEqual(kitScheduleProblems({ text, date: "2026-11-27", slug: "friday" }, posts, TODAY), [
    "this post goes live 2026-11-27; it can go to Kit from 2026-11-28",
    "it links to /today/, scheduled for 2026-11-21; it can go to Kit from 2026-11-22",
  ]);
});

test("kitScheduleProblems: as the days pass, each linked post clears the day after its own date", () => {
  const text = "[a](/today/) [b](/friday/) [c](/tuesday/)";
  const countOn = (day) => kitScheduleProblems({ text }, posts, day).length;
  assert.equal(countOn(TODAY), 3);
  assert.equal(countOn("2026-11-22"), 2);
  assert.equal(countOn("2026-11-27"), 2);
  assert.equal(countOn("2026-11-28"), 1);
  assert.equal(countOn("2026-12-01"), 1);
  assert.equal(countOn("2026-12-02"), 0);
});

test("property: no problems exactly when the post and every linked post are dated before today", () => {
  const slugs = posts.map((p) => p.slug);
  fc.assert(
    fc.property(fc.subarray(slugs), fc.option(isoDate, { nil: undefined }), isoDate, (linked, date, today) => {
      const text = linked.map((s) => `[x](/${s}/)`).join(" ");
      const dated = [date, ...linked.map((s) => posts.find((p) => p.slug === s).date)].filter(Boolean);
      const clear = dated.every((d) => d < today);
      return (kitScheduleProblems({ text, date }, posts, today).length === 0) === clear;
    }),
  );
});
