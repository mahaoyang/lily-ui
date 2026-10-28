import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLlmIpScores, getLlmRegion, LLM_PROFILES } from '../src/headless/diagnostics/scoring/llm.js';
import { LLM_REGIONS } from '../src/headless/diagnostics/scoring/llm-regions.js';
import { browserForReport, webrtcLeakRegions } from '../src/ui/ipqcheck/tools/llm-browser.js';

const options = { asOf: '2026-10-26T12:00:00Z', browser: { ready: true, webdriver: false, timezone: 'America/Los_Angeles', webrtcStatus: 'complete' } };
function input({ country = 'US', factors = {}, type = {}, score = {}, sharing = '1-10', sources = {}, derived = {} } = {}) {
  return { ip: '8.8.8.8', sources, normalized: {
    basic: { ip: '8.8.8.8', countryCode: country, timezone: 'America/Los_Angeles' },
    factors: { is_vpn: false, is_proxy: false, is_tor: false, is_anonymous: false, is_malicious: false, is_abuser: false, is_bogon: false, ...factors },
    type: { isDatacenter: false, ...type }, score: { riskScore: 0, threatScore: 0, ...score },
    derived: { sharedUsersEstimate: sharing, ...derived },
  } };
}
const evaluate = (section, browser = {}) => computeLlmIpScores(section, { ...options, browser: { ...options.browser, ...browser } });

test('all six profiles score clean and incomplete observations without claiming provider ban probabilities', () => {
  assert.deepEqual(Object.keys(LLM_PROFILES), ['claude', 'chatgpt', 'gemini', 'grok', 'kiro', 'copilot']);
  for (const result of Object.values(evaluate(input()))) {
    assert.equal(typeof result.risk, 'number');
    assert.equal(result.score, 100 - result.risk);
    assert.equal(result.coverage.known, 6);
  }
  assert.equal(evaluate(input()).claude.risk, 0);
  const partial = computeLlmIpScores({ normalized: { basic: { countryCode: 'US' } } }, options).claude;
  assert.equal(typeof partial.risk, 'number');
  assert.ok(partial.risk > 0);
  assert.equal(computeLlmIpScores(null).claude.risk, null);
  assert.equal(evaluate(null).claude.risk, 21);
});

test('consumer region policy remains provider-specific; unverified products never claim supported regions', () => {
  const hk = evaluate(input({ country: 'HK' }));
  assert.equal(hk.claude.risk, 100);
  assert.equal(hk.chatgpt.risk, 100);
  assert.equal(hk.gemini.risk, 0);
  assert.equal(evaluate(input({ country: 'CN' })).gemini.risk, 20);
  assert.equal(getLlmRegion('claude', 'uk', options).status, 'supported');
  assert.equal(getLlmRegion('chatgpt', 'UA', options).status, 'conditional');
  for (const provider of ['grok', 'kiro', 'copilot']) {
    assert.equal(hk[provider].region.status, 'unknown');
    assert.equal(hk[provider].region.reason, 'regionUnverified');
  }
});

test('unknown, stale and conflicting region observations increase uncertainty but still give estimates', () => {
  for (const value of ['', 'ZZ', 'EU', 'invalid']) {
    const result = evaluate(input({ country: value })).claude;
    assert.equal(result.region.status, 'unknown');
    assert.ok(result.risk > 0);
  }
  const conflict = evaluate(input({ sources: { ipwho: { country_code: 'JP' } } })).claude;
  assert.equal(conflict.region.reason, 'regionConflict');
  assert.ok(conflict.reasons.some((r) => r.key === 'regionConflict'));
  assert.equal(getLlmRegion('claude', 'US', { asOf: '2027-10-26' }).reason, 'regionStale');
  assert.equal(getLlmRegion('claude', 'US', { asOf: '2026-10-25' }).status, 'unknown');
});

test('privacy and hosting deduplicate; reputation and sharing are monotonic', () => {
  const vpn = evaluate(input({ factors: { is_vpn: true } }));
  const duplicate = evaluate(input({ factors: { is_vpn: true, is_proxy: true, is_anonymous: true }, type: { isDatacenter: true } }));
  for (const provider of Object.keys(LLM_PROFILES)) {
    assert.equal(duplicate[provider].risk, vpn[provider].risk);
    assert.equal(vpn[provider].risk - evaluate(input())[provider].risk, LLM_PROFILES[provider].privacy);
    const shared = evaluate(input({ sharing: '1k+' }))[provider];
    const bad = evaluate(input({ sharing: '1k+', score: { riskScore: 100, threatScore: 100 } }))[provider];
    assert.ok(bad.risk >= shared.risk && shared.risk >= evaluate(input())[provider].risk);
    assert.equal(evaluate(input({ score: { riskScore: '100', threatScore: NaN } }))[provider].risk, evaluate(input())[provider].risk);
  }
  assert.ok(evaluate(input({ sharing: '1k+' })).gemini.risk > evaluate(input({ sharing: '1k+' })).chatgpt.risk);
});

test('automation dominates GPT; Claude weighs region exposure more; Gemini weighs WebRTC mismatch', () => {
  const bot = evaluate(input(), { webdriver: true });
  assert.equal(bot.chatgpt.risk, 65);
  assert.equal(bot.claude.risk, 55);
  const headless = evaluate(input(), { webdriver: true, userAgent: 'HeadlessChrome' });
  assert.equal(headless.chatgpt.risk, bot.chatgpt.risk);
  const timezone = evaluate(input(), { timezone: 'Asia/Shanghai', languages: ['zh-CN'] });
  assert.equal(timezone.claude.risk, 95);
  assert.equal(timezone.chatgpt.risk, 0);
  const webrtc = evaluate(input(), { webrtcCountries: ['CN'], webrtcMismatch: true });
  assert.equal(webrtc.claude.risk, 100);
  assert.equal(webrtc.chatgpt.risk, 8);
  assert.equal(webrtc.gemini.risk, 25); // CN is conditional, not unsupported for Gemini.
  assert.equal(webrtc.claude.reasons.filter((r) => r.key.startsWith('webrtc')).length, 1);
  assert.equal(evaluate(input(), { webrtcMismatch: true }).chatgpt.risk, 5);
});

test('risk floors apply to blacklisted IPs; summed evidence and extremes remain bounded', () => {
  for (const [flag, floor] of [['is_bogon', 100], ['is_malicious', 95], ['is_tor', 85], ['is_abuser', 80]]) {
    for (const result of Object.values(evaluate(input({ factors: { [flag]: true } })))) {
      assert.ok(result.risk >= floor && result.risk <= 100);
      const reasons = result.reasons.reduce((sum, r) => sum + r.points, 0);
      assert.equal(result.risk, Math.min(100, reasons));
    }
  }
});

test('language, plan prices, WHOIS and private WebRTC candidates do not imply foreign location or abuse', () => {
  const clean = evaluate(input());
  const irrelevant = input({ type: { isMobile: true }, derived: { registrationCountryCode: 'CN' } });
  irrelevant.normalized.media = { Claude: { status: 'failed', statusCode: 403 } };
  const actual = evaluate(irrelevant, { languages: ['zh-CN'], plan: 'free', price: 0, webrtcHostIps: ['192.168.1.5'] });
  for (const provider of Object.keys(LLM_PROFILES)) assert.equal(actual[provider].risk, clean[provider].risk);
});

test('WebRTC uses same-family public exits, canonicalizes IPv6 and does not penalize absent results', () => {
  const report = { results: { ipv4: { ip: '8.8.8.8' }, ipv6: { ip: '2001:db8::1' } } };
  assert.equal(browserForReport({ webrtcIps: ['8.8.8.8', '2001:0db8:0:0:0:0:0:1'] }, report).webrtcMismatch, false);
  assert.equal(browserForReport({ webrtcIps: ['1.1.1.1'] }, report).webrtcMismatch, true);
  assert.equal(browserForReport({ webrtcIps: ['2001:db8::2'] }, { results: { ipv4: { ip: '8.8.8.8' } } }).webrtcMismatch, false);
  assert.equal(browserForReport({ webrtcIps: [] }, report).webrtcMismatch, false);
});

test('availability snapshots identify sources and contain no duplicate or malformed codes', () => {
  for (const provider of ['claude', 'chatgpt', 'gemini']) {
    const codes = LLM_REGIONS.supported[provider];
    assert.equal(new Set(codes).size, codes.length);
    assert.ok(codes.length > 150 && codes.every((code) => /^[A-Z]{2}$/.test(code)));
    assert.match(LLM_REGIONS.sources[provider], /^https:\/\//);
  }
});

test('browser probes reject private candidates, reuse tabs, refresh on recheck and close connections', async (context) => {
  const { collectLlmBrowser } = await import('../src/ui/ipqcheck/tools/llm-browser.js');
  let created = 0;
  let closed = 0;
  const lookups = [];
  class Peer {
    iceGatheringState = 'complete';
    listeners = {};
    constructor() { created++; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    createDataChannel() {}
    async createOffer() { return {}; }
    async setLocalDescription() {
      for (const [ip, type] of [['192.168.1.5','srflx'], ['100.64.0.1','srflx'], ['fd00::1','srflx'], ['8.8.8.8','host'], ['8.8.8.8','srflx']]) {
        this.listeners.icecandidate({ candidate: { candidate: `candidate:1 1 udp 123 ${ip} 456 typ ${type}` } });
      }
    }
    close() { closed++; }
  }
  for (const [key, value] of Object.entries({
    RTCPeerConnection: Peer,
    navigator: { webdriver: false, userAgent: 'Example browser' },
    fetch: async (url) => { lookups.push(url); return { ok: true, json: async () => ({ success: true, country_code: 'US' }) }; },
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    context.after(() => { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; });
  }
  const first = collectLlmBrowser({ refresh: true });
  assert.equal(collectLlmBrowser(), first);
  const value = await first;
  assert.deepEqual(value.webrtcIps, ['8.8.8.8']);
  assert.deepEqual(value.webrtcCountries, ['US']);
  assert.equal(value.webrtcStatus, 'complete');
  assert.equal(lookups.length, 1);
  assert.equal(created, 1);
  assert.equal(closed, 1);
  await collectLlmBrowser({ refresh: true });
  assert.equal(created, 2);
  assert.equal(closed, 2);
});


test('Claude cannot score highly when any public exit or regional timezone exposes an unsupported country', () => {
  for (const country of ['CN', 'HK', 'RU']) {
    const exposed = evaluate(input(), { webrtcCountries: ['US', country], webrtcMismatch: false }).claude;
    assert.equal(exposed.score, 0);
    assert.equal(exposed.level, 'bad');
    const conflicting = evaluate(input({ sources: { ipwho: { country_code: country } } })).claude;
    assert.equal(conflicting.score, 0);
  }
  for (const timezone of ['Asia/Shanghai', 'Asia/Hong_Kong', 'Europe/Moscow']) {
    const result = evaluate(input(), { timezone }).claude;
    assert.ok(result.score <= 5);
    assert.equal(result.level, 'bad');
  }
  assert.equal(evaluate(input(), { webrtcCountries: ['US', 'JP'] }).claude.score, 100);
});


test('ordinary public WebRTC exit leaks incur light deductions except Gemini medium deduction', () => {
  const clean = evaluate(input());
  const leaked = evaluate(input(), { webrtcCountries: ['JP'], webrtcMismatch: true });
  const penalties = { claude: 8, chatgpt: 5, gemini: 25, grok: 5, kiro: 8, copilot: 5 };
  for (const [provider, penalty] of Object.entries(penalties)) {
    assert.equal(clean[provider].score - leaked[provider].score, penalty);
    assert.equal(leaked[provider].reasons.filter((r) => r.key.startsWith('webrtc')).length, 1);
  }
  const sameExit = evaluate(input(), { webrtcCountries: ['US'], webrtcMismatch: false });
  for (const provider of Object.keys(penalties)) assert.equal(sameExit[provider].score, clean[provider].score);
  assert.equal(evaluate(input(), { webrtcCountries: ['CN'], webrtcMismatch: true }).claude.score, 0);
});

test('hero leak regions are localized, deduplicated and hidden without a leak', () => {
  const browser = { webrtcMismatch: true, webrtcCountries: ['cn', 'CN', 'US', 'XX', 'bad'] };
  assert.equal(webrtcLeakRegions(browser, 'zh-Hans'), '中国 (CN) / 美国 (US)');
  assert.equal(webrtcLeakRegions({ ...browser, webrtcMismatch: false }, 'en'), '');
  assert.equal(webrtcLeakRegions({ webrtcCountries: ['CN'] }, 'en', true), 'China (CN)');
  assert.equal(webrtcLeakRegions({ webrtcMismatch: true }, 'en'), '');
});
