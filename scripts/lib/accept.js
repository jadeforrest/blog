// HTTP Accept negotiation (RFC 9110 §12.5.1) between the two representations
// the site serves: HTML (default) and Markdown for agents. Pure so it can run
// both under `node --test` and inside the Netlify edge function (Deno).
//
// Rules, following https://acceptmarkdown.com/guides/accept-parsing:
// - each offered type takes the q of its most specific matching Accept entry
//   (exact > type/* > */*); no match or q=0 means "not acceptable"
// - highest q wins; ties go to Markdown only when the client named
//   text/markdown explicitly — browsers never do, while a bare */* must keep
//   getting HTML
// - a missing, blank or unparseable header means "no constraint", so HTML

export const HTML = "text/html";
export const MARKDOWN = "text/markdown";

export function parseAccept(header) {
  const entries = [];
  for (const part of String(header).split(",")) {
    const [range, ...params] = part.split(";").map((s) => s.trim());
    const [type, subtype] = range.toLowerCase().split("/");
    if (!type || !subtype) continue;
    let q = 1;
    for (const param of params) {
      const [name, value] = param.split("=").map((s) => s.trim());
      if (name.toLowerCase() === "q") q = parseQ(value);
    }
    entries.push({ type, subtype, q });
  }
  return entries;
}

// Malformed q-values are read as 1 rather than discarding the entry: a client
// that wrote `text/markdown;q=high` still asked for Markdown.
function parseQ(value) {
  const q = Number(value);
  if (value === "" || !Number.isFinite(q)) return 1;
  return Math.min(1, Math.max(0, q));
}

// 2 exact, 1 type/*, 0 */*, -1 no match.
function specificity(entry, type, subtype) {
  if (entry.type === "*" && entry.subtype === "*") return 0;
  if (entry.type !== type) return -1;
  if (entry.subtype === subtype) return 2;
  return entry.subtype === "*" ? 1 : -1;
}

// Returns { q, specificity } for the most specific entry matching `mediaType`,
// or null when nothing matches. Among equally specific entries the highest q
// wins.
export function matchQuality(entries, mediaType) {
  const [type, subtype] = mediaType.split("/");
  let best = null;
  for (const e of entries) {
    const s = specificity(e, type, subtype);
    if (s < 0) continue;
    if (!best || s > best.specificity || (s === best.specificity && e.q > best.q)) {
      best = { q: e.q, specificity: s };
    }
  }
  return best;
}

// Picks HTML or MARKDOWN for an Accept header, or null when neither is
// acceptable (the caller answers 406).
export function negotiate(header) {
  const entries = parseAccept(header ?? "");
  if (entries.length === 0) return HTML;
  const html = matchQuality(entries, HTML);
  const md = matchQuality(entries, MARKDOWN);
  const htmlQ = html ? html.q : 0;
  const mdQ = md ? md.q : 0;
  if (htmlQ === 0 && mdQ === 0) return null;
  if (mdQ > htmlQ) return MARKDOWN;
  if (mdQ === htmlQ && md.specificity === 2) return MARKDOWN;
  return HTML;
}

// Whether `mediaType` is acceptable at all (q > 0) under the header.
export function isAcceptable(header, mediaType) {
  const entries = parseAccept(header ?? "");
  if (entries.length === 0) return true;
  const match = matchQuality(entries, mediaType);
  return Boolean(match && match.q > 0);
}
