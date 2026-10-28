import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccordion, createTabs, createDialog } from '../src/headless/controls/index.js';

test('accordion keeps selection when closing another item and respects collapsible', () => {
  const state = createAccordion({ defaultValue: 'a' });
  state.close('b');
  assert.equal(state.value, 'a');
  state.toggle('a');
  assert.equal(state.value, '');
  const fixed = createAccordion({ defaultValue: 'a', collapsible: false });
  fixed.close('a');
  assert.equal(fixed.value, 'a');
  fixed.open('b');
  assert.equal(fixed.value, 'b');
});

test('multiple accordion owns its initial selection and avoids duplicates', () => {
  const initial = ['a'];
  const state = createAccordion({ type: 'multiple', defaultValue: initial });
  initial.push('b');
  state.open('a');
  state.open('c');
  assert.deepEqual(state.value, ['a', 'c']);
  state.toggle('a');
  assert.deepEqual(state.value, ['c']);
  assert.throws(() => createAccordion({ type: 'multiple', defaultValue: 'a' }), TypeError);
});

test('tabs wrap, recover absent selection, and ignore empty lists', () => {
  const state = createTabs({ defaultValue: 'a' });
  state.selectPrevious(['a', 'b']);
  assert.equal(state.value, 'b');
  state.selectNext(['a', 'b']);
  assert.equal(state.value, 'a');
  for (const method of ['selectNext', 'selectPrevious', 'selectFirst', 'selectLast']) state[method]([]);
  assert.equal(state.value, 'a');
  state.select('missing');
  state.selectNext(['a', 'b']);
  assert.equal(state.value, 'a');
});

test('dialog actions remain callable across repeated visibility changes', () => {
  const state = createDialog();
  const other = createDialog();
  state.open();
  state.close();
  state.open();
  assert.equal(state.isOpen, true);
  assert.equal(other.isOpen, false);
  state.toggle();
  assert.equal(state.isOpen, false);
});
