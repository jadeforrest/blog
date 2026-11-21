import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { parseFrontmatter } from './frontmatter.js';
import { recordPushState } from './kit-push-lib.js';
import {
  readEmailFile,
  inspectRemote,
  describePush,
  applyPush,
  listEmailFiles,
  pushSequence,
  pushOne,
  summarizeSequence,
} from './kit-push-run.js';

const NOW = new Date('2026-11-12T12:00:00.000Z');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kit-push-run-'));
}

/** A sequence folder with emails written as { name: frontmatter }. */
function makeSequence(emails, { synced = [] } = {}) {
  const dir = tmpDir();
  for (const [name, fm] of Object.entries(emails)) {
    fs.mkdirSync(path.join(dir, name));
    const file = path.join(dir, name, 'index.md');
    const text = recordPushState('Hello', fm, { published: true, syncedAt: 'then' });
    // Unsynced files: drop the recorded hash so they read as new.
    fs.writeFileSync(file, synced.includes(name) ? text : text.replace(/^kitSync.*\n/gm, ''));
  }
  return dir;
}

/** Fake Kit API: remote emails by id; records PUTs; `failOn` ids throw. */
function fakeDeps(remotes, { failOn = [] } = {}) {
  const puts = [];
  const idOf = (p) => Number(p.split('/').pop());
  return {
    puts,
    deps: {
      fs,
      now: () => NOW,
      apiGet: async (p) => {
        if (failOn.includes(idOf(p))) throw new Error(`GET ${p} → 404`);
        return { email: remotes[idOf(p)] };
      },
      apiPut: async (p, body) => {
        puts.push({ path: p, body });
        return { email: { ...remotes[idOf(p)], ...body } };
      },
    },
  };
}

const fm = (id, extra = {}) => ({ kitEmailId: id, sequenceId: 9, subject: `S${id}`, ...extra });

test('readEmailFile: rejects files without Kit ids', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'x.md');
  fs.writeFileSync(file, '---\nsubject: Hi\n---\nBody\n');
  assert.throws(() => readEmailFile(file, { fs }), /kitEmailId and sequenceId/);
});

test('inspectRemote: backs up remote JSON and outgoing HTML', async () => {
  const dir = makeSequence({ '01--a': fm(1) });
  const email = readEmailFile(path.join(dir, '01--a', 'index.md'), { fs });
  const { deps } = fakeDeps({ 1: { subject: 'S1', content: '<p>old</p>' } });
  const backupDir = path.join(dir, 'backups');
  const inspection = await inspectRemote(email, { apiKey: 'k', backupDir, deps });
  assert.equal(path.basename(inspection.backupBase), '9-1-2026-11-12T12-00-00-000Z');
  assert.deepEqual(JSON.parse(fs.readFileSync(`${inspection.backupBase}.json`, 'utf8')), {
    email: { subject: 'S1', content: '<p>old</p>' },
  });
  assert.equal(fs.readFileSync(`${inspection.backupBase}-outgoing.html`, 'utf8'), '<p>Hello</p>\n');
});

test('describePush: subject drift, content size, schedule and state', () => {
  const email = { fm: fm(1, { delayValue: 5, delayUnit: 'days', sendDays: ['monday'] }) };
  const remoteEmail = {
    subject: 'Old',
    content: 'abc',
    published: false,
    delay_value: 7,
    delay_unit: 'days',
    send_days: ['sunday'],
  };
  assert.deepEqual(describePush(email, { remoteEmail, html: '12345' }), [
    'subject drift: Kit has "Old", pushing "S1"',
    'content: 3 → 5 chars',
    'schedule: 7 days, sunday → 5 days, monday',
    'state: draft',
  ]);
  assert.deepEqual(describePush({ fm: { subject: 'S' } }, { remoteEmail: { subject: 'S', published: true }, html: '' }), [
    'content: 0 → 0 chars',
    'schedule: unchanged',
    'state: published',
  ]);
});

test('applyPush: sends schedule, records push state, keeps remote published state', async () => {
  const dir = makeSequence({ '01--a': fm(1, { delayValue: 5, delayUnit: 'days', sendDays: ['monday'], published: true }) });
  const file = path.join(dir, '01--a', 'index.md');
  const email = readEmailFile(file, { fs });
  const { deps, puts } = fakeDeps({ 1: { subject: 'S1' } });
  const inspection = { remoteEmail: { published: false }, html: '<p>Hello</p>\n' };
  // Kit's PUT response here has no `published`, so the remote state (draft) is kept.
  const updated = await applyPush(email, inspection, { apiKey: 'k', deps });
  assert.equal(updated.published, false);
  assert.deepEqual(puts[0], {
    path: '/sequences/9/emails/1',
    body: {
      subject: 'S1',
      preview_text: '',
      content: '<p>Hello</p>\n',
      delay_value: 5,
      delay_unit: 'days',
      send_days: ['monday'],
    },
  });
  const after = readEmailFile(file, { fs });
  assert.equal(after.status, 'in-sync');
  assert.equal(after.fm.kitSyncedAt, NOW.toISOString());
  assert.equal(after.fm.published, false);
});

test('listEmailFiles: email folders only, sorted', () => {
  const dir = makeSequence({ '02--b': fm(2), '01--a': fm(1) });
  fs.mkdirSync(path.join(dir, 'empty'));
  fs.writeFileSync(path.join(dir, 'notes.md'), 'x');
  assert.deepEqual(
    listEmailFiles(dir, { fs }).map((f) => path.relative(dir, f)),
    ['01--a/index.md', '02--b/index.md']
  );
});

function sequenceRun(opts = {}) {
  const dir = makeSequence(
    { '01--a': fm(1, { delayValue: 5 }), '02--b': fm(2), '03--c': fm(3) },
    { synced: ['02--b'] }
  );
  const fake = fakeDeps({ 1: { subject: 'S1' }, 2: { subject: 'S2' }, 3: { subject: 'S3' } }, opts);
  const logs = [];
  const confirms = [];
  const run = (extra = {}) =>
    pushSequence(listEmailFiles(dir, { fs }), {
      getApiKey: () => 'k',
      backupDir: path.join(dir, '..', `${path.basename(dir)}-backups`),
      confirm: async (n) => {
        confirms.push(n);
        return extra.answer ?? true;
      },
      log: (l) => logs.push(l),
      deps: fake.deps,
      ...extra,
    });
  return { dir, run, logs, confirms, puts: fake.puts };
}

test('pushSequence: dry run inspects out-of-sync emails, pushes nothing', async () => {
  const s = sequenceRun();
  const result = await s.run({ dryRun: true });
  assert.deepEqual(result, { scanned: 3, pending: 2, pushed: 0, failed: [] });
  assert.equal(s.puts.length, 0);
  assert.equal(s.confirms.length, 0);
  assert.ok(s.logs.includes('[1/3] 01--a  new'));
  assert.ok(s.logs.includes('[2/3] 02--b  in-sync'));
  assert.ok(s.logs.includes('[1/2] 01--a  new'));
  assert.ok(s.logs.includes('      schedule: ? ?, ? → 5 ?, ?'));
});

test('pushSequence: confirms once, pushes each, then reads as in sync', async () => {
  const s = sequenceRun();
  const result = await s.run();
  assert.deepEqual(result, { scanned: 3, pending: 2, pushed: 2, failed: [] });
  assert.deepEqual(s.confirms, [2]);
  assert.deepEqual(s.puts.map((p) => p.path), ['/sequences/9/emails/1', '/sequences/9/emails/3']);
  assert.ok(s.logs.includes('[2/2] 03--c  ✓ pushed (draft)'));
  const again = await s.run();
  assert.equal(again.pending, 0);
  assert.equal(s.logs.at(-1), '\nNothing to push.');
});

test('pushSequence: declining the confirmation pushes nothing', async () => {
  const s = sequenceRun();
  const result = await s.run({ answer: false });
  assert.equal(result.pushed, 0);
  assert.equal(s.puts.length, 0);
});

test('pushSequence: force includes in-sync emails', async () => {
  const s = sequenceRun();
  const result = await s.run({ force: true, dryRun: true });
  assert.equal(result.pending, 3);
});

test('pushSequence: one failing email is reported, the rest still push', async () => {
  const s = sequenceRun({ failOn: [1] });
  const result = await s.run();
  assert.equal(result.pushed, 1);
  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0].error, /404/);
  assert.match(result.failed[0].filePath, /01--a/);
  assert.ok(s.logs.some((l) => l.startsWith('[1/2] 01--a  ✗ GET')));
});

test('pushSequence: an unreadable file is a failure, not a crash', async () => {
  const s = sequenceRun();
  fs.writeFileSync(path.join(s.dir, '02--b', 'index.md'), '---\nsubject: no ids\n---\n');
  const result = await s.run({ dryRun: true });
  assert.equal(result.failed.length, 1);
  assert.equal(result.pending, 2);
});

test('pushSequence: nothing confirmed when every inspection fails', async () => {
  const s = sequenceRun({ failOn: [1, 3] });
  const result = await s.run();
  assert.equal(result.failed.length, 2);
  assert.equal(s.confirms.length, 0);
});

test('pushSequence: missing API key throws only when something is pending', async () => {
  const s = sequenceRun();
  await assert.rejects(s.run({ getApiKey: () => null }), /KIT_API_KEY/);
  const synced = makeSequence({ '01--a': fm(1) }, { synced: ['01--a'] });
  const result = await pushSequence(listEmailFiles(synced, { fs }), {
    getApiKey: () => null,
    backupDir: tmpDir(),
    confirm: async () => true,
    log: () => {},
  });
  assert.equal(result.pending, 0);
});

function oneRun({ synced = false, failOn = [], remote = { subject: 'S1', published: false } } = {}) {
  const dir = makeSequence({ '01--a': fm(1, { sendDays: ['monday'] }) }, { synced: synced ? ['01--a'] : [] });
  const file = path.join(dir, '01--a', 'index.md');
  const fake = fakeDeps({ 1: remote }, { failOn });
  const logs = [];
  const run = (extra = {}) =>
    pushOne(file, {
      getApiKey: () => 'k',
      backupDir: path.join(dir, 'backups'),
      confirm: async () => extra.answer ?? true,
      log: (l) => logs.push(l),
      deps: fake.deps,
      ...extra,
    });
  return { file, run, logs, puts: fake.puts };
}

test('pushOne: changed file is reported as changed', async () => {
  const s = oneRun({ synced: true });
  fs.appendFileSync(s.file, 'more\n');
  assert.equal(await s.run({ dryRun: true }), 'dry-run');
  assert.ok(s.logs.includes('\nContent changed since last push.'));
});

test('pushOne: in-sync file is skipped without touching the API', async () => {
  const s = oneRun({ synced: true });
  assert.equal(await s.run({ getApiKey: () => assert.fail('no key needed') }), 'in-sync');
  assert.ok(s.logs.includes('Nothing to push. Use --force to push anyway.'));
});

test('pushOne: dry run backs up and describes, never PUTs', async () => {
  const s = oneRun();
  assert.equal(await s.run({ dryRun: true }), 'dry-run');
  assert.equal(s.puts.length, 0);
  assert.ok(s.logs.includes('\nNever pushed before.'));
  assert.ok(s.logs.includes('  schedule: ? ?, ? → ? ?, monday'));
});

test('pushOne: declined confirmation aborts', async () => {
  const s = oneRun();
  assert.equal(await s.run({ answer: false }), 'aborted');
  assert.equal(s.puts.length, 0);
});

test('pushOne: pushes with --publish and records it', async () => {
  const s = oneRun();
  assert.equal(await s.run({ publish: true }), 'pushed');
  assert.equal(s.puts[0].body.published, true);
  assert.deepEqual(s.puts[0].body.send_days, ['monday']);
  assert.ok(s.logs.some((l) => l.includes('this push will publish')));
  assert.ok(s.logs.some((l) => l.startsWith('\n✓ Pushed.') && l.includes('published')));
  assert.equal(readEmailFile(s.file, { fs }).status, 'in-sync');
});

test('pushOne: --publish on a published email notes the no-op; --force pushes in-sync files', async () => {
  const s = oneRun({ synced: true, remote: { subject: 'S1', published: true } });
  assert.equal(await s.run({ publish: true, force: true }), 'pushed');
  assert.ok(s.logs.some((l) => l.includes('no-op for state')));
  assert.ok(s.logs.some((l) => l.startsWith('\nStatus: in-sync')));
});

test('pushOne: missing API key throws', async () => {
  const s = oneRun();
  await assert.rejects(s.run({ getApiKey: () => null }), /KIT_API_KEY/);
});

test('summarizeSequence: totals then one line per failure', () => {
  const lines = summarizeSequence(
    { scanned: 3, pending: 2, pushed: 1, failed: [{ filePath: '/x/01/index.md', error: 'boom' }] },
    (p) => p.replace('/x/', '')
  );
  assert.deepEqual(lines, ['\nDone: 3 scanned, 2 out of sync, 1 pushed, 1 failed.', '  ✗ 01/index.md: boom']);
  assert.equal(summarizeSequence({ scanned: 0, pending: 0, pushed: 0, failed: [] }).length, 1);
});

// CLI smoke tests: paths that never reach the Kit API.
const scriptsDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
function cli(script, args) {
  try {
    return { code: 0, out: execFileSync('node', [path.join(scriptsDir, script), ...args], { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (err) {
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

test('CLIs: usage errors exit 1', () => {
  assert.equal(cli('kit-push-email.js', []).code, 1);
  assert.equal(cli('kit-push-sequence.js', ['/nonexistent']).code, 1);
});

test('CLIs: in-sync files report nothing to push', () => {
  const dir = makeSequence({ '01--a': fm(1) }, { synced: ['01--a'] });
  const seq = cli('kit-push-sequence.js', [dir, '--dry-run']);
  assert.equal(seq.code, 0);
  assert.match(seq.out, /DRY RUN[\s\S]*\[1\/1\] 01--a  in-sync[\s\S]*Done: 1 scanned, 0 out of sync/);
  const one = cli('kit-push-email.js', [path.join(dir, '01--a', 'index.md'), '--dry-run']);
  assert.equal(one.code, 0);
  assert.match(one.out, /Status: in-sync[\s\S]*Nothing to push/);
});

test('CLIs: a broken file fails the sequence run and the single push', () => {
  const dir = makeSequence({ '01--a': fm(1) }, { synced: ['01--a'] });
  const file = path.join(dir, '01--a', 'index.md');
  fs.writeFileSync(file, '---\nsubject: no ids\n---\n');
  const seq = cli('kit-push-sequence.js', [dir]);
  assert.equal(seq.code, 1);
  assert.match(seq.out, /✗ .*kitEmailId and sequenceId/);
  assert.equal(cli('kit-push-email.js', [file]).code, 1);
});

// --- Linked posts not live yet (kit-schedule-guard.js): OK from the day after their date ---

const scheduledPosts = { posts: () => [{ slug: 'far-off', date: '2026-12-25' }, { slug: 'live', date: '2026-11-11' }], today: () => '2026-11-12' };

test('pushSequence: an email linking to a post not live yet is refused, the rest still push', async () => {
  const s = sequenceRun();
  fs.appendFileSync(path.join(s.dir, '01--a', 'index.md'), '\n[Soon](https://www.rubick.com/far-off/)\n');
  fs.appendFileSync(path.join(s.dir, '03--c', 'index.md'), '\n[Live](https://www.rubick.com/live/)\n');
  const fake = fakeDeps({ 1: { subject: 'S1' }, 3: { subject: 'S3' } });
  const result = await s.run({ deps: { ...fake.deps, ...scheduledPosts } });
  assert.equal(result.pushed, 1);
  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0].error, /Not pushing to Kit: it links to \/far-off\/, scheduled for 2026-12-25/);
  assert.deepEqual(fake.puts.map((p) => p.path), ['/sequences/9/emails/3']);
});

test('pushOne: refuses before any Kit call, even with --force or --dry-run', async () => {
  const s = oneRun({});
  fs.appendFileSync(s.file, '\n[Soon](/far-off/)\n');
  const gets = [];
  const deps = { fs, now: () => NOW, apiGet: async (p) => gets.push(p), apiPut: async () => assert.fail('PUT'), ...scheduledPosts };
  for (const extra of [{ dryRun: true }, { force: true }]) {
    await assert.rejects(s.run({ ...extra, deps }), /Not pushing to Kit: it links to \/far-off\//);
  }
  assert.deepEqual(gets, []);
});

test('pushOne: refused on the linked post\'s own date, allowed the day after', async () => {
  const s = oneRun({});
  fs.appendFileSync(s.file, '\n[Soon](/far-off/)\n');
  const fake = fakeDeps({ 1: { subject: 'S1' } });
  const on = (day) => ({ ...fake.deps, ...scheduledPosts, today: () => day });
  await assert.rejects(s.run({ deps: on('2026-12-25') }), /far-off\/, scheduled for 2026-12-25; it can go to Kit from 2026-12-26/);
  assert.equal(await s.run({ deps: on('2026-12-26') }), 'pushed');
});
