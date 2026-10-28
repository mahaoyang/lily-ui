/** Convert sRGB hex to perceptual OKLCH without DOM or theme dependencies. */
export function hexToOklch(hex) {
  if (typeof hex !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) throw new TypeError('Expected an sRGB hex color');
  let value = hex.slice(1);
  if (value.length <= 4) value = [...value].map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => {
    const channel = parseInt(value.slice(i, i + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const lightness = .2104542553 * l + .793617785 * m - .0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
  const bAxis = .0259040371 * l + .7827717662 * m - .808675766 * s;
  const chroma = Math.hypot(a, bAxis);
  return { l: lightness, c: chroma < 1e-7 ? 0 : chroma, h: chroma < 1e-7 ? 0 : (Math.atan2(bAxis, a) * 180 / Math.PI + 360) % 360, alpha: value.length === 8 ? parseInt(value.slice(6), 16) / 255 : 1 };
}

export function formatOklch({ l, c, h, alpha = 1 }) {
  if (![l, c, h, alpha].every(Number.isFinite) || l < 0 || l > 1 || c < 0 || alpha < 0 || alpha > 1) throw new RangeError('Invalid OKLCH channels');
  const round = n => Number(n.toFixed(6));
  return `oklch(${round(l)} ${round(c)} ${round((h % 360 + 360) % 360)}${alpha === 1 ? '' : ` / ${round(alpha)}`})`;
}
