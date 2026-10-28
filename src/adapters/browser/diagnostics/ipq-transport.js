function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function uniqueStrings(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const s = String(item ?? '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function isV6(ip) {
  return String(ip ?? '').includes(':');
}

function pickIpByFamily(ips, family) {
  const list = Array.isArray(ips) ? ips : [];
  return list.find((ip) => (family === 6 ? isV6(ip) : !isV6(ip))) ?? null;
}

function parseCandidate(candidateLine) {
  const raw = String(candidateLine ?? '').trim();
  if (!raw) return null;
  const parts = raw.split(/\s+/g);
  if (parts.length < 8) return null;
  const protocol = String(parts[2] ?? '').trim().toLowerCase();
  const ip = String(parts[4] ?? '').trim();
  if (!ip) return null;
  const typIndex = parts.indexOf('typ');
  const typ = typIndex >= 0 ? parts[typIndex + 1] : parts[7];
  const type = String(typ ?? '').trim().toLowerCase();
  return { protocol, ip, type };
}

async function fetchWithTimeout(url, timeoutMs) {
  const ms = Math.max(400, Number(timeoutMs) || 2200);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(url, { signal: controller?.signal, cache: 'no-store' });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function probeWebrtcEgress({ timeoutMs = 2200 } = {}) {
  const ctor = globalThis?.RTCPeerConnection;
  if (typeof ctor !== 'function') {
    return { supported: false, reason: 'RTCPeerConnection unsupported' };
  }

  const startedAt = nowMs();
  const candidates = [];
  const stunUrls = ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'];
  const pc = new ctor({
    iceServers: stunUrls.map((url) => ({ urls: url })),
  });

  try {
    try {
      pc.createDataChannel('p');
    } catch {
      // ignore
    }

    const done = new Promise((resolve) => {
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
      pc.onicecandidate = (event) => {
        if (event?.candidate?.candidate) candidates.push(event.candidate.candidate);
        if (!event?.candidate) resolve();
      };
    });

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
    } catch (error) {
      const endedAt = nowMs();
      return {
        supported: true,
        ok: false,
        ms: Math.max(0, Math.round(endedAt - startedAt)),
        error: String(error?.message ?? error),
        candidates: { total: 0, srflxUdp: [], srflxTcp: [] },
      };
    }

    const timeout = new Promise((resolve) => setTimeout(resolve, Math.max(500, Number(timeoutMs) || 2200)));
    await Promise.race([done, timeout]);

    const srflxUdp = [];
    const srflxTcp = [];
    for (const line of candidates) {
      const parsed = parseCandidate(line);
      if (!parsed || parsed.type !== 'srflx') continue;
      if (parsed.protocol === 'udp') srflxUdp.push(parsed.ip);
      else if (parsed.protocol === 'tcp') srflxTcp.push(parsed.ip);
    }

    const endedAt = nowMs();
    return {
      supported: true,
      ok: srflxUdp.length > 0 || srflxTcp.length > 0,
      ms: Math.max(0, Math.round(endedAt - startedAt)),
      error: null,
      candidates: {
        total: candidates.length,
        srflxUdp: uniqueStrings(srflxUdp),
        srflxTcp: uniqueStrings(srflxTcp),
      },
    };
  } finally {
    try {
      pc.close();
    } catch {
      // ignore
    }
  }
}

export async function probeHttp3({ timeoutMs = 2200 } = {}) {
  const hasPerf =
    typeof performance !== 'undefined' &&
    typeof performance.getEntriesByName === 'function' &&
    typeof performance.getEntriesByType === 'function';
  if (!hasPerf) return { supported: false, reason: 'Resource Timing unsupported' };
  if (typeof fetch !== 'function') return { supported: false, reason: 'fetch unsupported' };
  if (!globalThis?.location?.origin) return { supported: false, reason: 'location unavailable' };

  const startedAt = nowMs();
  const mkUrl = (tag) => {
    const url = new URL('/api/health', globalThis.location.origin);
    url.searchParams.set('h3probe', tag);
    url.searchParams.set('t', String(Date.now()));
    url.searchParams.set('r', Math.random().toString(16).slice(2));
    return url;
  };

  try {
    const preUrl = mkUrl('pre');
    const pre = await fetchWithTimeout(preUrl, timeoutMs);
    const altSvc = String(pre.headers?.get?.('alt-svc') ?? '').toLowerCase();
    const originSupportsH3 = /\bh3\b/.test(altSvc);
    if (!originSupportsH3) {
      const endedAt = nowMs();
      return {
        supported: true,
        ok: null,
        originSupportsH3: false,
        nextHopProtocol: null,
        usedH3: null,
        ms: Math.max(0, Math.round(endedAt - startedAt)),
      };
    }

    const probeUrl = mkUrl('probe');
    await fetchWithTimeout(probeUrl, timeoutMs);
    const entries = performance.getEntriesByName(probeUrl.href, 'resource');
    const entry = Array.isArray(entries) && entries.length ? entries[entries.length - 1] : null;
    const nextHopProtocol = String(entry?.nextHopProtocol ?? '').trim() || null;
    const usedH3 = nextHopProtocol ? nextHopProtocol.toLowerCase().startsWith('h3') : null;
    const endedAt = nowMs();
    return {
      supported: true,
      ok: usedH3,
      originSupportsH3: true,
      nextHopProtocol,
      usedH3,
      ms: Math.max(0, Math.round(endedAt - startedAt)),
    };
  } catch (error) {
    const endedAt = nowMs();
    return {
      supported: true,
      ok: null,
      originSupportsH3: null,
      nextHopProtocol: null,
      usedH3: null,
      ms: Math.max(0, Math.round(endedAt - startedAt)),
      error: String(error?.message ?? error),
    };
  }
}

export async function probeTransportSignals({ timeoutMs = 2200 } = {}) {
  const [webrtc, http3] = await Promise.all([
    probeWebrtcEgress({ timeoutMs: Math.min(3000, Math.max(800, Number(timeoutMs) || 2200)) }).catch((error) => ({
      supported: true,
      ok: false,
      error: String(error?.message ?? error),
    })),
    probeHttp3({ timeoutMs: Math.min(2600, Math.max(800, Number(timeoutMs) || 2200)) }).catch((error) => ({
      supported: true,
      ok: null,
      error: String(error?.message ?? error),
    })),
  ]);

  return { webrtc, http3 };
}

