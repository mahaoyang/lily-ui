export function createIpinfoSource({ fetch, storage, now = Date.now } = {}) {
async function fetchJsonWithTimeout(url, timeoutMs) {
  const ms = Math.max(400, Number(timeoutMs) || 3500);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const r = await fetch(url, { signal: controller?.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.ok) return null;
    return data?.data ?? null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchIpinfoLite({ ip, timeoutMs = 2500 } = {}) {
  const targetIp = String(ip || '').trim();
  if (!targetIp) return null;
  const cacheKey = `ipq:ipinfo:lite:${targetIp}`;
  const ttlMs = 10 * 60 * 1000;
  try {
    const raw = storage?.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && now() - Number(parsed.t || 0) < ttlMs) return parsed.v ?? null;
    }
  } catch {
    // ignore cache errors
  }

  const data = await fetchJsonWithTimeout(`/api/ipinfo/lite?ip=${encodeURIComponent(targetIp)}`, timeoutMs);
  try {
    storage?.setItem(cacheKey, JSON.stringify({ t: now(), v: data }));
  } catch {
    // ignore
  }
  return data;
}

return { fetchIpinfoLite };
}
