/**
 * Tests for the LinkedIn token lifecycle safeguards:
 *   - writeTokenToEnv     (scripts/linkedin-get-token.js) — persisting a new token
 *   - checkTokenExpiry    (scripts/extract-to-linkedin.js) — warning before it lapses
 *
 * These exist because the failure they guard against is silent: a LinkedIn member
 * token dies on a ~60-day clock, and before this the scheduled job only found out
 * by getting a 401 mid-post. An untested warning is no warning at all.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { writeTokenToEnv } from './linkedin-get-token.js';
import { checkTokenExpiry } from './extract-to-linkedin.js';

const daysOut = (n) => new Date(Date.now() + n * 86400000).toISOString();

/** Run checkTokenExpiry with a spy notifier and captured console.warn output. */
function inspect(expiresAt) {
  const notified = [];
  const lines = [];
  const realWarn = console.warn;
  console.warn = (...args) => lines.push(args.join(' '));
  try {
    const days = checkTokenExpiry(expiresAt, (msg) => notified.push(msg));
    return { days, notified, warn: lines.join('\n') };
  } finally {
    console.warn = realWarn;
  }
}

describe('checkTokenExpiry', () => {
  test('stays silent when the token has plenty of life left', () => {
    const r = inspect(daysOut(60));
    assert.equal(r.warn, '');
    assert.deepEqual(r.notified, []);
    assert.ok(r.days > 59 && r.days <= 60);
  });

  test('does not warn just outside the 7-day window', () => {
    assert.deepEqual(inspect(daysOut(8)).notified, []);
  });

  // Pins the threshold to within an hour of 7 days. Note that `<=` vs `<` at
  // *exactly* 7.0 days is unobservable against a real clock — the microseconds
  // spent between constructing the date and comparing it always push it under.
  test('brackets the threshold tightly around 7 days', () => {
    const justInside = new Date(Date.now() + 7 * 86400000 - 1000).toISOString();
    const justOutside = new Date(Date.now() + 7 * 86400000 + 3600000).toISOString();
    assert.equal(inspect(justInside).notified.length, 1, '7 days minus a second must warn');
    assert.deepEqual(inspect(justOutside).notified, [], '7 days plus an hour must stay silent');
  });

  test('warns inside the 7-day window, naming the command to run', () => {
    const r = inspect(daysOut(6));
    assert.equal(r.notified.length, 1);
    assert.match(r.notified[0], /expires in 6 days/);
    assert.match(r.notified[0], /linkedin-get-token\.js/);
  });

  test('uses singular wording on the last day', () => {
    assert.match(inspect(daysOut(1)).notified[0], /in 1 day\b/);
  });

  test('reports an already-expired token as EXPIRED', () => {
    const r = inspect(daysOut(-3));
    assert.match(r.notified[0], /EXPIRED/);
    assert.ok(r.days < 0);
  });

  // Backward compatibility: an .env written before this key existed must keep working.
  test('is a no-op when the expiry key is absent', () => {
    for (const absent of [undefined, '', null]) {
      const r = inspect(absent);
      assert.equal(r.days, null);
      assert.deepEqual(r.notified, []);
      assert.equal(r.warn, '');
    }
  });

  test('an unparseable expiry warns but never blocks posting', () => {
    const r = inspect('not-a-date');
    assert.equal(r.days, null, 'must return null rather than NaN');
    assert.match(r.warn, /Could not parse/);
    assert.deepEqual(r.notified, [], 'a malformed value is a config bug, not an expiry alert');
  });
});

describe('writeTokenToEnv', () => {
  /** A realistic .env: the LinkedIn keys share the file with unrelated secrets. */
  const sampleEnv = [
    'export BLUESKY_IDENTIFIER="bsky-id"',
    'export BLUESKY_APP_PASSWORD="bsky-pw"',
    'export LINKEDIN_CLIENT_ID="cid"',
    'export LINKEDIN_CLIENT_SECRET="csec"',
    'export LINKEDIN_ACCESS_TOKEN="OLD_TOKEN"',
    '',
    '# sequence-item-updater v4 api on kit',
    'export KIT_API_KEY="kitkey"',
    ''
  ].join('\n');

  const withEnvFile = (contents, fn) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'li-env-'));
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, contents);
    try {
      return fn(file);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  test('replaces the token in place and preserves every other secret', () => {
    withEnvFile(sampleEnv, (file) => {
      writeTokenToEnv({ access_token: 'NEW_TOKEN', expires_in: 5184000 }, file);
      const out = fs.readFileSync(file, 'utf8');

      assert.ok(!out.includes('OLD_TOKEN'), 'stale token must be gone');
      assert.equal(out.match(/NEW_TOKEN/g).length, 1);
      for (const secret of ['bsky-id', 'bsky-pw', 'cid', 'csec', 'kitkey']) {
        assert.ok(out.includes(secret), `clobbered unrelated secret: ${secret}`);
      }
      assert.ok(out.includes('# sequence-item-updater v4 api on kit'), 'comments preserved');
      assert.ok(out.indexOf('BLUESKY_IDENTIFIER') < out.indexOf('LINKEDIN_ACCESS_TOKEN'), 'order preserved');
    });
  });

  test('records an expiry the warning path can read back', () => {
    withEnvFile(sampleEnv, (file) => {
      const expiresAt = writeTokenToEnv({ access_token: 'T', expires_in: 5184000 }, file);
      const out = fs.readFileSync(file, 'utf8');

      assert.ok(out.includes(`export LINKEDIN_TOKEN_EXPIRES_AT="${expiresAt}"`));
      const days = (new Date(expiresAt) - Date.now()) / 86400000;
      assert.ok(days > 59 && days < 61, `expected ~60 days, got ${days}`);
      // Round-trip: a freshly written expiry must not trip the warning.
      assert.deepEqual(inspect(expiresAt).notified, []);
    });
  });

  test('is idempotent — re-authorizing never duplicates keys', () => {
    withEnvFile(sampleEnv, (file) => {
      writeTokenToEnv({ access_token: 'FIRST', expires_in: 5184000 }, file);
      writeTokenToEnv({ access_token: 'SECOND', expires_in: 5184000 }, file);
      const out = fs.readFileSync(file, 'utf8');

      assert.equal(out.match(/^export LINKEDIN_ACCESS_TOKEN=/gm).length, 1);
      assert.equal(out.match(/^export LINKEDIN_TOKEN_EXPIRES_AT=/gm).length, 1);
      assert.ok(!out.includes('FIRST') && out.includes('SECOND'));
    });
  });

  test('matches the bare KEY=value form too, rather than appending a shadow copy', () => {
    withEnvFile('LINKEDIN_ACCESS_TOKEN=bare_old\nexport KIT_API_KEY="k"\n', (file) => {
      writeTokenToEnv({ access_token: 'T3', expires_in: 100 }, file);
      const out = fs.readFileSync(file, 'utf8');
      assert.equal(out.match(/LINKEDIN_ACCESS_TOKEN/g).length, 1);
      assert.ok(!out.includes('bare_old'));
    });
  });

  test('leaves the file owner-only and free of temp droppings', () => {
    withEnvFile(sampleEnv, (file) => {
      writeTokenToEnv({ access_token: 'T', expires_in: 5184000 }, file);
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
      const strays = fs.readdirSync(path.dirname(file)).filter((f) => f.includes('.tmp-'));
      assert.deepEqual(strays, []);
    });
  });

  test('refuses to invent a .env that does not exist', () => {
    assert.throws(
      () => writeTokenToEnv({ access_token: 'x', expires_in: 1 }, path.join(os.tmpdir(), 'definitely-absent.env')),
      /refusing to create/
    );
  });
});
