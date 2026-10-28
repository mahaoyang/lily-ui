import { getPing0ShareFloorByIp } from '../ip/ping0Seed.js';

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clamp0to100(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function bool(v) {
  return v === true;
}

function baseFromIpapiScore(score) {
  const r = score?.riskScore;
  const t = score?.threatScore;
  const parts = [r, t].filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!parts.length) return 0;
  return clamp0to100(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function shareRank(value) {
  const s = String(value ?? '').trim();
  if (!s) return 0;
  if (s === '1-10') return 1;
  if (s === '10-100') return 2;
  if (s === '100-1k') return 3;
  if (s === '1k+') return 4;
  return 0;
}

function vetoRiskFromFactors(factors) {
  if (bool(factors?.is_bogon)) return 100;
  if (bool(factors?.is_tor)) return 100;
  if (bool(factors?.is_malicious)) return 100;
  // “Abuser” is often a strong indicator; treat as near-veto.
  if (bool(factors?.is_abuser)) return 95;
  return 0;
}

function weightsForPlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'tiktok') {
    return {
      is_bogon: 100,
      is_tor: 65,
      is_vpn: 55,
      is_proxy: 55,
      is_anonymous: 35,
      is_malicious: 45,
      is_abuser: 28,
      is_crawler: 18,
      is_satellite: 18,
    };
  }
  if (p === 'instagram') {
    return {
      is_bogon: 100,
      is_tor: 65,
      is_vpn: 42,
      is_proxy: 42,
      is_anonymous: 28,
      is_malicious: 45,
      is_abuser: 28,
      is_crawler: 12,
      is_satellite: 14,
    };
  }
  // YouTube / Twitter: relatively lenient.
  return {
    is_bogon: 100,
    is_tor: 65,
    is_vpn: 28,
    is_proxy: 28,
    is_anonymous: 18,
    is_malicious: 45,
    is_abuser: 28,
    is_crawler: 10,
    is_satellite: 12,
  };
}

function computePenalty(factors, type, platform) {
  const isDatacenter = bool(type?.isDatacenter) || bool(factors?.is_datacenter);
  const isMobile = bool(type?.isMobile) || bool(factors?.is_mobile);

  const weights = weightsForPlatform(platform);

  let penalty = 0;
  for (const [k, w] of Object.entries(weights)) {
    if (bool(factors?.[k])) penalty += w;
  }

  const dcRisk = isDatacenter
    ? platform === 'tiktok'
      ? 65
      : platform === 'instagram'
        ? 35
        : platform === 'youtube' || platform === 'twitter'
          ? 20
          : 28
    : 0;

  const mobileRisk = isMobile
    ? platform === 'tiktok'
      ? 18
      : platform === 'instagram'
        ? 14
        : platform === 'youtube' || platform === 'twitter'
          ? 10
          : 10
    : 0;

  return { otherRisk: penalty, dcRisk, mobileRisk };
}

function probePenalty(mediaProbe) {
  const status = String(mediaProbe?.status ?? '').toLowerCase();
  if (status === 'failed') return 32;
  return 0;
}

function continentForRir(rir) {
  const s = String(rir ?? '').trim().toUpperCase();
  if (s === 'ARIN') return 'NA';
  if (s === 'RIPE') return 'EU';
  if (s === 'APNIC') return 'AS';
  if (s === 'LACNIC') return 'SA';
  if (s === 'AFRINIC') return 'AF';
  return null;
}

function normalizeCountryCode(code) {
  const s = String(code ?? '').trim().toUpperCase();
  if (!s) return null;
  if (s === 'UK') return 'GB';
  // Some WHOIS datasets use non-country placeholders.
  if (s === 'EU' || s === 'AP' || s === 'XX' || s === 'ZZ') return null;
  return s;
}

function normalizeUsageType(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'isp') return 'isp';
  if (s === 'hosting' || s === 'datacenter' || s === 'data-center') return 'hosting';
  if (s === 'business' || s === 'enterprise') return 'business';
  return null;
}

export function computeAccessType({ type, factors, ipapi } = {}) {
  const isBogon = bool(type?.isBogon) || bool(factors?.is_bogon);
  const isCrawler = bool(type?.isCrawler) || bool(factors?.is_crawler);
  const isMobile = bool(type?.isMobile) || bool(factors?.is_mobile) || bool(factors?.is_satellite);

  if (isBogon) return { kind: 'bogon', usageType: null, ispMode: null };
  if (isCrawler) return { kind: 'crawler', usageType: null, ispMode: null };
  if (isMobile) return { kind: 'mobile', usageType: null, ispMode: null };

  const asnUsage = normalizeUsageType(type?.asnType ?? ipapi?.asn?.type);
  const companyUsage = normalizeUsageType(type?.companyType ?? ipapi?.company?.type);
  const usageType = asnUsage ?? companyUsage ?? null;

  const hasDatacenterSignal =
    bool(type?.isDatacenter) ||
    bool(factors?.is_datacenter) ||
    (typeof ipapi?.is_datacenter === 'boolean' ? ipapi.is_datacenter : false) ||
    (typeof ipapi?.datacenter?.datacenter === 'string' && ipapi.datacenter.datacenter.trim().length > 0);

  if (usageType === 'hosting') return { kind: 'idc', usageType, ispMode: null };

  // Some providers are "resi-proxy / proxy-pool" style: treat as IDC even if ASN tags look ISP/business.
  const org = String(ipapi?.asn?.org ?? ipapi?.company?.name ?? '').toLowerCase();
  if (looksProxyPoolProvider({ ipapi, org })) return { kind: 'idc', usageType, ispMode: null };

  if (usageType === 'isp' || usageType === 'business') {
    const ispMode = hasDatacenterSignal ? 'single' : 'dual';
    return { kind: 'isp', usageType, ispMode };
  }

  // Fallback: keep prior behavior when usage type is missing.
  if (hasDatacenterSignal) return { kind: 'idc', usageType: null, ispMode: null };
  return { kind: 'isp', usageType: null, ispMode: null };
}

export function computeNativeKind({ factors, type, registrationCountryCode, physicalCountryCode, registrationRir, physicalContinentCode } = {}) {
  const isMobile = bool(type?.isMobile) || bool(factors?.is_mobile) || bool(factors?.is_satellite);
  const isPrivacy = bool(factors?.is_proxy) || bool(factors?.is_vpn) || bool(factors?.is_tor) || bool(factors?.is_anonymous);

  // "Broadcast" here means the IP is likely shared by many users (carrier/mobile, VPN/proxy, etc.).
  if (isMobile || isPrivacy) return 'broadcast';

  const regCountry = normalizeCountryCode(registrationCountryCode);
  const phyCountry = normalizeCountryCode(physicalCountryCode);
  if (regCountry && phyCountry) return regCountry === phyCountry ? 'native' : 'broadcast';

  const rawReg = String(registrationCountryCode ?? '').trim().toUpperCase();
  const regContinent = continentForRir(registrationRir) ?? (rawReg === 'EU' ? 'EU' : null);
  const phyContinent = String(physicalContinentCode ?? '').trim().toUpperCase() || null;
  if (regContinent && phyContinent) return regContinent === phyContinent ? 'native' : 'broadcast';

  return 'unknown';
}

function sharedUsersPenalty(sharedUsersEstimate, platform, { nativeKind } = {}) {
  const s = String(sharedUsersEstimate ?? '').trim();
  if (!s) return 0;

  // Highest weight: many shared users => low score, even if not “blacklisted”.
  const base =
    s === '1-10' ? 0
      : s === '10-100' ? 12
        : s === '100-1k' ? 38
          : s === '1k+' ? 55
            : 0;

  const platformFactor =
    platform === 'tiktok' ? 1.25
      : platform === 'instagram' ? 1.12
        : platform === 'youtube' || platform === 'twitter' ? 1.03
          : 1.0;

  // Secondary weight: broadcast vs native. Only add when shared-users isn't already “obviously high”.
  const r = shareRank(s);
  const broadcastExtra = nativeKind === 'broadcast' && r > 0 && r < 3 ? (platform === 'tiktok' ? 18 : 12) : 0;
  return Math.round(base * platformFactor + broadcastExtra);
}

export function computePlatformRisks({ score, factors, type, media, sharedUsersEstimate, nativeKind, transport } = {}) {
  // Keep ipapi “risk_score/threat_score” as a soft signal; our own factors/shared-users should dominate.
  const isDatacenter = bool(type?.isDatacenter) || bool(factors?.is_datacenter);
  const base = clamp0to100(baseFromIpapiScore(score) * (isDatacenter ? 0.18 : 0.25));
  const vetoRisk = vetoRiskFromFactors(factors);

  const tiktokProbe = media?.TikTok;
  const youtubeProbe = media?.YouTubePremium;
  const instagramProbe = media?.Instagram;
  const twitterProbe = media?.X ?? media?.Twitter;

  const platformScore = (platform, probe) => {
    const share = sharedUsersPenalty(sharedUsersEstimate, platform, { nativeKind });
    const { otherRisk, dcRisk, mobileRisk } = computePenalty(factors, type, platform);
    const probeRisk = probePenalty(probe) * (platform === 'tiktok' ? 1.25 : platform === 'instagram' ? 1.1 : 0.9);
    const transportRisk = transportPenalty(transport, platform);

    // TikTok: strict “bucket theory”: worst factor defines outcome.
    if (platform === 'tiktok') {
      const worst = Math.max(share, dcRisk, otherRisk, base, probeRisk, mobileRisk, transportRisk);
      const clamped = clamp0to100(worst);
      return vetoRisk ? Math.max(clamped, vetoRisk) : clamped;
    }

    // Instagram: still strict, but allows some compensation.
    if (platform === 'instagram') {
      const dom = Math.max(share, dcRisk, otherRisk);
      const tail = Math.round((base + probeRisk + mobileRisk + transportRisk) * 0.6);
      const clamped = clamp0to100(dom + tail);
      return vetoRisk ? Math.max(clamped, vetoRisk) : clamped;
    }

    // YouTube/Twitter: relatively lenient (additive, smaller dc/probe impact).
    const sum =
      share * 0.9 +
      dcRisk * 0.6 +
      otherRisk * 0.85 +
      base +
      probeRisk * 0.55 +
      mobileRisk * 0.5 +
      transportRisk * 0.75;
    const clamped = clamp0to100(sum);
    return vetoRisk ? Math.max(clamped, vetoRisk) : clamped;
  };

  const tiktok = platformScore('tiktok', tiktokProbe);
  const youtube = platformScore('youtube', youtubeProbe);
  const instagram = platformScore('instagram', instagramProbe);
  const twitter = platformScore('twitter', twitterProbe);

  const overall = clamp0to100(
    0.45 * clamp01(youtube / 100) * 100 +
      0.35 * clamp01(tiktok / 100) * 100 +
      0.1 * clamp01(instagram / 100) * 100 +
      0.1 * clamp01(twitter / 100) * 100,
  );

  return { overall, youtube, tiktok, instagram, twitter };
}

function transportPenalty(transport, platform) {
  const udp = transport?.udp || null;
  const quic = transport?.quic || null;

  const mismatch = udp?.mismatch === true || udp?.status === 'mismatch';
  if (mismatch) return platform === 'tiktok' ? 70 : platform === 'instagram' ? 62 : 55;

  const originSupportsH3 = quic?.originSupportsH3 === true;
  const quicOff = originSupportsH3 && (quic?.usedH3 === false || quic?.status === 'disabled');
  const udpBlocked = udp?.status === 'blocked' || (udp?.udpAvailable === false && udp?.egressIp);
  const issue = quicOff || udpBlocked;
  if (!issue) return 0;

  if (platform === 'tiktok') return 26;
  if (platform === 'instagram') return 20;
  if (platform === 'youtube' || platform === 'twitter') return 16;
  return 18;
}


function parseCidrPrefixLen(cidr) {
  const raw = String(cidr || '').trim();
  const m = raw.match(/\/(\d{1,3})$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 128) return null;
  return n;
}

function isV6(ip) {
  const s = String(ip || '').trim();
  return s.includes(':');
}

function rdnsLooksShared(rdns) {
  const s = String(rdns || '').toLowerCase();
  if (!s) return false;
  return /(cgnat|cg-nat|cgnt|carrier|nat|pppoe|broadband|mobile|lte|5g)/i.test(s);
}

function toShareRangeByUsersCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v <= 10) return '1-10';
  if (v <= 100) return '10-100';
  if (v <= 1000) return '100-1k';
  return '1k+';
}

function rangeRank(value) {
  const s = String(value ?? '').trim();
  if (!s) return 0;
  if (s === '1-10') return 1;
  if (s === '10-100') return 2;
  if (s === '100-1k') return 3;
  if (s === '1k+') return 4;
  return 0;
}

function pickMaxRange(a, b) {
  return rangeRank(b) > rangeRank(a) ? b : a;
}

function looksProxyPoolProvider({ ipapi, org } = {}) {
  const dc = String(ipapi?.datacenter?.datacenter ?? '').toLowerCase();
  const asnOrg = String(ipapi?.asn?.org ?? '').toLowerCase();
  const s = `${dc} ${asnOrg} ${String(org ?? '').toLowerCase()}`;
  // Proxy / scraping / resi-proxy pool style providers often imply very high sharing.
  return /(ipxo|bright\s*data|luminati|oxylabs|smartproxy|soax|packetstream|geonode|netnut|iproyal|proxyrack|storm|911|rapidseedbox|webshare|rayobyte|blazing|multilogin)/i.test(
    s,
  );
}

function looksDedicatedLowShareHosting({ ipapi, org } = {}) {
  const dc = String(ipapi?.datacenter?.datacenter ?? '').toLowerCase();
  const asnOrg = String(ipapi?.asn?.org ?? '').toLowerCase();
  const s = `${dc} ${asnOrg} ${String(org ?? '').toLowerCase()}`;
  // Known VPS/dedicated providers that are usually not "mass shared" like proxy pools.
  return /(dmit|hetzner|ovh|linode|vultr|digitalocean)/i.test(s);
}

export function estimateSharedUsersFromObservation({ observedCount, ipapi, ipinfo, basic, factors, type } = {}) {
  const c = Number(observedCount);
  if (!Number.isFinite(c) || c <= 0) return null;

  const org = String(ipinfo?.org ?? basic?.org ?? basic?.isp ?? '').toLowerCase();

  const orgLooksMobile = /(mobile|wireless|cellular|lte|5g|cmcc|china\s*mobile)/i.test(org);
  const orgLooksCarrier =
    /(telecom|communications|chinanet|unicom|ctcc|chinatelecom|china\s*telecom|china\s*unicom)/i.test(org);

  const isMobile = bool(type?.isMobile) || bool(factors?.is_mobile) || bool(factors?.is_satellite) || orgLooksMobile || orgLooksCarrier;
  const isDatacenter = bool(type?.isDatacenter) || bool(factors?.is_datacenter) || bool(ipapi?.is_datacenter);
  const isPrivacy = bool(factors?.is_proxy) || bool(factors?.is_vpn) || bool(factors?.is_tor) || bool(factors?.is_anonymous);

  const proxyPool = looksProxyPoolProvider({ ipapi, org });

  // Exponential uplift model: for proxy pools / carriers, a is higher (faster growth).
  const a =
    proxyPool ? 2.0
      : isMobile ? 1.85
        : bool(factors?.is_tor) ? 1.8
          : isPrivacy ? 1.65
            : isDatacenter ? 1.5
              : 1.35;

  const b = Math.max(1, Math.min(14, Math.round(c)));
  const estimate = Math.round(a ** b);
  return toShareRangeByUsersCount(estimate);
}

export function estimateSharedUsers({ ip, ipapi, ipinfo, basic, factors, type, rdns } = {}) {
  const v6 = isV6(ip);
  const isBogon = bool(type?.isBogon) || bool(factors?.is_bogon);
  if (isBogon) return null;

  const org = String(ipinfo?.org ?? basic?.org ?? basic?.isp ?? '').toLowerCase();
  const orgLooksMobile = /(mobile|wireless|cellular|lte|5g|cmcc|china\s*mobile)/i.test(org);
  const orgLooksCarrier =
    /(telecom|communications|chinanet|unicom|ctcc|chinatelecom|china\s*telecom|china\s*unicom)/i.test(org);
  const orgLooksHosting = /(cloud|hosting|data\s*center|datacenter|cdn|vps|colo|colocation)/i.test(org);
  const orgLooksBigCloud =
    /(amazon|aws|google|microsoft|azure|oracle|alibaba|tencent|digitalocean|linode|ovh|hetzner)/i.test(org);

  const isMobile =
    bool(type?.isMobile) || bool(factors?.is_mobile) || bool(factors?.is_satellite) || orgLooksMobile || orgLooksCarrier;
  const isDatacenter =
    bool(type?.isDatacenter) || bool(factors?.is_datacenter) || orgLooksHosting || orgLooksBigCloud;
  const isPrivacy = bool(factors?.is_proxy) || bool(factors?.is_vpn) || bool(factors?.is_tor) || bool(factors?.is_anonymous);

  const asnType = String(ipapi?.asn?.type ?? '').toLowerCase();
  const cidr =
    ipapi?.asn?.route ??
    ipapi?.datacenter?.network ??
    ipapi?.company?.network ??
    null;
  const prefixLen = parseCidrPrefixLen(cidr);

  // Browser-only: heuristic + a small seed list for calibration (ping0-like labels).
  // If present, the seed is treated as authoritative for that exact IP (prevents flapping).
  const seed = getPing0ShareFloorByIp(ip);
  if (seed) return seed;

  if (v6 && !isMobile && !isPrivacy && !isDatacenter) return '1-10';
  if (looksProxyPoolProvider({ ipapi, org })) return '1k+';
  if (isMobile) return '1k+';
  if (bool(factors?.is_tor)) return '1k+';
  if (isPrivacy) return '100-1k';
  if (rdnsLooksShared(rdns)) return '100-1k';

  if (isDatacenter || asnType === 'hosting') {
    if (looksDedicatedLowShareHosting({ ipapi, org })) return '1-10';
    if (prefixLen != null && prefixLen >= (v6 ? 124 : 30)) return '1-10';
    return '10-100';
  }

  // ISP/residential-ish
  if (prefixLen != null) {
    const companyType = String(ipapi?.company?.type ?? '').toLowerCase();
    if (companyType === 'business' && !isPrivacy && !isMobile) return '1-10';
    if (!v6 && prefixLen <= 20) return '100-1k';
    if (!v6 && prefixLen <= 24) return '10-100';
    if (!v6 && prefixLen >= 30) return '1-10';
  }

  return '10-100';
}
