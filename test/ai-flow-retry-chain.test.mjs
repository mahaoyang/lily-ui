import test from 'node:test';
import assert from 'node:assert/strict';
import { clearRetryChain } from '../src/headless/workflow/graph/retry-chain.js';
test('retry invalidates dependencies but preserves imported input and unrelated branch', () => {
 const input={id:'input',type:'audio-input',output:'uploaded'}, a={id:'a',type:'tts',output:'old'}, b={id:'b',type:'tts',output:'keep'};
 clearRetryChain(a,[input,a,b],[{from:'input',to:'a'}]);
 assert.equal(input.output,'uploaded'); assert.equal(a.output,undefined); assert.equal(b.output,'keep');
});
