import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiagnosticSession } from '../src/headless/diagnostics/session/index.js';
import { runDnsLeak } from '../src/headless/diagnostics/leaks/dns.js';
import { computeBrowserScanAuthenticity } from '../src/headless/diagnostics/browser/authenticity.js';
import { createBrowserManagerClient } from '../src/headless/browser-manager/client.js';
import { parseProxy, formatProxy } from '../src/headless/browser-manager/proxy.js';
import { runReachability } from '../src/headless/diagnostics/network/index.js';
import { countTextUnits } from '../src/headless/text/index.js';

test('diagnostic refresh cancels old batch and late completion cannot overwrite new results', async () => {
  const pending = [], signals = [];
  const session = createDiagnosticSession({ checks: { ip: ({ signal }) => { signals.push(signal); return new Promise(resolve => pending.push(resolve)); } } });
  const first = session.run(), second = session.run();
  assert.equal(signals[0].aborted, true);
  pending[1]({ ip: 'new' }); await second;
  pending[0]({ ip: 'old' }); assert.equal((await first).status, 'cancelled');
  assert.equal(session.getSnapshot().checks.ip.data.ip, 'new');
  const copy = session.getSnapshot(); copy.checks.ip.data.ip = 'mutation';
  assert.equal(session.getSnapshot().checks.ip.data.ip, 'new');
  session.dispose(); await assert.rejects(session.run(), /disposed/);
});
test('diagnostic partial failure, unsupported, cancellation and unsubscribe are explicit', async () => {
  const session = createDiagnosticSession({ checks: { good: async () => 42, bad: async () => { throw Error('offline'); }, unsupported: async () => ({ supported: false }) } });
  let calls = 0; const off = session.subscribe(() => calls++); off();
  const result = await session.run(); assert.equal(result.status, 'partial'); assert.equal(result.checks.unsupported.status, 'skipped'); assert.equal(calls, 1);
  const pending = createDiagnosticSession({ checks: { wait: ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))) } });
  const promise = pending.run(); pending.cancel(); assert.equal(pending.getSnapshot().status, 'cancelled'); assert.equal((await promise).status, 'cancelled');
});
test('DNS leak flow is injectable, disabled stays unknown, enabled invokes trigger and result', async () => {
  let triggers = 0;
  const options = { fetchJsonWithTimeout: async path => path.endsWith('status') ? { ok: true, enabled: true, domain: 'test.invalid' } : path.endsWith('start') ? { ok: true, token: 'test', hostname: 'token.test.invalid' } : { ok: true, resolvers: ['1.1.1.1'] }, trigger: async () => triggers++, delay: async () => {}, fetch: async () => {}, postJsonWithTimeout: async () => {} };
  const result = await runDnsLeak(options); assert.equal(triggers, 1); assert.deepEqual(result.dnsLeak.resolvers, ['1.1.1.1']);
  let last;
  await runDnsLeak({ ...options, fetchJsonWithTimeout: async () => ({ ok: true, enabled: false }), onUpdate: state => last = state });
  assert.equal(last.dnsLeak, null); assert.equal(triggers, 1);
});
test('browser authenticity returns translation keys; no browser or locale is required', () => {
  const result = computeBrowserScanAuthenticity({ signals: { bot: { webdriver: true } } });
  assert.equal(result.score, 40); assert.equal(result.issues[0].key, 'scan.detect.webdriver');
});
test('FinPri client preserves backend capability guard and exposes unauthorized event', async () => {
  let mutations = 0;
  const client = createBrowserManagerClient({ baseUrl: 'http://backend.test/', fetch: async (url, init) => {
    if (init?.method === 'PATCH') mutations++;
    return Response.json({ capabilities: { hardwarePolicyVersion: 1 } });
  } });
  await assert.rejects(client.apiFetch('/api/profiles/1', { method: 'PATCH', body: JSON.stringify({ settings: { hardwareProtection: true } }) }), /旧版本/);
  assert.equal(mutations, 0);
  let unauthorized = false;
  const other = createBrowserManagerClient({ fetch: async () => Response.json({ error: 'denied' }, { status: 401 }), onUnauthorized: () => unauthorized = true });
  await assert.rejects(other.apiFetch('/api/health'), /denied/); assert.equal(unauthorized, true);
});
test('FinPri proxy codecs retain Unicode authentication and IPv6', () => {
  const proxy = { type: 'ss', host: '2001:db8::1', port: 443, method: 'aes-256-gcm', password: '中文:secret' };
  assert.deepEqual(parseProxy(formatProxy(proxy)), proxy);
});
test('network timing reports failures and text count treats surrogate pairs as one character', async () => {
  let n = 0;
  const result = await runReachability({ url: 'https://test.invalid', count: 3, probe: async () => ++n === 2 ? { ok: false, ms: 10 } : { ok: true, ms: 20 } });
  assert.deepEqual(result.stats, { sent: 3, received: 2, min: 20, avg: 20, max: 20 });
  assert.deepEqual(countTextUnits('Hi 中文🙂'), { words: 1, letters: 2, cjkChars: 2, charsNoSpace: 5, chars: 6 });
});
