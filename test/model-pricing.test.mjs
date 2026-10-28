import assert from 'node:assert/strict';
import { formatRelativePrice, codexModelRate, codexModelPrice, formatDollarPrice } from '../src/headless/fox/model-pricing.js';
for (const [value, expected] of [[1,'1×'],[.23,'.2×'],[.034,'.03×'],[.0042,'.004×'],[.0001,'<.001×'],[NaN,'价格未知']]) assert.equal(formatRelativePrice(value),expected);
const choices = ['gpt-6-astra','gpt-6-luna','unknown'].map(value=>({value}));
assert.equal(codexModelRate(choices[0],choices),'1×');
assert.equal(codexModelRate(choices[1],choices),'.01×');
assert.equal(codexModelRate(choices[2],choices),'价格未知');
assert.equal(codexModelRate({value:'gpt-6-luna-2026-10-01'},choices),'.01×');
assert.equal(codexModelRate(choices[1],[choices[1]]),'1×');
console.log('PASS: adaptive precision, price normalization, unknown models and dated aliases');

assert.equal(formatRelativePrice(.023, false), '0.02×');
assert.equal(formatRelativePrice(.0001, false), '<0.001×');
assert.equal(codexModelRate(choices[1], choices, false), '0.01×');

assert.deepEqual(codexModelPrice({value:'gpt-6.1-sol'}), [2,10,.1]);
assert.deepEqual(codexModelPrice({value:'gpt-6-luna-2026-10-01'}), [.1,.5,.01]);
assert.equal(codexModelPrice({value:'unknown'}), null);
assert.equal(formatDollarPrice(.02), '$0.02');
assert.equal(formatDollarPrice(undefined), '—');
assert.equal(formatDollarPrice(0), '$0');
