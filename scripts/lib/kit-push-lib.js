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
import { stringifyFrontmatter } from './frontmatter.js';

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
 * The file as written after a successful push, recording `published`, `kitSyncedAt`
 * and a `kitSyncHash` of the file exactly as written (stringifyFrontmatter may
 * normalize hand-edited YAML). hashableContent drops the two push-state lines, so the
 * next run's contentHash(file) matches and reports "already in sync". The hash is
 * quoted so a digits-only hex string can't read back as a number.
 */
export function recordPushState(body, frontmatter, { published, syncedAt }) {
  const fm = { ...frontmatter, published, kitSyncHash: 'pending', kitSyncedAt: syncedAt };
  const out = stringifyFrontmatter(body, fm);
  return out.replace(/^kitSyncHash: .*$/m, `kitSyncHash: '${contentHash(out)}'`);
}

/** Frontmatter key → v4 API field for the sequence scheduling settings. */
const SCHEDULE_FIELDS = [
  ['delayValue', 'delay_value'],
  ['delayUnit', 'delay_unit'],
  ['sendDays', 'send_days'],
];

/**
 * The scheduling part of the PUT body: `delay_value`, `delay_unit` and `send_days` from
 * the frontmatter. A field that is missing or null in the frontmatter is left out, so a
 * file without scheduling keys never clears Kit's settings.
 */
export function schedulePayload(frontmatter) {
  const out = {};
  for (const [local, remote] of SCHEDULE_FIELDS) {
    if (frontmatter[local] != null) out[remote] = frontmatter[local];
  }
  return out;
}

/** "5 days, monday" — a one-line view of a schedule in API field names. */
export function formatSchedule({ delay_value: value, delay_unit: unit, send_days: days } = {}) {
  const daysText = Array.isArray(days) ? days.join('/') : '?';
  return `${value ?? '?'} ${unit ?? '?'}, ${daysText}`;
}

/**
 * How a push would change Kit's schedule for this email: `{ from, to }` as formatted
 * strings, or null when the fields the push sends already match the remote email.
 */
export function scheduleChange(remoteEmail, frontmatter) {
  const outgoing = schedulePayload(frontmatter);
  const merged = { ...remoteEmail, ...outgoing };
  const from = formatSchedule(remoteEmail);
  const to = formatSchedule(merged);
  return from === to ? null : { from, to };
}

/**
 * Whether a file needs pushing: 'in-sync' (its kitSyncHash matches its content),
 * 'changed' (it has a hash that no longer matches) or 'new' (never pushed).
 */
export function syncStatus(raw, frontmatter) {
  if (!frontmatter.kitSyncHash) return 'new';
  return frontmatter.kitSyncHash === contentHash(raw) ? 'in-sync' : 'changed';
}

/**
 * Build the PUT body for `/v4/sequences/{sequence_id}/emails/{id}`: subject,
 * preview_text, content, plus the scheduling fields from `schedulePayload` (delay and
 * send days; sent since Nov 2026). Never `position` — reordering stays a Kit-side
 * action. The v4 endpoint only changes fields present in the body.
 *
 * `published` is omitted by default: the email's draft/published state on Kit is left
 * untouched unless the caller opts in with `{ publish: true }` (the `--publish` CLI
 * flag), which sends `published: true` to flip a draft live. Note this is
 * intentionally one-directional — we never send `published: false`, so a push cannot
 * unpublish a live email.
 */
export function buildUpdatePayload(frontmatter, html, { publish = false } = {}) {
  return {
    subject: frontmatter.subject ?? '',
    preview_text: frontmatter.previewText ?? '',
    content: html,
    ...schedulePayload(frontmatter),
    ...(publish && { published: true }),
  };
}
