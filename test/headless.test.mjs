import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import * as headless from '../src/headless/index.js';

test('headless modules do not import themes or browser UI', async () => {
  for (const file of await readdir(new URL('../src/headless/', import.meta.url), { recursive: true })) {
    if (!file.endsWith('.js')) continue;
    const source = await readFile(new URL('../src/headless/' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?<![\w-])(?:document|window|localStorage)\s*[.(]|themes\//, file);
  }
});

test('instances are isolated and protocol data folds without DOM', () => {
  const a = headless.createAppState(), b = headless.createAppState();
  a.messages.push({ text: 'a' });
  assert.equal(b.messages.length, 0);
  assert.deepEqual(headless.previewMessages([
    { sessionUpdate: 'agent_message_chunk', messageId: '1', content: { text: 'hello ' } },
    { sessionUpdate: 'agent_message_chunk', messageId: '1', content: { text: 'world' } },
    { sessionUpdate: 'session_info_update', _meta: { fox: { kind: 'message_completed', messageId: '1' } } },
  ]), [{ role: 'assistant', text: 'hello world', messageId: '1', final: true }]);
});

test('request and event transports are injectable', async () => {
  const requests = [];
  const client = headless.createClient({ baseUrl: 'http://example.test/', fetch: async (...args) => {
    requests.push(args); return { ok: true, json: async () => ({ saved: true }) };
  }, EventSource: class { constructor(url) { this.url = url; } } });
  assert.deepEqual(await client.api('/api/settings', 'PATCH', { enabled: true }), { saved: true });
  assert.equal(requests[0][0], 'http://example.test/api/settings');
  assert.equal(requests[0][1].body, '{"enabled":true}');
  assert.equal(client.subscribeEvents('a/b').url, 'http://example.test/api/events/a%2Fb');
  const broken = headless.createClient({ fetch: async () => ({ ok: false, status: 409, json: async () => ({ error: 'conflict' }) }) });
  await assert.rejects(broken.api('/api/state'), /conflict/);
});

test('resource writes and lifecycle work without browser globals', async () => {
  const events = new EventTarget(), requests = [];
  const store = headless.createResourceState({ instances: () => [{ id: 'p' }], events, fetch: async (...args) => {
    requests.push(args); return { ok: true };
  } });
  store.hydrate(); store.set('p:@new', { draft: 'saved' });
  events.dispatchEvent(new Event('pagehide'));
  await store.flush();
  assert.equal(requests.length, 1);
  store.dispose();
  events.dispatchEvent(new Event('online'));
  assert.equal(requests.length, 1);
});

test('model catalogs are data, with failed profile requests tolerated', async () => {
  const api = async url => {
    if (url === '/api/state') return { instances: [{ id: 'p', provider: 'codex' }, { id: 'sim', provider: 'codex', simulation: true }] };
    if (url === '/api/settings') return { settings: { modelCatalogs: { codex: [{ value: 'model', name: 'Model' }] } } };
    throw new Error('offline');
  };
  assert.deepEqual(await headless.loadTemplateModels(api, 'codex', 'saved'), [
    { value: 'model', name: 'Model' }, { value: 'saved', name: 'saved（不可用时使用 CLI 默认）' },
  ]);
});
