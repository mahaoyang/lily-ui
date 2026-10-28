export function uniqueProfileName(value, profiles, excludeId) {
  const base = String(value || '').trim().slice(0, 48) || 'Kiro 配置';
  const names = new Set(Array.from(profiles).filter(item => !item.archived && item.id !== excludeId).map(item => item.name));
  let name = base;
  for (let index = 2; names.has(name); index++) {
    const suffix = ` (${index})`;
    name = base.slice(0, 48 - suffix.length) + suffix;
  }
  return name;
}
