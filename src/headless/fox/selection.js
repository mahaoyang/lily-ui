export function previousAfterDeletion(items, deletedId, key = 'id') {
  const index = items.findIndex(item => item[key] === deletedId);
  if (index < 0) return null;
  return items[index - 1]?.[key] ?? items[index + 1]?.[key] ?? null;
}
