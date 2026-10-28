export function createShareSource({ fetch, storage, now = Date.now } = {}) {
async function observeShareEstimate({ ip, fingerprint, timeoutMs = 2500 } = {}) {
  const targetIp = String(ip || '').trim();
  const fp = String(fingerprint || '').trim();
  if (!targetIp || !fp) return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), Math.max(400, timeoutMs)) : null;
  try {
    const r = await fetch('/api/share/observe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      signal: controller?.signal,
      body: JSON.stringify({ ip: targetIp, fp }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.ok) return null;
    return {
      range: typeof data?.range === 'string' ? data.range : null,
      count: typeof data?.count === 'number' ? data.count : null,
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}


return { observeShareEstimate };
}
