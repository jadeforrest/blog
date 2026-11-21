/**
 * Which Kit sequence emails are copies of which blog posts, for scripts/kit-sync.js.
 *
 * A post's email carries its share link ("Share this link: https://www.rubick.com/<slug>/",
 * or just the bare link in older pastes) in a paragraph of its own, usually the first, sometimes
 * after an intro paragraph. The first such paragraph names the post; links inside running text
 * are only references to other posts and never count. Emails in sequences that have a local
 * src/content/kit-sequence-<id>/ folder are hand-written and owned by kit-push-sequence.js,
 * so those sequences are not scanned.
 *
 * In frontmatter a post's emails are `kitEmails: "<sequenceId>/<emailId>[, ...]"`.
 */

// The `w+` tolerates typos like "wwww." seen in old pastes; the slug is the first path segment.
const RUBICK_LINK = /(?:https?:)?\/\/(?:w+\.)?rubick\.com\/([a-z0-9][a-z0-9-]*)/i;

const SHARE_LABEL = /^share this (?:post|link):?/i;
const BARE_URL = new RegExp(`^${RUBICK_LINK.source}[^\\s]*$`, "i");

/** A paragraph's visible text, without tags, zero-width spaces or surrounding space. */
function paragraphText(inner) {
  return inner.replace(/<[^>]*>/g, "").replace(/&nbsp;| |​/g, " ").trim();
}

/**
 * The slug a share-link paragraph names: one labelled "Share this post/link" with a rubick.com
 * link in it, or one whose whole text is a rubick.com URL. Null for any other paragraph.
 */
function shareParagraphSlug(inner) {
  const text = paragraphText(inner);
  const isShare = SHARE_LABEL.test(text) || BARE_URL.test(text);
  const link = isShare && inner.match(RUBICK_LINK);
  return link ? link[1].toLowerCase() : null;
}

/** The slug the email's first share-link paragraph names, or null. */
export function shareSlug(html) {
  const body = String(html ?? "").replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const [, inner] of body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const slug = shareParagraphSlug(inner);
    if (slug) return slug;
  }
  return null;
}

/** `[{ sequenceId, emailId }]` from a kitEmails value ("1031459/4535403, ..."). */
export function parseKitEmails(value) {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim().match(/^(\d+)\/(\d+)$/))
    .filter(Boolean)
    .map((m) => ({ sequenceId: Number(m[1]), emailId: Number(m[2]) }));
}

export function formatKitEmails(pairs) {
  return pairs.map((p) => `${p.sequenceId}/${p.emailId}`).join(", ");
}

const pairKey = (p) => `${p.sequenceId}/${p.emailId}`;

/** `a` plus the pairs of `b` it doesn't have yet, in order. */
export function mergePairs(a, b) {
  const seen = new Set(a.map(pairKey));
  return [...a, ...b.filter((p) => !seen.has(pairKey(p)))];
}

/**
 * The sequences that can hold post emails: everything except those with a local folder
 * (`localIds`) and test or archived ("ZZ ...") sequences.
 */
export function postSequences(sequences, localIds) {
  const local = new Set(localIds.map(Number));
  return sequences.filter((s) => !local.has(s.id) && !/\btest|^zz\b/i.test(s.name));
}

/** All emails of a sequence from the paginated list endpoint (content is not included). */
async function listEmails(sequenceId, get) {
  const emails = [];
  let after = null;
  do {
    const q = new URLSearchParams({ per_page: "100", ...(after && { after }) });
    const page = await get(`/sequences/${sequenceId}/emails?${q}`);
    emails.push(...page.emails);
    after = page.pagination?.has_next_page ? page.pagination.end_cursor : null;
  } while (after);
  return emails;
}

/**
 * Every email in `sequences`, each with the slug its share link names. A matched slug never
 * changes for an email, so `cache` ({ [emailId]: slug | null }) saves fetching it again; it is
 * updated in place. Returns `{ emails, fetched }`.
 */
export async function loadKitIndex({ sequences, get, cache }) {
  const emails = [];
  let fetched = 0;
  for (const seq of sequences) {
    for (const email of await listEmails(seq.id, get)) {
      // Only matches are cached: an email that names no post is checked again each run, so a
      // better matcher (or a fixed share link) picks it up.
      if (!cache[email.id]) {
        const full = await get(`/sequences/${seq.id}/emails/${email.id}`);
        cache[email.id] = shareSlug((full.email ?? full).content);
        fetched++;
      }
      emails.push({ ...email, sequence_id: seq.id, slug: cache[email.id] });
    }
  }
  return { emails, fetched };
}

/** slug → [{ sequenceId, emailId }] for the emails that name a post. */
export function emailsBySlug(emails) {
  const map = new Map();
  for (const e of emails.filter((x) => x.slug)) {
    const list = map.get(e.slug) ?? [];
    map.set(e.slug, [...list, { sequenceId: e.sequence_id, emailId: e.id }]);
  }
  return map;
}

/**
 * Schedule settings for a new email appended to `sequenceId`: copied from its last email, so a
 * new post goes out on the same rhythm as the one before it. Kit requires delay_value/unit.
 */
export function newEmailSchedule(emails, sequenceId) {
  const last = emails
    .filter((e) => e.sequence_id === sequenceId)
    .reduce((a, b) => ((b.position ?? 0) > (a?.position ?? -1) ? b : a), null);
  if (!last) return { delay_value: 7, delay_unit: "days" };
  const days = last.delay_unit === "days" && Array.isArray(last.send_days) ? { send_days: last.send_days } : {};
  return { delay_value: last.delay_value, delay_unit: last.delay_unit, ...days };
}
