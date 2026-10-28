import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMixEntries } from '../src/headless/audio/index.js';

test('audio mixing ignores invalid and negative weights without changing inputs', () => {
  const entries = [{ id: 'a', weight: -2 }, { id: 'b', weight: '3' }, { id: 'c', weight: NaN }];
  const mixed = normalizeMixEntries(entries);
  assert.deepEqual(mixed.map(entry => entry.weight), [0, 1, 0]);
  assert.deepEqual(mixed.map(entry => entry.id), ['a', 'b', 'c']);
  assert.equal(entries[1].weight, '3');
  assert.notEqual(mixed[0], entries[0]);
});

test('audio mixing handles empty input and distributes an all-zero mix equally', () => {
  assert.deepEqual(normalizeMixEntries([]), []);
  assert.deepEqual(normalizeMixEntries([{ weight: 0 }, { weight: undefined }]), [{ weight: 0.5 }, { weight: 0.5 }]);
});
