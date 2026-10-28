// Both modes isolate editable graph state. Shallow copies share immutable attachments.
export function copyNode(node, id, position, mode = 'deep') {
  const copyFile = file => mode === 'shallow' ? file || null : file ? new File([file], file.name || 'audio.wav', {
    type: file.type, lastModified: file.lastModified ?? Date.now(),
  }) : null
  return {
    id, type: node.type, title: node.title, model: node.model,
    params: structuredClone(node.params), ...position,
    ...(node.graph ? { inputs: structuredClone(node.inputs), outputs: structuredClone(node.outputs), graph: { ...node.graph, nodes: node.graph.nodes.map(n => copyNode(n, n.id, { x: n.x, y: n.y }, mode)), edges: structuredClone(node.graph.edges) } } : {}),
    localFirst: copyFile(node.localFirst),
    localSecond: copyFile(node.localSecond),
    extraFiles: Object.fromEntries(Object.entries(node.extraFiles || {}).map(([port,file])=>[port,copyFile(file)])),
    emotionFile: copyFile(node.emotionFile),
    output: null, error: '', progress: 0, running: false,
  }
}
