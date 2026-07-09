/**
 * Pure, I/O-free helpers for pushing Kit (kit.com) sequence emails back via the
 * v4 API — the inverse of `kit-fetch-lib.js`.
 *
 * Everything here is free of `fs` and `fetch` so it can be unit-tested with the
 * built-in `node:test` runner. The CLI (`scripts/kit-push-email.js`) is a thin
 * orchestration layer over these functions.
 */

import crypto from 'crypto';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

/**
 * Convert sequence-email Markdown to HTML for the v4 `content` field. Kit merge /
 * Liquid tags like `{{ subscriber.first_name }}` or `{% if ... %}` are shielded
 * from Markdown processing (mirroring `htmlToMarkdown` in kit-fetch-lib.js) so
 * underscores/braces inside them arrive at Kit untouched.
 */
export async function markdownToHtml(markdown) {
  if (!markdown) return '';
  const tags = [];
  const guarded = String(markdown).replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, (m) => {
    tags.push(m);
    return `KITMERGETAG${tags.length - 1}ENDKITMERGETAG`;
  });
  const result = await remark().use(remarkHtml, { sanitize: false }).process(guarded);
  let html = String(result).trim();
  html = html.replace(/KITMERGETAG(\d+)ENDKITMERGETAG/g, (_, i) => tags[Number(i)]);
  return `${html}\n`;
}

/**
 * The file content that counts as "what we synced": everything except the push-state
 * lines themselves, so writing kitSyncHash/kitSyncedAt doesn't invalidate the hash.
 * Same idea as `hashableContent` in scripts/kit-sync.js.
 */
export function hashableContent(raw) {
  return String(raw ?? '').replace(/^kitSync(?:Hash|edAt):.*\n?/gm, '');
}

/** md5 of the hashable content — stored in frontmatter as `kitSyncHash`. */
export function contentHash(raw) {
  return crypto.createHash('md5').update(hashableContent(raw)).digest('hex');
}

/**
 * Build the PUT body for `/v4/sequences/{sequence_id}/emails/{id}`. Deliberately
 * limited to content-ish fields — never position, published, delays, or send_days,
 * so a push can't disturb sequence scheduling (the v4 endpoint only changes fields
 * present in the body).
 */
export function buildUpdatePayload(frontmatter, html) {
  return {
    subject: frontmatter.subject ?? '',
    preview_text: frontmatter.previewText ?? '',
    content: html,
  };
}
