import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  paddedPosition,
  folderName,
  buildFrontmatter,
  htmlToMarkdown,
  nextCursor,
  extractImageUrls,
  isRubickUrl,
} from './kit-fetch-lib.js';

test('slugify: normal subject → kebab-case', () => {
  assert.equal(slugify('Welcome to the Newsletter!'), 'welcome-to-the-newsletter');
});

test('slugify: strips diacritics', () => {
  assert.equal(slugify('Café résumé déjà'), 'cafe-resume-deja');
});

test('slugify: empty / emoji-only falls back to id', () => {
  assert.equal(slugify('', 42), 'email-42');
  assert.equal(slugify('🎉🎉', 999), 'email-999');
  assert.equal(slugify('!!! ???', 7), 'email-7');
});

test('paddedPosition: zero-based, at least two digits', () => {
  assert.equal(paddedPosition(0), '00');
  assert.equal(paddedPosition(9), '09');
  assert.equal(paddedPosition(12), '12');
  assert.equal(paddedPosition(123), '123');
});

test('folderName: position--slug', () => {
  assert.equal(folderName({ position: 0, subject: 'Welcome', id: 1 }), '00--welcome');
  assert.equal(folderName({ position: 3, subject: '', id: 88 }), '03--email-88');
});

test('buildFrontmatter: maps Kit fields, keeps zero-based position', () => {
  const fm = buildFrontmatter({
    id: 12345,
    sequence_id: 2684721,
    subject: 'Hi',
    preview_text: 'preview',
    position: 0,
    published: true,
    delay_value: 2,
    delay_unit: 'days',
    send_days: ['monday'],
    email_template_id: null,
  });
  assert.deepEqual(fm, {
    kitEmailId: 12345,
    sequenceId: 2684721,
    subject: 'Hi',
    previewText: 'preview',
    position: 0,
    published: true,
    delayValue: 2,
    delayUnit: 'days',
    sendDays: ['monday'],
    emailTemplateId: null,
  });
});

test('buildFrontmatter: tolerates missing optional fields', () => {
  const fm = buildFrontmatter({ id: 1, sequence_id: 2, position: 5 });
  assert.equal(fm.subject, '');
  assert.equal(fm.previewText, '');
  assert.equal(fm.published, false);
  assert.equal(fm.delayValue, null);
  assert.equal(fm.emailTemplateId, null);
});

test('htmlToMarkdown: converts headings/links/lists', () => {
  const md = htmlToMarkdown('<h1>Title</h1><ul><li>a</li><li>b</li></ul>');
  assert.match(md, /^# Title/);
  assert.match(md, /-\s+a/);
  assert.match(md, /-\s+b/);
});

test('htmlToMarkdown: image URL preserved verbatim', () => {
  const md = htmlToMarkdown('<img src="https://www.rubick.com/a/b.png" alt="x">');
  assert.match(md, /!\[x\]\(https:\/\/www\.rubick\.com\/a\/b\.png\)/);
});

test('htmlToMarkdown: merge/Liquid tags pass through untouched', () => {
  const md = htmlToMarkdown(
    '<p>Hi {{ subscriber.first_name }}</p>' +
      '<p><a href="{{ link_url }}">go</a></p>' +
      '{% if subscriber.tags %}<p>VIP</p>{% endif %}',
  );
  assert.match(md, /\{\{ subscriber\.first_name \}\}/);
  assert.match(md, /\(\{\{ link_url \}\}\)/);
  assert.match(md, /\{% if subscriber\.tags %\}/);
  assert.match(md, /\{% endif %\}/);
});

test('htmlToMarkdown: strips style/script content (no CSS/JS leak)', () => {
  const md = htmlToMarkdown(
    '<style>@media only screen { .email * { word-break: break-word; } }</style>' +
      '<script>trackOpen();</script>' +
      '<p>Real content</p>',
  );
  assert.doesNotMatch(md, /word-break/);
  assert.doesNotMatch(md, /@media/);
  assert.doesNotMatch(md, /trackOpen/);
  assert.match(md, /Real content/);
});

test('htmlToMarkdown: empty input → empty string', () => {
  assert.equal(htmlToMarkdown(''), '');
  assert.equal(htmlToMarkdown(null), '');
});

test('nextCursor: stops when no next page', () => {
  assert.equal(nextCursor({ has_next_page: false, end_cursor: 'z' }), null);
});

test('nextCursor: stops on empty or repeated cursor', () => {
  assert.equal(nextCursor({ has_next_page: true, end_cursor: '' }), null);
  assert.equal(nextCursor({ has_next_page: true, end_cursor: 'a' }, 'a'), null);
});

test('nextCursor: returns next cursor when advancing', () => {
  assert.equal(nextCursor({ has_next_page: true, end_cursor: 'b' }, 'a'), 'b');
});

test('extractImageUrls: pulls all image URLs', () => {
  const urls = extractImageUrls('![x](https://www.rubick.com/a.png) text ![](http://cdn.kit.com/y.gif "t")');
  assert.deepEqual(urls, ['https://www.rubick.com/a.png', 'http://cdn.kit.com/y.gif']);
});

test('isRubickUrl: matches rubick.com host only', () => {
  assert.equal(isRubickUrl('https://www.rubick.com/x.png'), true);
  assert.equal(isRubickUrl('https://rubick.com/x.png'), true);
  assert.equal(isRubickUrl('https://cdn.kit.com/x.png'), false);
  assert.equal(isRubickUrl('not a url'), false);
});
