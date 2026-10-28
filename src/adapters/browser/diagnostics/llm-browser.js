export function createLlmBrowserCollector() {
// One page-lifetime observation shared by all six tabs; no persistent fingerprint ID.
let observation;
function isPublicAddress(ip) {
  if (ip.includes(':')) return !/^(?:f[cd]|fe[89ab])/i.test(ip) && !['::', '::1'].includes(ip);
  const parts = ip.split('.').map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    && ![0, 10, 127].includes(parts[0]) && parts[0] < 224
    && !(parts[0] === 169 && parts[1] === 254) && !(parts[0] === 192 && parts[1] === 168)
    && !(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    && !(parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
}
async function json(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try { const response = await fetch(url, { signal: controller.signal, cache: 'no-store' }); if (!response.ok) return null; return await response.json(); }
  catch { return null; } finally { clearTimeout(timer); }
}
function collectLlmBrowser({ refresh = false } = {}) {
  if (refresh) observation = null;
  if (observation) return observation;
  observation = (async () => {
    const browser = { ready: true, webdriver: navigator.webdriver === true, userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, webrtcStatus: 'unavailable', webrtcIps: [], webrtcCountries: [] };
    const Peer = globalThis.RTCPeerConnection;
    if (!Peer) return browser;
    let pc;
    try {
      pc = new Peer({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      const ips = new Set();
      pc.addEventListener('icecandidate', ({ candidate }) => {
        // Only server-reflexive public addresses: private/mDNS host candidates are not a location leak.
        const match = candidate?.candidate?.match(/(?:^|\s)([\da-f:.]+)\s+\d+\s+typ\s+srflx(?:\s|$)/i);
        if (match && isPublicAddress(match[1])) ips.add(match[1]);
      });
      pc.createDataChannel('ping100');
      await pc.setLocalDescription(await pc.createOffer());
      const complete = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 3800);
        const done = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve(true); } };
        pc.addEventListener('icegatheringstatechange', done); done();
      });
      browser.webrtcIps = [...ips];
      browser.webrtcStatus = complete ? 'complete' : 'timeout';
      const locations = await Promise.all(browser.webrtcIps.slice(0, 4).map((ip) => json(`https://ipwho.is/${encodeURIComponent(ip)}`)));
      browser.webrtcCountries = locations.filter((x) => x?.success !== false).map((x) => x?.country_code).filter(Boolean);
      return browser;
    } catch { browser.webrtcStatus = 'failed'; return browser; }
    finally { pc?.close(); }
  })();
  return observation;
}

return { collectLlmBrowser };
}
