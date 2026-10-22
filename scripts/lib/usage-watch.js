// Daily production cost check for rubick.com (run by scripts/usage-watch.sh
// under launchd). Two signals, because Netlify's API exposes only cumulative
// account bandwidth per billing period, not function invocations:
//
// - bandwidth: snapshots of the period's cumulative bytes, turned into a daily
//   rate; alert on a step change against the recent baseline, or when the
//   period is on track to use most of the plan's allowance
// - headers: the real detector for per-request function overhead. Page views
//   must not carry Vary: Accept (the signature of the Oct 2026 pass-through
//   edge function, which would have alerted the morning after it shipped) and
//   must carry Netlify's cache-status (absent when a function generates the
//   response; a pass-through function keeps it, so this alone isn't enough)
//
// Bandwidth is the weaker signal for function overhead: Cloudflare sends every
// HTML view to Netlify already, so a pass-through function adds no bytes. It
// catches crawler surges and heavier pages instead.
//
// Alerts are { key, text }; the key is stable across days so a standing
// condition is re-notified only every REPEAT_DAYS. Pure functions; the CLI
// (scripts/usage-watch.js) does the fetching and state.

export const GB = 1e9;
export const SPIKE_RATIO = 2;
export const SPIKE_FLOOR = 0.5 * GB; // bytes/day below which no spike is reported
export const PROJECTION_WARN = 0.8;
export const MIN_GAP_HOURS = 20;
export const MIN_BASELINE_RATES = 3;
export const PROJECTION_DAYS = 7;
export const BASELINE_DAYS = 14;
export const STALE_DAYS = 3;
export const REPEAT_DAYS = 3;
export const HISTORY_LIMIT = 200;
const DAY_MS = 86400000;

const ms = (iso) => Date.parse(iso);
const gb = (bytes) => (bytes / GB).toFixed(1);

// Netlify's /accounts/{slug}/bandwidth response -> a history entry. Throws on
// an unexpected shape rather than letting NaN silently disable the checks.
export function snapshotFrom(api) {
  const numbers = ["used", "included"].every((k) => Number.isFinite(api?.[k]));
  const dates = ["period_start_date", "period_end_date", "last_updated_at"].every(
    (k) => typeof api?.[k] === "string" && Number.isFinite(Date.parse(api[k])),
  );
  if (!numbers || !dates) throw new Error(`unexpected bandwidth response: ${JSON.stringify(api)}`);
  return {
    used: api.used,
    included: api.included,
    periodStart: api.period_start_date,
    periodEnd: api.period_end_date,
    updatedAt: api.last_updated_at,
  };
}

// Appends unless Netlify has not refreshed its numbers since the last entry;
// keeps the newest HISTORY_LIMIT entries.
export function appendSnapshot(history, snap) {
  if (history.at(-1)?.updatedAt === snap.updatedAt) return history;
  return [...history, snap].slice(-HISTORY_LIMIT);
}

// Daily rates (bytes/day) between snapshots of the same billing period, on
// Netlify's own update clock. Snapshots closer than MIN_GAP_HOURS to the last
// kept one are skipped, so every window spans about a day or more and a
// diurnal peak can't pose as a spike. The period start counts as a zero-usage
// snapshot, so a rate exists from the first run.
export function dailyRates(history) {
  const rates = [];
  let prev = null;
  for (const s of history) {
    if (prev?.periodStart !== s.periodStart) {
      prev = { updatedAt: s.periodStart, used: 0, periodStart: s.periodStart };
    }
    const hours = (ms(s.updatedAt) - ms(prev.updatedAt)) / 3600000;
    if (hours < MIN_GAP_HOURS || s.used < prev.used) continue;
    rates.push({ at: s.updatedAt, perDay: ((s.used - prev.used) / hours) * 24 });
    prev = s;
  }
  return rates;
}

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function assessBandwidth(history, now) {
  const latest = history.at(-1);
  if (!latest) return [];
  const alerts = [];
  const ageDays = (ms(now) - ms(latest.updatedAt)) / DAY_MS;
  if (ageDays > STALE_DAYS) {
    alerts.push({
      key: "bandwidth:stale",
      text: `Netlify bandwidth data is ${Math.floor(ageDays)} days old; check the API token`,
    });
  }
  const rates = dailyRates(history);
  const current = rates.at(-1);
  if (!current) return alerts;
  const prior = rates
    .slice(0, -1)
    .filter((r) => ms(current.at) - ms(r.at) <= BASELINE_DAYS * DAY_MS);
  const baseline = prior.length >= MIN_BASELINE_RATES ? median(prior.map((r) => r.perDay)) : null;
  if (baseline !== null && current.perDay > SPIKE_RATIO * baseline && current.perDay > SPIKE_FLOOR) {
    alerts.push({
      key: "bandwidth:spike",
      text:
        `Bandwidth jumped to ${gb(current.perDay)} GB/day ` +
        `(${(current.perDay / baseline).toFixed(1)}x the ${gb(baseline)} GB/day baseline)`,
    });
  }
  // Project from the median of the last week's rates, not one window.
  const recent = rates.filter((r) => ms(current.at) - ms(r.at) <= PROJECTION_DAYS * DAY_MS);
  const rate = median(recent.map((r) => r.perDay));
  const daysLeft = Math.max(0, (ms(latest.periodEnd) - ms(latest.updatedAt)) / DAY_MS);
  const projected = latest.used + rate * daysLeft;
  if (latest.included > 0 && projected > PROJECTION_WARN * latest.included) {
    alerts.push({
      key: "bandwidth:projection",
      text:
        `Bandwidth on track for ${gb(projected)} of ${gb(latest.included)} GB this period ` +
        `(${gb(latest.used)} GB used so far)`,
    });
  }
  return alerts;
}

// results: [{ name, markdown, status, headers: { lowercased-name: value } }],
// or { name, error } when the request itself failed. Browser-style requests
// must come from the static path; Markdown requests must still get Markdown.
export function assessHeaders(results) {
  const alerts = [];
  const add = (name, kind, text) => alerts.push({ key: `headers:${name}:${kind}`, text });
  for (const { name, markdown, status, headers, error } of results) {
    if (error) {
      add(name, "error", `${name}: request failed (${error})`);
      continue;
    }
    const vary = (headers.vary || "").toLowerCase().split(",").map((s) => s.trim());
    const type = (headers["content-type"] || "").toLowerCase();
    if (status !== 200) {
      add(name, "status", `${name}: HTTP ${status}`);
    } else if (markdown) {
      if (!type.startsWith("text/markdown")) add(name, "type", `${name}: Markdown request got ${type}`);
    } else {
      if (vary.includes("accept")) add(name, "vary", `${name}: page views send Vary: Accept`);
      if (!headers["cache-status"]) {
        add(name, "uncached", `${name}: no Netlify cache-status, so a function generated the page`);
      }
    }
  }
  return alerts;
}

// Which alerts to notify now: those not notified within REPEAT_DAYS. Returns
// the alerts plus the updated { key: lastNotifiedIso } log, pruned of keys
// that are no longer firing so a recurrence notifies at once.
export function dueAlerts(alerts, sent, now) {
  const due = alerts.filter((a) => !sent[a.key] || ms(now) - ms(sent[a.key]) >= REPEAT_DAYS * DAY_MS);
  const next = {};
  for (const a of alerts) next[a.key] = due.includes(a) ? now : sent[a.key];
  return { due, sent: next };
}
