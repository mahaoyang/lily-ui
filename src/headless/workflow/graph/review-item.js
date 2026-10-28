// Stable identity for one graph output under quality review.
export const reviewItemId = item => JSON.stringify([item.source.id, item.port || 'out', item.index ?? null])
