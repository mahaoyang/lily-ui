export function normalizeBasic({ ip, ipwho, ipapi, rdns }) {
  const connection = ipwho?.connection ?? {};
  const location = ipapi?.location ?? {};
  const company = ipapi?.company ?? {};
  const asn = ipapi?.asn ?? {};

  const countryCode = ipwho?.country_code ?? location?.country_code ?? null;
  const country = ipwho?.country ?? location?.country ?? null;
  const city = ipwho?.city ?? location?.city ?? null;
  const region = ipwho?.region ?? location?.state ?? null;
  const timezone = ipwho?.timezone?.id ?? location?.timezone ?? null;
  const latitude = ipwho?.latitude ?? location?.latitude ?? null;
  const longitude = ipwho?.longitude ?? location?.longitude ?? null;

  const org = connection?.org ?? company?.name ?? asn?.org ?? ipwho?.org ?? ipwho?.isp ?? null;

  const asnNumber =
    connection?.asn ?? (typeof asn?.asn === 'number' ? `AS${asn.asn}` : asn?.asn ?? null);

  const mapUrl =
    latitude != null && longitude != null
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
      : null;

  return {
    ip,
    rdns,
    asn: asnNumber,
    org,
    isp: ipwho?.isp ?? company?.name ?? null,
    domain: connection?.domain ?? null,
    continent: ipwho?.continent ?? null,
    continentCode: ipwho?.continent_code ?? null,
    country,
    countryCode,
    region,
    city,
    postal: ipwho?.postal ?? location?.zip ?? null,
    timezone,
    latitude,
    longitude,
    mapUrl,
  };
}

export function normalizeType(ipapi) {
  const company = ipapi?.company ?? {};
  const asn = ipapi?.asn ?? {};

  const toBoolOrNull = (value) => {
    if (value === true || value === false) return value;
    if (value == null) return null;
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return null;
    }
    if (typeof value === 'string') {
      const s = value.trim().toLowerCase();
      if (s === 'true' || s === 'yes') return true;
      if (s === 'false' || s === 'no') return false;
      if (s === '1') return true;
      if (s === '0') return false;
      return null;
    }
    return null;
  };

  const isDatacenter = toBoolOrNull(ipapi?.is_datacenter);
  const isMobile = toBoolOrNull(ipapi?.is_mobile);
  const isCrawler = toBoolOrNull(ipapi?.is_crawler);
  const isBogon = toBoolOrNull(ipapi?.is_bogon);

  let category = 'Unknown';
  if (isBogon) category = 'Reserved/Bogon';
  else if (isCrawler) category = 'Web Spider';
  else if (isMobile) category = 'Mobile ISP';
  else if (isDatacenter) category = 'Hosting';
  else if (company?.type) category = String(company.type).toUpperCase();
  else if (asn?.type) category = String(asn.type).toUpperCase();
  else category = 'ISP';

  return {
    category,
    isDatacenter,
    isMobile,
    isCrawler,
    isBogon,
    companyType: company?.type ?? null,
    asnType: asn?.type ?? null,
  };
}

export function normalizeScore(ipapi) {
  return {
    riskScore: ipapi?.risk_score ?? null,
    threatScore: ipapi?.threat_score ?? null,
  };
}

export function normalizeFactors(ipapi) {
  const keys = [
    'is_proxy',
    'is_vpn',
    'is_tor',
    'is_abuser',
    'is_anonymous',
    'is_malicious',
    'is_datacenter',
    'is_mobile',
    'is_satellite',
    'is_crawler',
    'is_bogon',
  ];

  const toBoolOrNull = (value) => {
    if (value === true || value === false) return value;
    if (value == null) return null;
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return null;
    }
    if (typeof value === 'string') {
      const s = value.trim().toLowerCase();
      if (s === 'true' || s === 'yes') return true;
      if (s === 'false' || s === 'no') return false;
      if (s === '1') return true;
      if (s === '0') return false;
      return null;
    }
    return null;
  };

  const out = {};
  for (const key of keys) out[key] = toBoolOrNull(ipapi?.[key]);
  return out;
}
