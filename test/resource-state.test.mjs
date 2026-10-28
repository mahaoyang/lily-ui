import assert from 'node:assert/strict';
import { createResourceState, migrateLegacyWork } from '../src/headless/fox/resource-state.js';
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); Object.defineProperty(localStorage, key, { value, configurable: true, enumerable: true }); },
  removeItem: key => { values.delete(key); delete localStorage[key]; },
};
globalThis.window = { addEventListener() {} };
let profiles = [{ id: 'p', conversations: [{ sessionId: 's', workState: { draft: 'server', threshold: 82 } }, { sessionId: 't' }] }];
const requests = [], errors = [];
let fail = false, hold;
globalThis.fetch = async (url, options) => {
  requests.push({ url, ...JSON.parse(options.body) });
  if (hold) await hold;
  return { ok: !fail, status: fail ? 500 : 200 };
};
const resources = createResourceState({ instances: () => profiles, report: e => errors.push(e) });
resources.hydrate();
localStorage.setItem('fox-chat-work-v1', JSON.stringify({ drafts: { 'p:s': 'old', 'p:t': 'migrate', 'gone:s': 'orphan' }, queues: { 'p:s': [null, { id: 'q', text: 'queued', editing: true }] } }));
localStorage.setItem('fox-auto-compact', 'true');
localStorage.setItem('fox-compaction:p:s', 'blocked');
await migrateLegacyWork(resources, localStorage);
assert.equal(resources.get('p:s').draft, 'server');
assert.equal(resources.get('p:t').draft, 'migrate');
assert.equal(resources.get('p:s').compactionBlocked, true);
assert.equal(resources.get('p:s').autoCompact, undefined);
assert.equal(resources.get('p:s').queue[0].editing, undefined);
assert(!requests.some(r => r.url.includes('gone')));
assert.equal(localStorage.getItem('fox-chat-work-v1'), null);
resources.set('p:s', { threshold: 90 });
resources.set('p:s', { autoCompact: false });
await resources.flush();
assert.deepEqual(requests.at(-1).value, { threshold: 90, autoCompact: false });
assert.equal(resources.get('p:t').autoCompact, undefined);
fail = true;
resources.set('p:s', { draft: 'retry' });
await resources.flush();
assert.equal(errors.length, 1);
fail = false;
await resources.flush();
assert.equal(requests.at(-1).value.draft, 'retry');
resources.set('p:t', { draft: 'delete pending' });
resources.remove('p', 't');
const before = requests.length;
await resources.flush();
assert.equal(requests.length, before, 'deleted resources cannot leave pending writes');
profiles[0].conversations[0].workState = { draft: 'another browser' };
resources.hydrate();
assert.equal(resources.get('p:s').draft, 'another browser');
console.log('PASS: resource isolation, authoritative server data, legacy migration, orphan removal, partial updates, retry and deletion');
