// Files are immutable and may be shared by row snapshots. Node's structuredClone
// converts File to Blob, losing its name; keep file objects intact on both runtimes.
export function cloneLoopSnapshot(value) {
  if(value instanceof Blob)return value
  if(Array.isArray(value))return value.map(cloneLoopSnapshot)
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cloneLoopSnapshot(v)]))
  return value
}
// Loop composite inputs use aligned zip lists; downstream nodes remain outside the loop.
export const columnName = index => { let name = ''; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name }
export const forColumns = node => node.params?.columns || [{ id: 'list-0', name: 'A', items: [] }]
export const columnItems = (node, column) => node.connectedLists?.[column.id] ?? (column.files ? column.files.map(key => node.extraFiles?.[key]).filter(Boolean) : column.items || [])
export async function readForConnections(node, edges, nodes) {
  node.connectedLists = {}
  for (const c of forColumns(node)) {
    if (c.enabled === false) continue
    const edge = edges.find(e => e.to === node.id && e.toPort === c.id)
    if (!edge) continue
    const source = nodes.get(edge.from)
    const file = source?.type === 'compound' ? source.results?.[edge.fromPort || 'out'] : source?.output
    if (!file) throw new Error('请先运行上游列表节点')
    let items
    try { items = JSON.parse(await file.text()) } catch { throw new Error('For 连线输入需要 JSON 列表') }
    if (!Array.isArray(items) || !items.length) throw new Error('For 连线输入需要非空列表')
    node.connectedLists[c.id] = items
  }
}
export function validateFor(node) {
  const columns = forColumns(node).filter(c => c.enabled !== false && columnItems(node, c).length)
  if (!columns.length) throw new Error('For 请先填入至少一个非空列表')
  const length = columnItems(node, columns[0]).length
  if (columns.some(c => columnItems(node, c).length !== length)) throw new Error('For 各输入列表长度必须一致')
  return { columns, length }
}
export function forValueFile(value, name = 'item') {
  return value instanceof Blob ? value : new File([typeof value === 'string' ? value : JSON.stringify(value)], `${name}.txt`, { type: 'text/plain' })
}
export function forSample(node, port) { const column = forColumns(node).find(c => c.id === port); return column && columnItems(node, column).length ? forValueFile(columnItems(node, column)[0], column.name || column.id) : null }
// Compile loop composites directly into independent row snapshots and value inputs.
export function expandForGraph(graph) {
  let nodes = graph.nodes.map(node => ({ ...node }))
  let edges = graph.edges.map(edge => ({ ...edge }))
  for (const group of nodes.filter(node => node.type === 'compound' && node.params?.forLoop)) {
    const { columns, length } = validateFor(group)
    const generated = [], links = []
    const columnIds = new Set(columns.map(column => column.id))
    for (let row = 0; row < length; row++) {
      const id = value => `${group.id}__zip__${row}__${value}`
      for (const column of columns) {
        const file = forValueFile(columnItems(group, column)[row], `${column.name || column.id}-${row + 1}`)
        generated.push({
          id: id(column.id),
          type: file.type.startsWith('text/') || /\.(txt|md|json|csv|srt|vtt)$/i.test(file.name) ? 'text-input' : 'audio-input',
          title: `${group.title} / ${column.name || column.id} · ${row + 1}`,
          params: { autoWav: false }, localFirst: file, output: null, iteration: row,
        })
        links.push({ from: id(column.id), fromPort: 'out', to: id(group.id), toPort: column.id })
      }
      generated.push({
        ...group, params: { ...structuredClone(group.params), forLoop: false },
        graph: cloneLoopSnapshot(group.graph), id: id(group.id),
        title: `${group.title} · ${row + 1}/${length}`, originId: group.id, iteration: row,
        output: null, results: null, error: '', running: false,
      })
      for (const edge of edges) {
        if (edge.from === group.id) links.push({ ...edge, from: id(group.id) })
        else if (edge.to === group.id && !columnIds.has(edge.toPort)) links.push({ ...edge, to: id(group.id) })
      }
    }
    nodes = nodes.filter(node => node.id !== group.id).concat(generated)
    edges = edges.filter(edge => edge.from !== group.id && edge.to !== group.id).concat(links)
  }
  return { ...graph, nodes, edges }
}
