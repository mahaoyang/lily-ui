import { computeLlmIpScores } from '../scoring/llm.js';
import { normalizeBasic, normalizeFactors, normalizeScore, normalizeType } from './normalize.js';
import { computeAccessType, computeNativeKind, computePlatformRisks, estimateSharedUsers, estimateSharedUsersFromObservation } from '../scoring/risk.js';
import { getPing0ShareFloorByIp } from './ping0Seed.js';
export function createClientCheck({ fetch, storage, now = Date.now, reverseDns, checkMedia, fetchAsnHistory, getClientFingerprint, observeShareEstimate, fetchIpinfoLite, fetchRipeWhoisLite, deriveTransportForIp, probeTransportSignals } = {}) {

function rangeRank(value) {
  const s = String(value ?? '').trim();
  if (!s) return 0;
  if (s === '1-10') return 1;
  if (s === '10-100') return 2;
  if (s === '100-1k') return 3;
  if (s === '1k+') return 4;
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return Number(m[1]) || 0;
  const m2 = s.match(/^>\s*(\d+)$/);
  if (m2) return Number(m2[1]) || 0;
  return 0;
}

function pickMaxRange(a, b) {
  const ra = rangeRank(a);
  const rb = rangeRank(b);
  return rb > ra ? b : a;
}

function rankToRange(rank) {
  const r = Number(rank);
  if (!Number.isFinite(r)) return null;
  if (r <= 0) return null;
  if (r === 1) return '1-10';
  if (r === 2) return '10-100';
  if (r === 3) return '100-1k';
  return '1k+';
}

function capShareUpliftByObservation({ baseRange, upliftRange, observedCount } = {}) {
  const c = Number(observedCount);
  const baseRank = rangeRank(baseRange);
  const upliftRank = rangeRank(upliftRange);
  if (!upliftRank) return null;
  if (!Number.isFinite(c) || c < 6) return null;

  // If heuristic is missing, allow at most a conservative uplift.
  if (!baseRank) {
    const capRank = c >= 30 ? 3 : 2;
    return rankToRange(Math.min(upliftRank, capRank));
  }

  if (upliftRank <= baseRank) return null;
  // Self-observation should never dominate: at most +1 bucket.
  return rankToRange(Math.min(upliftRank, baseRank + 1));
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const ms = Math.max(400, Number(timeoutMs) || 12000);
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

async function fetchJsonWithTimeoutCached(url, { timeoutMs, cacheKey, ttlMs = 10 * 60 * 1000, staleIfErrorMs = 24 * 60 * 60 * 1000, accept } = {}) {
  const hit = readLocalCache(cacheKey, ttlMs);
  if (hit) return hit;
  try {
    const data = await fetchJsonWithTimeout(url, timeoutMs);
    const ok = typeof accept === 'function' ? accept(data) : true;
    if (ok) writeLocalCache(cacheKey, data);
    return data;
  } catch (error) {
    const stale = readLocalCache(cacheKey, staleIfErrorMs);
    if (stale) return stale;
    throw error;
  }
}

function wantedStacks(stack) {
  const normalized = String(stack ?? 'auto').toLowerCase();
  const wantV4 = normalized === 'dual' || normalized === 'both' || normalized === 'auto' || normalized === '4';
  const wantV6 = normalized === 'dual' || normalized === 'both' || normalized === 'auto' || normalized === '6';
  return { ipv4: wantV4, ipv6: wantV6 };
}

async function detectClientTargetIps(requested, timeoutMs) {
  const perRequestTimeout = Math.max(1200, Math.min(3200, Math.floor((Number(timeoutMs) || 12000) / 4)));
  const out = {};
  const tasks = [];
  if (requested?.ipv4) {
    tasks.push(
      fetchJsonWithTimeout('https://api.ipify.org?format=json', perRequestTimeout)
        .then((data) => {
          if (typeof data?.ip === 'string' && data.ip.trim()) out.ipv4 = data.ip.trim();
        })
        .catch(() => null),
    );
  }
  if (requested?.ipv6) {
    tasks.push(
      fetchJsonWithTimeout('https://api6.ipify.org?format=json', perRequestTimeout)
        .then((data) => {
          if (typeof data?.ip === 'string' && data.ip.trim()) out.ipv6 = data.ip.trim();
        })
        .catch(() => null),
    );
  }
  await Promise.all(tasks);
  return out;
}

async function runIpQualityForIp(ip, timeoutMs, options, shared) {
  const includeMedia = options?.includeMedia ?? true;
  const includeMail = options?.includeMail ?? false;
  const includeDnsbl = options?.includeDnsbl ?? false;

  const ipwhoPromise = fetchJsonWithTimeoutCached(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    timeoutMs,
    cacheKey: `ipq:cache:ipwho:${ip}`,
    ttlMs: 10 * 60 * 1000,
    staleIfErrorMs: 24 * 60 * 60 * 1000,
    accept: (data) => data && typeof data === 'object' && data.success === true,
  }).catch((error) => ({ success: false, error: String(error?.message ?? error) }));

  const ipapiPromise = fetchJsonWithTimeoutCached(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`, {
    timeoutMs,
    cacheKey: `ipq:cache:ipapi:${ip}`,
    ttlMs: 10 * 60 * 1000,
    staleIfErrorMs: 24 * 60 * 60 * 1000,
    accept: (data) => {
      if (!data || typeof data !== 'object') return false;
      if (typeof data.error === 'string' && data.error.trim()) return false;
      return typeof data.is_datacenter !== 'undefined' || typeof data.asn === 'object' || typeof data.company === 'object';
    },
  }).catch((error) => ({ error: String(error?.message ?? error) }));
  const rdnsPromise = reverseDns(ip, Math.min(3500, timeoutMs));
  const ripeWhoisPromise = fetchRipeWhoisLite({ ip, timeoutMs: Math.min(4500, timeoutMs) });

  const mediaPromise = includeMedia ? checkMedia(Math.min(6500, timeoutMs)) : Promise.resolve(null);
  const asnHistoryPromise = fetchAsnHistory(ip, Math.min(6500, timeoutMs));
  const sharePromise =
    shared?.fingerprint
      ? observeShareEstimate({ ip, fingerprint: shared.fingerprint, timeoutMs: Math.min(2500, timeoutMs) })
      : Promise.resolve(null);
  const mailPromise = includeMail
    ? Promise.resolve({ supported: false, reason: 'Browser unsupported' })
    : Promise.resolve(null);
  const dnsblPromise = includeDnsbl
    ? Promise.resolve({ supported: false, reason: 'Browser unsupported' })
    : Promise.resolve(null);

  const [ipwho, ipapi, rdns, ripeWhois, media, asnHistory, shareObserved, mail, dnsbl] = await Promise.all([
    ipwhoPromise,
    ipapiPromise,
    rdnsPromise,
    ripeWhoisPromise,
    mediaPromise,
    asnHistoryPromise,
    sharePromise,
    mailPromise,
    dnsblPromise,
  ]);

  const basic = normalizeBasic({ ip, ipwho, ipapi, rdns });
  const type = normalizeType(ipapi);
  const score = normalizeScore(ipapi);
  const factors = normalizeFactors(ipapi);

  const shouldFetchIpinfo = !basic?.org;
  const ipinfo = shouldFetchIpinfo
    ? await fetchIpinfoLite({ ip, timeoutMs: Math.min(2000, timeoutMs) }).catch(() => null)
    : null;

  const physicalCountryCode = (() => {
    const fromIpapi = ipapi?.location?.country_code ?? ipapi?.datacenter?.country ?? null;
    const fromIpinfo = ipinfo?.country_code ?? null;
    const fromBasic = basic?.countryCode ?? null;
    const raw = String(fromIpapi ?? fromIpinfo ?? fromBasic ?? '').trim();
    return raw ? raw.toUpperCase() : null;
  })();

  const physicalContinentCode = (() => {
    const fromIpapi = ipapi?.location?.continent_code ?? ipapi?.location?.continent ?? null;
    const fromBasic = basic?.continentCode ?? null;
    const raw = String(fromIpapi ?? fromBasic ?? '').trim().toUpperCase();
    return raw && raw.length <= 3 ? raw : null;
  })();

  const registrationCountryCode = (() => {
    const raw = String(ripeWhois?.registrationCountryCode ?? '').trim();
    return raw ? raw.toUpperCase() : null;
  })();

  const registrationRir = (() => {
    const raw = String(ripeWhois?.rirAuthority ?? '').trim().toUpperCase();
    return raw ? raw : null;
  })();

  const sharedUsersObservedRange = typeof shareObserved?.range === 'string' ? shareObserved.range : null;
  const sharedUsersObservedCount = typeof shareObserved?.count === 'number' ? shareObserved.count : null;
  const sharedUsersSeed = getPing0ShareFloorByIp(ip);
  const sharedUsersHeuristic = estimateSharedUsers({ ip, ipapi, ipinfo, basic, factors, type, rdns });
  const sharedUsersUplift = sharedUsersSeed
    ? null
    : estimateSharedUsersFromObservation({
        observedCount: sharedUsersObservedCount,
        ipapi,
        ipinfo,
        basic,
        factors,
        type,
      });
  const sharedUsersEstimate = sharedUsersSeed
    ? sharedUsersHeuristic
    : pickMaxRange(
        sharedUsersHeuristic,
        capShareUpliftByObservation({
          baseRange: sharedUsersHeuristic,
          upliftRange: sharedUsersUplift,
          observedCount: sharedUsersObservedCount,
        }),
      );
  const sharedUsersFinal = sharedUsersEstimate;
  const accessType = computeAccessType({ type, factors, ipapi });
  const nativeKind = computeNativeKind({ factors, type, registrationCountryCode, physicalCountryCode, registrationRir, physicalContinentCode });

  const transportSignals = await shared?.transportSignalsPromise?.catch(() => null);
  const transport = transportSignals ? deriveTransportForIp({ ip, signals: transportSignals }) : null;
  const platformRisks = computePlatformRisks({ score, factors, type, media, sharedUsersEstimate: sharedUsersFinal, nativeKind, transport });

  const result = {
    ip,
    sources: { ipwho, ipapi, ipinfo, ripeWhois, rdns },
    normalized: {
      basic,
      type,
      score,
      factors,
      media,
      asnHistory,
      derived: {
        typeKind: accessType.kind,
        usageType: accessType.usageType,
        ispMode: accessType.ispMode,
        nativeKind,
        platformRisks,
        transport,
        registrationCountryCode,
        physicalCountryCode,
        registrationRir,
        physicalContinentCode,
        registrationNetwork: ripeWhois?.registrationNetwork ?? null,
        registrationSource: ripeWhois?.registrationSource ?? null,
        // UI only shows a single "shared users" value; self-observation is treated as a weak signal.
        sharedUsersEstimate: sharedUsersFinal,
        sharedUsersObservedRange,
        sharedUsersObservedCount,
      },
      mail,
      dnsbl,
    },
  };
  result.normalized.derived.llmIpScores = computeLlmIpScores(result);
  return result;
}

async function runClientCheck({ stack = 'auto', timeoutMs = 12000, options = {} } = {}) {
  const requested = wantedStacks(stack);
  const targetIps = await detectClientTargetIps(requested, timeoutMs);
  const fingerprint = await getClientFingerprint().catch(() => null);
  const transportSignalsPromise = probeTransportSignals({ timeoutMs: Math.min(3500, timeoutMs) }).catch(() => null);

  const tasks = [];
  if (requested.ipv4 && targetIps.ipv4) {
    tasks.push(
      runIpQualityForIp(targetIps.ipv4, timeoutMs, options, { fingerprint, transportSignalsPromise }).then((r) => [
        'ipv4',
        r,
      ]),
    );
  }
  if (requested.ipv6 && targetIps.ipv6) {
    tasks.push(
      runIpQualityForIp(targetIps.ipv6, timeoutMs, options, { fingerprint, transportSignalsPromise }).then((r) => [
        'ipv6',
        r,
      ]),
    );
  }

  const computed = await Promise.all(tasks);
  const results = Object.fromEntries(computed);
  if (!Object.keys(results).length) throw new Error('Failed to detect public IP (IPv4/IPv6).');

  return {
    ok: true,
    generatedAt: new Date(now()).toISOString(),
    stack,
    results,
    requested,
  };
}
return { runClientCheck };
}
