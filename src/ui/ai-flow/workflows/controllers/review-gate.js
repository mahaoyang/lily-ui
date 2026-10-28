export function reviewGate(node, items) {
  return items.length > 0 && (node.params?.reviewSkipChecks === true || node.reviewPassed === true || items.every(item => node.reviewChecked?.[JSON.stringify([item.source.id, item.port || 'out', item.index ?? null])]))
}
