// Deploy-time size budgets (scripts/check-budgets.js runs them at the end of
// `npm run build`, so an over-budget change fails the Netlify deploy). Metrics
// are per page or per page-average, so adding posts doesn't creep toward the
// limits; a change in what each page ships does:
// - key pages: HTML, inline+linked CSS, inline+linked JS, eager (above the
//   fold) image bytes, and the number of third-party origins they load from
// - site: files and non-image bytes per HTML page (catches "a new file for
//   every page"; images are excluded because posts legitimately add them)
// Budgets live in budgets.json; raising one is a deliberate, gated commit.
// The HTML parsing is regex-based and counts raw (uncompressed) bytes: a
// regression tripwire, not a performance measurement (Lighthouse is that).

export const HEADROOM = 0.1;
// Absolute minimum headroom per metric, so content that legitimately varies
// (the newest post's cover and blurb on listing pages, a CSS tweak) doesn't
// fail a deploy. A real regression (a new script, a hero image) is bigger.
export const FLOORS = { html: 8 * 1024, css: 2048, js: 2048, eagerImages: 150 * 1024 };
const IMAGE = /\.(webp|jpe?g|png|gif|avif|svg|ico)$/i;
export const KEY_PAGES = ["/", "/about/", "/posts/", "/newsletter/", "/completed-staff-work/"];
// Search index and its loader are fetched only when someone searches.
export const EXCLUDED = /^pagefind\//;

const attr = (tag, name) =>
  tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find((v) => v !== undefined);
const bytes = (s) => Buffer.byteLength(s, "utf8");

// One page's weight. `sizeOf(path)` returns a local file's bytes or null.
export function measurePage(html, sizeOf) {
  const m = { html: bytes(html), css: 0, js: 0, eagerImages: 0, thirdParty: 0 };
  const origins = new Set();
  const local = (url, field) => {
    if (/^(https?:)?\/\//i.test(url)) {
      origins.add(new URL(url, "https://x.invalid").host);
    } else if (url && !url.startsWith("data:")) {
      m[field] += sizeOf(url.split(/[?#]/)[0]) ?? 0;
    }
  };
  for (const [, tag, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = attr(tag, "src");
    if (src) local(src, "js");
    else if (!/type\s*=\s*["']?application\/(ld\+)?json/i.test(tag)) m.js += bytes(body);
  }
  for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) m.css += bytes(body);
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (/rel\s*=\s*["']?stylesheet/i.test(tag)) local(attr(tag, "href"), "css");
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (attr(tag, "loading") !== "lazy") local(attr(tag, "src"), "eagerImages");
  }
  m.thirdParty = origins.size;
  return m;
}

// files: [{ path (relative to dist), bytes }] -> per-page averages.
export function measureSite(files) {
  const kept = files.filter((f) => !EXCLUDED.test(f.path));
  const pages = kept.filter((f) => f.path.endsWith(".html")).length || 1;
  const nonImage = kept.filter((f) => !IMAGE.test(f.path)).reduce((sum, f) => sum + f.bytes, 0);
  return { filesPerPage: kept.length / pages, nonImageBytesPerPage: nonImage / pages };
}

// measured / budgets: { site: {...}, pages: { "/": {...} } } -> violations.
export function compare(measured, budgets) {
  const out = [];
  const check = (where, actual, limits = {}) => {
    for (const [metric, budget] of Object.entries(limits)) {
      if (actual?.[metric] === undefined) {
        out.push({ where, metric, actual: "missing", budget });
      } else if (actual[metric] > budget) {
        out.push({ where, metric, actual: actual[metric], budget });
      }
    }
  };
  check("site", measured.site, budgets.site);
  for (const [page, limits] of Object.entries(budgets.pages ?? {})) {
    check(page, measured.pages[page], limits);
  }
  return out;
}

// Budgets from a measurement: HEADROOM above each size, exact for the
// third-party count (a new origin is always a decision).
export function makeBudgets(measured, headroom = HEADROOM) {
  // Rounding to 6 places first keeps float noise (1.1 * 100000 =
  // 110000.00000000001) from ceiling up a whole unit.
  const ceil = (x) => Math.ceil(Math.round(x * 1e6) / 1e6);
  const raw = (metric, v) => {
    if (metric === "thirdParty") return v;
    if (metric === "filesPerPage") return ceil(v * (1 + headroom) * 100) / 100;
    return ceil(Math.max(v * (1 + headroom), v + (FLOORS[metric] ?? 0)));
  };
  // ...but never below the measurement itself (a near-zero value can round to 0).
  const limit = (metric, v) => Math.max(raw(metric, v), v);
  const limits = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, limit(k, v)]));
  return {
    site: limits(measured.site),
    pages: Object.fromEntries(Object.entries(measured.pages).map(([p, m]) => [p, limits(m)])),
  };
}

export const fmt = (metric, v) =>
  typeof v !== "number" ? v : /^(thirdParty|filesPerPage)$/.test(metric) ? String(v) : `${(v / 1024).toFixed(1)} KB`;

export function explainFailure(violations) {
  const missing = violations.some((v) => v.actual === "missing");
  return [
    "Size budget exceeded: this build ships more to each visitor than budgets.json allows.",
    "",
    ...violations.map(
      (v) => `  ${v.where} ${v.metric}: ${fmt(v.metric, v.actual)} (budget ${fmt(v.metric, v.budget)})`,
    ),
    "",
    ...(missing ? ["A key page is missing: if it was renamed or removed, update KEY_PAGES in", "scripts/lib/budgets.js and its entry in budgets.json.", ""] : []),
    "To fix: shrink what changed (images, scripts, inline CSS, third-party embeds).",
    "To accept the new cost (locally; this build's dist/ is reused):",
    "  npm run budgets:update",
    "  git commit budgets.json   # the cost gate asks for a Cost: line saying why",
    "To deploy right now anyway: set BUDGETS_WARN_ONLY=1 in Netlify's environment",
    "  (Site configuration > Environment variables), redeploy, then remove it. The daily",
    "  cost watch notifies you every few days while it is still set.",
  ].join("\n");
}
