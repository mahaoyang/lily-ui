export function createAsnHistorySource({ fetch, storage, now = Date.now } = {}) {
function clamp0(n, min = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, v);
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const ms = Math.max(400, Number(timeoutMs) || 6500);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const r = await fetch(url, { signal: controller?.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function reduceTimelines(timelines) {
  const list = Array.isArray(timelines) ? timelines : [];
  let first = null;
  let last = null;
  for (const t of list) {
    const s = t?.starttime ? String(t.starttime) : null;
    const e = t?.endtime ? String(t.endtime) : null;
    if (s && (!first || s < first)) first = s;
    if (e && (!last || e > last)) last = e;
  }
  return { first, last };
}

async function fetchAsnInfo(asnNumber, timeoutMs) {
  const n = clamp0(asnNumber, 0);
  if (!n) return null;
  try {
    return await fetchJsonWithTimeout(`https://api.ipapi.is/?q=AS${encodeURIComponent(String(n))}`, timeoutMs);
  } catch {
    return null;
  }
}

async function fetchAsnHistory(ip, timeoutMs) {
  const resource = String(ip || '').trim();
  if (!resource) return null;

  let routing = null;
  try {
    routing = await fetchJsonWithTimeout(
      `https://stat.ripe.net/data/routing-history/data.json?resource=${encodeURIComponent(resource)}`,
      timeoutMs,
    );
  } catch {
    return null;
  }

  const byOrigin = Array.isArray(routing?.data?.by_origin) ? routing.data.by_origin : [];
  const rows = [];

  for (const originRow of byOrigin) {
    const origin = originRow?.origin ? String(originRow.origin) : '';
    const asn = clamp0(origin, 0);
    if (!asn) continue;
    const prefixes = Array.isArray(originRow?.prefixes) ? originRow.prefixes : [];
    for (const p of prefixes) {
      const prefix = p?.prefix ? String(p.prefix) : null;
      if (!prefix) continue;
      const { first, last } = reduceTimelines(p?.timelines);
      rows.push({ asn, prefix, firstSeen: first, lastSeen: last });
    }
  }

  // Sort: most recently active first.
  rows.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')));

  const uniqueAsns = Array.from(new Set(rows.map((r) => r.asn))).slice(0, 6);
  const asnInfoEntries = await Promise.all(uniqueAsns.map((n) => fetchAsnInfo(n, Math.min(5500, timeoutMs))));
  const asnInfo = new Map();
  for (const info of asnInfoEntries) {
    const n = clamp0(info?.asn, 0);
    if (n) asnInfo.set(n, info);
  }

  const entries = rows.slice(0, 10).map((r) => {
    const info = asnInfo.get(r.asn) || null;
    const country = info?.country ? String(info.country).toUpperCase() : null;
    const descr = info?.descr ?? info?.org ?? null;
    return { ...r, country, info: descr ? String(descr) : null };
  });

  return entries.length ? entries : null;
}


return { fetchAsnHistory };
}
