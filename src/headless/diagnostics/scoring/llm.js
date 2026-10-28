import { LLM_REGIONS } from './llm-regions.js';

export const LLM_RULE_VERSION = '2026-10-26.5';
// Site-defined screening weights, not measured provider ban probabilities.
// Copilot here means GitHub Copilot. Weights are site hypotheses, not provider disclosures.
export const LLM_PROFILES = Object.freeze(Object.fromEntries(Object.entries({
  claude: { name: 'Claude', privacy: 28, hosting: 16, bot: 55, sharing: 18, timezone: 95, webrtc: 8, exposedRegion: 100 },
  chatgpt: { name: 'GPT', privacy: 16, hosting: 10, bot: 65, sharing: 18, timezone: 0, webrtc: 5, exposedRegion: 8 },
  gemini: { name: 'Gemini', privacy: 24, hosting: 18, bot: 55, sharing: 30, timezone: 3, webrtc: 25, exposedRegion: 40 },
  grok: { name: 'Grok', privacy: 18, hosting: 12, bot: 65, sharing: 28, timezone: 0, webrtc: 5, exposedRegion: 15 },
  kiro: { name: 'Kiro', privacy: 22, hosting: 16, bot: 60, sharing: 32, timezone: 2, webrtc: 8, exposedRegion: 20 },
  copilot: { name: 'Copilot', privacy: 16, hosting: 12, bot: 60, sharing: 25, timezone: 0, webrtc: 5, exposedRegion: 15 },
}).map(([key, value]) => [key, Object.freeze(value)])));
const regionSets = Object.fromEntries(Object.entries(LLM_REGIONS.supported).map(([provider, codes]) => [provider, new Set(codes)]));
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const clamp = (number) => Math.max(0, Math.min(100, Math.round(number)));
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const boolKnown = (value) => typeof value === 'boolean';

function countryCode(value) {
  const code = String(value ?? '').trim().toUpperCase().replace(/^UK$/, 'GB');
  if (!/^[A-Z]{2}$/.test(code) || ['XX', 'ZZ', 'EU', 'UN', 'QO', 'XA', 'XB'].includes(code)) return null;
  return regionNames.of(code) !== code ? code : null;
}

export function getLlmRegion(provider, country, { asOf = new Date() } = {}) {
  if (!regionSets[provider]) return { status: 'unknown', reason: 'regionUnverified' };
  const ageDays = (new Date(asOf).getTime() - Date.parse(`${LLM_REGIONS.reviewedAt}T00:00:00Z`)) / 86400000;
  if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > LLM_REGIONS.maxAgeDays) {
    return { status: 'unknown', reason: 'regionStale' };
  }
  const code = countryCode(country);
  if (!code) return { status: 'unknown', reason: 'regionUnknown' };
  const condition = LLM_REGIONS.conditional[provider]?.[code];
  if (condition) return { status: 'conditional', reason: condition };
  return regionSets[provider].has(code)
    ? { status: 'supported', reason: 'regionSupported' }
    : { status: 'unsupported', reason: 'regionUnsupported' };
}

// A timezone is a weak consistency hint, never proof of a person's physical country.
const timezoneCountries = { 'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO', 'Asia/Tehran': 'IR', 'Europe/Moscow': 'RU', 'Asia/Pyongyang': 'KP', 'Asia/Damascus': 'SY' };
export function computeLlmIpScores(section = {}, options = {}) {
  section = section && typeof section === 'object' ? section : {};
  const { factors = {}, type = {}, score = {}, basic = {}, derived = {} } = section.normalized || {};
  const browser = options.browser || {};
  const countries = [...new Set([basic.countryCode, derived.physicalCountryCode,
    section.sources?.ipwho?.country_code, section.sources?.ipapi?.location?.country_code,
  ].map(countryCode).filter(Boolean))];
  const country = countryCode(basic.countryCode) || countryCode(derived.physicalCountryCode) || countries[0] || null;
  const conflict = countries.length > 1;
  const privacyKnown = ['is_vpn', 'is_proxy', 'is_tor', 'is_anonymous'].some((key) => boolKnown(factors[key]));
  const abuseKnown = ['is_malicious', 'is_abuser', 'is_bogon'].some((key) => boolKnown(factors[key])) || [score.riskScore, score.threatScore].some(isNumber);
  const usage = String(type.asnType || type.companyType || '').toLowerCase();
  const hosting = type.isDatacenter === true || factors.is_datacenter === true || ['hosting', 'datacenter', 'data-center'].includes(usage);
  const networkKnown = hosting || boolKnown(type.isDatacenter) || boolKnown(factors.is_datacenter) || ['isp', 'business', 'enterprise'].includes(usage);
  const reputationValues = [score.riskScore, score.threatScore].filter(isNumber);
  const reputationPenalty = reputationValues.length ? Math.round(reputationValues.reduce((sum, n) => sum + n, 0) / reputationValues.length * .4) : 0;
  const sharing = { '1-10': 0, '10-100': .3, '100-1k': .65, '1k+': 1 }[derived.sharedUsersEstimate] || 0;
  const tzCountry = timezoneCountries[browser.timezone];
  const observedCountries = (browser.webrtcCountries || []).map(countryCode).filter(Boolean);
  const haveData = !!(country || privacyKnown || abuseKnown || networkKnown || browser.ready);
  return Object.fromEntries(Object.entries(LLM_PROFILES).map(([provider, profile]) => {
    const region = conflict ? { status: 'unknown', reason: 'regionConflict' } : getLlmRegion(provider, country, options);
    const reasons = [];
    const groups = { region: 0, reputation: 0, automation: 0, sharing: 0, environment: 0, uncertainty: 0 };
    const add = (key, points, group) => { if (points > 0) { reasons.push({ key, points, group }); groups[group] += points; } };
    // Claude treats any observed unsupported exit as high risk, even if geo sources disagree.
    const unsupportedExit = provider === 'claude' && countries.some((code) => getLlmRegion(provider, code, options).status === 'unsupported');
    if (region.status === 'unsupported' || unsupportedExit) add('regionUnsupported', 100, 'region');
    else if (region.status === 'conditional') add(region.reason, 20, 'region');
    if (conflict) add('regionConflict', 12, 'uncertainty');
    const privacy = ['is_vpn', 'is_proxy', 'is_anonymous', 'is_tor'].some((key) => factors[key] === true);
    if (privacy) add('privacy', profile.privacy, 'reputation');
    else if (hosting) add('hosting', profile.hosting, 'reputation');
    add('reputation', reputationPenalty, 'reputation');
    add('sharing', Math.round(sharing * profile.sharing), 'sharing');
    // Positive automation evidence only. Headless UA is not double-counted with webdriver.
    if (browser.webdriver === true || /HeadlessChrome|PhantomJS|SlimerJS/i.test(browser.userAgent || '')) add('automation', profile.bot, 'automation');
    const timezoneRegion = tzCountry ? getLlmRegion(provider, tzCountry, options) : null;
    if (timezoneRegion?.status === 'unsupported' && region.status !== 'unsupported') add('timezoneRegion', profile.timezone, 'environment');
    else if (browser.timezone && basic.timezone && browser.timezone !== basic.timezone) add('timezoneMismatch', Math.min(profile.timezone, 4), 'environment');
    const exposed = observedCountries.some((code) => getLlmRegion(provider, code, options).status === 'unsupported');
    if (exposed && region.status !== 'unsupported') add('webrtcRegion', profile.exposedRegion, 'environment');
    else if (browser.webrtcMismatch === true) add('webrtcMismatch', profile.webrtc, 'environment');
    const coverage = { known: [!!country && !conflict, privacyKnown, abuseKnown, networkKnown, !!browser.ready,
      browser.webrtcStatus === 'complete'].filter(Boolean).length, total: 6 };
    // Missing data gets a modest uncertainty adjustment, rather than suppressing every score.
    add('uncertainty', Math.min(24, (coverage.total - coverage.known) * 4), 'uncertainty');
    if (!regionSets[provider]) add('regionUnverified', 5, 'uncertainty');
    else if (region.status === 'unknown' && !conflict) add(region.reason, 5, 'uncertainty');
    const floor = factors.is_bogon === true || type.isBogon === true ? 100 : factors.is_malicious === true ? 95
      : factors.is_tor === true ? 85 : factors.is_abuser === true ? 80 : 0;
    const sum = Object.values(groups).reduce((a,b) => a+b,0);
    if (floor > sum) add(floor === 100 ? 'bogon' : floor === 95 ? 'malicious' : floor === 85 ? 'tor' : 'abuse', floor - sum, 'reputation');
    const risk = haveData ? clamp(Object.values(groups).reduce((a,b) => a+b,0)) : null;
    reasons.sort((a,b) => b.points-a.points);
    return [provider, { score: risk === null ? null : 100-risk, risk, region, country, coverage, groups, reasons,
      level: risk === null ? 'neutral' : risk <= 20 ? 'good' : risk <= 50 ? 'warn' : 'bad',
      version: LLM_RULE_VERSION, reviewedAt: LLM_REGIONS.reviewedAt }];
  }));
}
