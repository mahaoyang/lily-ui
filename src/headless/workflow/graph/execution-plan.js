// Stable topological scheduling with model affinity. No dependency is reordered.
export function modelKey(node) {
  const ui = node.params?.ui || {}
  if (node.type.startsWith('chatterbox')) return `chatterbox:${ui[node.type === 'chatterbox-read' ? 'chatterbox-model' : 'chatterbox-mix-model'] || node.model || 'english'}`
  if (node.type === 'uvr') return `uvr:${ui['denoise-model-select'] || node.model || 'kim-vocal-2'}`
  if (node.type === 'indextts') return 'indextts2'
  if (node.type === 'sensevoice') return 'sensevoice'
  return null
}
export function compileGraph(nodes, edges) {
  const byId = new Map()
  for (const node of nodes) {
    if (byId.has(node.id)) throw new Error(`节点 ID 重复：${node.id}`)
    byId.set(node.id, node)
  }
  const incoming = new Map(nodes.map(n => [n.id, []]))
  const outgoing = new Map(nodes.map(n => [n.id, []]))
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) throw new Error('连线引用了不存在的节点')
    incoming.get(edge.to).push(edge)
    outgoing.get(edge.from).push(edge)
  }
  // Resolve aliases without mutating the saved graph. Memoization also catches
  // alias-only cycles before they disappear from the scheduling graph.
  const aliases = new Map(), resolving = new Set()
  function source(id) {
    if (aliases.has(id)) return aliases.get(id)
    const node = byId.get(id), inputs = incoming.get(id)
    if (!['audio-input', 'text-input'].includes(node.type) || !outgoing.get(id).length || inputs.length !== 1 || inputs[0].toPort !== 'in') return null
    if (resolving.has(id)) throw new Error('连线存在循环，无法执行')
    resolving.add(id)
    const edge = inputs[0], upstream = source(edge.from)
    const result = upstream || { from: edge.from, fromPort: edge.fromPort || 'out' }
    resolving.delete(id); aliases.set(id, result)
    return result
  }
  for (const node of nodes) source(node.id)
  const active = nodes.filter(n => !aliases.has(n.id))
  const links = edges.filter(e => !aliases.has(e.to)).map(e => aliases.has(e.from) ? { ...e, ...aliases.get(e.from) } : e)
  const inputs = new Map(active.map(n => [n.id, []])), outputs = new Map(active.map(n => [n.id, []]))
  const degree = new Map(active.map(n => [n.id, 0]))
  for (const edge of links) {
    inputs.get(edge.to).push(edge); outputs.get(edge.from).push(edge)
    degree.set(edge.to, degree.get(edge.to) + 1)
  }
  const rank = new Map(active.map((n, i) => [n.id, i]))
  const keys = new Map(active.map(n => [n.id, modelKey(n)]))
  // Three lazy heaps preserve original-order ties in O(log V), without
  // rescanning/sorting the ready set for each node in a wide graph.
  const all = [], cpu = [], models = new Map(), scheduled = new Set(), order = []
  const before = (a, b) => rank.get(a.id) < rank.get(b.id)
  function push(heap, node) {
    heap.push(node)
    let index = heap.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (!before(heap[index], heap[parent])) break
      ;[heap[index], heap[parent]] = [heap[parent], heap[index]]
      index = parent
    }
  }
  function pop(heap) {
    const result = heap[0], last = heap.pop()
    if (heap.length) {
      heap[0] = last
      let index = 0
      while (index * 2 + 1 < heap.length) {
        let child = index * 2 + 1
        if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child++
        if (!before(heap[child], heap[index])) break
        ;[heap[index], heap[child]] = [heap[child], heap[index]]
        index = child
      }
    }
    return result
  }
  function peek(heap) {
    while (heap?.length && scheduled.has(heap[0].id)) pop(heap)
    return heap?.[0]
  }
  function add(node) {
    push(all, node)
    const key = keys.get(node.id)
    if (!key) push(cpu, node)
    else { if (!models.has(key)) models.set(key, []); push(models.get(key), node) }
  }
  for (const node of active) if (degree.get(node.id) === 0) add(node)
  let resident = null
  while (peek(all)) {
    const node = peek(cpu) || peek(models.get(resident)) || peek(all), key = keys.get(node.id)
    scheduled.add(node.id)
    if (key) resident = key
    order.push(node)
    for (const edge of outputs.get(node.id)) {
      degree.set(edge.to, degree.get(edge.to) - 1)
      if (degree.get(edge.to) === 0) add(byId.get(edge.to))
    }
  }
  if (order.length !== active.length) throw new Error('连线存在循环，无法执行')
  return { nodes: active, edges: links, order, byId, incoming: inputs, aliases }
}
export function compileOrder(nodes, edges) {
  return compileGraph(nodes, edges).order
}
