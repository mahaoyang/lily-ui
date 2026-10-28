// Invalidate the selected result's dependency chain, retaining imported inputs
// and unrelated outputs. Loop callers pass only the selected iteration snapshot.
export function clearRetryChain(target, nodes, edges, port, seen = new Set()) {
  const map = nodes instanceof Map ? nodes : new Map(nodes.map(node => [node.id, node]))
  if (!target || seen.has(target.id)) return
  seen.add(target.id)
  for (const edge of edges.filter(edge => edge.to === target.id)) {
    clearRetryChain(map.get(edge.from), map, edges, edge.fromPort, seen)
  }
  if (['audio-input', 'text-input'].includes(target.type) && !edges.some(edge => edge.to === target.id)) return
  if (target.graph) {
    const bindings = port ? target.outputs?.filter(output => output.id === port) : target.outputs
    if (bindings?.length) {
      const children = new Map(target.graph.nodes.map(node => [node.id, node])), visited = new Set()
      for (const binding of bindings) clearRetryChain(children.get(binding.node), children, target.graph.edges, binding.port, visited)
    } else {
      const visited = new Set()
      for (const child of target.graph.nodes) clearRetryChain(child, target.graph.nodes, target.graph.edges, undefined, visited)
    }
    if (port && target.results) delete target.results[port]
    else delete target.results
  }
  for (const key of ['output', 'error', 'progress', 'progressMessage', 'running']) delete target[key]
}
