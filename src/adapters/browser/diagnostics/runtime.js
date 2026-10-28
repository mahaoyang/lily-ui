import { createClientCheck } from '../../../headless/diagnostics/ip/clientCheck.js';
import { deriveTransportForIp } from '../../../headless/diagnostics/leaks/transport.js';
import { probeTransportSignals } from './ipq-transport.js';
import { checkMedia } from './ipq-media.js';
import { getClientFingerprint } from './ipq-fingerprint.js';
import { createIpinfoSource } from '../../../headless/diagnostics/ip/ipinfo.js';
import { createRipeWhoisSource } from '../../../headless/diagnostics/ip/ripeWhois.js';
import { createAsnHistorySource } from '../../../headless/diagnostics/ip/asnHistory.js';
import { createRdnsSource } from '../../../headless/diagnostics/ip/rdns.js';
import { createShareSource } from '../../../headless/diagnostics/ip/share.js';
const storage = { getItem: key => { try { return globalThis.localStorage.getItem(key); } catch { return null; } }, setItem: (key, value) => { try { globalThis.localStorage.setItem(key, value); } catch {} } };
export async function runClientCheck({ signal, ...options } = {}) {
  const fetch = (url, init = {}) => globalThis.fetch(url, { ...init, signal: signal ? (init.signal ? AbortSignal.any([signal, init.signal]) : signal) : init.signal });
  const { fetchIpinfoLite } = createIpinfoSource({ fetch, storage });
  const { fetchRipeWhoisLite } = createRipeWhoisSource({ fetch, storage });
  const { fetchAsnHistory } = createAsnHistorySource({ fetch, storage });
  const { reverseDns } = createRdnsSource({ fetch, storage });
  const { observeShareEstimate } = createShareSource({ fetch, storage });
  const client = createClientCheck({ fetch, storage, reverseDns, checkMedia, fetchAsnHistory, getClientFingerprint, observeShareEstimate, fetchIpinfoLite, fetchRipeWhoisLite, deriveTransportForIp, probeTransportSignals });
  return client.runClientCheck(options);
}
