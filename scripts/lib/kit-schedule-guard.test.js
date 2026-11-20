import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { KIT_MAX_DAYS_AHEAD, kitScheduleProblems, linkedSlugs, tooFarAheadForKit } from "./kit-schedule-guard.js";
import { addDays } from "./publish-dates.js";

const TODAY = "2026-11-19";
const posts = [
  { slug: "live", date: "2026-11-01" },
  { slug: "soon", date: addDays(TODAY, 13) },
  { slug: "later", date: addDays(TODAY, 14) },
  { slug: "much-later", date: "2027-02-01" },
];

test("13 days out is allowed, 14 is not", () => {
  assert.equal(KIT_MAX_DAYS_AHEAD, 13);
  assert.equal(tooFarAheadForKit("2026-12-02", TODAY), false);
  assert.equal(tooFarAheadForKit("2026-12-03", TODAY), true);
  assert.equal(tooFarAheadForKit(TODAY, TODAY), false);
  assert.equal(tooFarAheadForKit("2026-01-01", TODAY), false);
});

test("property: refused exactly when more than 13 days after today", () => {
  const isoDate = fc
    .date({ min: new Date("2026-01-01T00:00:00Z"), max: new Date("2028-12-31T00:00:00Z"), noInvalidDate: true })
    .map((d) => d.toISOString().slice(0, 10));
  fc.assert(
    fc.property(isoDate, isoDate, (date, today) => {
      const days = (Date.parse(date) - Date.parse(today)) / 86_400_000;
      return tooFarAheadForKit(date, today) === days > 13;
    }),
  );
});

test("linkedSlugs finds absolute, www, utm-tagged and site-relative Markdown links", () => {
  const text = [
    "[a](https://www.rubick.com/later/)",
    "[b](https://rubick.com/Soon?utm_source=x)",
    "[c](/much-later/)",
    "see rubick.com/later again",
    "[d](https://example.com/later/)",
  ].join("\n");
  assert.deepEqual(linkedSlugs(text), ["later", "soon", "much-later"]);
});

test("kitScheduleProblems: allows a post within 13 days and links to live or near posts", () => {
  const text = "[x](https://www.rubick.com/live/) [y](https://www.rubick.com/soon/) [z](/wiki/people/)";
  assert.deepEqual(kitScheduleProblems({ text, date: addDays(TODAY, 13) }, posts, TODAY), []);
});

test("kitScheduleProblems: refuses a post scheduled too far out", () => {
  assert.deepEqual(kitScheduleProblems({ text: "", date: "2026-12-03" }, posts, TODAY), [
    "this post is scheduled for 2026-12-03, more than 13 days out",
  ]);
});

test("kitScheduleProblems: names each linked post scheduled too far out, once", () => {
  const text = "[a](https://www.rubick.com/later/) [b](/much-later/) [c](https://www.rubick.com/later/)";
  assert.deepEqual(kitScheduleProblems({ text }, posts, TODAY), [
    "it links to /later/, scheduled for 2026-12-03, more than 13 days out",
    "it links to /much-later/, scheduled for 2027-02-01, more than 13 days out",
  ]);
});

test("kitScheduleProblems: two scheduled posts, as the days pass each becomes pushable on its own day", () => {
  const text = "[a](/later/) [b](/much-later/)";
  const countOn = (day) => kitScheduleProblems({ text }, posts, day).length;
  assert.equal(countOn(TODAY), 2);
  assert.equal(countOn("2026-11-20"), 1); // /later/ is now 13 days out
  assert.equal(countOn(addDays("2027-02-01", -14)), 1);
  assert.equal(countOn(addDays("2027-02-01", -13)), 0);
});
