import assert from 'node:assert/strict';
import { resetCountdown, billingResetCountdown } from '../src/headless/fox/usage.js';

const now = 1700000000000;
const remaining = seconds => resetCountdown(now / 1000 + seconds, now);
assert.equal(remaining(2 * 86400 + 86399), '2天');
assert.equal(remaining(2 * 86400), '2天');
assert.equal(remaining(2 * 86400 - 1), '1天');
assert.equal(remaining(1.5 * 86400), '1天');
assert.equal(remaining(1.5 * 86400 - 1), '35小时');
assert.equal(remaining(86400), '24小时');
assert.equal(remaining(86399), '23小时');
assert.equal(remaining(7200), '2小时');
assert.equal(remaining(7199), '1小时');
assert.equal(remaining(5400), '1小时');
assert.equal(remaining(5399), '89分钟');
assert.equal(remaining(3600), '60分钟');
assert.equal(remaining(3599), '59分钟');
assert.equal(remaining(119), '1分钟');
assert.equal(remaining(59), '0分钟');
assert.equal(remaining(-60), '0分钟');
for (const value of [undefined, null, NaN, Infinity, 0]) assert.equal(resetCountdown(value, now), '');
console.log('PASS: reset countdown units, truncation, expired and missing timestamps');
const reset = now + 36 * 3600000;
for (const value of [reset, reset / 1000, String(reset / 1000), new Date(reset).toISOString()]) {
  assert.equal(billingResetCountdown(value, now), '1天');
}
assert.equal(billingResetCountdown(reset - 1000, now), '35小时');
for (const value of [undefined, null, '', 'invalid', 0]) assert.equal(billingResetCountdown(value, now), '');
console.log('PASS: Kiro billing reset dates and timestamps share countdown thresholds');
