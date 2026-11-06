import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportAlert, reportArgs, osascriptArgs, REPORT_ERROR_CLI } from './report-error.js';

const darwin = process.platform === 'darwin';

test('reports through the CLI when present', () => {
  const calls = [];
  const opts = { sound: true, log: '/x.log', script: '/x.sh' };
  const r = reportAlert('job', 'msg "x"', opts, (...a) => calls.push(a), () => true);
  assert.equal(r, 'reported');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], REPORT_ERROR_CLI);
  assert.deepEqual(calls[0][1], reportArgs('job', 'msg "x"', opts));
});

test('reportArgs uses --opt=VALUE so a leading dash is safe', () => {
  const a = reportArgs('j', '-x oops', { severity: 'error', log: '/l', script: '/s' });
  assert.ok(a.includes('--reason=-x oops'));
  assert.ok(a.includes('--severity=error') && a.includes('--log=/l') && a.includes('--script=/s'));
  assert.deepEqual(reportArgs('j', 'm').slice(-3), ['--sound=', '--log=', '--script=']);
});

test('falls back to osascript when the CLI is absent', () => {
  const calls = [];
  const r = reportAlert('job', 'a"b\\c', {}, (...a) => calls.push(a), () => false);
  if (!darwin) return assert.equal(r, 'skipped');
  assert.equal(r, 'notified');
  assert.equal(calls[0][0], 'osascript');
  assert.deepEqual(calls[0][1].slice(-2), ['job', 'a"b\\c']);
  assert.ok(osascriptArgs('t', 'm', true)[3].includes('sound name'));
  assert.ok(!osascriptArgs('t', 'm', false)[3].includes('sound'));
});

test('falls back to osascript when the CLI fails', () => {
  const calls = [];
  const exec = (cmd, ...rest) => {
    calls.push(cmd);
    if (cmd === REPORT_ERROR_CLI) throw new Error('exit 2');
  };
  const r = reportAlert('job', 'm', {}, exec, () => true);
  if (!darwin) return assert.equal(r, 'skipped');
  assert.equal(r, 'notified');
  assert.deepEqual(calls, [REPORT_ERROR_CLI, 'osascript']);
});

test('never throws, even when both paths fail', () => {
  const r = reportAlert('job', 'm', {}, () => { throw new Error('boom'); }, () => true);
  assert.equal(r, darwin ? 'failed' : 'skipped');
});
