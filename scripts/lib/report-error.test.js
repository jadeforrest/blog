import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportAlert, reportArgs, osascriptArgs, REPORT_ERROR_CLI } from './report-error.js';

test('reports through the CLI when present', () => {
  const calls = [];
  const r = reportAlert('job', 'msg "x"', { sound: true }, (...a) => calls.push(a), () => true);
  assert.equal(r, 'reported');
  assert.equal(calls[0][0], REPORT_ERROR_CLI);
  assert.deepEqual(calls[0][1], reportArgs('job', 'msg "x"', { sound: true }));
  assert.deepEqual(reportArgs('j', 'm').slice(-2), ['--sound', '']);
  assert.ok(reportArgs('j', 'm', { severity: 'error' }).includes('error'));
});

test('falls back to osascript with text as argv', () => {
  const calls = [];
  const r = reportAlert('job', 'a"b\\c', {}, (...a) => calls.push(a), () => false);
  if (process.platform !== 'darwin') return assert.equal(r, 'skipped');
  assert.equal(r, 'notified');
  assert.equal(calls[0][0], 'osascript');
  assert.deepEqual(calls[0][1].slice(-2), ['job', 'a"b\\c']);
  assert.ok(osascriptArgs('t', 'm', true)[3].includes('sound name'));
  assert.ok(!osascriptArgs('t', 'm', false)[3].includes('sound'));
});

test('never throws', () => {
  const r = reportAlert('job', 'm', {}, () => { throw new Error('boom'); }, () => true);
  assert.equal(r, 'failed');
});
