import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  paddedPosition,
  folderName,
  buildFrontmatter,
  mergeFrontmatter,
  htmlToMarkdown,
  nextCursor,
  extractImageUrls,
  isRubickUrl,
  isImageContentType,
  isSvgContentType,
  imageExtension,
  imageUrlHash,
  mirroredImageName,
  rewriteImageUrls,
  snippetKeysIn,
  applySnippets,
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

test('mergeFrontmatter: carries over push-side bookkeeping from existing', () => {
  const built = buildFrontmatter({ id: 1, sequence_id: 2, position: 0 });
  const merged = mergeFrontmatter(built, {
    kitSyncHash: 'abc123',
    kitSyncedAt: '2026-07-20T16:17:44.211Z',
  });
  assert.equal(merged.kitSyncHash, 'abc123');
  assert.equal(merged.kitSyncedAt, '2026-07-20T16:17:44.211Z');
  // API-derived fields still come from `built`.
  assert.equal(merged.kitEmailId, 1);
});

test('mergeFrontmatter: no existing (new file) leaves built untouched', () => {
  const built = buildFrontmatter({ id: 1, sequence_id: 2, position: 0 });
  assert.deepEqual(mergeFrontmatter(built, null), built);
  assert.deepEqual(mergeFrontmatter(built, undefined), built);
  assert.deepEqual(mergeFrontmatter(built, {}), built);
  assert.equal('kitSyncHash' in mergeFrontmatter(built, {}), false);
});

test('mergeFrontmatter: only preserved keys are carried, not arbitrary extras', () => {
  const built = buildFrontmatter({ id: 1, sequence_id: 2, position: 0 });
  const merged = mergeFrontmatter(built, { kitSyncHash: 'h', someOtherField: 'x' });
  assert.equal(merged.kitSyncHash, 'h');
  assert.equal('someOtherField' in merged, false);
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

test('isImageContentType: true only for image/* media types', () => {
  assert.equal(isImageContentType('image/png'), true);
  assert.equal(isImageContentType('image/jpeg; charset=binary'), true);
  assert.equal(isImageContentType('text/html'), false);
  assert.equal(isImageContentType(''), false);
  assert.equal(isImageContentType(null), false);
});

test('isSvgContentType: true only for image/svg+xml', () => {
  assert.equal(isSvgContentType('image/svg+xml'), true);
  assert.equal(isSvgContentType('image/svg+xml; charset=utf-8'), true);
  assert.equal(isSvgContentType('IMAGE/SVG+XML'), true);
  assert.equal(isSvgContentType('image/png'), false);
  assert.equal(isSvgContentType(''), false);
  assert.equal(isSvgContentType(null), false);
});

test('imageExtension: prefers Content-Type, falls back to URL then png', () => {
  // Content-Type wins even for an extensionless (filekitcdn-style) URL.
  assert.equal(imageExtension('https://embed.filekitcdn.com/e/abc/def', 'image/png'), 'png');
  assert.equal(imageExtension('https://x/y', 'image/jpeg'), 'jpg');
  assert.equal(imageExtension('https://x/y.webp', ''), 'webp');
  assert.equal(imageExtension('https://x/y.JPG?v=2', ''), 'jpg');
  assert.equal(imageExtension('https://embed.filekitcdn.com/e/abc/def', ''), 'png');
});

test('imageUrlHash: deterministic and URL-sensitive', () => {
  assert.equal(imageUrlHash('https://x/a'), imageUrlHash('https://x/a'));
  assert.notEqual(imageUrlHash('https://x/a'), imageUrlHash('https://x/b'));
  assert.match(imageUrlHash('https://x/a'), /^[0-9a-f]{16}$/);
});

test('mirroredImageName: <hash>.<ext>, stable across runs', () => {
  const url = 'https://embed.filekitcdn.com/e/abc/def';
  const name = mirroredImageName(url, 'image/png');
  assert.equal(name, `${imageUrlHash(url)}.png`);
  assert.equal(mirroredImageName(url, 'image/png'), name);
});

test('rewriteImageUrls: swaps exact URLs, skips no-op entries', () => {
  const md = '![a](https://cdn/x) and again ![b](https://cdn/x) but ![c](https://cdn/y)';
  const out = rewriteImageUrls(
    md,
    new Map([
      ['https://cdn/x', 'https://www.rubick.com/kit-images/1/h.png'],
      ['https://cdn/z', 'https://cdn/z'], // identical → skipped
    ]),
  );
  assert.equal(
    out,
    '![a](https://www.rubick.com/kit-images/1/h.png) and again ![b](https://www.rubick.com/kit-images/1/h.png) but ![c](https://cdn/y)',
  );
});

test('rewriteImageUrls: accepts a plain object and tolerates empty mapping', () => {
  assert.equal(rewriteImageUrls('![a](u)', { u: 'v' }), '![a](v)');
  assert.equal(rewriteImageUrls('![a](u)', {}), '![a](u)');
  assert.equal(rewriteImageUrls('![a](u)', null), '![a](u)');
});

test('snippetKeysIn: distinct keys in first-seen order', () => {
  const text = 'a {{ snippet.engineering-manager }} b {{snippet.hiring_speed}} c {{ snippet.engineering-manager }}';
  assert.deepEqual(snippetKeysIn(text), ['engineering-manager', 'hiring_speed']);
});

test('snippetKeysIn: ignores other Liquid tags, tolerates empty', () => {
  assert.deepEqual(snippetKeysIn('{{ subscriber.first_name }} {% if x %}{% endif %}'), []);
  assert.deepEqual(snippetKeysIn(''), []);
  assert.deepEqual(snippetKeysIn(null), []);
});

test('applySnippets: replaces known keys, reports replaced', () => {
  const { text, replaced, missing } = applySnippets(
    'intro\n\n{{ snippet.engineering-manager }}\n\noutro',
    new Map([['engineering-manager', 'EXPANDED BODY']]),
  );
  assert.equal(text, 'intro\n\nEXPANDED BODY\n\noutro');
  assert.deepEqual(replaced, ['engineering-manager']);
  assert.deepEqual(missing, []);
});

test('applySnippets: unknown key left as its tag and reported missing', () => {
  const { text, replaced, missing } = applySnippets('{{ snippet.unknown }}', new Map());
  assert.equal(text, '{{ snippet.unknown }}');
  assert.deepEqual(replaced, []);
  assert.deepEqual(missing, ['unknown']);
});

test('applySnippets: accepts a plain object and de-dupes reported keys', () => {
  const { text, replaced } = applySnippets(
    '{{ snippet.a }} and {{ snippet.a }}',
    { a: 'X' },
  );
  assert.equal(text, 'X and X');
  assert.deepEqual(replaced, ['a']);
});
