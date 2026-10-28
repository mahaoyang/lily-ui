import { runDnsLeak } from '../../headless/diagnostics/leaks/dns.js';
import { triggerDnsQuery, abortableDelay } from '../../adapters/browser/diagnostics/dns.js';
import { createDiagnosticSession } from '../../headless/diagnostics/session/index.js';
import { collectBrowserScanSignals } from '../../adapters/browser/diagnostics/scan-signals.js';
import { computeBrowserScanAuthenticity as evaluateAuthenticity } from '../../headless/diagnostics/browser/authenticity.js';
function computeBrowserScanAuthenticity(input) { const result = evaluateAuthenticity(input); return { ...result, issues: result.issues.map(issue => ({ ...issue, key: t(issue.key), message: t(issue.message) })) }; }
import { SOCIAL_PROFILES, socialFromPath } from './ipq/platforms.js';
import { llmReason } from './tools/llm-score.js';
import { LLM_PROFILES, llmPath, llmProviderFromPath, llmMethodPath, computeLlmIpScores } from './ipq/llm.js';
import { collectLlmBrowser, browserForReport, webrtcLeakRegions } from './tools/llm-browser.js';
import { FETCHING, PENDING, pill, kv, detailsTable, card, sectionFold } from './ui/components.js';
import { createNetworkTools } from './tools/network.js';
import { renderTextCountCard } from './tools/text-count.js';
import { initParticleBackground } from './ui/particleBackground.js';
import { setupLilyCheckboxes } from './ui/checkbox.js';
import { ensureScrollAreaStructure, refreshScrollAreas, setupScrollAreas } from './ui/scrollarea.js';
import { setupLilySelects } from './ui/select.js';
import { applyI18n, getLocale, getSeoMeta, initI18n, setLocale, t } from './i18n.js';
import { runClientCheck } from '../../adapters/browser/diagnostics/runtime.js';
import { getFingerprintJsResult, getFingerprintJsAgentError, initFingerprintJsAgent } from '../../adapters/browser/diagnostics/fingerprintjs.js';

async function initGlobe() {
  try {
    const mod = await import('./ui/particles.js');
    const Particles = mod?.Particles;
    if (typeof Particles !== 'function') return;
    new Particles('globe-canvas', { fit: 'element' });
  } catch {
    // ignore: visual-only
  }
}

function initLucideIcons() {
  // Use the official X brand asset rather than a generic close icon.
  for (const node of document.querySelectorAll('[data-brand="x"]')) {
    const logo = document.createElement('img');
    logo.src = '/assets/x-logo.svg';
    logo.width = 12;
    logo.height = 12;
    logo.alt = '';
    logo.className = 'brand-x';
    logo.setAttribute('aria-hidden', 'true');
    node.replaceWith(logo);
  }
  try {
    globalThis.lucide?.createIcons?.({
      attrs: {
        width: '16',
        height: '16',
        'stroke-width': '2',
      },
    });
  } catch {
    // ignore
  }
}

initParticleBackground('bg-canvas');
initGlobe();
initLucideIcons();
// FingerprintJS is only needed in the browser-fingerprint page; load lazily via getFingerprintJsResult().

const els = {
  status: document.getElementById('app-status'),
  clock: document.getElementById('app-clock'),
  btnTools: document.getElementById('btn-tools'),
  langSelect: document.getElementById('lang-select'),
  navButtons: Array.from(document.querySelectorAll('.nav-btn')),
  navIndicator: document.getElementById('nav-indicator'),
  leftSidebar: document.querySelector('.ops-left'),
  main: document.getElementById('ops-main'),
  runbar: document.getElementById('ipq-runbar'),
  view: document.getElementById('ipq-view'),
  details: document.getElementById('details-panel'),
  activity: document.getElementById('activity'),
  footerStats: document.getElementById('footer-stats'),
  actionTicker: document.getElementById('action-ticker'),
  btnPrivacy: document.getElementById('btn-privacy'),
  btnTerms: document.getElementById('btn-terms'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalClose: document.getElementById('modal-close'),
  modalScroll: document.getElementById('modal-scroll'),
  stack: document.getElementById('stack'),
  timeoutMs: document.getElementById('timeoutMs'),
  includeMedia: document.getElementById('includeMedia'),
  includeMail: document.getElementById('includeMail'),
  includeDnsbl: document.getElementById('includeDnsbl'),
  btnRun: document.getElementById('btn-run'),
  btnRunSettings: document.getElementById('btn-run-settings'),
  runAdvanced: document.getElementById('run-advanced'),
};

setupLilySelects(document);
setupLilyCheckboxes(document);

const queryLang = (() => {
  try {
    const u = new URL(location.href);
    return u.searchParams.get('lang');
  } catch {
    return null;
  }
})();
const initialLocale = initI18n({ queryLocale: queryLang });
if (els.langSelect) els.langSelect.value = initialLocale;
setupLilySelects(document);
document.querySelectorAll('select.select').forEach((s) => s.dispatchEvent(new Event('change', { bubbles: true })));

function toggleRunAdvanced(next) {
  if (!els.runAdvanced || !els.btnRunSettings) return;
  const shouldOpen = typeof next === 'boolean' ? next : !!els.runAdvanced.hidden;
  els.runAdvanced.hidden = !shouldOpen;
  els.btnRunSettings.setAttribute('aria-expanded', String(shouldOpen));
  refreshScrollAreas(els.main);
}

els.btnRunSettings?.addEventListener('click', () => toggleRunAdvanced());

// Browser mode: some checks require server-side capabilities (raw TCP/DNSBL/MX/port 25) and are disabled.
if (els.includeMail) {
  els.includeMail.checked = false;
  els.includeMail.disabled = true;
}
if (els.includeDnsbl) {
  els.includeDnsbl.checked = false;
  els.includeDnsbl.disabled = true;
}

let currentRoute = 'ipq';
let apiOk = null;
let latestReport = null;
let llmBrowser = null;
let llmBrowserStarted = false;
let llmBrowserGeneration = 0;
function startLlmBrowser({ refresh = false } = {}) {
  if (llmBrowserStarted && !refresh) return;
  llmBrowserStarted = true;
  llmBrowser = null;
  const generation = ++llmBrowserGeneration;
  void collectLlmBrowser({ refresh }).then((value) => {
    if (generation !== llmBrowserGeneration) return;
    llmBrowser = value;
    if (currentRoute !== 'net') render();
  });
}
let sharedScanNode = null;
let refreshSharedScan = null;
let latestScanSnapshot = null; // { score, level }
let activityEvents = [];
let lastAction = '';

function routeFromPathname(pathname) {
  const p = String(pathname || '/').replace(/\/+$/g, '') || '/';
  if (llmProviderFromPath(p)) return llmProviderFromPath(p);
  if (socialFromPath(p)) return socialFromPath(p);
  if (p === '/browser-fingerprint') return 'scan';
  if (p === '/tools' || p === '/network-tools') return 'net';
  return 'ipq';
}

function routeFromMeta() {
  const meta = document.querySelector('meta[name="ping100-route"]');
  const v = String(meta?.getAttribute?.('content') || '').trim().toLowerCase();
  if (v === 'scan' || v === 'ipq' || v === 'net') return v;
  return null;
}

function routePath(route) {
  const r = String(route || '').trim().toLowerCase();
  if (SOCIAL_PROFILES[r]) return SOCIAL_PROFILES[r].path;
  if (LLM_PROFILES[r]) return llmPath(r);
  if (r === 'net') return '/tools';
  return r === 'scan' ? '/browser-fingerprint' : '/';
}

function routeUrl(route, { navigation = false } = {}) {
  const lang = getLocale?.() || 'en';
  const u = new URL(`${location.origin}${routePath(route)}`);
  // Automatic detection must stay automatic across navigation and bookmarks.
  if (lang && (!navigation || new URL(location.href).searchParams.has('lang'))) u.searchParams.set('lang', lang);
  return u.toString();
}

function setMeta(name, content) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (!el) return;
  if (content == null) el.removeAttribute('content');
  else el.setAttribute('content', String(content));
}

function setMetaProp(property, content) {
  const el = document.querySelector(`meta[property="${property}"]`);
  if (!el) return;
  if (content == null) el.removeAttribute('content');
  else el.setAttribute('content', String(content));
}

function setCanonical(href) {
  const el = document.querySelector('link[rel="canonical"]');
  if (!el) return;
  el.setAttribute('href', String(href));
}

function applySeo({ route } = {}) {
  const r = String(route || currentRoute || 'ipq').trim().toLowerCase();
  const meta = getSeoMeta({ route: r });
  if (meta?.title) document.title = meta.title;
  if (meta?.description) setMeta('description', meta.description);

  const url = routeUrl(r);
  setMetaProp('og:url', url);
  setMetaProp('og:title', meta?.title || null);
  setMetaProp('og:description', meta?.description || null);
  setCanonical(url);
}

currentRoute = routeFromPathname(location.pathname) ?? routeFromMeta() ?? 'ipq';
applySeo({ route: currentRoute });

const STACKS = [
  { key: 'ipv4', label: 'IPv4' },
  { key: 'ipv6', label: 'IPv6' },
];

function wantedStacks(stack) {
  const normalized = String(stack ?? 'auto').toLowerCase();
  const wantV4 = normalized === 'dual' || normalized === 'both' || normalized === 'auto' || normalized === '4';
  const wantV6 = normalized === 'dual' || normalized === 'both' || normalized === 'auto' || normalized === '6';
  return { ipv4: wantV4, ipv6: wantV6 };
}

function nowClock() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

function setAction(text) {
  lastAction = String(text || '').trim();
  if (els.actionTicker) els.actionTicker.textContent = lastAction;
}

function boolText(value) {
  return value ? t('pill.yes') : t('pill.no');
}

function translateExternalStatus(status) {
  const raw = String(status ?? '').trim();
  if (!raw) return raw;
  const normalized = raw.toLowerCase();
  if (normalized === 'yes') return t('ext.status.yes');
  if (normalized === 'blocked') return t('ext.status.blocked');
  if (normalized === 'failed') return t('ext.status.failed');
  if (normalized === 'unknown') return t('ext.status.unknown');
  return raw;
}

function ensureScrollContent(root, opts) {
  const { content } = ensureScrollAreaStructure(root, opts);
  setupScrollAreas(root);
  return content;
}

function openModal(render) {
  if (!els.modalOverlay || !els.modalScroll) return;
  const content = ensureScrollContent(els.modalScroll);
  content.innerHTML = '';
  render(content);
  initLucideIcons();
  refreshScrollAreas(els.modalScroll);
  els.modalOverlay.classList.add('is-visible');
  els.modalClose?.focus?.();
}

function openLegalModal(initialTab = 'privacy') {
  const tab0 = String(initialTab || 'privacy') === 'terms' ? 'terms' : 'privacy';
  openModal((content) => {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = t('footer.about');

    const tabs = document.createElement('div');
    tabs.className = 'legal-tabs';

    const btnPrivacy = document.createElement('button');
    btnPrivacy.type = 'button';
    btnPrivacy.className = 'legal-tab';
    btnPrivacy.textContent = t('footer.privacy');
    btnPrivacy.setAttribute('aria-label', t('footer.privacy'));

    const btnTerms = document.createElement('button');
    btnTerms.type = 'button';
    btnTerms.className = 'legal-tab';
    btnTerms.textContent = t('footer.terms');
    btnTerms.setAttribute('aria-label', t('footer.terms'));

    tabs.append(btnPrivacy, btnTerms);

    const doc = document.createElement('div');
    doc.className = 'legal-doc';

    const setTab = (tab) => {
      const next = String(tab || 'privacy') === 'terms' ? 'terms' : 'privacy';
      btnPrivacy.classList.toggle('is-active', next === 'privacy');
      btnTerms.classList.toggle('is-active', next === 'terms');
      doc.innerHTML = next === 'privacy' ? t('legal.privacy.html') : t('legal.terms.html');
    };

    btnPrivacy.addEventListener('click', () => setTab('privacy'));
    btnTerms.addEventListener('click', () => setTab('terms'));
    setTab(tab0);

    content.append(title, tabs, doc);
  });
}

function closeModal() {
  if (!els.modalOverlay) return;
  els.modalOverlay.classList.remove('is-visible');
  els.btnTools?.focus?.();
}

function pushEvent({ level = 'info', kind = 'event', message = '' } = {}) {
  activityEvents.unshift({ ts: Date.now(), level, kind, message: String(message || '') });
  activityEvents = activityEvents.slice(0, 80);
  renderActivity();
}

function renderActivity() {
  if (!els.activity) return;
  const viewport = els.activity.querySelector?.('.rt-ScrollAreaViewport') || null;
  const stickToBottom = viewport
    ? viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 24
    : false;
  const content = ensureScrollContent(els.activity);
  const recent = activityEvents.slice(0, 10);

  content.innerHTML = '';
  if (recent.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'line muted';
    empty.textContent = t('activity.empty');
    content.appendChild(empty);
  } else {
    for (const ev of recent) {
      const when = ev?.ts ? new Date(Number(ev.ts)).toLocaleTimeString() : '--';
      const level = String(ev?.level || 'info').toLowerCase();
      const klass =
        level === 'error'
          ? 'level-error'
          : level === 'warn' || level === 'warning'
            ? 'level-warn'
            : 'level-info';
      const line = document.createElement('div');
      line.className = `line ${klass}`;
      const kindKey = `event.kind.${String(ev?.kind || 'event')}`;
      const kindTextCandidate = t(kindKey);
      const kindText = kindTextCandidate === kindKey ? String(ev?.kind || 'event') : kindTextCandidate;
      line.textContent = `[${when}] ${kindText} :: ${String(ev?.message || '')}`;
      content.appendChild(line);
    }
  }

  refreshScrollAreas(els.activity);
  if (viewport && stickToBottom) viewport.scrollTop = viewport.scrollHeight;
}

function renderFooter() {
  if (!els.footerStats) return;
  const parts = [
    {
      k: t('footer.api'),
      v: apiOk === null ? '--' : apiOk ? t('footer.api.ok') : t('footer.api.offline'),
      api: true,
    },
    { k: t('footer.route'), v: currentRoute.toUpperCase() },
    { k: t('footer.stack'), v: latestReport?.stack ? String(latestReport.stack).toUpperCase() : '--' },
    {
      k: t('footer.lastRun'),
      v: latestReport?.generatedAt ? new Date(latestReport.generatedAt).toLocaleString() : '--',
    },
  ];
  const renderStat = ({ k, v, api }) => {
    const root = document.createElement('div');
    root.className = `footer-stat${api ? ' is-api' : ''}`;
    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = k;
    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = String(v ?? '--');
    root.append(label, value);
    return root;
  };

  els.footerStats.innerHTML = '';
  for (const part of parts.slice().reverse()) els.footerStats.appendChild(renderStat(part));
}

function safetyLevelFromScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
  if (value >= 67) return 'good';
  if (value >= 34) return 'warn';
  return 'bad';
}

function renderLeftSidebarScores() {
  const root = els.leftSidebar?.querySelector(':scope > .rt-ScrollAreaViewport > .rt-ScrollAreaContent');
  if (!root) return;

  let block = root.querySelector('#left-score-block');
  if (!block) {
    block = document.createElement('div');
    block.className = 'data-block';
    block.id = 'left-score-block';
    root.prepend(block);
  } else if (root.firstChild !== block) {
    root.insertBefore(block, root.firstChild);
  }

  const show = currentRoute !== 'net';
  block.style.display = show ? '' : 'none';
  if (!show) return;

  const title = document.createElement('div');
  title.className = 'block-title';
  title.textContent = currentRoute === 'scan' ? t('sidebar.score.scan.title') : platformTitle();

  const big = document.createElement('div');
  big.className = 'large-readout sidebar-score-big';

  const lines = document.createElement('div');
  lines.className = 'sidebar-score-lines';

  const makeLine = ({ icon, label, platform, value, level = 'neutral' }) => {
    const row = document.createElement('div');
    row.className = 'stat-item sidebar-score-line';
    const k = document.createElement('span');
    k.className = 'sidebar-score-k';
    if (icon) {
      const i = document.createElement('i');
      i.setAttribute(icon === 'brand-x' ? 'data-brand' : 'data-lucide', icon === 'brand-x' ? 'x' : icon);
      i.setAttribute('aria-hidden', 'true');
      k.appendChild(i);
    }
    if (platform) {
      k.appendChild(platformLabel(platform, label));
    } else if (label) {
      const text = document.createElement('span');
      text.textContent = String(label);
      k.appendChild(text);
    }
    const v = document.createElement('span');
    v.className = 'sidebar-score-v';
    v.appendChild(pill(value == null ? '--' : value, `status-${level}`));
    row.append(k, v);
    return row;
  };

  if (currentRoute === 'scan') {
    const score = latestScanSnapshot ? Number(latestScanSnapshot.score) : null;
    const ok = typeof score === 'number' && Number.isFinite(score);
    const level = ok ? (score >= 70 ? 'good' : 'bad') : 'neutral';

    big.textContent = ok ? `${clamp0to100(score)}%` : '--%';
    big.classList.remove('is-good', 'is-warn', 'is-bad');
    if (level === 'good' || level === 'bad') big.classList.add(`is-${level}`);

    const subtitle = document.createElement('div');
    subtitle.className = `sidebar-score-sub is-${level}`;
    if (!ok) subtitle.textContent = t('ip.score.band.unknown');
    else subtitle.textContent = score >= 70 ? t('scan.score.advice.good') : t('scan.score.advice.bad');

    const topRow = document.createElement('div');
    topRow.className = 'sidebar-score-toprow';
    topRow.append(big, subtitle);

    block.replaceChildren(title, topRow);
    return;
  }

  const any = latestReport?.results && typeof latestReport.results === 'object' ? latestReport.results : {};
  const primary = any.ipv4 || any.ipv6 || null;
  const sharedUsers = primary?.normalized?.derived?.sharedUsersEstimate ?? null;
  const pending = !!latestReport?.pending;

  const overall = platformScore(primary);
  if (pending) {
    big.textContent = '--';
  } else {
    big.textContent = overall == null ? '--' : String(overall);
  }

  const overallLevel = safetyLevelFromScore(overall);
  big.classList.remove('is-good', 'is-warn', 'is-bad', 'is-neutral');
  big.classList.add(`is-${overallLevel}`);

  const scoreAdvice = (value) => {
    const v = Number(value);
    if (!Number.isFinite(v)) return { level: 'neutral', label: t('ip.score.band.unknown'), hintShort: '', hintFull: '' };
    if (v >= 90) return { level: 'good', label: t('ip.score.band.perfect'), hintShort: t('ip.score.advice.short.perfect'), hintFull: t('ip.score.advice.perfect') };
    if (v >= 80) return { level: 'good', label: t('ip.score.band.excellent'), hintShort: t('ip.score.advice.short.excellent'), hintFull: t('ip.score.advice.excellent') };
    if (v >= 70) return { level: 'warn', label: t('ip.score.band.good'), hintShort: t('ip.score.advice.short.good'), hintFull: t('ip.score.advice.good') };
    if (v >= 60) return { level: 'warn', label: t('ip.score.band.pass'), hintShort: t('ip.score.advice.short.pass'), hintFull: t('ip.score.advice.pass') };
    if (v >= 40) return { level: 'bad', label: t('ip.score.band.poor'), hintShort: t('ip.score.advice.short.poor'), hintFull: t('ip.score.advice.poor') };
    return { level: 'bad', label: t('ip.score.band.danger'), hintShort: t('ip.score.advice.short.danger'), hintFull: t('ip.score.advice.danger') };
  };

  const subtitle = document.createElement('div');
  subtitle.className = `sidebar-score-sub is-${overallLevel}`;
  if (pending) subtitle.textContent = t('ip.score.band.pending');
  else if (overall == null) subtitle.textContent = t('ip.score.band.unknown');
  else {
    const a = scoreAdvice(overall);
    const shareNote = sharedUsers ? `${t('ip.score.shared.short', { range: String(sharedUsers) })}` : '';
    const parts = [a.label, a.hintShort, shareNote].filter(Boolean);
    const compact = parts.join('·');
    const verboseShare = sharedUsers ? ` · ${t('ip.score.shared', { range: String(sharedUsers) })}` : '';
    subtitle.textContent = compact;
    subtitle.title = `${a.label} · ${a.hintFull}${verboseShare}`.trim();
  }

  const topRow = document.createElement('div');
  topRow.className = 'sidebar-score-toprow';
  topRow.append(big, subtitle);

  const scoreOrDash = (v) => (pending ? '--' : (typeof v === 'number' ? String(v) : '--'));

  for (const [group, profiles] of platformGroups()) {
    const label = document.createElement('div'); label.className = 'block-title'; label.textContent = t(group); lines.append(label);
    for (const key of Object.keys(profiles)) {
      const row = makeLine({ platform: key, label: profiles[key].name, value: scoreOrDash(platformScore(primary, key)), level: safetyLevelFromScore(platformScore(primary, key)) });
      row.classList.toggle('is-selected', key === selectedPlatform());
      row.tabIndex = 0; row.setAttribute('role', 'link');
      row.addEventListener('click', () => setRoute(key, { push: true }));
      row.addEventListener('keydown', e => { if (e.key === 'Enter') setRoute(key, { push: true }); });
      lines.append(row);
    }
  }

  block.replaceChildren(title, topRow, lines);
}

function selectedPlatform() { return LLM_PROFILES[currentRoute] || SOCIAL_PROFILES[currentRoute] ? currentRoute : 'ipq'; }
function platformTitle(key = selectedPlatform()) { return t(`nav.${key}`); }
function platformScore(section, key = selectedPlatform()) {
  if (LLM_PROFILES[key]) return computeLlmIpScores(section || {}, { browser: browserForReport(llmBrowser, latestReport) })[key].score;
  const risk = section?.normalized?.derived?.platformRisks?.[key === 'ipq' ? 'overall' : key];
  return typeof risk === 'number' ? clamp0to100(100 - risk) : null;
}
function sharedBrowserScan() {
  if (!sharedScanNode) { sharedScanNode = renderBrowserScan(); }
  return sharedScanNode;
}
function platformGroups() {
  const groups = [['platform.llm', LLM_PROFILES], ['platform.social', SOCIAL_PROFILES]];
  return groups.filter(([, profiles]) => selectedPlatform() === 'ipq' || !!profiles[currentRoute]);
}
const PLATFORM_ICONS = { claude: 'anthropic', chatgpt: 'openai', gemini: 'googlegemini', grok: 'x', copilot: 'githubcopilot', youtube: 'youtube', tiktok: 'tiktok', twitter: 'x', instagram: 'instagram' };
function platformLabel(key, name = platformTitle(key)) {
  const label = document.createElement('span');
  label.className = 'k-wrap';
  const icon = document.createElement(PLATFORM_ICONS[key] ? 'img' : 'i');
  if (PLATFORM_ICONS[key]) {
    icon.src = `/assets/platform-${PLATFORM_ICONS[key]}.svg`;
    icon.alt = '';
    icon.className = 'platform-icon';
    icon.width = 12;
    icon.height = 12;
  } else icon.setAttribute('data-lucide', 'ghost');
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = name;
  label.append(icon, text);
  return label;
}
function platformTables(section) {
  return platformGroups().map(([label, profiles]) => {
    const table = detailsTable(Object.keys(profiles).map(key => {
      const score = platformScore(section, key);
      const value = latestReport?.pending ? FETCHING : !latestReport ? PENDING : pill(score == null ? '--' : score, `status-${safetyLevelFromScore(score)}`);
      return [platformLabel(key), value];
    }));
    const panel = card(t(label), table);
    panel.classList.add('platform-table');
    return panel;
  });
}

function renderOverviewCard({ report, requested, results, pending } = {}) {
  const placeholder = !report;
  const showDots = !pending && !placeholder;
  const any = results && typeof results === 'object' ? results : {};
  const v4 = any.ipv4 || null;
  const v6 = any.ipv6 || null;

  const primary = v4 || v6 || null;
  const basic = primary?.normalized?.basic || {};
  const type = primary?.normalized?.type || {};
  const derived = primary?.normalized?.derived || {};

  const triPill = (value, level) => {
    const text = value === null || value === undefined || value === '' ? t('pill.na') : String(value);
    const normalized = String(level || 'neutral');
    const klass =
      normalized === 'good'
        ? 'status-good'
        : normalized === 'warn'
          ? 'status-warn'
          : normalized === 'bad'
            ? 'status-bad'
            : 'status-neutral';
    return pill(text, klass);
  };

  const keyLabel = (text, level = 'neutral', { iconName = null } = {}) => {
    if (!showDots && !iconName) return text;
    const wrap = document.createElement('span');
    wrap.className = 'k-wrap';

    if (showDots) {
      const dot = document.createElement('span');
      dot.className = `status-dot status-dot--${level || 'neutral'}`;
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'circle');
      icon.setAttribute('aria-hidden', 'true');
      dot.appendChild(icon);
      wrap.appendChild(dot);
    }

    if (iconName) {
      const plat = document.createElement('span');
      plat.className = 'k-plat';
      const icon = document.createElement('i');
      icon.setAttribute(iconName === 'brand-x' ? 'data-brand' : 'data-lucide', iconName === 'brand-x' ? 'x' : String(iconName));
      icon.setAttribute('aria-hidden', 'true');
      plat.appendChild(icon);
      wrap.appendChild(plat);
    }

    const label = document.createElement('span');
    label.textContent = String(text);
    wrap.appendChild(label);
    return wrap;
  };

  const keyLabelWithHint = (text, level, hintText, { iconName = null } = {}) => {
    const hint = String(hintText ?? '').trim();
    const base = keyLabel(text, level, { iconName });
    if (!hint) return base;

    const outer = document.createElement('span');
    outer.className = 'k-hwrap';
    if (base && typeof base === 'object' && 'nodeType' in base) outer.appendChild(base);
    else {
      const label = document.createElement('span');
      label.textContent = String(base);
      outer.appendChild(label);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hint-icon';
    btn.setAttribute('title', hint);
    btn.setAttribute('aria-label', hint);
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'circle-help');
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);
    outer.appendChild(btn);
    return outer;
  };

  const riskToSafety = (value) => {
    if (value === FETCHING) return FETCHING;
    if (value === PENDING) return PENDING;
    return typeof value === 'number' && Number.isFinite(value) ? clamp0to100(100 - value) : null;
  };
  const safetyLevel = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
    if (value >= 67) return 'good';
    if (value >= 34) return 'warn';
    return 'bad';
  };

  const typeLevel = (() => {
    if (!showDots) return 'neutral';
    const kind = String(derived?.typeKind || '').toLowerCase();
    if (kind === 'bogon') return 'bad';
    if (kind === 'idc') return 'bad';
    if (kind === 'crawler') return 'warn';
    if (kind === 'mobile') return 'warn';
    if (kind === 'isp') return 'good';
    if (type.isBogon) return 'bad';
    if (type.isDatacenter) return 'bad';
    if (type.isCrawler) return 'warn';
    if (type.isMobile) return 'warn';
    return 'neutral';
  })();

  const nativeLevel = (() => {
    if (!showDots) return 'neutral';
    const kind = String(derived?.nativeKind || '').toLowerCase();
    if (kind === 'native') return 'good';
    if (kind === 'broadcast' || kind === 'shared') return 'warn';
    return 'neutral';
  })();

  const sharedUsersLevel = (() => {
    if (!showDots) return 'neutral';
    const v = String(derived?.sharedUsersEstimate ?? '').trim();
    if (!v) return 'neutral';
    if (v === '1-10') return 'good';
    if (v === '10-100') return 'warn';
    if (v === '100-1k' || v === '1k+') return 'bad';
    return 'neutral';
  })();

  const transport = derived?.transport || null;
  const transportLevel = (() => {
    if (!showDots) return 'neutral';
    const udpStatus = String(transport?.udp?.status ?? '');
    if (udpStatus === 'mismatch') return 'bad';
    if (udpStatus === 'blocked') return 'warn';
    const quicStatus = String(transport?.quic?.status ?? '');
    if (quicStatus === 'disabled') return 'warn';
    if (udpStatus === 'ok' || quicStatus === 'ok') return 'good';
    return 'neutral';
  })();

  const transportLabel = (() => {
    if (pending) return FETCHING;
    if (placeholder) return PENDING;
    if (!transport) return null;
    const udpStatus = String(transport?.udp?.status ?? '');
    const quicStatus = String(transport?.quic?.status ?? '');
    if (udpStatus === 'mismatch') return t('transport.status.udpMismatch');
    if (udpStatus === 'blocked') return t('transport.status.udpBlocked');
    if (quicStatus === 'disabled') return t('transport.status.quicOff');
    if (udpStatus === 'ok' || quicStatus === 'ok') return t('transport.status.ok');
    if (quicStatus === 'na' || udpStatus === 'unsupported' || quicStatus === 'unsupported') return t('transport.status.na');
    return t('transport.status.unknown');
  })();

  const typeLabel = (() => {
    if (pending) return FETCHING;
    if (placeholder) return PENDING;
    if (!primary) return null;
    const kind = String(derived?.typeKind || '').toLowerCase();
    const ispMode = String(derived?.ispMode || '').toLowerCase();
    if (kind === 'bogon') return t('ipq.type.bogon');
    if (kind === 'crawler') return t('ipq.type.crawler');
    if (kind === 'mobile') return t('ipq.type.mobile');
    if (kind === 'idc') return t('ipq.type.idc');
    if (kind === 'isp') {
      if (ispMode === 'dual') return t('ipq.type.isp.dual');
      if (ispMode === 'single') return t('ipq.type.isp.single');
      return t('ipq.type.isp');
    }
    if (type.isBogon) return t('ipq.type.bogon');
    if (type.isCrawler) return t('ipq.type.crawler');
    if (type.isMobile) return t('ipq.type.mobile');
    if (type.isDatacenter) return t('ipq.type.idc');
    return t('ipq.type.isp');
  })();

  const nativeLabel = (() => {
    if (pending) return FETCHING;
    if (placeholder) return PENDING;
    const kind = String(derived?.nativeKind || '').toLowerCase();
    if (kind === 'native') return t('ipq.native.native');
    if (kind === 'broadcast' || kind === 'shared') return t('ipq.native.broadcast');
    if (kind === 'unknown') return t('ipq.native.unknown');
    return null;
  })();

  const risk = derived?.platformRisks || null;
  const riskValue = (k) => {
    if (pending) return FETCHING;
    if (placeholder) return PENDING;
    const v = risk?.[k];
    return typeof v === 'number' ? v : null;
  };

  const stackLine = (label, section, want) => {
    if (!want) return null;
    if (placeholder) return [label, PENDING];
    if (pending) return [label, FETCHING];
    const ip = section?.normalized?.basic?.ip || null;
    const value = ip || t('ipq.stack.notDetected');
    const level = ip ? 'good' : 'warn';
    return [showDots ? keyLabel(label, level) : label, value];
  };

  const overall = pending || placeholder ? null : platformScore(primary);
  const youtube = riskToSafety(riskValue('youtube'));
  const tiktok = riskToSafety(riskValue('tiktok'));
  const instagram = riskToSafety(riskValue('instagram'));
  const twitter = riskToSafety(riskValue('twitter'));

  const rows = [
    [showDots ? keyLabel(t('summary.ip'), basic.ip ? 'good' : 'neutral') : t('summary.ip'), pending ? FETCHING : placeholder ? PENDING : basic.ip || null],
    [
      showDots ? keyLabel(t('summary.type'), typeLevel) : t('summary.type'),
      showDots && typeof typeLabel === 'string' ? triPill(typeLabel, typeLevel) : typeLabel,
    ],
    [
      showDots ? keyLabel(t('summary.native'), nativeLevel) : t('summary.native'),
      showDots && typeof nativeLabel === 'string' ? triPill(nativeLabel, nativeLevel) : nativeLabel,
    ],
    [
      keyLabelWithHint(t('summary.sharedUsers'), sharedUsersLevel, t('summary.sharedUsers.hint')),
      pending
        ? FETCHING
        : placeholder
          ? PENDING
          : showDots
            ? triPill(derived?.sharedUsersEstimate ?? null, sharedUsersLevel)
            : (derived?.sharedUsersEstimate ?? null),
    ],
    [
      keyLabelWithHint(t('summary.transport'), transportLevel, t('summary.transport.hint')),
      showDots && typeof transportLabel === 'string' ? triPill(transportLabel, transportLevel) : transportLabel,
    ],
    [
      showDots ? keyLabel(t('summary.risk.overall'), safetyLevel(overall)) : t('summary.risk.overall'),
      showDots && typeof overall === 'number' ? triPill(overall, safetyLevel(overall)) : overall,
    ],
    [
      keyLabel(t('summary.risk.youtube'), safetyLevel(youtube), { iconName: 'youtube' }),
      showDots && typeof youtube === 'number' ? triPill(youtube, safetyLevel(youtube)) : youtube,
    ],
    [
      keyLabel(t('summary.risk.tiktok'), safetyLevel(tiktok), { iconName: 'music' }),
      showDots && typeof tiktok === 'number' ? triPill(tiktok, safetyLevel(tiktok)) : tiktok,
    ],
    [
      keyLabel(t('summary.risk.instagram'), safetyLevel(instagram), { iconName: 'instagram' }),
      showDots && typeof instagram === 'number' ? triPill(instagram, safetyLevel(instagram)) : instagram,
    ],
    [
      keyLabel(t('summary.risk.twitter'), safetyLevel(twitter), { iconName: 'brand-x' }),
      showDots && typeof twitter === 'number' ? triPill(twitter, safetyLevel(twitter)) : twitter,
    ],
    stackLine('IPv4', v4, !!requested?.ipv4),
    stackLine('IPv6', v6, !!requested?.ipv6),
  ].filter(Boolean);

  const overview = document.createElement('section');
  overview.className = 'result-overview';
  overview.classList.toggle('result-overview--platform', selectedPlatform() !== 'ipq');
  const hero = document.createElement('div');
  hero.className = `card result-hero is-${safetyLevelFromScore(overall)}`;
  const heading = document.createElement('h1');
  heading.className = 'card-title';
  heading.textContent = platformTitle();
  const value = document.createElement('div');
  value.className = 'result-score';
  value.textContent = typeof overall === 'number' ? String(overall) : '—';
  const scale = document.createElement('span');
  scale.textContent = ' / 100';
  value.appendChild(scale);
  const advice = document.createElement('p');
  const band = typeof overall !== 'number' ? null : overall >= 90 ? 'perfect' : overall >= 80 ? 'excellent' : overall >= 70 ? 'good' : overall >= 60 ? 'pass' : overall >= 40 ? 'poor' : 'danger';
  advice.textContent = pending ? t('ip.score.band.pending') : band ? `${t(`ip.score.band.${band}`)} · ${t(`ip.score.advice.${band}`)}` : t('ip.score.band.unknown');
  if (!pending && LLM_PROFILES[selectedPlatform()]) {
    const browser = browserForReport(llmBrowser, report);
    const scored = computeLlmIpScores(primary || {}, { browser })[selectedPlatform()];
    const regions = webrtcLeakRegions(browser, getLocale(), scored.reasons.some(({ key }) => key === 'webrtcRegion'));
    if (regions) {
      advice.append(' · WebRTC: ');
      const leakRegion = document.createElement('span');
      leakRegion.className = 'webrtc-leak-region';
      leakRegion.textContent = regions;
      advice.append(leakRegion);
    }
  }
  hero.append(heading, value, advice);
  const platforms = platformTables(primary);
  const network = card(t('result.network'), detailsTable([...rows.slice(0, 5), ...rows.slice(10)]));
  network.classList.add('network-summary');
  overview.append(hero, ...(selectedPlatform() === 'ipq' ? [...platforms, network] : [network, ...platforms]));
  if (LLM_PROFILES[selectedPlatform()]) {
    const detailRows = Object.entries(any).filter(([, section]) => section?.normalized).flatMap(([stack, section]) => {
      const scored = computeLlmIpScores(section, { browser: browserForReport(llmBrowser, report) })[selectedPlatform()];
      return [[`${stack === 'ipv6' ? 'IPv6' : 'IPv4'} · ${platformTitle()}`, scored.score], ...scored.reasons.map(({key, points}) => [llmReason(key), `−${points}`])];
    });
    overview.append(card(t('llm2.details'), detailsTable(detailRows)));
  }
  return overview;
}

function renderIpQualitySections(label, section, mode = 'ready') {
  const isPending = mode === 'pending';
  const isDisabled = mode === 'disabled' || mode === 'na';
  const show = (v) => (isPending ? FETCHING : isDisabled ? null : v);

  const basic = section?.normalized?.basic || {};
  const type = section?.normalized?.type || {};
  const score = section?.normalized?.score || {};
  const factors = section?.normalized?.factors || {};
  const derived = section?.normalized?.derived || {};
  const asnHistory = section?.normalized?.asnHistory || null;

  const countryLabel = (() => {
    if (isPending) return FETCHING;
    if (isDisabled) return null;
    if (!basic.country && !basic.countryCode) return null;
    return `${basic.country ?? ''} (${basic.countryCode ?? '-'})`;
  })();

  const latlonLabel = (() => {
    if (isPending) return FETCHING;
    if (isDisabled) return null;
    return basic.latitude != null && basic.longitude != null ? `${basic.latitude}, ${basic.longitude}` : null;
  })();

  const typeLabel = (() => {
    if (isPending) return FETCHING;
    if (isDisabled) return null;
    const kind = String(derived?.typeKind || '').toLowerCase();
    const ispMode = String(derived?.ispMode || '').toLowerCase();
    if (kind === 'bogon') return t('ipq.type.bogon');
    if (kind === 'crawler') return t('ipq.type.crawler');
    if (kind === 'mobile') return t('ipq.type.mobile');
    if (kind === 'idc') return t('ipq.type.idc');
    if (kind === 'isp') {
      if (ispMode === 'dual') return t('ipq.type.isp.dual');
      if (ispMode === 'single') return t('ipq.type.isp.single');
      return t('ipq.type.isp');
    }
    if (type.isBogon) return t('ipq.type.bogon');
    if (type.isCrawler) return t('ipq.type.crawler');
    if (type.isMobile) return t('ipq.type.mobile');
    if (type.isDatacenter) return t('ipq.type.idc');
    return t('ipq.type.isp');
  })();

  const nativeLabel = (() => {
    if (isPending) return FETCHING;
    if (isDisabled) return null;
    const kind = String(derived?.nativeKind || '').toLowerCase();
    if (kind === 'broadcast') return t('ipq.native.broadcast');
    if (kind === 'native') return t('ipq.native.native');
    if (kind === 'unknown') return t('ipq.native.unknown');
    return null;
  })();

  const platformRisks = derived?.platformRisks || null;
  const riskValue = (k) => {
    if (isPending) return FETCHING;
    if (isDisabled) return null;
    const v = platformRisks?.[k];
    return typeof v === 'number' ? v : null;
  };

  const nodes = [
    card(
      `${label} / ${t('section.summary')}`,
      detailsTable([
        [t('summary.ip'), show(basic.ip)],
        [t('summary.type'), typeLabel],
        [t('summary.native'), nativeLabel],
        [
          t('ipq.native.regPhy'),
          show(
            derived?.registrationCountryCode || derived?.physicalCountryCode || derived?.registrationRir || derived?.physicalContinentCode
              ? `${derived?.registrationCountryCode ?? '-'}${derived?.registrationRir ? ` (${derived.registrationRir})` : ''} / ${derived?.physicalCountryCode ?? '-'}${derived?.physicalContinentCode ? ` (${derived.physicalContinentCode})` : ''}`
              : null,
          ),
        ],
        [platformTitle(), show(platformScore(section))],
        [t('summary.asn'), isPending ? FETCHING : basic.asn ? `${basic.asn}${basic.org ? ` / ${basic.org}` : ''}` : null],
        [t('summary.sharedUsers'), show(derived?.sharedUsersEstimate ?? null)],
        [t('summary.transport'), show(transportLabelFromDerived(derived))],
      ]),
    ),
    card(
      `${label} / ${t('section.basic')}`,
      detailsTable([
        [t('ipq.basic.ip'), show(basic.ip)],
        [t('ipq.basic.rdns'), show(basic.rdns)],
        [t('ipq.basic.asn'), show(basic.asn)],
        [t('ipq.basic.org'), show(basic.org)],
        [t('ipq.basic.isp'), show(basic.isp)],
        [t('ipq.basic.domain'), show(basic.domain)],
        [t('ipq.basic.country'), countryLabel],
        [t('ipq.basic.region'), show(basic.region)],
        [t('ipq.basic.city'), show(basic.city)],
        [t('ipq.basic.timezone'), show(basic.timezone)],
        [t('ipq.basic.latlon'), latlonLabel],
        [t('ipq.basic.map'), show(basic.mapUrl || null)],
      ]),
    ),
    card(
      `${label} / ${t('section.type')}`,
      detailsTable([
        [t('ipq.type.category'), show(type.category)],
        ['asn_type', show(type.asnType)],
        ['company_type', show(type.companyType)],
        ['usage_type', show(derived?.usageType ?? null)],
        ['isp_mode', show(derived?.ispMode ?? null)],
        ['is_datacenter', show(type.isDatacenter)],
        ['is_mobile', show(type.isMobile)],
        ['is_crawler', show(type.isCrawler)],
        ['is_bogon', show(type.isBogon)],
      ]),
    ),
    card(
      `${label} / ${t('section.score')}`,
      detailsTable([
        [t('ipq.score.risk'), show(score.riskScore)],
        [t('ipq.score.threat'), show(score.threatScore)],
      ]),
    ),
    card(
      `${label} / ${t('section.factors')}`,
      detailsTable(
        Object.keys(factors).length
          ? Object.entries(factors).map(([k, v]) => [k, show(v)])
          : [[t('common.status'), isPending ? FETCHING : null]],
      ),
    ),
  ];

  if (!isPending && !isDisabled) {
    if (Array.isArray(asnHistory) && asnHistory.length) {
      const rows = asnHistory.slice(0, 6).map((h) => {
        const left = `AS${h.asn} ${h.prefix}`;
        const parts = [];
        if (h.info) parts.push(h.info);
        if (h.country) parts.push(h.country);
        const range = h.firstSeen || h.lastSeen ? `${h.firstSeen || '-'} → ${h.lastSeen || '-'}` : null;
        if (range) parts.push(range);
        return [left, parts.length ? parts.join(' / ') : null];
      });
      nodes.push(card(`${label} / ${t('section.asnHistory')}`, detailsTable(rows)));
    }
  } else if (isPending) {
    nodes.push(card(`${label} / ${t('section.asnHistory')}`, detailsTable([[t('common.status'), FETCHING]])));
  }

  if (isPending || isDisabled) return nodes;

  const media = section?.normalized?.media || null;
  if (media) {
    const mediaRows = Object.entries(media).map(([name, result]) => {
      const status = translateExternalStatus(result?.status ?? 'Unknown');
      const region = result?.region ?? null;
      const ms = typeof result?.ms === 'number' ? `${result.ms}ms` : null;
      const note = result?.note ? String(result.note) : null;
      const extra = [note, ms].filter(Boolean).join(' / ');
      return [name, `${status}${region ? ` / ${region}` : ''}${extra ? ` (${extra})` : ''}`];
    });
    nodes.push(card(`${label} / ${t('section.media')}`, detailsTable(mediaRows)));
  }

  const mail = section?.normalized?.mail || null;
  if (mail) {
    const mailRows = [
      [t('ipq.mail.port25'), mail.port25],
      ...(Array.isArray(mail.providers) ? mail.providers : []).map((p) => [`${p.name} (${p.domain})`, p.ok]),
    ];
    nodes.push(card(`${label} / ${t('section.mail')}`, detailsTable(mailRows)));
  }

  const dnsbl = section?.normalized?.dnsbl || null;
  if (dnsbl) {
    if (dnsbl.supported === false) {
      nodes.push(
        card(
          `${label} / ${t('section.dnsbl')}`,
          detailsTable([
            [t('ipq.dnsbl.supported'), false],
            [t('ipq.dnsbl.reason'), dnsbl.reason],
          ]),
        ),
      );
    } else {
      nodes.push(
        card(
          `${label} / ${t('section.dnsbl')}`,
          detailsTable([
            [t('ipq.dnsbl.resolver'), dnsbl.resolver ?? null],
            [t('ipq.dnsbl.maxZones'), dnsbl.maxZones ?? null],
            [t('ipq.dnsbl.total'), dnsbl.total],
            [t('ipq.dnsbl.listed'), dnsbl.listed],
            [t('ipq.dnsbl.clean'), dnsbl.clean],
            [t('ipq.dnsbl.samples'), dnsbl.samples?.length ? dnsbl.samples.map((s) => s.zone).join(', ') : null],
          ]),
        ),
      );
    }
  }

  return nodes;
}

function transportLabelFromDerived(derived) {
  const transport = derived?.transport || null;
  if (!transport) return null;
  const udpStatus = String(transport?.udp?.status ?? '');
  const quicStatus = String(transport?.quic?.status ?? '');
  if (udpStatus === 'mismatch') return t('transport.status.udpMismatch');
  if (udpStatus === 'blocked') return t('transport.status.udpBlocked');
  if (quicStatus === 'disabled') return t('transport.status.quicOff');
  if (udpStatus === 'ok' || quicStatus === 'ok') return t('transport.status.ok');
  if (quicStatus === 'na' || udpStatus === 'unsupported' || quicStatus === 'unsupported') return t('transport.status.na');
  return t('transport.status.unknown');
}

function clamp0to100(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function scanLevelFromScore(score0to100) {
  const s = Number(score0to100);
  if (!Number.isFinite(s)) return 'neutral';
  if (s >= 80) return 'good';
  if (s >= 60) return 'warn';
  return 'bad';
}

function scoreLevelLabel(level) {
  const l = String(level || 'neutral');
  if (l === 'good') return t('scan.score.level.high');
  if (l === 'warn') return t('scan.score.level.medium');
  if (l === 'bad') return t('scan.score.level.low');
  return t('pill.na');
}

function dntEnabled(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return v === '1' || v === 'yes' || v === 'true';
}

function maskId(value, head = 6, tail = 4) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function textWithKvLevel(text, level) {
  const span = document.createElement('span');
  span.textContent = String(text ?? '');
  if (level) span.dataset.kvLevel = String(level);
  return span;
}

async function fetchJsonWithTimeout(url, { timeoutMs = 6000, headers = null } = {}) {
  const ms = Math.max(400, Number(timeoutMs) || 6000);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const r = await fetch(url, {
      signal: controller?.signal,
      cache: 'no-store',
      headers: headers && typeof headers === 'object' ? headers : undefined,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function postJsonWithTimeout(url, body, { timeoutMs = 6000, headers = null } = {}) {
  const ms = Math.max(400, Number(timeoutMs) || 6000);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      signal: controller?.signal,
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...(headers && typeof headers === 'object' ? headers : {}),
      },
      body: JSON.stringify(body ?? null),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probeDohResolve({ label, url, headers = null, timeoutMs = 6000 } = {}) {
  const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  try {
    const data = await fetchJsonWithTimeout(url, { timeoutMs, headers });
    const endedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const ms = Math.max(0, Math.round(endedAt - startedAt));
    const answers = Array.isArray(data?.Answer) ? data.Answer : [];
    const ips = answers.map((a) => a?.data).filter((v) => typeof v === 'string' && v.trim()).slice(0, 4);
    return { ok: true, label: String(label || ''), ms, ips };
  } catch (error) {
    const endedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const ms = Math.max(0, Math.round(endedAt - startedAt));
    return { ok: false, label: String(label || ''), ms, error: String(error?.message ?? error) };
  }
}

function detectFingerprintJsAvailability(result) {
  if (!result) return 'fetching';
  if (result.ok) return 'ok';
  const msg = String(result.error || '').toLowerCase();
  if (
    msg.includes('blocked') ||
    msg.includes('err_blocked_by_client') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load')
  ) {
    return 'blocked';
  }
  return 'failed';
}

function fingerprintStatusPill(result) {
  const kind = detectFingerprintJsAvailability(result);
  if (kind === 'fetching') return FETCHING;
  if (kind === 'ok') return pill(t('scan.fp.status.ok'), 'status-good');
  if (kind === 'blocked') return pill(t('scan.fp.status.blocked'), 'status-warn');
  return pill(t('scan.fp.status.failed'), 'status-bad');
}

function renderDetailsPanel() {
  if (!els.details) return;
  const viewport = els.details.querySelector?.('.rt-ScrollAreaViewport') || null;
  const stickToTop = viewport ? viewport.scrollTop <= 12 : true;
  const content = ensureScrollContent(els.details);
  content.innerHTML = '';

  if (LLM_PROFILES[currentRoute]) {
    const rows = [];
    for (const [stack, section] of Object.entries(latestReport?.results || {}).filter(([, section]) => section?.normalized)) {
      const result = computeLlmIpScores(section, { browser: browserForReport(llmBrowser, latestReport) })[currentRoute];
      rows.push([`${stack === 'ipv6' ? 'IPv6' : 'IPv4'} · ${t('llm2.ip')}`, section.ip || section.normalized?.basic?.ip || null],
        [platformTitle(), result.score],
        [t('llm2.coverage'), `${result.coverage.known} / ${result.coverage.total}`],
        [t('llm2.region'), result.region.reason === 'regionUnverified' ? t('llm2.unknown') : t(`llm.reason.${result.region.reason}`)]);
    }
    if (!rows.length) rows.push([t('common.status'), latestReport?.ok === false ? latestReport.error : t('pill.fetching')]);
    content.appendChild(detailsTable(rows));
    refreshScrollAreas(els.details);
    return;
  }

  if (latestReport && latestReport.ok === false) {
    content.appendChild(detailsTable([[t('common.error'), latestReport.error || t('common.unknownError')]]));
    refreshScrollAreas(els.details);
    if (viewport && stickToTop) viewport.scrollTop = 0;
    return;
  }

  if (!latestReport?.ok) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent =
      currentRoute === 'ipq'
        ? t('details.empty.ipq')
        : currentRoute === 'scan'
          ? t('details.empty.scan')
          : t('details.empty.net');
    content.appendChild(empty);
    refreshScrollAreas(els.details);
    return;
  }

  const requested = latestReport?.requested || wantedStacks(latestReport?.stack);
  const pending = !!latestReport?.pending;
  const rows = [
    [t('details.generatedAt'), latestReport.generatedAt],
    [t('details.stack'), latestReport.stack],
  ];
  const results = latestReport.results && typeof latestReport.results === 'object' ? latestReport.results : {};
  for (const { key, label } of STACKS) {
    const value = results[key] || null;
    const want = !!requested?.[key];
    if (!want) continue;
    if (!pending && !value) {
      rows.push([t('common.status'), `${label} ${t('ipq.stack.notDetected')}`]);
      continue;
    }
    rows.push([`${label} ${t('details.ip')}`, pending ? FETCHING : value?.ip || null]);
    rows.push([`${label} ${t('details.type')}`, pending ? FETCHING : value?.normalized?.type?.category || null]);
    rows.push([`${label} ${platformTitle()}`, pending ? FETCHING : platformScore(value)]);
  }

  content.appendChild(detailsTable(rows));
  refreshScrollAreas(els.details);
  if (viewport && stickToTop) viewport.scrollTop = 0;
}

function renderMain() {
  if (!els.main || !els.view) return;
  if (els.runbar) els.runbar.style.display = currentRoute !== 'net' ? '' : 'none';
  const viewport = els.main.querySelector?.('.rt-ScrollAreaViewport') || null;
  const stickToTop = viewport ? viewport.scrollTop <= 12 : true;
  const mainContent = ensureScrollContent(els.main);
  const view = els.view;
  if (view.parentElement !== mainContent) mainContent.appendChild(view);
  // Keep controls and legal navigation outside the scrolling results.
  const scrollViewport = mainContent.parentElement;
  if (els.runbar && els.runbar.parentElement !== els.main) els.main.insertBefore(els.runbar, scrollViewport);
  const footer = els.main.querySelector('.ops-main-footer');
  if (footer && footer.parentElement !== els.main) els.main.appendChild(footer);
  const oldScrollWrapper = mainContent.querySelector('#ops-main-scroll');
  if (oldScrollWrapper && !oldScrollWrapper.children.length) oldScrollWrapper.remove();

  view.innerHTML = '';

  if (currentRoute !== 'net') startLlmBrowser();

  if (currentRoute === 'net') {
    view.appendChild(renderTextCountCard());
    refreshScrollAreas(els.main);
    if (viewport) viewport.scrollTop = 0;
    return;
  }

  if (currentRoute === 'scan') {
    const scan = sharedBrowserScan();
    scan.arrange();
    view.appendChild(scan);
    refreshScrollAreas(els.main);
    if (viewport) viewport.scrollTop = 0;
    return;
  }

  if (latestReport && latestReport.ok === false) {
    view.appendChild(
      card(
        t('ipq.error.title'),
        detailsTable([[t('ipq.error.message'), latestReport.error || t('common.unknownError')]]),
      ),
    );
    refreshScrollAreas(els.main);
    if (viewport && stickToTop) viewport.scrollTop = 0;
    return;
  }

  if (!latestReport?.ok) {
    const requested = wantedStacks(els.stack?.value || 'auto');
    view.appendChild(
      renderOverviewCard({
        report: null,
        requested,
        results: {},
        pending: false,
      }),
    );
    view.appendChild(
      card(
        t('ipq.title'),
        detailsTable([
          [t('ipq.target'), t('ipq.target.value')],
          [t('ipq.tip'), t('ipq.tip.value')],
        ]),
      ),
    );
    refreshScrollAreas(els.main);
    if (viewport && stickToTop) viewport.scrollTop = 0;
    return;
  }

  const results = latestReport.results && typeof latestReport.results === 'object' ? latestReport.results : {};
  const requested = latestReport?.requested || wantedStacks(latestReport?.stack);

  view.appendChild(
    renderOverviewCard({
      report: latestReport,
      requested,
      results,
      pending: !!latestReport?.pending,
    }),
  );

  if (LLM_PROFILES[currentRoute] || SOCIAL_PROFILES[currentRoute]) {
    renderPlatformSignals(view, results, requested);
    refreshScrollAreas(els.main);
    if (viewport && stickToTop) viewport.scrollTop = 0;
    return;
  }

  const scan = sharedBrowserScan();
  scan.arrange();
  const fingerprint = sectionFold(t('nav.scan'), [scan], { open: false });

  for (const { key, label } of STACKS) {
    const value = results[key] || null;
    const want = !!requested?.[key];
    if (!want) continue;
    if (!latestReport?.pending && !value) {
      view.appendChild(card(label, detailsTable([[t('common.status'), t('ipq.stack.notDetected')]])));
      continue;
    }
    const mode = latestReport?.pending ? 'pending' : 'ready';
    view.appendChild(sectionFold(`${label} · ${t('panel.details')}`, renderIpQualitySections(label, value, mode), { open: true }));
  }

  view.appendChild(fingerprint);
  refreshScrollAreas(els.main);
  if (viewport && stickToTop) viewport.scrollTop = 0;
}

function renderPlatformSignals(view, results, requested) {
  const focus = document.createElement('div');
  focus.className = 'platform-signals';
  focus.dataset.platform = currentRoute;
  const scan = sharedBrowserScan();
  const browser = scan.arrange(focus, currentRoute);
  const raw = [];
  for (const { key, label } of STACKS) {
    if (!requested?.[key]) continue;
    const section = results[key];
    if (!section) continue;
    const nodes = renderIpQualitySections(label, section, latestReport.pending ? 'pending' : 'ready');
    // Summary combines exit identity, sharing, network type and current platform score.
    // Abuse signals sit beside browser automation, rather than in an IP-only section.
    focus.append(nodes[0], nodes[4]);
    if (currentRoute === 'claude' || currentRoute === 'gemini') focus.append(nodes[1]);
    else raw.push(nodes[1]);
    raw.push(...nodes.slice(2, 4), ...nodes.slice(5));
  }
  view.append(focus);
  view.append(
    sectionFold(t('result.ipDetails'), [...raw, ...browser.ip]),
    sectionFold(t('result.browserDetails'), [...browser.secondary, ...browser.fingerprint]),
  );
}

let scanLifetime = new AbortController();
window.addEventListener('pagehide', () => scanLifetime.abort(), { once: true });
function renderBrowserScan() {
  scanLifetime.abort();
  scanLifetime = new AbortController();
  const root = document.createElement('div');
  root.className = 'scan-page';
  const grid = document.createElement('div');
  grid.className = 'scan-grid';

  const nav = globalThis.navigator || {};
  const scr = globalThis.screen || {};
  const glInfo = (() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return { vendor: String(vendor || ''), renderer: String(renderer || '') };
    } catch {
      return null;
    }
  })();

  const baseRows = [
    [t('scan.env.userAgent'), nav.userAgent || null],
    [t('scan.env.platform'), nav.platform || null],
    [t('scan.env.languages'), Array.isArray(nav.languages) ? nav.languages.join(', ') : (nav.language || null)],
    [
      t('scan.env.timezone'),
      (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        } catch {
          return null;
        }
      })(),
    ],
    [t('scan.env.cookies'), typeof nav.cookieEnabled === 'boolean' ? nav.cookieEnabled : null],
    [t('scan.env.doNotTrack'), nav.doNotTrack ?? null],
    [t('scan.env.hardwareConcurrency'), nav.hardwareConcurrency ?? null],
    [t('scan.env.deviceMemory'), nav.deviceMemory ?? null],
    [t('scan.env.screen'), scr.width && scr.height ? `${scr.width}×${scr.height}` : null],
    [t('scan.env.pixelRatio'), globalThis.devicePixelRatio ?? null],
  ];

  const storageRows = [
    [t('scan.storage.localStorage'), (() => { try { return !!globalThis.localStorage; } catch { return false; } })()],
    [t('scan.storage.sessionStorage'), (() => { try { return !!globalThis.sessionStorage; } catch { return false; } })()],
    [t('scan.storage.indexedDB'), typeof globalThis.indexedDB !== 'undefined'],
    [t('scan.storage.serviceWorker'), !!nav.serviceWorker],
  ];

  const gfxRows = [
    [t('scan.gfx.webgl'), glInfo ? 'WebGL' : null],
    [t('scan.gfx.vendor'), glInfo?.vendor || null],
    [t('scan.gfx.renderer'), glInfo?.renderer || null],
  ];

  let fpBody = detailsTable([[t('scan.fp.status'), FETCHING]]);
  const fpCard = card(t('scan.section.fingerprint'), fpBody);

  const scoreBody = document.createElement('div');
  scoreBody.className = 'scan-score-body';
  const scoreTop = document.createElement('div');
  scoreTop.className = 'scan-score-top';
  const scoreValue = document.createElement('div');
  scoreValue.className = 'scan-score-value';
  scoreValue.textContent = '--%';
  const scoreMeta = document.createElement('div');
  scoreMeta.className = 'scan-score-meta';
  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'scan-score-label';
  scoreLabel.textContent = t('scan.score.title');
  const scorePillWrap = document.createElement('div');
  scorePillWrap.className = 'scan-score-pill';
  scorePillWrap.appendChild(pill(t('pill.pending'), 'status-pending'));
  scoreMeta.append(scoreLabel, scorePillWrap);
  scoreTop.append(scoreValue, scoreMeta);

  const meter = document.createElement('div');
  meter.className = 'scan-meter is-neutral';
  const meterFill = document.createElement('div');
  meterFill.className = 'scan-meter-fill';
  meterFill.style.width = '0%';
  meter.appendChild(meterFill);
  scoreBody.append(scoreTop, meter);

  let summaryBody = detailsTable([
    [t('scan.summary.level'), FETCHING],
    [t('scan.summary.browser'), nav.userAgent || null],
    [t('scan.summary.platform'), nav.platform || null],
    [t('scan.summary.timezones'), FETCHING],
    [t('scan.summary.languages'), FETCHING],
    [t('scan.summary.location'), FETCHING],
    [t('scan.summary.isp'), FETCHING],
    [t('scan.summary.proxy'), FETCHING],
  ]);
  const summaryCard = card(t('scan.section.summary'), summaryBody);

  let dnsBody = detailsTable([
    [t('scan.dns.leak'), FETCHING],
    [t('scan.dns.doh.cloudflare'), FETCHING],
    [t('scan.dns.doh.google'), FETCHING],
  ]);
  const dnsCard = card(t('scan.section.dns'), dnsBody);

  let detectBody = detailsTable([[t('scan.detect.status'), FETCHING]]);
  const detectCard = card(t('scan.section.detection'), detectBody);

  let ipBody = detailsTable([[t('scan.ip.public'), FETCHING]]);
  const ipCard = card(t('scan.section.ip'), ipBody);

  let headersBody = detailsTable([[t('scan.headers.userAgent'), FETCHING]]);
  const headersCard = card(t('scan.section.headers'), headersBody);

  let webrtcBody = detailsTable([[t('scan.webrtc.leak'), FETCHING]]);
  const webrtcCard = card(t('scan.section.webrtc'), webrtcBody);

  let fpPartsBody = detailsTable([
    [t('scan.fpParts.visitor'), FETCHING],
    [t('scan.fpParts.canvas'), FETCHING],
    [t('scan.fpParts.webgl'), FETCHING],
    [t('scan.fpParts.audio'), FETCHING],
    [t('scan.fpParts.clientRects'), FETCHING],
  ]);
  const fpPartsCard = card(t('scan.section.fpParts'), fpPartsBody);

  const heroBody = document.createElement('div');
  heroBody.className = 'scan-hero-body';
  const heroNote = document.createElement('div');
  heroNote.className = 'scan-hero-note';
  heroNote.textContent = t('scan.hint.value');
  const heroScore = document.createElement('div');
  heroScore.className = 'scan-hero-score';
  heroScore.appendChild(scoreBody);
  heroBody.append(heroScore, heroNote);

  const hero = card(t('scan.title'), heroBody);
  hero.classList.add('scan-hero');
  const overview = document.createElement('div');
  overview.className = 'scan-overview';
  overview.append(hero, detectCard);
  const privacy = document.createElement('div');
  privacy.className = 'scan-privacy';
  privacy.append(webrtcCard, dnsCard);
  grid.append(summaryCard, ipCard);

  // Keep diagnostics live while placing raw signals behind native disclosure controls.
  const diagnosticCards = [
    headersCard,
    fpPartsCard,
    fpCard,
    card(t('scan.section.browser'), detailsTable(baseRows)),
    card(t('scan.section.graphics'), detailsTable(gfxRows)),
    card(t('scan.section.storage'), detailsTable(storageRows)),
  ];
  const diagnostics = sectionFold(t('panel.details'), diagnosticCards);
  diagnostics.classList.add('scan-diagnostics');
  root.append(overview, privacy, grid, diagnostics);

  // Move the existing live cards; switching tabs never starts another collector.
  root.arrange = (target = null, key = null) => {
    diagnostics.querySelector('.section-body').replaceChildren(...diagnosticCards);
    overview.append(hero, detectCard);
    privacy.append(webrtcCard, dnsCard);
    grid.append(summaryCard, ipCard);
    root.replaceChildren(overview, privacy, grid, diagnostics);
    if (!target) return;
    const priority = key === 'claude' ? [summaryCard, detectCard, webrtcCard, dnsCard]
      : key === 'gemini' ? [webrtcCard, detectCard, summaryCard, dnsCard]
      : key === 'tiktok' ? [summaryCard, webrtcCard, detectCard]
      : key === 'youtube' ? [dnsCard, summaryCard]
      : [detectCard];
    target.append(...priority);
    const secondary = [summaryCard, webrtcCard, dnsCard].filter(node => !priority.includes(node));
    return { secondary, ip: [ipCard], fingerprint: diagnosticCards };
  };

  const state = {
    fpjs: undefined,
    headers: undefined,
    publicIps: undefined,
    ipWho: undefined,
    ipinfo: undefined,
    webrtc: undefined,
    fpParts: undefined,
    ipHistory: undefined,
    dnsLeakStatus: undefined,
    dnsLeak: undefined,
    doh: undefined,
  };

  const dnsLeakGeoCache = new Map(); // ip -> geo|null

  const geoIpClientSide = async (ip) => {
    const target = String(ip || '').trim();
    if (!target) return null;
    if (dnsLeakGeoCache.has(target)) return dnsLeakGeoCache.get(target) || null;
    const r = await fetchJsonWithTimeout(`https://ipwho.is/${encodeURIComponent(target)}`, { timeoutMs: 2500 }).catch(() => null);
    const ok = !!r?.success;
    const geo = ok
      ? {
          ip: target,
          country: r?.country ?? null,
          country_code: r?.country_code ?? null,
          region: r?.region ?? null,
          city: r?.city ?? null,
          isp: r?.connection?.isp ?? null,
          asn: r?.connection?.asn ?? null,
        }
      : null;
    dnsLeakGeoCache.set(target, geo);
    return geo;
  };

  const enrichDnsLeakResolverGeo = async () => {
    const entry = state.dnsLeak;
    if (!entry?.ok || !Array.isArray(entry?.resolvers) || !entry.resolvers.length) return;

    const updated = entry.resolvers.map((r) => ({ ...(r || {}) }));
    const pending = [];
    for (let i = 0; i < updated.length && pending.length < 8; i++) {
      const ip = String(updated[i]?.ip || '').trim();
      if (!ip) continue;
      const cc = String(updated[i]?.geo?.country_code || '').trim();
      if (cc) continue;
      pending.push({ idx: i, ip });
    }
    if (!pending.length) return;

    let changed = false;
    await Promise.all(
      pending.map(async ({ idx, ip }) => {
        const geo = await geoIpClientSide(ip);
        if (!geo) return;
        updated[idx].geo = geo;
        changed = true;
      }),
    );

    if (!changed) return;
    state.dnsLeak = { ...entry, resolvers: updated };
    updateAll();
  };

  const pillLevel = (level) => `status-${String(level || 'neutral')}`;

  const renderPenalty = (penalty, level, message) => {
    const wrap = document.createElement('span');
    wrap.appendChild(pill(`-${Math.round(Number(penalty) || 0)}%`, pillLevel(level)));
    if (message) wrap.append(` ${String(message)}`);
    return wrap;
  };

  const safeBoolPill = (value, { goodIfTrue = true } = {}) => {
    if (value === null || value === undefined) return null;
    const v = value === true;
    const klass = v ? (goodIfTrue ? 'status-good' : 'status-bad') : (goodIfTrue ? 'status-bad' : 'status-good');
    return pill(v ? t('pill.yes') : t('pill.no'), klass);
  };

  const normalizeAsn = (value) => {
    const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const normalizeOrg = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  const isPublicResolver = ({ asn, org }) => {
    const a = normalizeAsn(asn);
    const o = normalizeOrg(org);
    if (a && (a === 13335 || a === 15169 || a === 19281 || a === 36692 || a === 34939 || a === 199524)) return true;
    return /(cloudflare|google|quad9|opendns|cisco|nextdns|adguard)/i.test(o);
  };

  const orgSimilar = (a, b) => {
    const x = normalizeOrg(a);
    const y = normalizeOrg(b);
    if (!x || !y) return false;
    if (x === y) return true;
    return x.includes(y) || y.includes(x);
  };

  const classifyDnsLeak = () => {
    const ipCountry = String(state.ipWho?.country_code ?? '').trim().toUpperCase();
    const exitAsn = normalizeAsn(state.ipWho?.connection?.asn);
    const exitOrg = state.ipWho?.connection?.org || state.ipWho?.connection?.isp || state.ipWho?.isp || null;
    const resolvers = Array.isArray(state.dnsLeak?.resolvers) ? state.dnsLeak.resolvers : [];
    if (!resolvers.length) return { ok: false, status: 'unknown' };
    if (!ipCountry) return { ok: false, status: 'unknown' };

    let crossRegion = false;
    let sameRegionLeak = false;

    for (const r of resolvers) {
      const cc = String(r?.geo?.country_code ?? '').trim().toUpperCase();
      if (cc && cc !== ipCountry) crossRegion = true;
    }
    if (crossRegion) return { ok: true, status: 'leak_cross_region' };

    for (const r of resolvers) {
      const cc = String(r?.geo?.country_code ?? '').trim().toUpperCase();
      if (cc && cc !== ipCountry) continue;
      const rasn = normalizeAsn(r?.geo?.asn);
      const rorg = r?.geo?.isp || r?.geo?.org || null;
      if (isPublicResolver({ asn: rasn, org: rorg })) continue;
      if (exitAsn && rasn && rasn !== exitAsn) {
        sameRegionLeak = true;
        break;
      }
      if (!exitAsn && exitOrg && rorg && !orgSimilar(exitOrg, rorg)) {
        sameRegionLeak = true;
        break;
      }
    }

    return { ok: true, status: sameRegionLeak ? 'leak_same_region' : 'no_leak' };
  };

  const updateAll = () => {
    const signals = collectBrowserScanSignals({ glInfo, fingerprintJsResult: state.fpjs });
    const resolverCountries = Array.isArray(state.dnsLeak?.resolvers)
      ? state.dnsLeak.resolvers
          .map((r) => String(r?.geo?.country_code ?? '').trim().toUpperCase())
          .filter(Boolean)
      : [];
    const uniqResolverCountries = Array.from(new Set(resolverCountries));
    const dns = classifyDnsLeak();
    const mismatchCountry = dns.ok ? dns.status === 'leak_cross_region' : false;
    signals.dnsLeak = {
      tested: state.dnsLeak !== undefined,
      leak: state.dnsLeak ? (dns.ok ? dns.status !== 'no_leak' : false) : false,
      status: dns.ok ? dns.status : 'unknown',
      mismatchCountry,
      ipCountry: String(state.ipWho?.country_code ?? '').trim().toUpperCase() || null,
      resolverCountries: uniqResolverCountries,
    };
    const headers = state.headers?.headers || null;
    const { score, level, issues, ipTz, localTz, acceptPrimary } = computeBrowserScanAuthenticity({
      signals,
      ipWho: state.ipWho,
      headers,
      webrtc: state.webrtc,
    });

    if (sharedScanNode !== root) return;
    latestScanSnapshot = { score, level };
    if (currentRoute === 'scan') renderLeftSidebarScores();

    scoreValue.textContent = `${score}%`;
    scorePillWrap.innerHTML = '';
    scorePillWrap.appendChild(pill(scoreLevelLabel(level), pillLevel(level)));
    meter.className = `scan-meter is-${level}`;
    meterFill.style.width = `${score}%`;

    // Summary
    const ipTimezoneMismatch = ipTz && localTz && ipTz !== localTz;
    const timezonesValue = (() => {
      const wrap = document.createElement('span');
      wrap.append(`IP: ${ipTz || '--'} / Local: ${localTz || '--'}`);
      if (ipTimezoneMismatch) wrap.appendChild(pill(t('scan.summary.mismatch'), 'status-bad'));
      else if (ipTz && localTz) wrap.appendChild(pill(t('scan.summary.match'), 'status-good'));
      return wrap;
    })();

    const acceptLangHeader = String(headers?.['accept-language'] ?? '').trim() || null;
    const navLangs = Array.isArray(signals?.env?.languages) ? signals.env.languages.join(', ') : null;
    const langMismatch = (() => {
      if (!acceptPrimary) return null;
      if (!Array.isArray(signals?.env?.languages) || !signals.env.languages.length) return null;
      const acceptFam = langFamily(acceptPrimary);
      const ok = signals.env.languages.map(normalizeLangTag).some((l) => l === acceptPrimary || langFamily(l) === acceptFam);
      return ok ? false : true;
    })();

    const languagesValue = (() => {
      const wrap = document.createElement('span');
      wrap.append(`${navLangs || '--'}`);
      if (acceptLangHeader) wrap.append(` / H: ${acceptLangHeader}`);
      if (langMismatch === true) wrap.appendChild(pill(t('scan.summary.mismatch'), 'status-warn'));
      if (langMismatch === false) wrap.appendChild(pill(t('scan.summary.match'), 'status-good'));
      return wrap;
    })();

    const location = state.ipWho
      ? [state.ipWho?.city, state.ipWho?.region, state.ipWho?.country_code].filter(Boolean).join(', ')
      : null;
    const isp = state.ipWho?.connection?.isp || state.ipWho?.connection?.org || state.ipinfo?.org || null;
    const proxy = state.ipWho?.security?.proxy;

    const nextSummary = detailsTable([
      [t('scan.summary.level'), pill(scoreLevelLabel(level), pillLevel(level))],
      [t('scan.summary.browser'), signals?.env?.userAgent || null],
      [t('scan.summary.platform'), signals?.env?.platform || null],
      [t('scan.summary.timezones'), state.ipWho === undefined ? FETCHING : (state.ipWho ? timezonesValue : null)],
      [t('scan.summary.languages'), state.headers === undefined ? FETCHING : (headers ? languagesValue : null)],
      [t('scan.summary.location'), state.ipWho === undefined ? FETCHING : (state.ipWho ? location : null)],
      [t('scan.summary.isp'), state.ipWho === undefined && state.ipinfo === undefined ? FETCHING : isp],
      [
        t('scan.summary.proxy'),
        state.ipWho === undefined
          ? FETCHING
          : (typeof proxy === 'boolean' ? safeBoolPill(proxy, { goodIfTrue: false }) : null),
      ],
    ]);
    summaryCard.replaceChild(nextSummary, summaryBody);
    summaryBody = nextSummary;

    // Detection (penalties)
    const nextDetect = (() => {
      const hasAny =
        state.fpjs !== undefined || state.headers !== undefined || state.ipWho !== undefined || state.webrtc !== undefined;
      if (!hasAny) return detailsTable([[t('scan.detect.status'), FETCHING]]);
      if (!issues.length) return detailsTable([[t('scan.detect.none'), pill(t('scan.detect.none.value'), 'status-good')]]);
      const rows = issues.map((it) => [it.key, renderPenalty(it.penalty, it.level, it.message)]);
      return detailsTable(rows);
    })();
    detectCard.replaceChild(nextDetect, detectBody);
    detectBody = nextDetect;

    // IP card
    const ip = state.publicIps?.ipv4 || state.publicIps?.ipv6 || null;
    const ipRows = [
      [t('scan.ip.public'), state.publicIps === undefined ? FETCHING : ip],
      [t('scan.ip.ipv4'), state.publicIps?.ipv4 || null],
      [t('scan.ip.ipv6'), state.publicIps?.ipv6 || null],
      [t('scan.ip.count7d'), state.ipHistory === undefined ? FETCHING : (state.ipHistory?.unique7d ?? null)],
      [t('scan.ip.timezoneIp'), ipTz || (state.ipWho ? null : FETCHING)],
      [t('scan.ip.timezoneLocal'), localTz || null],
      [t('scan.ip.loc'), state.ipWho ? (state.ipWho?.latitude && state.ipWho?.longitude ? `${state.ipWho.latitude}, ${state.ipWho.longitude}` : null) : FETCHING],
      [t('scan.ip.postal'), state.ipWho?.postal || state.ipinfo?.postal || null],
      [t('scan.ip.org'), isp],
    ];
    const nextIp = detailsTable(ipRows);
    ipCard.replaceChild(nextIp, ipBody);
    ipBody = nextIp;

    // Headers card
    const nextHeaders = detailsTable([
      [t('scan.headers.userAgent'), state.headers === undefined ? FETCHING : (headers ? (headers['user-agent'] || null) : null)],
      [t('scan.headers.acceptLanguage'), state.headers === undefined ? FETCHING : (headers ? (headers['accept-language'] || null) : null)],
      [t('scan.headers.secChUa'), state.headers === undefined ? FETCHING : (headers ? (headers['sec-ch-ua'] || null) : null)],
      [t('scan.headers.secChUaPlatform'), state.headers === undefined ? FETCHING : (headers ? (headers['sec-ch-ua-platform'] || null) : null)],
      [t('scan.headers.secChUaMobile'), state.headers === undefined ? FETCHING : (headers ? (headers['sec-ch-ua-mobile'] || null) : null)],
    ]);
    headersCard.replaceChild(nextHeaders, headersBody);
    headersBody = nextHeaders;

    // WebRTC card
    const w = state.webrtc;
    const leakPill = (() => {
      if (w === undefined) return FETCHING;
      if (!w || w?.supported === false) return pill(t('pill.no'), 'status-good');
      if (w.disabled) return pill(t('pill.no'), 'status-warn');
      if (!w.ok) return pill(t('ext.status.unknown'), 'status-warn');
      return w.leak === true ? pill(t('pill.yes'), 'status-bad') : pill(t('pill.no'), 'status-good');
    })();

    const nextWebrtc = detailsTable([
      [t('scan.webrtc.leak'), leakPill],
      [t('scan.webrtc.srflx'), w?.srflxIps?.length ? w.srflxIps.join(', ') : null],
      [t('scan.webrtc.host'), w?.hostIps?.length ? w.hostIps.join(', ') : null],
    ]);
    webrtcCard.replaceChild(nextWebrtc, webrtcBody);
    webrtcBody = nextWebrtc;

    // Fingerprint parts card
    const fpRes = state.fpjs?.ok ? state.fpjs.result : null;
    const nextParts = detailsTable([
      [t('scan.fpParts.visitor'), state.fpjs === undefined ? FETCHING : (fpRes?.visitorId ? maskId(fpRes.visitorId, 4, 2) : null)],
      [t('scan.fpParts.canvas'), state.fpParts === undefined ? FETCHING : (state.fpParts?.canvas ?? null)],
      [t('scan.fpParts.webgl'), state.fpParts === undefined ? FETCHING : (state.fpParts?.webgl ?? null)],
      [t('scan.fpParts.audio'), state.fpParts === undefined ? FETCHING : (state.fpParts?.audio ?? null)],
      [t('scan.fpParts.clientRects'), state.fpParts === undefined ? FETCHING : (state.fpParts?.clientRects ?? null)],
    ]);
    fpPartsCard.replaceChild(nextParts, fpPartsBody);
    fpPartsBody = nextParts;

    // DNS card
    const renderDohValue = (probe) => {
      if (!probe) return FETCHING;
      if (!probe?.ok) {
        const wrap = document.createElement('span');
        wrap.dataset.kvLevel = 'bad';
        wrap.appendChild(pill(t('scan.dns.status.failed'), 'status-bad'));
        if (typeof probe?.ms === 'number') wrap.append(` ${probe.ms}ms`);
        return wrap;
      }
      const wrap = document.createElement('span');
      wrap.appendChild(pill(t('scan.dns.status.ok'), 'status-good'));
      const ips = Array.isArray(probe.ips) && probe.ips.length ? ` / ${probe.ips.join(', ')}` : '';
      wrap.append(` ${probe.ms}ms${ips}`);
      return wrap;
    };

    const leakValue = (() => {
      const status = state.dnsLeakStatus;
      if (status === undefined) return FETCHING;
      if (!status?.enabled) return pill(t('scan.dns.leak.disabled'), 'status-neutral');
      if (status?.enabled && !status?.active) return pill(t('scan.dns.leak.inactive'), 'status-warn');
      if (state.dnsLeak === undefined) return pill(t('scan.dns.leak.pending'), 'status-pending');
      if (state.dnsLeak && state.dnsLeak.ok === false && state.dnsLeak.error === 'oast_blocked') {
        return pill(t('scan.dns.leak.blocked'), 'status-warn');
      }
      if (state.dnsLeak === null) return pill(t('scan.dns.leak.unknown'), 'status-warn');
      if (!state.dnsLeak?.resolvers?.length) return pill(t('scan.dns.leak.unknown'), 'status-warn');
      const status0 = String(signals?.dnsLeak?.status || '').toLowerCase();
      if (status0 === 'leak_cross_region') return pill(t('scan.dns.leak.yes.mismatch'), 'status-bad');
      if (status0 === 'leak_same_region') return pill(t('scan.dns.leak.yes.sameRegion'), 'status-warn');
      if (status0 === 'no_leak') return pill(t('scan.dns.leak.no'), 'status-good');
      return pill(t('scan.dns.leak.unknown'), 'status-warn');
    })();

    const resolverList = (() => {
      if (!state.dnsLeak?.resolvers?.length) return null;
      const ipCountry = signals?.dnsLeak?.ipCountry;
      const parts = state.dnsLeak.resolvers.slice(0, 3).map((r) => {
        const ip = r?.ip;
        const c = String(r?.geo?.country_code ?? '').trim().toUpperCase();
        const mismatch = ipCountry && c && c !== ipCountry;
        const span = document.createElement('span');
        if (mismatch) span.dataset.kvLevel = 'bad';
        span.textContent = `${ip}${c ? ` (${c})` : ''}`;
        return span;
      });
      const wrap = document.createElement('span');
      for (let i = 0; i < parts.length; i++) {
        if (i) wrap.append(' / ');
        wrap.appendChild(parts[i]);
      }
      const more = state.dnsLeak.resolvers.length - parts.length;
      if (more > 0) wrap.append(` +${more}`);
      return wrap;
    })();

    const nextDns = detailsTable([
      [t('scan.dns.leak'), leakValue],
      [t('scan.dns.resolvers'), resolverList],
      [t('scan.dns.doh.cloudflare'), renderDohValue(state.doh?.cloudflare)],
      [t('scan.dns.doh.google'), renderDohValue(state.doh?.google)],
    ]);
    dnsCard.replaceChild(nextDns, dnsBody);
    dnsBody = nextDns;
  };

  updateAll();

  // Fill FingerprintJS results async.
  (async () => {
    const r = await getFingerprintJsResult();
    const rows = [];
    if (r.ok) {
      const res = r.result || {};
      rows.push([t('scan.fp.visitorId'), res.visitorId || null]);
      if (res.confidence && typeof res.confidence.score === 'number') {
        rows.push([t('scan.fp.confidence'), res.confidence.score]);
      }
      if (typeof res.version === 'string') rows.push([t('scan.fp.version'), res.version]);
    } else {
      rows.push([t('scan.fp.error'), textWithKvLevel(r.error || getFingerprintJsAgentError() || null, 'bad')]);
      rows.push([t('scan.fp.hint'), t('scan.fp.hint.value')]);
    }

    const next = detailsTable(rows.length ? rows : [[t('common.status'), null]]);
    fpCard.replaceChild(next, fpBody);
    fpBody = next;
    state.fpjs = r;
    updateAll();
    refreshScrollAreas(els.main);
  })();

  // DNS (DoH) probe async.
  (async () => {
    const timeoutMs = 5000;
    const [cf, gg] = await Promise.all([
      probeDohResolve({
        label: 'Cloudflare',
        url: 'https://cloudflare-dns.com/dns-query?name=example.com&type=A',
        headers: { accept: 'application/dns-json' },
        timeoutMs,
      }),
      probeDohResolve({
        label: 'Google',
        url: 'https://dns.google/resolve?name=example.com&type=A',
        timeoutMs,
      }),
    ]);
    state.doh = { cloudflare: cf, google: gg };
    updateAll();
    refreshScrollAreas(els.main);
  })();

  const dnsLifetime = scanLifetime;
  void runDnsLeak({ fetch, fetchJsonWithTimeout, postJsonWithTimeout, trigger: triggerDnsQuery, delay: abortableDelay,
    signal: dnsLifetime.signal,
    onUpdate: next => { if (!dnsLifetime.signal.aborted) { Object.assign(state, next); updateAll(); } },
    onResult: () => { if (!dnsLifetime.signal.aborted) void enrichDnsLeakResolverGeo(); },
  }).catch(() => {});

  refreshSharedScan = () => { applyI18n(root); updateAll(); };
  // IP/geo + headers + WebRTC + parts async.
  (async () => {
    const updateIpHistory = (ips) => {
      const key = 'ipq:scan:ipHistory';
      const now = Date.now();
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const get = () => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      const set = (v) => {
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {
          // ignore
        }
      };

      const input = [ips?.ipv4, ips?.ipv6].filter((v) => typeof v === 'string' && v.trim());
      const current = get()
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({ ip: String(x.ip || '').trim(), t: Number(x.t || 0) }))
        .filter((x) => x.ip && Number.isFinite(x.t));

      const pruned = current.filter((x) => now - x.t <= ttlMs);
      for (const ip of input) pruned.push({ ip, t: now });
      set(pruned.slice(-200));

      const unique = new Set(pruned.map((x) => x.ip));
      return { unique7d: unique.size };
    };

    try {
      while (!latestReport || latestReport.pending) await new Promise(resolve => setTimeout(resolve, 50));
      const sections = latestReport.results || {};
      state.publicIps = { ipv4: sections.ipv4?.ip || sections.ipv4?.normalized?.basic?.ip || null, ipv6: sections.ipv6?.ip || sections.ipv6?.normalized?.basic?.ip || null };
      state.ipHistory = updateIpHistory(state.publicIps);
      const primary = sections.ipv4 || sections.ipv6;
      state.ipWho = primary?.raw?.ipwho || primary?.sources?.ipwho || null;
      if (!state.ipWho && primary?.normalized?.basic) {
        const b = primary.normalized.basic;
        state.ipWho = { country_code: b.countryCode, latitude: b.latitude, longitude: b.longitude, timezone: { id: b.timezone }, connection: { isp: b.isp, org: b.org } };
      }
      state.ipinfo = null;
      updateAll();
    } catch {
      // ignore
    }
  })();

  (async () => {
    const h = await fetchJsonWithTimeout('/api/headers', { timeoutMs: 2500 }).catch(() => null);
    state.headers = h?.ok ? h : null;
    updateAll();
  })();

  (async () => {
    const observed = await collectLlmBrowser();
    const compared = browserForReport(observed, latestReport);
    state.webrtc = { supported: observed.webrtcStatus !== 'unavailable', ok: observed.webrtcStatus === 'complete', disabled: !observed.webrtcIps.length, hostIps: [], srflxIps: observed.webrtcIps, leak: compared.webrtcMismatch };
    updateAll();
  })();

  (async () => {
    const toHex = (buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const hashHex8 = async (text) => {
      const enc = new TextEncoder();
      const bytes = enc.encode(String(text ?? ''));
      if (globalThis.crypto?.subtle?.digest) {
        const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
        return toHex(digest).slice(0, 8).toUpperCase();
      }
      let h = 2166136261;
      for (const b of bytes) {
        h ^= b;
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
    };

    const canvasId = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 260;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 10, 100, 40);
      ctx.fillStyle = '#069';
      ctx.font = '16px Arial';
      ctx.fillText('ipqcheck@fingerprint', 12, 14);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.65)';
      ctx.font = '18px Times New Roman';
      ctx.fillText('Cwm fjord', 12, 36);
      return hashHex8(canvas.toDataURL());
    };

    const webglId = async () => {
      if (!glInfo) return null;
      const s = `${glInfo.vendor}|${glInfo.renderer}`;
      return hashHex8(s);
    };

    const rectsId = async () => {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:123.4px;height:56.7px;transform:rotate(0.7deg);';
      el.textContent = 'ipqcheck';
      document.body.appendChild(el);
      const r = el.getBoundingClientRect();
      document.body.removeChild(el);
      return hashHex8(`${r.x},${r.y},${r.width},${r.height}`);
    };

    const audioId = async () => {
      const OfflineAudioContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext || null;
      if (!OfflineAudioContext) return null;
      try {
        const ctx = new OfflineAudioContext(1, 44100, 44100);
        const osc = ctx.createOscillator();
        const comp = ctx.createDynamicsCompressor();
        osc.type = 'triangle';
        osc.frequency.value = 1000;
        comp.threshold.value = -50;
        comp.knee.value = 40;
        comp.ratio.value = 12;
        comp.attack.value = 0;
        comp.release.value = 0.25;
        osc.connect(comp);
        comp.connect(ctx.destination);
        osc.start(0);
        const buf = await ctx.startRendering();
        const data = buf.getChannelData(0).slice(0, 2200);
        let sum = 0;
        for (const v of data) sum += Math.abs(v);
        return hashHex8(`a:${sum.toFixed(6)}`);
      } catch {
        return null;
      }
    };

    const [canvas, webgl, audio, clientRects] = await Promise.all([canvasId(), webglId(), audioId(), rectsId()]);
    state.fpParts = { canvas, webgl, audio, clientRects };
    updateAll();
  })();

  return root;
}

const mobileLayout = window.matchMedia('(max-width: 700px)');
const mobileNav = document.querySelector('.ops-nav');
const sidebarToggle = document.getElementById('sidebar-toggle');
const navToggle = document.getElementById('nav-toggle');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
function closeMobilePanels({ restoreFocus = false } = {}) {
  const wasSidebar = document.getElementById('ops-shell').classList.contains('sidebar-open');
  document.getElementById('ops-shell').classList.remove('sidebar-open');
  mobileNav.classList.remove('is-expanded');
  sidebarToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-expanded', 'false');
  els.leftSidebar.inert = mobileLayout.matches;
  if (restoreFocus) (wasSidebar ? sidebarToggle : navToggle).focus();
  requestAnimationFrame(syncNav);
}
sidebarToggle.addEventListener('click', () => {
  const open = sidebarToggle.getAttribute('aria-expanded') !== 'true';
  closeMobilePanels();
  document.getElementById('ops-shell').classList.toggle('sidebar-open', open);
  sidebarToggle.setAttribute('aria-expanded', String(open));
  els.leftSidebar.inert = !open;
});
navToggle.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  closeMobilePanels();
  mobileNav.classList.toggle('is-expanded', open);
  navToggle.setAttribute('aria-expanded', String(open));
  syncNav();
});
sidebarBackdrop.addEventListener('click', () => closeMobilePanels({ restoreFocus: true }));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileLayout.matches) closeMobilePanels({ restoreFocus: true });
});
mobileLayout.addEventListener('change', () => closeMobilePanels());
closeMobilePanels();

function syncNav() {
  const active = els.navButtons.find((b) => b.dataset.route === currentRoute) || null;
  for (const btn of els.navButtons) btn.removeAttribute('aria-current');
  if (active) active.setAttribute('aria-current', 'page');

  if (!els.navIndicator || !active) return;
  const nav = active.parentElement;
  if (!nav) return;
  const rect = active.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const shell = document.getElementById('ops-shell');
  shell?.style.setProperty('--platform-nav-bottom', `${nav.offsetTop + nav.offsetHeight + 10}px`);
  els.navIndicator.style.left = `${rect.left - navRect.left - nav.clientLeft}px`;
  els.navIndicator.style.top = `${rect.top - navRect.top - nav.clientTop}px`;
  els.navIndicator.style.height = `${rect.height}px`;
  els.navIndicator.style.bottom = 'auto';
  els.navIndicator.style.width = `${rect.width}px`;
  els.navIndicator.classList.add('is-visible');

}

function scheduleNavIndicatorSync() {
  if (!els.navIndicator || els.navButtons.length === 0) return;
  const tick = () => syncNav();
  window.addEventListener('resize', tick, { passive: true });
  window.addEventListener('orientationchange', tick, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(tick).catch(() => null);

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => tick());
    for (const btn of els.navButtons) ro.observe(btn);
    const nav = document.querySelector('.ops-nav');
    if (nav) ro.observe(nav);
  }
}

function setRoute(route, { push = false } = {}) {
  closeMobilePanels();
  const next = String(route || '').trim() || 'ipq';
  if (next === currentRoute) return;
  currentRoute = next;

  setAction(t('action.routeSwitched', { route: currentRoute }));
  pushEvent({ kind: 'route', message: t('event.route.switched', { route: currentRoute }) });
  applySeo({ route: currentRoute });
  try {
    const url = routeUrl(currentRoute, { navigation: true });
    if (push) history.pushState({ route: currentRoute }, '', url);
    else history.replaceState({ route: currentRoute }, '', url);
  } catch {
    // ignore
  }
  render();
  if ((currentRoute !== 'net') && !latestReport) void runCheck();
}

function renderRouteContext() {
  const llm = !!LLM_PROFILES[currentRoute];
  const heading = document.querySelector('.main-title');
  if (heading) heading.textContent = currentRoute !== 'net' && currentRoute !== 'scan' ? `PING100 ${platformTitle()}` : t('header.mainTitle');
  const tips = document.querySelector('[data-i18n-html="sidebar.tips.body"]');
  if (tips) tips.innerHTML = t('sidebar.tips.body');
  const method = document.querySelector('a[data-i18n="footer.scoring"]');
  if (method) method.href = `${llm ? llmMethodPath(currentRoute) : '/methodology/ip-score'}?lang=${encodeURIComponent(getLocale())}`;
}

function render() {
  renderRouteContext();
  syncNav();
  renderMain();
  renderDetailsPanel();
  renderActivity();
  renderFooter();
  renderLeftSidebarScores();
  initLucideIcons();
}

window.addEventListener('popstate', () => {
  const next = routeFromPathname(location.pathname);
  if (next !== currentRoute) setRoute(next, { push: false });
});

async function checkHealth() {
  try {
    const r = await fetch('/api/health');
    const data = await r.json();
    apiOk = !!data.ok;
  } catch {
    apiOk = false;
  }
  renderFooter();
}

const diagnosticSession = createDiagnosticSession({ checks: { ip: runClientCheck } });
window.addEventListener('pagehide', () => diagnosticSession.dispose(), { once: true });

async function runCheck({ refreshBrowser = false } = {}) {
  if (!els.btnRun || els.btnRun.disabled) return;
  if (refreshBrowser) { startLlmBrowser({ refresh: true }); sharedScanNode = null; latestScanSnapshot = null; }
  els.btnRun.disabled = true;
  els.btnRun.classList.add('is-running');
  setStatus(t('status.running'));

  const stack = String(els.stack?.value || 'auto');
  const timeoutMs = Number.parseInt(String(els.timeoutMs?.value || '12000'), 10) || 12000;
  const includeMedia = !!els.includeMedia?.checked;
  const includeMail = !!els.includeMail?.checked;
  const includeDnsbl = !!els.includeDnsbl?.checked;
  const requested = wantedStacks(stack);

  setAction(t('action.run', { stack, timeoutMs }));
  pushEvent({
    kind: 'check',
    message: t('event.check.run', {
      stack,
      timeoutMs,
      media: boolText(includeMedia),
      mail: boolText(includeMail),
      dnsbl: boolText(includeDnsbl),
    }),
  });

  latestReport = {
    ok: true,
    pending: true,
    generatedAt: new Date().toISOString(),
    stack,
    requested,
    options: { includeMedia, includeMail, includeDnsbl },
    results: {},
  };
  render();

  try {
    const batch = await diagnosticSession.run({
      stack,
      timeoutMs,
      options: { includeMedia, includeMail, includeDnsbl },
    });
    if (batch.status === 'cancelled') return;
    if (batch.checks.ip.status !== 'success') throw new Error(batch.checks.ip.error?.message || 'IP detection failed');
    const data = batch.checks.ip.data;
    latestReport = { ...data, requested, options: { includeMedia, includeMail, includeDnsbl } };
    setStatus(t('status.ready'));
    pushEvent({
      kind: 'check',
      message: t('event.check.ok', { stack: Object.keys(data.results || {}).join('+') || '-' }),
    });
  } catch (error) {
    latestReport = { ok: false, error: String(error?.message || error) };
    setStatus(t('status.error'));
    pushEvent({ level: 'error', kind: 'check', message: latestReport.error });
  } finally {
    els.btnRun.disabled = false;
    els.btnRun.classList.remove('is-running');
    render();
  }
}

const { renderTcpPingCard, renderDnsCard } = createNetworkTools({ setStatus, pushEvent, setAction });

els.btnRun?.addEventListener('click', async () => {
  await runCheck({ refreshBrowser: true });
});

els.btnTools?.addEventListener('click', () => {
  openModal((content) => {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = t('header.tools');
    content.appendChild(title);
    content.appendChild(renderTcpPingCard());
    content.appendChild(renderDnsCard());
  });
  pushEvent({ kind: 'ui', message: t('event.ui.openedTools') });
  setAction(t('action.tools'));
});

els.btnPrivacy?.addEventListener('click', () => openLegalModal('privacy'));
els.btnTerms?.addEventListener('click', () => openLegalModal('terms'));

els.modalClose?.addEventListener('click', closeModal);

els.modalOverlay?.addEventListener('click', (event) => {
  if (event.target === els.modalOverlay) closeModal();
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!els.modalOverlay?.classList.contains('is-visible')) return;
  closeModal();
});

els.langSelect?.addEventListener('change', () => {
  setLocale(els.langSelect.value);
  // Replace an explicit URL locale too, so reloading cannot undo this choice.
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', getLocale());
    history.replaceState(history.state, '', url);
  }
  applyI18n(document);
  // Refresh other lily-select triggers after i18n; avoid recursively triggering this handler.
  document
    .querySelectorAll('select.select')
    .forEach((s) => {
      if (s === els.langSelect) return;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
  applySeo({ route: currentRoute });
  refreshSharedScan?.();
  render();
});

for (const btn of els.navButtons) {
  btn.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setRoute(btn.dataset.route, { push: true });
  });
}

scheduleNavIndicatorSync();

setInterval(() => {
  if (els.clock) els.clock.textContent = nowClock();
}, 250);

void checkHealth();
setInterval(checkHealth, 5000);

ensureScrollAreaStructure(els.details);
ensureScrollAreaStructure(els.activity);
ensureScrollAreaStructure(els.main);
ensureScrollAreaStructure(els.modalScroll);
ensureScrollAreaStructure(els.leftSidebar);
const sidebarEvents = els.leftSidebar.querySelector('.data-block--events');
if (sidebarEvents) els.leftSidebar.appendChild(sidebarEvents);
setupScrollAreas(document);

setStatus(t('status.ready'));
pushEvent({ kind: 'boot', message: t('event.boot.ready') });
render();

// Start the page's checks immediately; the browser scan starts inside render().
if (currentRoute !== 'net') void runCheck();
