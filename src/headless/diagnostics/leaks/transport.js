function isV6(ip) {
  return String(ip ?? '').includes(':');
}

function pickIpByFamily(ips, family) {
  const list = Array.isArray(ips) ? ips : [];
  return list.find((ip) => (family === 6 ? isV6(ip) : !isV6(ip))) ?? null;
}

export function deriveTransportForIp({ ip, signals } = {}) {
  const address = String(ip ?? '').trim();
  if (!address) return null;
  const family = isV6(address) ? 6 : 4;

  const webrtc = signals?.webrtc || null;
  const http3 = signals?.http3 || null;

  const udpIp = pickIpByFamily(webrtc?.candidates?.srflxUdp, family);
  const tcpIp = pickIpByFamily(webrtc?.candidates?.srflxTcp, family);
  const egressIp = udpIp ?? tcpIp ?? null;
  const egressTransport = udpIp ? 'udp' : tcpIp ? 'tcp' : null;
  const mismatch = egressIp ? egressIp !== address : null;
  const udpAvailable = udpIp ? true : egressIp ? false : null;

  const udpStatus = (() => {
    if (!webrtc) return 'unknown';
    if (webrtc.supported === false) return 'unsupported';
    if (mismatch === true) return 'mismatch';
    if (udpAvailable === false) return 'blocked';
    if (udpAvailable === true) return 'ok';
    return 'unknown';
  })();

  const quicStatus = (() => {
    if (!http3) return 'unknown';
    if (http3.supported === false) return 'unsupported';
    if (http3.originSupportsH3 === false) return 'na';
    if (http3.usedH3 === true) return 'ok';
    if (http3.usedH3 === false) return 'disabled';
    return 'unknown';
  })();

  return {
    udp: {
      supported: webrtc?.supported ?? null,
      status: udpStatus,
      udpAvailable,
      egressIp,
      egressTransport,
      mismatch,
      ms: typeof webrtc?.ms === 'number' ? webrtc.ms : null,
      error: webrtc?.error ?? null,
    },
    quic: {
      supported: http3?.supported ?? null,
      status: quicStatus,
      originSupportsH3: http3?.originSupportsH3 ?? null,
      nextHopProtocol: http3?.nextHopProtocol ?? null,
      usedH3: http3?.usedH3 ?? null,
      ms: typeof http3?.ms === 'number' ? http3.ms : null,
      error: http3?.error ?? null,
    },
  };
}

