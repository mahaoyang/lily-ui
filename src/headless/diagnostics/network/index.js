export const buildProbeUrl = (host, port) => {
    const raw = String(host || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const p = Number.parseInt(String(port || '443'), 10) || 443;
    const scheme = p === 443 || p === 8443 ? 'https' : 'http';
    return `${scheme}://${raw}:${p}/`;
  };


export async function runReachability({ url, count = 4, probe }) {
      const total = Math.max(1, Math.min(20, Number.parseInt(String(count || '4'), 10) || 4));
      const samples = [];
      for (let i = 0; i < total; i++) {
        // eslint-disable-next-line no-await-in-loop
        samples.push(await probe(url, 3500));
      }
      const sent = samples.length;
      const received = samples.filter((s) => s.ok).length;
      const okMs = samples.filter((s) => s.ok).map((s) => s.ms);
      const min = okMs.length ? Math.min(...okMs) : null;
      const max = okMs.length ? Math.max(...okMs) : null;
      const avg = okMs.length ? Math.round(okMs.reduce((a, b) => a + b, 0) / okMs.length) : null;
      const data = { ok: true, resolved: null, stats: { sent, received, min, avg, max }, samples };
return data;
}
export async function resolveDns({ name, type = 'A', fetch, signal }) {
  if (!String(name || '').trim()) throw new Error('DNS name required');
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { ok: true, name, type, records: (Array.isArray(data?.Answer) ? data.Answer : []).map(answer => answer?.data).filter(Boolean) };
}
