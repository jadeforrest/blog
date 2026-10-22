// Lighthouse performance budgets for production pages (scripts/perf-check.js;
// run daily by scripts/usage-watch.sh and on demand with `npm run perf`).
// Each page is measured several times and the median of each metric is
// compared with the "lighthouse" section of budgets.json, which records the
// site as it is plus headroom: a ratchet against regressions, not a target.
//
// Score and timings are noisy from a laptop (the homepage measured 0.96 and
// 0.87 an hour apart), so they get wide headroom and must breach on two
// consecutive runs before alerting. Page weight is stable (within 1 KB) and
// alerts at once.

export const PERF_PAGES = ["/", "/completed-staff-work/"];
export const RUNS = 3;

const AUDITS = {
  lcpMs: "largest-contentful-paint",
  tbtMs: "total-blocking-time",
  cls: "cumulative-layout-shift",
  bytes: "total-byte-weight",
};

// Lighthouse result JSON -> the metrics we budget. Throws if the run failed.
export function summarize(lhr) {
  if (lhr.runtimeError) throw new Error(`Lighthouse: ${lhr.runtimeError.code}`);
  const out = { score: lhr.categories?.performance?.score };
  for (const [k, id] of Object.entries(AUDITS)) out[k] = lhr.audits?.[id]?.numericValue;
  if (Object.values(out).some((v) => typeof v !== "number")) {
    throw new Error("Lighthouse result is missing performance metrics");
  }
  return out;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export function medianRun(runs) {
  return Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]));
}

// Headroom covers run-to-run noise: score and CLS absolute, timings and bytes
// relative (TBT also absolute, since it is often 0). `exact` strips float
// noise first, so 0.96 - 0.1 floors to 0.86, not 0.85.
const exact = (x) => Math.round(x * 1e6) / 1e6;

export function makePerfBudgets(medians) {
  return Object.fromEntries(
    Object.entries(medians).map(([page, m]) => [
      page,
      {
        minScore: Math.max(0, Math.floor(exact((m.score - 0.1) * 100)) / 100),
        maxLcpMs: Math.ceil(m.lcpMs * 1.4),
        maxTbtMs: Math.ceil(m.tbtMs * 1.5 + 200),
        maxCls: Math.ceil(exact((m.cls + 0.1) * 1000)) / 1000,
        maxBytes: Math.ceil(m.bytes * 1.1),
      },
    ]),
  );
}

export function assessPerf(medians, budgets) {
  const alerts = [];
  for (const [page, b] of Object.entries(budgets)) {
    const m = medians[page];
    if (!m) continue;
    const add = (kind, text) => alerts.push({ key: `perf:${page}:${kind}`, text: `${page} ${text}` });
    if (m.score < b.minScore) add("score", `Lighthouse score ${m.score} (budget ${b.minScore})`);
    if (m.lcpMs > b.maxLcpMs) add("lcp", `LCP ${Math.round(m.lcpMs)} ms (budget ${b.maxLcpMs})`);
    if (m.tbtMs > b.maxTbtMs) add("tbt", `TBT ${Math.round(m.tbtMs)} ms (budget ${b.maxTbtMs})`);
    if (m.cls > b.maxCls) add("cls", `CLS ${m.cls.toFixed(3)} (budget ${b.maxCls})`);
    if (m.bytes > b.maxBytes) {
      add("bytes", `page weight ${(m.bytes / 1024).toFixed(0)} KB (budget ${(b.maxBytes / 1024).toFixed(0)} KB)`);
    }
  }
  return alerts;
}

// Kinds that alert on the first breach; the rest need two runs in a row.
const IMMEDIATE = new Set(["bytes", "unavailable"]);

// alerts + the keys that breached on the previous run -> alerts to raise now,
// and the breached keys to remember for the next run.
export function confirmAlerts(alerts, previous = []) {
  const seen = new Set(previous);
  const confirmed = alerts.filter((a) => IMMEDIATE.has(a.key.split(":").at(-1)) || seen.has(a.key));
  return { confirmed, breached: alerts.map((a) => a.key) };
}
