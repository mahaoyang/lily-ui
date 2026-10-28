// Only actual input entries participate; all-zero weights become an equal mix.
export function normalizeMixEntries(entries) {
  if (!entries.length) return []
  const values = entries.map(entry => Number.isFinite(Number(entry.weight)) ? Math.max(0, Number(entry.weight)) : 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  return entries.map((entry, index) => ({ ...entry, weight: total > 0 ? values[index] / total : 1 / entries.length }))
}
