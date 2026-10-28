export function createRdnsSource({ fetch, storage, now = Date.now } = {}) {
function isV4(ip) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip);
}

function isV6(ip) {
  return /^[0-9a-f:]+$/i.test(ip) && ip.includes(':');
}

function expandV6(ip) {
  const raw = String(ip || '').toLowerCase();
  const [left, right] = raw.split('::');
  const leftParts = left ? left.split(':').filter(Boolean) : [];
  const rightParts = right ? right.split(':').filter(Boolean) : [];

  const normalizePart = (p) => p.padStart(4, '0');
  const missing = Math.max(0, 8 - (leftParts.length + rightParts.length));
  const full = [
    ...leftParts.map(normalizePart),
    ...new Array(missing).fill('0000'),
    ...rightParts.map(normalizePart),
  ];
  return full.join('');
}

function ipToPtrName(ip) {
  const value = String(ip ?? '').trim();
  if (!value) return null;
  if (isV4(value)) {
    return `${value.split('.').reverse().join('.')}.in-addr.arpa`;
  }
  if (isV6(value)) {
    const hex = expandV6(value);
    if (hex.length !== 32) return null;
    return `${hex.split('').reverse().join('.')}.ip6.arpa`;
  }
  return null;
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const ms = Math.max(200, Number(timeoutMs) || 2000);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const r = await fetch(url, { signal: controller?.signal, cache: 'no-store' });
    return await r.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function reverseDns(ip, timeoutMs) {
  const ptrName = ipToPtrName(ip);
  if (!ptrName) return null;
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(ptrName)}&type=PTR`;
    const data = await fetchJsonWithTimeout(url, timeoutMs);
    const answer = Array.isArray(data?.Answer) ? data.Answer : [];
    const name = answer?.[0]?.data ? String(answer[0].data) : '';
    return name.endsWith('.') ? name.slice(0, -1) : name || null;
  } catch {
    return null;
  }
}


return { reverseDns };
}
