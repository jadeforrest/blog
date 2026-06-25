/**
 * Pure, I/O-free helpers for fetching Kit (kit.com) v4 sequence emails.
 *
 * Everything here is free of `fs` and `fetch` so it can be unit-tested with the
 * built-in `node:test` runner. The CLI (`scripts/kit-fetch-sequence.js`) is a thin
 * orchestration layer over these functions.
 */

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
