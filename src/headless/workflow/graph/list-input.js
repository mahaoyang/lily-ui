// A gather node consumes completed loop results once, in iteration order.
export function expansionAncestors(id, nodes, edges) {
  const ancestors = new Set(), pending = [id]
  while (pending.length) {
    const current = pending.pop()
    if (ancestors.has(current)) continue
    ancestors.add(current)
    if (nodes.get(current)?.type === 'audio-merge') continue
    for (const edge of edges) if (edge.to === current) pending.push(edge.from)
  }
  return ancestors
}

export function connectedInput(id, port, nodes, edges) {
  const edge = edges.find(e => e.to === id && e.toPort === port)
  const source = edge && nodes.get(edge.from)
  if (!source) return null
  const outputPort = edge.fromPort || 'out'
  const single = source.type === 'compound' ? source.results?.[outputPort] : source.output
  if (nodes.get(id)?.type !== 'audio-merge') return single || null
  return resultList(source, outputPort, nodes, edges, new Set())
}

function resultList(source, port, nodes, edges, seen) {
  if (seen.has(source.id)) return []
  seen.add(source.id)
  if (source.type === 'quality-review') return edges.filter(e => e.to === source.id).flatMap(e => {
    const upstream = nodes.get(e.from)
    return upstream ? resultList(upstream, e.fromPort || 'out', nodes, edges, new Set(seen)) : []
  })
  if (source.iterationOutputs?.length) return source.iterationOutputs.map((file, index) =>
    source.type === 'compound' ? source.iterationResults?.[index]?.[port] || (source.outputs?.length === 1 ? file : null) : file
  ).filter(Boolean)
  return (source.type === 'compound' ? source.results?.[port] : source.output) || null
}
