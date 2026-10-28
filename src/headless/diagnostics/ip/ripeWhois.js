export function createRipeWhoisSource({ fetch, storage, now = Date.now } = {}) {
function pickFirstString(values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function parseRipeWhoisLite(data) {
  const records = Array.isArray(data?.data?.records) ? data.data.records : [];
  const firstRecord = Array.isArray(records[0]) ? records[0] : [];
  const pairs = firstRecord.filter((x) => x && typeof x === 'object');
  const authorities = Array.isArray(data?.data?.authorities) ? data.data.authorities : [];

  const getAll = (key) =>
    pairs
      .filter((p) => String(p.key || '').toLowerCase() === String(key).toLowerCase())
      .map((p) => (typeof p.value === 'string' ? p.value.trim() : null))
      .filter(Boolean);

  const registrationCountryCode = pickFirstString(getAll('country'));
  const registrationNetwork = pickFirstString(getAll('inetnum')) ?? pickFirstString(getAll('netrange')) ?? null;
  const registrationSource = pickFirstString(getAll('source')) ?? null;
  const rirAuthority = pickFirstString(authorities.map((x) => String(x ?? '').trim().toLowerCase()));

  return { registrationCountryCode, registrationNetwork, registrationSource, rirAuthority };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const ms = Math.max(400, Number(timeoutMs) || 3500);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const r = await fetch(url, { signal: controller?.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const data = await r.json();
    return data;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readLocalCache(key, maxAgeMs) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const ageMs = now() - Number(parsed.t || 0);
    if (!Number.isFinite(ageMs) || ageMs < 0) return null;
    if (ageMs > maxAgeMs) return null;
    return parsed.v ?? null;
  } catch {
    return null;
  }
}

function writeLocalCache(key, value) {
  try {
    storage?.setItem(key, JSON.stringify({ t: now(), v: value }));
  } catch {
    // ignore
  }
}

async function fetchRipeWhoisLite({ ip, timeoutMs = 3500 } = {}) {
  const targetIp = String(ip || '').trim();
  if (!targetIp) return null;

  const cacheKey = `ipq:cache:ripewhois:${targetIp}`;
  const ttlMs = 24 * 60 * 60 * 1000;
  const hit = readLocalCache(cacheKey, ttlMs);
  if (hit) return hit;

  const direct = await fetchJsonWithTimeout(
    `https://stat.ripe.net/data/whois/data.json?resource=${encodeURIComponent(targetIp)}`,
    timeoutMs,
  );
  const parsed = direct ? parseRipeWhoisLite(direct) : null;
  if (parsed) {
    writeLocalCache(cacheKey, parsed);
    return parsed;
  }

  // Fallback to our server proxy (may help in networks where RIPEstat is blocked).
  const viaServer = await fetchJsonWithTimeout(
    `/api/ripe/whois-lite?ip=${encodeURIComponent(targetIp)}&timeoutMs=${encodeURIComponent(String(timeoutMs))}`,
    timeoutMs,
  );
  const parsed2 = viaServer && viaServer.ok ? (viaServer.data ?? null) : null;
  if (parsed2) writeLocalCache(cacheKey, parsed2);
  return parsed2;
}

return { fetchRipeWhoisLite };
}
