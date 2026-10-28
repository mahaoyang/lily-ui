function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stableStringify(obj) {
  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of keys) sorted[k] = obj[k];
  return JSON.stringify(sorted);
}

function basicEnv() {
  const nav = globalThis.navigator || {};
  const scr = globalThis.screen || {};
  return {
    ua: nav.userAgent || '',
    lang: nav.language || '',
    langs: Array.isArray(nav.languages) ? nav.languages.join(',') : '',
    plat: nav.platform || '',
    tz: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch {
        return '';
      }
    })(),
    hw: nav.hardwareConcurrency ?? '',
    mem: nav.deviceMemory ?? '',
    sw: scr.width ?? '',
    sh: scr.height ?? '',
    dpr: globalThis.devicePixelRatio ?? '',
  };
}

async function hashToHex(data) {
  const enc = new TextEncoder();
  const bytes = typeof data === 'string' ? enc.encode(data) : data;

  if (globalThis.crypto?.subtle?.digest) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return toHex(digest);
  }

  // Fallback (non-cryptographic) hash: still avoids sending raw info.
  let h = 2166136261;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return `fnv1a32:${(h >>> 0).toString(16).padStart(8, '0')}`;
}

async function tryGetFingerprintJsVisitorId() {
  try {
    const mod = await import('./fingerprintjs.js');
    if (!mod?.getFingerprintJsResult) return '';
    const r = await mod.getFingerprintJsResult();
    if (!r?.ok) return '';
    const visitorId = r?.result?.visitorId;
    return typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim() : '';
  } catch {
    return '';
  }
}

// Privacy: only a hash is sent to backend.
export async function getClientFingerprint() {
  const fpjs = await tryGetFingerprintJsVisitorId();
  if (fpjs) return hashToHex(`fpjs:${fpjs}`);
  return hashToHex(stableStringify(basicEnv()));
}
