import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { parseFrontmatter } from './frontmatter.js';
import {
  markdownToHtml,
  hashableContent,
  contentHash,
  buildUpdatePayload,
  recordPushState,
  schedulePayload,
  formatSchedule,
  scheduleChange,
  syncStatus,
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

test('buildUpdatePayload: content and scheduling fields, never position or published', () => {
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
  assert.deepEqual(payload, {
    subject: 'Hi',
    preview_text: 'peek',
    content: '<p>Body</p>\n',
    delay_value: 2,
    delay_unit: 'days',
    send_days: ['monday'],
  });
});

test('buildUpdatePayload: tolerates missing subject/preview', () => {
  const payload = buildUpdatePayload({}, '<p>x</p>\n');
  assert.deepEqual(payload, { subject: '', preview_text: '', content: '<p>x</p>\n' });
});

test('buildUpdatePayload: never sends published unless publish opted in', () => {
  // Frontmatter's own published flag must not leak into the payload.
  const payload = buildUpdatePayload({ subject: 'Hi', published: true }, '<p>x</p>\n');
  assert.equal('published' in payload, false);
});

test('buildUpdatePayload: publish:true sends published:true', () => {
  const payload = buildUpdatePayload({ subject: 'Hi', previewText: 'peek' }, '<p>x</p>\n', {
    publish: true,
  });
  assert.deepEqual(payload, {
    subject: 'Hi',
    preview_text: 'peek',
    content: '<p>x</p>\n',
    published: true,
  });
});

test('recordPushState: records published, syncedAt and a hash that reads as in sync', () => {
  const fm = { kitEmailId: 1, sequenceId: 2, subject: 'Hi', published: false, kitSyncHash: 'old' };
  const out = recordPushState('Body', fm, { published: true, syncedAt: '2026-10-22T10:00:00.000Z' });
  const { data, content } = parseFrontmatter(out);
  assert.equal(content, 'Body\n');
  assert.equal(data.published, true);
  assert.equal(data.kitSyncedAt, '2026-10-22T10:00:00.000Z');
  assert.equal(data.kitSyncHash, contentHash(out));
  assert.deepEqual({ ...data, published: false, kitSyncHash: 'old', kitSyncedAt: undefined }, {
    ...fm,
    kitSyncedAt: undefined,
  });
  // A body edit after the push makes the file read as changed.
  assert.notEqual(contentHash(out.replace('Body', 'Body!')), data.kitSyncHash);
});

test('recordPushState: a digits-only hash still reads back as a string', () => {
  const out = recordPushState('x', { a: 1 }, { published: false, syncedAt: 's' });
  const line = out.match(/^kitSyncHash: (.*)$/m)[1];
  assert.match(line, /^'[0-9a-f]{32}'$/);
});

test('property: after a push, the file always reads as in sync with its own hash', () => {
  const key = fc.string({ minLength: 1, maxLength: 12 }).filter((k) => !k.startsWith('kitSync'));
  const value = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.string(), { maxLength: 3 }),
    // Long and multi-line values make js-yaml fold or block them.
    fc.string({ minLength: 90, maxLength: 200 }),
    fc.constantFrom('a\nkitSyncHash: fake', 'x\nkitSyncedAt: y'),
  );
  const previous = fc.record(
    {
      kitSyncHash: fc.oneof(fc.stringMatching(/^[0-9a-f]{32}$/), fc.string()),
      kitSyncedAt: fc.string(),
    },
    { requiredKeys: [] },
  );
  const fm = fc
    .tuple(fc.dictionary(key, value, { maxKeys: 8, noNullPrototype: true }), previous)
    .map(([d, p]) => ({ kitEmailId: 1, sequenceId: 2, ...d, ...p }));
  const body = fc.oneof(
    fc.string(),
    fc.constantFrom('kitSyncHash: in-body\n', '---\nkitSyncedAt: x\n---\n', ''),
  );
  const syncedAt = fc.date({ noInvalidDate: true }).map((d) => d.toISOString());
  fc.assert(
    fc.property(body, fm, fc.boolean(), syncedAt, (b, f, published, at) => {
      const out = recordPushState(b, f, { published, syncedAt: at });
      const { data, content } = parseFrontmatter(out);
      assert.equal(data.kitSyncHash, contentHash(out));
      assert.equal(data.kitSyncedAt, at);
      assert.equal(data.published, published);
      assert.equal(content, b.endsWith('\n') ? b : `${b}\n`);
      for (const k of Object.keys(f)) {
        if (!['kitSyncHash', 'kitSyncedAt', 'published'].includes(k)) assert.deepEqual(data[k], f[k], k);
      }
    }),
    { numRuns: 2000 },
  );
});

test('schedulePayload: maps present fields, skips missing and null ones', () => {
  assert.deepEqual(schedulePayload({ delayValue: 0, delayUnit: null, sendDays: [] }), {
    delay_value: 0,
    send_days: [],
  });
  assert.deepEqual(schedulePayload({ subject: 'x' }), {});
});

test('formatSchedule: readable line, ? for missing parts', () => {
  assert.equal(
    formatSchedule({ delay_value: 5, delay_unit: 'days', send_days: ['monday', 'friday'] }),
    '5 days, monday/friday'
  );
  assert.equal(formatSchedule({}), '? ?, ?');
  assert.equal(formatSchedule(), '? ?, ?');
});

test('scheduleChange: null when the push would not change the schedule', () => {
  const remote = { delay_value: 5, delay_unit: 'days', send_days: ['monday'] };
  assert.equal(scheduleChange(remote, { delayValue: 5, delayUnit: 'days', sendDays: ['monday'] }), null);
  assert.equal(scheduleChange(remote, {}), null);
});

test('scheduleChange: from/to when it would', () => {
  const remote = { delay_value: 7, delay_unit: 'days', send_days: ['monday', 'sunday'] };
  assert.deepEqual(scheduleChange(remote, { delayValue: 5, sendDays: ['monday'] }), {
    from: '7 days, monday/sunday',
    to: '5 days, monday',
  });
});

test('syncStatus: new, in-sync and changed', () => {
  const raw = '---\nsubject: Hi\n---\nBody\n';
  assert.equal(syncStatus(raw, {}), 'new');
  assert.equal(syncStatus(raw, { kitSyncHash: contentHash(raw) }), 'in-sync');
  assert.equal(syncStatus(raw, { kitSyncHash: 'stale' }), 'changed');
});

test('property: scheduleChange is null exactly when formatted schedules agree', () => {
  const days = fc.array(fc.constantFrom('monday', 'tuesday', 'sunday'), { maxLength: 3 });
  const remote = fc.record(
    { delay_value: fc.nat(10), delay_unit: fc.constantFrom('days', 'hours'), send_days: days },
    { requiredKeys: [] }
  );
  const local = fc.record(
    { delayValue: fc.option(fc.nat(10)), delayUnit: fc.option(fc.constantFrom('days', 'hours')), sendDays: fc.option(days) },
    { requiredKeys: [] }
  );
  fc.assert(
    fc.property(remote, local, (r, l) => {
      const change = scheduleChange(r, l);
      const after = formatSchedule({ ...r, ...schedulePayload(l) });
      if (change === null) assert.equal(formatSchedule(r), after);
      else assert.deepEqual(change, { from: formatSchedule(r), to: after });
    }),
    { numRuns: 500 }
  );
});
