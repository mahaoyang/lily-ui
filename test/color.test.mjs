import test from 'node:test';
import assert from 'node:assert/strict';
import { hexToOklch, formatOklch } from '../src/headless/color/index.js';

test('sRGB colors convert to perceptual OKLCH reference values', () => {
  const red = hexToOklch('#ff0000');
  assert.ok(Math.abs(red.l - .627955) < .000001);
  assert.ok(Math.abs(red.c - .257683) < .000001);
  assert.ok(Math.abs(red.h - 29.233885) < .00001);
  assert.equal(hexToOklch('#fff').c, 0);
  assert.equal(hexToOklch('#000').l, 0);
  assert.equal(hexToOklch('#1238').alpha, 136 / 255);
  assert.deepEqual(hexToOklch('#1238'), hexToOklch('#11223388'));
});

test('OKLCH serialization validates channels and preserves transparent colors', () => {
  assert.equal(formatOklch({ l: .6, c: .12, h: -30, alpha: .5 }), 'oklch(0.6 0.12 330 / 0.5)');
  assert.equal(formatOklch(hexToOklch('#0000')), 'oklch(0 0 0 / 0)');
  for (const value of ['#12', '#gggggg', '#12345', null]) assert.throws(() => hexToOklch(value), TypeError);
  for (const value of [{ l: 2, c: 0, h: 0 }, { l: .5, c: -1, h: 0 }, { l: .5, c: 0, h: NaN }]) assert.throws(() => formatOklch(value), RangeError);
});
