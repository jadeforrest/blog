import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  GB,
  HISTORY_LIMIT,
  REPEAT_DAYS,
  appendSnapshot,
  assessBandwidth,
  assessHeaders,
  dailyRates,
  dueAlerts,
  median,
  snapshotFrom,
} from "./usage-watch.js";

const PERIOD = { periodStart: "2026-10-01T07:00:00.000Z", periodEnd: "2026-11-01T07:00:00.000Z" };
const day = (n, hour = 15) => new Date(Date.UTC(2026, 9, n, hour)).toISOString();
// One snapshot per day at `perDay` GB/day from the period start, then `spike` GB/day.
function history(days, perDay, spikeDays = 0, spike = perDay) {
  const out = [];
  let used = 0;
  let last = Date.parse(PERIOD.periodStart);
  for (let d = 1; d <= days; d++) {
    const at = Date.parse(day(d + 1, 7)); // 07:00 UTC daily
    used += ((d > days - spikeDays ? spike : perDay) * GB * (at - last)) / 86400000;
    last = at;
    out.push({ ...PERIOD, used, included: 100 * GB, updatedAt: new Date(at).toISOString() });
  }
  return out;
}
const keys = (alerts) => alerts.map((a) => a.key);

test("snapshotFrom maps Netlify's bandwidth response", () => {
  const api = {
    used: 54009590830,
    included: 107374182400,
    last_updated_at: "2026-10-22T15:26:10.532+00:00",
    period_start_date: "2026-10-01T00:00:00.000-07:00",
    period_end_date: "2026-11-01T00:00:00.000-07:00",
  };
  assert.deepEqual(snapshotFrom(api), {
    used: api.used,
    included: api.included,
    periodStart: api.period_start_date,
    periodEnd: api.period_end_date,
    updatedAt: api.last_updated_at,
  });
});

test("snapshotFrom rejects an unexpected response shape", () => {
  const ok = {
    used: 1,
    included: 2,
    last_updated_at: "2026-10-22T15:26:10Z",
    period_start_date: "2026-10-01T00:00:00Z",
    period_end_date: "2026-11-01T00:00:00Z",
  };
  assert.doesNotThrow(() => snapshotFrom(ok));
  for (const bad of [null, {}, { ...ok, used: "1" }, { ...ok, period_end_date: undefined }, { ...ok, last_updated_at: "x" }]) {
    assert.throws(() => snapshotFrom(bad), /unexpected bandwidth response/);
  }
});

test("appendSnapshot skips unchanged data and caps history", () => {
  const s = { updatedAt: "a", used: 1 };
  assert.equal(appendSnapshot([s], { ...s }).length, 1);
  assert.equal(appendSnapshot([s], { updatedAt: "b", used: 2 }).length, 2);
  const long = Array.from({ length: HISTORY_LIMIT }, (_, i) => ({ updatedAt: String(i) }));
  const next = appendSnapshot(long, { updatedAt: "new" });
  assert.equal(next.length, HISTORY_LIMIT);
  assert.equal(next.at(-1).updatedAt, "new");
});

test("the first run already has a rate, measured from the period start", () => {
  const [snap] = history(1, 2);
  const rates = dailyRates([snap]);
  assert.equal(rates.length, 1);
  assert.ok(Math.abs(rates[0].perDay - 2 * GB) < 1e6);
});

test("dailyRates restarts at a new period and skips short or shrinking gaps", () => {
  const h = history(3, 2);
  const nextPeriod = {
    periodStart: "2026-11-01T07:00:00.000Z",
    periodEnd: "2026-12-01T08:00:00.000Z",
    updatedAt: "2026-11-02T07:00:00.000Z",
    used: 3 * GB,
    included: 100 * GB,
  };
  const close = { ...h[2], updatedAt: new Date(Date.parse(h[2].updatedAt) + 3600000).toISOString() };
  const rates = dailyRates([...h, close, nextPeriod]);
  assert.equal(rates.length, 4); // 3 days, the 1-hour gap skipped, the new period
  assert.ok(Math.abs(rates.at(-1).perDay - 3 * GB) < 1e6);
  assert.equal(dailyRates([h[1], { ...h[2], used: 0 }]).length, 1); // shrinking: skipped
});

test("steady traffic raises nothing", () => {
  const h = history(20, 1.5);
  assert.deepEqual(assessBandwidth(h, h.at(-1).updatedAt), []);
});

test("a step change alerts the next day", () => {
  const h = history(10, 1, 1, 4).map((s) => ({ ...s, included: 1000 * GB }));
  const alerts = assessBandwidth(h, h.at(-1).updatedAt);
  assert.deepEqual(keys(alerts), ["bandwidth:spike"]);
  assert.match(alerts[0].text, /4\.0 GB\/day \(4\.0x the 1\.0 GB\/day baseline\)/);
});

test("no spike verdict until the baseline has enough days", () => {
  const h = history(3, 1, 1, 10).map((s) => ({ ...s, included: 1e6 * GB }));
  assert.deepEqual(assessBandwidth(h, h.at(-1).updatedAt), []); // only 2 prior rates
});

test("a single heavy window doesn't drive the projection", () => {
  // 2 GB/day all month (62 GB projected), one 6 GB day: median rate stays 2.
  const h = history(10, 2, 1, 6);
  assert.ok(!keys(assessBandwidth(h, h.at(-1).updatedAt)).includes("bandwidth:projection"));
});

test("tiny absolute traffic never counts as a spike", () => {
  const h = history(10, 0.01, 1, 0.1);
  assert.deepEqual(assessBandwidth(h, h.at(-1).updatedAt), []);
});

test("on track to use most of the allowance alerts", () => {
  const h = history(10, 3); // 3 GB/day * 31 days = 93 of 100 GB
  const alerts = assessBandwidth(h, h.at(-1).updatedAt);
  assert.deepEqual(keys(alerts), ["bandwidth:projection"]);
  assert.match(alerts[0].text, /on track for 93\.0 of 100\.0 GB/);
});

test("stale Netlify data alerts", () => {
  const h = history(5, 1);
  assert.deepEqual(keys(assessBandwidth(h, day(15))), ["bandwidth:stale"]);
  assert.deepEqual(assessBandwidth([], day(15)), []);
});

const page = (vary, cacheStatus = '"Netlify Edge"; hit') => ({
  name: "home",
  markdown: false,
  status: 200,
  headers: { "content-type": "text/html; charset=UTF-8", vary, "cache-status": cacheStatus },
});

test("headers: the pre-fix site (Oct 2-21) would have alerted", () => {
  // What www.rubick.com returned for a browser before the fix.
  const before = page("Accept, Accept-Encoding");
  assert.deepEqual(keys(assessHeaders([before])), ["headers:home:vary"]);
});

test("headers: the fixed site is quiet", () => {
  const markdown = {
    name: "about (markdown)",
    markdown: true,
    status: 200,
    headers: { "content-type": "text/markdown; charset=utf-8", vary: "Accept, Accept-Encoding" },
  };
  assert.deepEqual(assessHeaders([page("Accept-Encoding"), markdown]), []);
});

test("headers: function-served pages, broken Markdown and errors alert", () => {
  assert.deepEqual(keys(assessHeaders([page("Accept-Encoding", "")])), ["headers:home:uncached"]);
  const md = { name: "md", markdown: true, status: 200, headers: { "content-type": "text/html" } };
  assert.deepEqual(keys(assessHeaders([md])), ["headers:md:type"]);
  assert.deepEqual(keys(assessHeaders([{ name: "x", status: 502, headers: {} }])), ["headers:x:status"]);
  assert.deepEqual(keys(assessHeaders([{ name: "x", error: "ENOTFOUND" }])), ["headers:x:error"]);
});

test("dueAlerts: notify once, repeat after REPEAT_DAYS, forget cleared alerts", () => {
  const a = { key: "k", text: "t" };
  const first = dueAlerts([a], {}, day(1));
  assert.equal(first.due.length, 1);
  const soon = dueAlerts([a], first.sent, day(1 + REPEAT_DAYS - 1));
  assert.equal(soon.due.length, 0);
  assert.deepEqual(soon.sent, first.sent);
  assert.equal(dueAlerts([a], first.sent, day(1 + REPEAT_DAYS)).due.length, 1);
  const cleared = dueAlerts([], first.sent, day(2));
  assert.deepEqual(cleared.sent, {});
  assert.equal(dueAlerts([a], cleared.sent, day(2)).due.length, 1);
});

test("median handles odd and even lengths", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test("property: scaling all traffic by a constant doesn't change spike detection", () => {
  fc.assert(
    fc.property(
      fc.array(fc.double({ min: 0.6, max: 20, noNaN: true }), { minLength: 2, maxLength: 25 }),
      fc.double({ min: 1, max: 10, noNaN: true }),
      (perDay, k) => {
        const build = (scale) => {
          let used = 0;
          let last = Date.parse(PERIOD.periodStart);
          return perDay.map((r, i) => {
            const at = Date.parse(day(i + 2, 7));
            used += (r * scale * GB * (at - last)) / 86400000;
            last = at;
            return { ...PERIOD, used, included: 1e6 * GB, updatedAt: new Date(at).toISOString() };
          });
        };
        const spike = (h) => keys(assessBandwidth(h, h.at(-1).updatedAt)).includes("bandwidth:spike");
        // Every rate is above the floor at both scales, so only ratios matter.
        assert.equal(spike(build(1)), spike(build(k)));
      },
    ),
  );
});

test("property: rates never negative and never more than snapshots", () => {
  const snap = fc.record({
    used: fc.integer({ min: 0, max: 100 * GB }),
    hours: fc.integer({ min: 0, max: 72 }),
  });
  fc.assert(
    fc.property(fc.array(snap, { maxLength: 30 }), (steps) => {
      let t = Date.parse(PERIOD.periodStart);
      const h = steps.map(({ used, hours }) => {
        t += hours * 3600000;
        return { ...PERIOD, used, included: 100 * GB, updatedAt: new Date(t).toISOString() };
      });
      const rates = dailyRates(h);
      assert.ok(rates.length <= h.length);
      assert.ok(rates.every((r) => r.perDay >= 0));
    }),
  );
});
