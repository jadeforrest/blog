import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  assessPerf,
  confirmAlerts,
  inDarkWake,
  makePerfBudgets,
  medianRun,
  staleAlerts,
  summarize,
} from "./perf-budget.js";

const lhr = (score, lcp, tbt, cls, bytes) => ({
  categories: { performance: { score } },
  audits: {
    "largest-contentful-paint": { numericValue: lcp },
    "total-blocking-time": { numericValue: tbt },
    "cumulative-layout-shift": { numericValue: cls },
    "total-byte-weight": { numericValue: bytes },
  },
});

test("summarize extracts the budgeted metrics", () => {
  assert.deepEqual(summarize(lhr(0.96, 2607, 0, 0.002, 492000)), {
    score: 0.96,
    lcpMs: 2607,
    tbtMs: 0,
    cls: 0.002,
    bytes: 492000,
  });
});

test("summarize fails loudly on a failed or partial run", () => {
  assert.throws(() => summarize({ runtimeError: { code: "NO_FCP" } }), /NO_FCP/);
  const partial = lhr(0.9, 1, 1, 0, 1);
  delete partial.audits["total-byte-weight"];
  assert.throws(() => summarize(partial), /missing performance metrics/);
  assert.throws(() => summarize({ ...lhr(null, 1, 1, 0, 1) }), /missing/);
});

test("medianRun discards one outlier run", () => {
  // The single 0.6 / CLS 0.36 run seen while building this.
  const runs = [
    summarize(lhr(0.6, 4858, 0, 0.362, 517701)),
    summarize(lhr(0.96, 2607, 0, 0.002, 492000)),
    summarize(lhr(0.97, 2500, 0, 0.001, 491000)),
  ];
  assert.deepEqual(medianRun(runs), { score: 0.96, lcpMs: 2607, tbtMs: 0, cls: 0.002, bytes: 492000 });
});

test("budgets record today plus headroom; today passes", () => {
  const today = { "/": { score: 0.96, lcpMs: 2607, tbtMs: 0, cls: 0.002, bytes: 492000 } };
  const b = makePerfBudgets(today);
  assert.deepEqual(b, {
    "/": { minScore: 0.86, maxLcpMs: 3650, maxTbtMs: 200, maxCls: 0.102, maxBytes: 541200 },
  });
  assert.deepEqual(assessPerf(today, b), []);
});

test("the noisy second run seen while building this stays within budget", () => {
  const b = makePerfBudgets({ "/": { score: 0.96, lcpMs: 2607, tbtMs: 0, cls: 0.002, bytes: 492000 } });
  assert.deepEqual(assessPerf({ "/": { score: 0.87, lcpMs: 3600, tbtMs: 0, cls: 0.002, bytes: 491000 } }, b), []);
});

test("noisy kinds alert only on a second consecutive breach; weight at once", () => {
  const score = { key: "perf:/:score", text: "s" };
  const bytes = { key: "perf:/:bytes", text: "b" };
  const down = { key: "perf:/:unavailable", text: "u" };
  const first = confirmAlerts([score, bytes, down], []);
  assert.deepEqual(first.confirmed, [bytes, down]);
  assert.deepEqual(first.breached, ["perf:/:score", "perf:/:bytes", "perf:/:unavailable"]);
  assert.deepEqual(confirmAlerts([score], first.breached).confirmed, [score]);
  // a clean run in between resets the streak
  const clean = confirmAlerts([], first.breached);
  assert.deepEqual(confirmAlerts([score], clean.breached).confirmed, []);
  assert.deepEqual(confirmAlerts([score]).confirmed, []);
});

test("each regression alerts with a stable key", () => {
  const b = { "/": { minScore: 0.9, maxLcpMs: 3000, maxTbtMs: 100, maxCls: 0.05, maxBytes: 500000 } };
  const worse = { "/": { score: 0.7, lcpMs: 4000, tbtMs: 300, cls: 0.2, bytes: 900000 } };
  const alerts = assessPerf(worse, b);
  assert.deepEqual(
    alerts.map((a) => a.key),
    ["perf:/:score", "perf:/:lcp", "perf:/:tbt", "perf:/:cls", "perf:/:bytes"],
  );
  assert.match(alerts[4].text, /page weight 879 KB \(budget 488 KB\)/);
  assert.deepEqual(assessPerf({}, b), []); // page not measured: nothing to say
});

test("property: budgets made from a measurement never flag that measurement", () => {
  const m = fc.record({
    score: fc.double({ min: 0, max: 1, noNaN: true }),
    lcpMs: fc.double({ min: 0, max: 20000, noNaN: true }),
    tbtMs: fc.double({ min: 0, max: 5000, noNaN: true }),
    cls: fc.double({ min: 0, max: 2, noNaN: true }),
    bytes: fc.double({ min: 0, max: 1e8, noNaN: true }),
  });
  fc.assert(
    fc.property(fc.dictionary(fc.constantFrom("/", "/p/"), m), (medians) => {
      assert.deepEqual(assessPerf(medians, makePerfBudgets(medians)), []);
    }),
  );
});

test("dark wake is detected from pmset systemstate", () => {
  // Captured on this Mac: full wake, and the Power Nap state the job hit on Oct 23.
  const full = "Current System Capabilities are: CPU Graphics Audio Network \nCurrent Power State: 4\n";
  const dark = "Current System Capabilities are: CPU Network \nCurrent Power State: 4\n";
  assert.equal(inDarkWake(full), false);
  assert.equal(inDarkWake(dark), true);
  assert.equal(inDarkWake(""), false); // pmset missing or failed: just try
});

test("skipped runs alert only once the last real run is STALE_DAYS old", () => {
  const last = "2026-10-24T15:30:00.000Z";
  assert.deepEqual(staleAlerts(last, "2026-10-27T15:29:59.000Z"), []);
  const [a] = staleAlerts(last, "2026-10-27T15:30:00.000Z");
  assert.equal(a.key, "perf:stale");
  assert.match(a.text, /not run since 2026-10-24/);
  assert.deepEqual(staleAlerts("garbage", "2026-10-27T15:30:00.000Z"), []);
});
