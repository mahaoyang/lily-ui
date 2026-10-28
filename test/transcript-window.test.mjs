import assert from 'node:assert/strict';
import { createTranscriptWindow } from '../src/headless/fox/transcript-window.js';
const messages = Array.from({ length: 500 }, (_, index) => ({ text: `message ${index}` }));
const window = createTranscriptWindow();
const initial = window.range(messages, 600, 800);
assert(initial > 400);
let previous = initial;
for (let i = 0; i < 30; i++) {
  const start = window.more(messages, 600, 800);
  assert(start <= previous);
  assert.equal(window.range(messages, 600, 800), start);
  previous = start;
}
assert.equal(previous, 0);
assert.equal(window.range([], 600, 800), 0);
assert.equal(window.range([{ text: 'long '.repeat(10000) }], 600, 800), 0);
console.log('PASS: bounded transcript, older batches, stable range and session reset');
