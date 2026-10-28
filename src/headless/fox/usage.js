// Choose the unit from exact remaining time; truncate only the displayed value.
export function billingResetCountdown(value, now = Date.now()) {
  if (value == null || value === '') return '';
  const numeric = typeof value === 'number' || /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
  const seconds = Number.isFinite(numeric) ? (numeric >= 1e12 ? numeric / 1000 : numeric) : Date.parse(value) / 1000;
  return resetCountdown(seconds, now);
}

export function resetCountdown(resetsAt, now = Date.now()) {
  if (!Number.isFinite(resetsAt) || resetsAt <= 0) return '';
  const minutes = Math.max(0, (resetsAt * 1000 - now) / 60000);
  if (minutes >= 1.5 * 1440) return `${Math.floor(minutes / 1440)}天`;
  if (minutes >= 1.5 * 60) return `${Math.floor(minutes / 60)}小时`;
  return `${Math.floor(minutes)}分钟`;
}
