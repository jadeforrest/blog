/**
 * Pure, I/O-free helpers for fetching Kit (kit.com) v4 sequence emails.
 *
 * Everything here is free of `fs` and `fetch` so it can be unit-tested with the
 * built-in `node:test` runner. The CLI (`scripts/kit-fetch-sequence.js`) is a thin
 * orchestration layer over these functions.
 */

import { createHash } from 'node:crypto';
import TurndownService from 'turndown';

/**
 * Convert an email subject to an ASCII kebab-case slug, falling back to the email
 * id for empty / emoji-only / punctuation-only subjects.
 */
export function slugify(subject, fallbackId) {
  const slug = String(subject ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `email-${fallbackId ?? 'untitled'}`;
}

/** Zero-pad a (zero-based) position to at least two digits: 0 -> "00", 12 -> "12". */
export function paddedPosition(position) {
  return String(position ?? 0).padStart(2, '0');
}

/** Folder name for an email: `<paddedPosition>--<slug>`, e.g. `00--welcome`. */
export function folderName(email) {
  return `${paddedPosition(email.position)}--${slugify(email.subject, email.id)}`;
}

/**
 * Build the frontmatter object (passed to `matter.stringify`) carrying enough
 * metadata to map back to Kit on a future push. `position` is kept raw/zero-based
 * as Kit returns it.
 */
export function buildFrontmatter(email) {
  return {
    kitEmailId: email.id,
    sequenceId: email.sequence_id,
    subject: email.subject ?? '',
    previewText: email.preview_text ?? '',
    position: email.position,
    published: email.published ?? false,
    delayValue: email.delay_value ?? null,
    delayUnit: email.delay_unit ?? null,
    sendDays: email.send_days ?? null,
    emailTemplateId: email.email_template_id ?? null,
  };
}

/**
 * Frontmatter keys owned by the push side (kit-push-email), not derivable from
 * Kit's API. A fetch rebuilds frontmatter from the API, so these must be carried
 * over from the file's existing frontmatter — otherwise a re-fetch wipes the
 * push script's change-detection state (kitSyncHash) and last-push timestamp.
 */
export const PRESERVED_FRONTMATTER_KEYS = ['kitSyncHash', 'kitSyncedAt'];

/**
 * Merge freshly-built frontmatter with push-side bookkeeping carried over from
 * `existing` (the file's current frontmatter, or null/undefined for a new file).
 * Only PRESERVED_FRONTMATTER_KEYS with a non-null existing value are carried;
 * everything else comes from `built`.
 */
export function mergeFrontmatter(built, existing) {
  const out = { ...built };
  for (const key of PRESERVED_FRONTMATTER_KEYS) {
    if (existing != null && existing[key] != null) out[key] = existing[key];
  }
  return out;
}

let _turndown;
function turndown() {
  if (!_turndown) {
    _turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    // Drop non-content elements so their inner text/CSS doesn't leak into Markdown.
    _turndown.remove(['style', 'script', 'head', 'title']);
  }
  return _turndown;
}

/**
 * Convert email HTML to Markdown. Image URLs are preserved verbatim (turndown
 * renders `<img>` as `![alt](url)`), and Kit merge / Liquid tags like
 * `{{ subscriber.first_name }}` or `{% if ... %}` pass through untouched —
 * they are shielded from turndown's Markdown escaping so underscores/asterisks
 * inside them survive a future push back to Kit.
 */
export function htmlToMarkdown(html) {
  if (!html) return '';
  const tags = [];
  const guarded = String(html).replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, (m) => {
    tags.push(m);
    return `KITMERGETAG${tags.length - 1}ENDKITMERGETAG`;
  });
  let md = turndown().turndown(guarded).trim();
  md = md.replace(/KITMERGETAG(\d+)ENDKITMERGETAG/g, (_, i) => tags[Number(i)]);
  return `${md}\n`;
}

/**
 * Decide the cursor for the next page of a paginated list response, or `null` to
 * stop. Stops when `has_next_page` is not true, or when the cursor is empty or
 * unchanged from the previous page (guards against an infinite loop on an API quirk).
 */
export function nextCursor(pagination, prevCursor = null) {
  if (!pagination || pagination.has_next_page !== true) return null;
  const cursor = pagination.end_cursor;
  if (!cursor || cursor === prevCursor) return null;
  return cursor;
}

/** Extract image URLs from Markdown `![alt](url "title")` references. */
export function extractImageUrls(markdown) {
  const urls = [];
  const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) urls.push(m[1]);
  return urls;
}

/** True if a URL points at rubick.com (the site that hosts blog/newsletter images). */
export function isRubickUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'rubick.com';
  } catch {
    return false;
  }
}

const CONTENT_TYPE_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

/** True if `contentType` names an image media type (`image/...`). */
export function isImageContentType(contentType) {
  return /^image\//i.test(String(contentType ?? '').trim());
}

/**
 * File extension for a mirrored image. Prefers the `Content-Type` (authoritative
 * for filekitcdn's extensionless URLs), then the URL's own extension, then `png`.
 */
export function imageExtension(url, contentType) {
  const ct = String(contentType ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (CONTENT_TYPE_EXT[ct]) return CONTENT_TYPE_EXT[ct];
  const m = String(url ?? '')
    .split(/[?#]/)[0]
    .match(/\.([a-z0-9]{2,4})$/i);
  return m ? m[1].toLowerCase() : 'png';
}

/** Short, stable content-address of a source image URL (used as the mirror's basename). */
export function imageUrlHash(url) {
  return createHash('sha1').update(String(url)).digest('hex').slice(0, 16);
}

/** Deterministic mirrored filename for a source image URL: `<hash>.<ext>`. */
export function mirroredImageName(url, contentType) {
  return `${imageUrlHash(url)}.${imageExtension(url, contentType)}`;
}

/**
 * Replace exact image source URLs in `markdown` using `mapping` (old URL → new
 * URL, a Map or plain object). No-op entries (missing/identical) are skipped.
 */
export function rewriteImageUrls(markdown, mapping) {
  let out = String(markdown ?? '');
  const entries = mapping instanceof Map ? [...mapping] : Object.entries(mapping ?? {});
  for (const [oldUrl, newUrl] of entries) {
    if (!oldUrl || !newUrl || oldUrl === newUrl) continue;
    out = out.split(oldUrl).join(newUrl);
  }
  return out;
}

/** Matches Kit's Liquid snippet tag, e.g. `{{ snippet.engineering-manager }}`. */
const SNIPPET_TAG = /\{\{\s*snippet\.([a-zA-Z0-9_-]+)\s*\}\}/g;

/**
 * Distinct snippet keys referenced via Kit's Liquid snippet tag
 * (`{{ snippet.<key> }}`), in first-seen order and de-duplicated.
 */
export function snippetKeysIn(text) {
  const keys = [];
  const seen = new Set();
  for (const m of String(text ?? '').matchAll(SNIPPET_TAG)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      keys.push(m[1]);
    }
  }
  return keys;
}

/**
 * Replace `{{ snippet.<key> }}` tags with resolved content. `resolved` is a Map
 * (or plain object) of key → replacement string; a key whose value is missing
 * (undefined / null) is left untouched so an unknown snippet degrades to its tag
 * rather than vanishing. Returns `{ text, replaced, missing }` (both lists of
 * distinct keys) so the caller can report what happened.
 */
export function applySnippets(text, resolved) {
  const get = (k) => (resolved instanceof Map ? resolved.get(k) : resolved?.[k]);
  const replaced = new Set();
  const missing = new Set();
  const out = String(text ?? '').replace(SNIPPET_TAG, (whole, key) => {
    const value = get(key);
    if (value == null) {
      missing.add(key);
      return whole;
    }
    replaced.add(key);
    return String(value);
  });
  return { text: out, replaced: [...replaced], missing: [...missing] };
}
