import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAccessType, computeNativeKind, computePlatformRisks, estimateSharedUsers } from '../src/headless/diagnostics/scoring/risk.js';

test('computeNativeKind does not treat datacenter as broadcast by default', () => {
  assert.equal(
    computeNativeKind({
      type: { isDatacenter: true, isMobile: false },
      factors: { is_proxy: false, is_vpn: false, is_tor: false, is_anonymous: false },
    }),
    'unknown',
  );
});

test('computeAccessType uses ASN usage type as the source of truth', () => {
  assert.deepEqual(
    computeAccessType({
      type: { asnType: 'business', isDatacenter: true },
      factors: {},
      ipapi: { is_datacenter: true, datacenter: { datacenter: 'zenlayer.net' } },
    }),
    { kind: 'isp', usageType: 'business', ispMode: 'single' },
  );

  assert.deepEqual(
    computeAccessType({
      type: { asnType: 'hosting', isDatacenter: false },
      factors: {},
      ipapi: { is_datacenter: false },
    }),
    { kind: 'idc', usageType: 'hosting', ispMode: null },
  );

  assert.deepEqual(
    computeAccessType({
      type: { asnType: 'isp', isDatacenter: false },
      factors: {},
      ipapi: { is_datacenter: false },
    }),
    { kind: 'isp', usageType: 'isp', ispMode: 'dual' },
  );
});

test('computeAccessType treats proxy-pool providers as IDC', () => {
  assert.deepEqual(
    computeAccessType({
      type: { asnType: 'business', isDatacenter: true },
      factors: {},
      ipapi: { is_datacenter: true, datacenter: { datacenter: 'ipxo.com' } },
    }),
    { kind: 'idc', usageType: 'business', ispMode: null },
  );
});

test('computeNativeKind marks privacy/mobile as broadcast', () => {
  assert.equal(
    computeNativeKind({
      type: { isMobile: true },
      factors: {},
    }),
    'broadcast',
  );
  assert.equal(
    computeNativeKind({
      type: { isMobile: false },
      factors: { is_vpn: true },
    }),
    'broadcast',
  );
});

test('computeNativeKind uses registration vs physical country mismatch', () => {
  assert.equal(
    computeNativeKind({
      type: { isMobile: false },
      factors: {},
      registrationCountryCode: 'US',
      physicalCountryCode: 'SG',
    }),
    'broadcast',
  );
  assert.equal(
    computeNativeKind({
      type: { isMobile: false },
      factors: {},
      registrationCountryCode: 'JP',
      physicalCountryCode: 'JP',
    }),
    'native',
  );
});

test('computeNativeKind falls back to RIR vs continent when country is unavailable/ambiguous', () => {
  assert.equal(
    computeNativeKind({
      type: { isMobile: false },
      factors: {},
      registrationCountryCode: 'EU',
      physicalContinentCode: 'AS',
    }),
    'broadcast',
  );
  assert.equal(
    computeNativeKind({
      type: { isMobile: false },
      factors: {},
      registrationRir: 'RIPE',
      physicalContinentCode: 'EU',
    }),
    'native',
  );
});

test('estimateSharedUsers respects ping0 seed overrides', () => {
  const out = estimateSharedUsers({
    ip: '103.179.160.171',
    ipapi: {},
    ipinfo: null,
    basic: { org: 'Example Org' },
    factors: {},
    type: {},
    rdns: null,
  });
  assert.equal(out, '1-10');
});

test('computePlatformRisks includes UDP/QUIC transport signals', () => {
  const base = computePlatformRisks({
    score: {},
    factors: {},
    type: {},
    media: {},
    sharedUsersEstimate: '1-10',
    nativeKind: 'native',
  });
  assert.equal(base.tiktok, 0);

  const quicOff = computePlatformRisks({
    score: {},
    factors: {},
    type: {},
    media: {},
    sharedUsersEstimate: '1-10',
    nativeKind: 'native',
    transport: { udp: { status: 'ok', mismatch: false }, quic: { originSupportsH3: true, usedH3: false } },
  });
  assert.ok(quicOff.tiktok > base.tiktok);

  const udpLeak = computePlatformRisks({
    score: {},
    factors: {},
    type: {},
    media: {},
    sharedUsersEstimate: '1-10',
    nativeKind: 'native',
    transport: { udp: { status: 'mismatch', mismatch: true }, quic: { originSupportsH3: true, usedH3: false } },
  });
  assert.ok(udpLeak.tiktok > quicOff.tiktok);
  assert.ok(udpLeak.youtube > quicOff.youtube);
});
