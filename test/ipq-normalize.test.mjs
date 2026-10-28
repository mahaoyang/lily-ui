import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFactors, normalizeType } from '../src/headless/diagnostics/ip/normalize.js';

test('normalizeType coerces ipapi boolean-ish fields', () => {
  const out1 = normalizeType({
    is_datacenter: 'false',
    is_mobile: '0',
    is_crawler: 'no',
    is_bogon: 0,
    company: { type: 'isp' },
    asn: { type: 'isp' },
  });
  assert.equal(out1.isDatacenter, false);
  assert.equal(out1.isMobile, false);
  assert.equal(out1.isCrawler, false);
  assert.equal(out1.isBogon, false);
  assert.equal(out1.category, 'ISP');

  const out2 = normalizeType({
    is_datacenter: 'true',
    is_mobile: 1,
    is_crawler: 'yes',
    is_bogon: '1',
  });
  assert.equal(out2.isDatacenter, true);
  assert.equal(out2.isMobile, true);
  assert.equal(out2.isCrawler, true);
  assert.equal(out2.isBogon, true);
  assert.equal(out2.category, 'Reserved/Bogon');
});

test('normalizeFactors coerces ipapi factor booleans', () => {
  const out = normalizeFactors({
    is_proxy: 'true',
    is_vpn: 'false',
    is_tor: 1,
    is_anonymous: 0,
    is_datacenter: '0',
    is_mobile: '1',
  });
  assert.equal(out.is_proxy, true);
  assert.equal(out.is_vpn, false);
  assert.equal(out.is_tor, true);
  assert.equal(out.is_anonymous, false);
  assert.equal(out.is_datacenter, false);
  assert.equal(out.is_mobile, true);
});

