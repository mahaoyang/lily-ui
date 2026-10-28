import { graphManifest, walkNodes } from './compound-node.js'

// Save checkpoints describe editable content, independent of execution and navigation.
export function graphEditKey(graph) {
  const manifest = graphManifest(graph)
  const stripViewState = value => {
    delete value.viewport
    for (const node of value.nodes) {
      delete node.reviewPassed
      if (node.graph) stripViewState(node.graph)
    }
  }
  stripViewState(manifest)
  const files = []
  const fileKey = file => file ? [file.name, file.type, file.size, file.lastModified] : null
  walkNodes(graph.nodes, (node, path) => files.push([
    path, fileKey(node.localFirst), fileKey(node.localSecond),
    Object.entries(node.extraFiles || {}).sort(([a], [b]) => a.localeCompare(b)).map(([port, file]) => [port, fileKey(file)]),
  ]))
  return JSON.stringify([manifest, files])
}
