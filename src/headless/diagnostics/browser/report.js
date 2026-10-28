// Compare only within the same address family; a normal IPv4/IPv6 pair is not a mismatch.
export function browserForReport(browser, report) {
  const known = Object.values(report?.results || {}).map((s) => s?.ip || s?.normalized?.basic?.ip).filter(Boolean);
  const canonical = (ip) => { try { return new URL(`http://${ip.includes(':') ? `[${ip}]` : ip}`).hostname; } catch { return ip; } };
  const mismatch = browser?.webrtcIps?.some((ip) => {
    const peers = known.filter((value) => value.includes(':') === ip.includes(':'));
    return peers.length > 0 && !peers.some((peer) => canonical(peer) === canonical(ip));
  }) || false;
  return { ...browser, webrtcMismatch: mismatch };
}

