// Standard speed, short-context USD / 1M tokens: [input, output, cached input].
// Source: https://developers.openai.com/api/docs/pricing and model detail pages.
// Checked 2026-10-27. Update this table when validating CLI upgrades.
export const CODEX_PRICES = Object.freeze({
  'gpt-6-astra': [10, 50, 1],
  'gpt-6.1-sol': [2, 10, .1],
  'gpt-6.1-terra': [1, 5, .05],
  'gpt-6-sol': [2, 10, .2],
  'gpt-6-luna': [.1, .5, .01],
  'gpt-5.6-sol': [4, 20, .4],
  'gpt-5.6-terra': [2, 12, .2],
  'gpt-5.6-luna': [.2, 1.2, .02],
  'gpt-5.6-cyber': [12.5, 75, 1.25],
  'gpt-rosalind-research': [5, 25, .5],
  'gpt-rosalind-discovery': [5, 25, .5],
});
export function codexModelPrice(model) {
  const key = String(model?.value || '').toLowerCase().replace(/-\d{4}-\d{2}-\d{2}$/, '');
  return CODEX_PRICES[key] || null;
}
export function formatDollarPrice(value) {
  return Number.isFinite(value) && value >= 0 ? `$${value}` : '—';
}
export function formatRelativePrice(ratio, compact = true) {
  if (!Number.isFinite(ratio) || ratio <= 0) return '价格未知';
  if (ratio < .001) return compact ? '<.001×' : '<0.001×';
  const digits = ratio >= .1 ? 1 : ratio >= .01 ? 2 : 3;
  const value = String(Number(ratio.toFixed(digits)));
  return `${compact ? value.replace(/^0\./, '.') : value}×`;
}
function price(model) {
  const row = codexModelPrice(model);
  return row ? row[0] + row[1] : null;
}
export function codexModelRate(model, choices, compact = true) {
  const cost = price(model);
  const baseline = Math.max(0, ...choices.map(price).filter(Number.isFinite));
  return cost && baseline ? formatRelativePrice(cost / baseline, compact) : '价格未知';
}
