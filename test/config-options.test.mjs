import assert from 'node:assert/strict';
import { optionChoices, modelChoices, catalogModels } from '../src/headless/fox/config-options.js';
import { effortChoices } from '../src/headless/fox/reasoning.js';

const options = [{ id: 'model', options: [
  { value: 'direct', name: 'Direct' },
  { name: 'Group', options: [{ value: 'grouped' }, { value: 'simulation' }, { name: 'invalid' }] },
] }];
assert.deepEqual(optionChoices(), []);
assert.deepEqual(modelChoices(), []);
assert.equal(modelChoices(options).length, 4);
assert.deepEqual(catalogModels(options), [
  { value: 'direct', name: 'Direct' }, { value: 'grouped', name: 'grouped' },
]);
assert.deepEqual(effortChoices({ options: [{ options: [{ value: 'default' }, { value: 'ultra' }] }] }), [{ value: 'ultra' }]);
console.log('PASS: flat/grouped CLI choices, absent catalogs, real-model filtering and advertised effort choices');
