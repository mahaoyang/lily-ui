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

function normalizeLangTag(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parseAcceptLanguagePrimary(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const first = raw.split(',')[0] || '';
  const tag = first.split(';')[0] || '';
  return normalizeLangTag(tag);
}

function langFamily(tag) {
  const s = normalizeLangTag(tag);
  return s.split('-')[0] || '';
}

function computeBrowserScanAuthenticity({ signals, ipWho, headers, webrtc } = {}) {
  const env = signals?.env || {};
  const bot = signals?.bot || {};
  const dnsLeak = signals?.dnsLeak || null;

  const localTz = String(env.timezone || '').trim();
  const ipTz = String(ipWho?.timezone?.id ?? ipWho?.timezone ?? '').trim();

  const headerUa = String(headers?.['user-agent'] ?? '').trim();
  const acceptLang = String(headers?.['accept-language'] ?? '').trim();
  const acceptPrimary = parseAcceptLanguagePrimary(acceptLang);
  const navLangs = Array.isArray(env.languages) ? env.languages.map(normalizeLangTag).filter(Boolean) : [];

  const issues = [];
  let score = 100;

  const add = ({ key, penalty, level, message }) => {
    const p = Math.max(0, Math.round(Number(penalty) || 0));
    if (!p) return;
    score -= p;
    issues.push({ key: String(key), penalty: p, level: String(level || 'warn'), message: String(message || '') });
  };

  if (bot.webdriver) {
    add({ key: 'scan.detect.webdriver', penalty: 60, level: 'bad', message: 'scan.detect.webdriver.value' });
  }

  if (headerUa && env.userAgent && headerUa !== env.userAgent) {
    add({ key: 'scan.detect.uaMismatch', penalty: 8, level: 'warn', message: 'scan.detect.uaMismatch.value' });
  }

  if (acceptPrimary && navLangs.length) {
    const acceptFam = langFamily(acceptPrimary);
    const ok = navLangs.some((l) => l === acceptPrimary || langFamily(l) === acceptFam);
    if (!ok) add({ key: 'scan.detect.languageMismatch', penalty: 6, level: 'warn', message: 'scan.detect.languageMismatch.value' });
  }

  if (ipTz && localTz && ipTz !== localTz) {
    add({ key: 'scan.detect.timezoneMismatch', penalty: 10, level: 'bad', message: 'scan.detect.timezoneMismatch.value' });
  }

  if (typeof bot.pluginsCount === 'number' && bot.pluginsCount === 0) {
    add({ key: 'scan.detect.noPlugins', penalty: 4, level: 'warn', message: 'scan.detect.noPlugins.value' });
  }

  if (webrtc?.supported && webrtc?.disabled) {
    add({ key: 'scan.detect.webrtcDisabled', penalty: 2, level: 'warn', message: 'scan.detect.webrtcDisabled.value' });
  }

  if (webrtc?.leak === true) {
    add({ key: 'scan.detect.webrtcLeak', penalty: 5, level: 'warn', message: 'scan.detect.webrtcLeak.value' });
  }

  if (dnsLeak?.tested && dnsLeak?.leak === true) {
    const status = String(dnsLeak?.status || '').toLowerCase();
    if (status === 'leak_cross_region') {
      add({
        key: 'scan.detect.dnsLeak',
        penalty: 15,
        level: 'bad',
        message: 'scan.detect.dnsLeak.value.mismatch',
      });
    } else if (status === 'leak_same_region') {
      add({
        key: 'scan.detect.dnsLeak',
        penalty: 5,
        level: 'warn',
        message: 'scan.detect.dnsLeak.value.sameRegion',
      });
    }
  }

  score = clamp0to100(score);
  const level = scanLevelFromScore(score);
  return { score, level, issues, ipTz, localTz, acceptPrimary };
}


export { computeBrowserScanAuthenticity };
