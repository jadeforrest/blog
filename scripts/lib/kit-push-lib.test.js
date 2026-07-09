import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  markdownToHtml,
  hashableContent,
  contentHash,
  buildUpdatePayload,
} from './kit-push-lib.js';

test('markdownToHtml: converts headings/links/lists', async () => {
  const html = await markdownToHtml('# Title\n\n- a\n- b\n\n[go](https://www.rubick.com/)');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<li>a<\/li>/);
  assert.match(html, /<li>b<\/li>/);
  assert.match(html, /<a href="https:\/\/www\.rubick\.com\/">go<\/a>/);
});

test('markdownToHtml: image URL preserved verbatim', async () => {
  const html = await markdownToHtml('![x](https://www.rubick.com/a/b.png)');
  assert.match(html, /<img src="https:\/\/www\.rubick\.com\/a\/b\.png" alt="x">/);
});

test('markdownToHtml: merge/Liquid tags pass through untouched', async () => {
  const html = await markdownToHtml(
    'Hi {{ subscriber.first_name }}\n\n[go]({{ link_url }})\n\n{% if subscriber.tags %}VIP{% endif %}'
  );
  assert.match(html, /\{\{ subscriber\.first_name \}\}/);
  assert.match(html, /href="\{\{ link_url \}\}"/);
  assert.match(html, /\{% if subscriber\.tags %\}/);
  assert.match(html, /\{% endif %\}/);
});

test('markdownToHtml: round-trips what kit-fetch escaped', async () => {
  // Underscores inside merge tags must never be interpreted as emphasis.
  const html = await markdownToHtml('{{ subscriber.first_name }} and {{ email_address }}');
  assert.doesNotMatch(html, /<em>/);
  assert.match(html, /\{\{ email_address \}\}/);
});

test('markdownToHtml: empty input → empty string', async () => {
  assert.equal(await markdownToHtml(''), '');
  assert.equal(await markdownToHtml(null), '');
});

test('hashableContent: strips kitSyncHash and kitSyncedAt lines only', () => {
  const raw = '---\nsubject: Hi\nkitSyncHash: abc123\nkitSyncedAt: 2026-07-09T00:00:00Z\n---\nBody\n';
  assert.equal(hashableContent(raw), '---\nsubject: Hi\n---\nBody\n');
});

test('contentHash: stable when only push-state lines change', () => {
  const before = '---\nsubject: Hi\n---\nBody\n';
  const after = '---\nsubject: Hi\nkitSyncHash: deadbeef\nkitSyncedAt: 2026-07-09\n---\nBody\n';
  assert.equal(contentHash(before), contentHash(after));
});

test('contentHash: changes when real content changes', () => {
  assert.notEqual(contentHash('---\nsubject: Hi\n---\nBody\n'), contentHash('---\nsubject: Hi\n---\nEdited\n'));
});

test('buildUpdatePayload: only content-ish fields, never scheduling', () => {
  const payload = buildUpdatePayload(
    {
      subject: 'Hi',
      previewText: 'peek',
      position: 3,
      published: true,
      delayValue: 2,
      delayUnit: 'days',
      sendDays: ['monday'],
    },
    '<p>Body</p>\n'
  );
  assert.deepEqual(payload, { subject: 'Hi', preview_text: 'peek', content: '<p>Body</p>\n' });
});

test('buildUpdatePayload: tolerates missing subject/preview', () => {
  const payload = buildUpdatePayload({}, '<p>x</p>\n');
  assert.deepEqual(payload, { subject: '', preview_text: '', content: '<p>x</p>\n' });
});
