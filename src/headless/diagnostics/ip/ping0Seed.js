const SEED = [
  // ping0 says 10k+ (we show conservative 1k+ floor)
  { ip: '163.5.148.7', label: '10k+', floor: '1k+' },
  { ip: '163.5.148.9', label: '10k+', floor: '1k+' },
  { ip: '210.79.150.13', label: '10k+', floor: '1k+' },
  { ip: '50.114.37.122', label: '10k+', floor: '1k+' },
  { ip: '194.156.154.185', label: '10k+', floor: '1k+' },
  { ip: '45.158.59.11', label: '10k+', floor: '1k+' },
  { ip: '45.67.200.234', label: '10k+', floor: '1k+' },

  // ping0 says 1-10
  { ip: '2605:52c0:1:147:be24:11ff:fe13:9ac4', label: '1-10', floor: '1-10' },
  { ip: '103.179.160.171', label: '1-10', floor: '1-10' },
  { ip: '69.63.207.178', label: '1-10', floor: '1-10' },
  { ip: '154.17.95.209', label: '1-10', floor: '1-10' },
  { ip: '103.244.209.5', label: '1-10', floor: '1-10' },
];

const byIp = new Map(SEED.map((x) => [x.ip, x]));

export function getPing0ShareFloorByIp(ip) {
  const hit = byIp.get(String(ip ?? '').trim());
  return hit?.floor ?? null;
}

export function listPing0SeedLabels() {
  return SEED.slice();
}

