// Capture boundary outputs once; internal edits do not silently change public ports.
export function snapshotOutputs(nodes, edges) {
  const selected = new Map(nodes.map(node => [node.id, node]))
  const crossing = edges.filter(edge => selected.has(edge.from) && !selected.has(edge.to))
  const candidates = crossing.length ? crossing.map(edge => ({ node: edge.from, port: edge.fromPort || 'out' })) : nodes
    .filter(node => !edges.some(edge => edge.from === node.id && selected.has(edge.to)))
    .flatMap(node => (node.type === 'compound' ? node.outputs || [] : [{ id: 'out' }]).map(port => ({ node: node.id, port: port.id })))
  const seen = new Set(), names = new Set()
  return candidates.filter(item => {
    const key = JSON.stringify([item.node, item.port])
    if (seen.has(key)) return false
    seen.add(key); return true
  }).map((item, index) => {
    const node = selected.get(item.node)
    const ports = node.type === 'compound' ? node.outputs || [] : []
    const detail = ports.find(port => port.id === item.port)?.label
    const base = `${node.title || '节点'}${detail ? ` · ${detail}` : item.port !== 'out' ? ` · ${item.port}` : ' · 输出'}`
    let label = base, suffix = 2
    while (names.has(label)) label = `${base}-${suffix++}`
    names.add(label)
    return { id: index ? `output-${index}` : 'out', ...item, label }
  })
}

// Composite boundaries are captured when grouping; unused inner inputs stay private.
export function walkNodes(nodes, visit, prefix = '') {
  for (const node of nodes) {
    const key = prefix + node.id
    visit(node, key)
    if (node.graph) walkNodes(node.graph.nodes, visit, key + '/')
  }
}
export function graphManifest(graph) {
  return { ...graph, nodes: graph.nodes.map(node => {
    const { localFirst, localSecond, extraFiles, connectedLists, output, results, iterationOutputs, iterationResults, iterationGraphs, currentIteration, reviewUnheard, reviewChecked, interrupted, error, running, progress, progressMessage, message, expanded, inputRevision, ...saved } = node
    return { ...saved, params: structuredClone(node.params || {}), ...(node.graph ? { graph: graphManifest(node.graph) } : {}) }
  }) }
}
export function expandGraph(graph) {
  let nodes = graph.nodes.map(n => ({ ...n })), edges = graph.edges.map(e => ({ ...e }))
  while (nodes.some(n => n.type === 'compound' && !n.params?.forLoop)) {
    const group = nodes.find(n => n.type === 'compound' && !n.params?.forLoop)
    if (!group.graph) throw new Error('复合节点缺少内部快照')
    const id = value => `${group.id}__${value}`
    const inner = group.graph.nodes.map(n => ({ ...n, id: id(n.id), title: `${group.title} / ${n.title}` }))
    const internal = group.graph.edges.map(e => ({ ...e, from: id(e.from), to: id(e.to) }))
    edges = edges.map(e => {
      let mapped = { ...e }
      if (e.to === group.id) {
        const port = group.inputs.find(p => p.id === e.toPort)
        if (!port) throw new Error('复合节点输入映射失效')
        mapped.to = id(port.node); mapped.toPort = port.port
      }
      if (e.from === group.id) {
        const port = group.outputs.find(p => p.id === (e.fromPort || 'out')) || group.outputs[0]
        if (!port) throw new Error('复合节点没有输出')
        mapped.from = id(port.node); mapped.fromPort = port.port || 'out'
      }
      return mapped
    }).concat(internal)
    nodes = nodes.filter(n => n !== group).concat(inner)
  }
  return { ...graph, nodes, edges }
}
