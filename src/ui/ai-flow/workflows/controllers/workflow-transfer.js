import { walkNodes } from '../../../../headless/workflow/graph/compound-node.js'
import { restoreWorkflowInputs, saveWorkflowInputs } from '../../../../adapters/browser/workflow/runtime.js'

const FORMAT = 'ai-flow-workflows'
const encodeFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve({ name: file.name || 'input', type: file.type, lastModified: file.lastModified, data: reader.result.split(',')[1] })
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})
const decodeFile = value => {
  if (value === null) return null
  if (!value || typeof value.name !== 'string' || typeof value.data !== 'string') throw new Error('输入文件格式不正确')
  const raw = atob(value.data), bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return new File([bytes], value.name, { type: value.type || '', lastModified: value.lastModified || Date.now() })
}

export async function exportWorkflows(graphs) {
  const workflows = []
  for (const graph of graphs) {
    const restored = await restoreWorkflowInputs(graph)
    const inputs = []
    const attachments = []; walkNodes(restored.nodes, (node, key) => attachments.push({ node, key }))
    for (const { node, key } of attachments) {
      const extras = {}
      for (const [port, file] of Object.entries(node.extraFiles || {})) if (file) extras[port] = await encodeFile(file)
      inputs.push({ id: key, localFirst: node.localFirst ? await encodeFile(node.localFirst) : null, localSecond: node.localSecond ? await encodeFile(node.localSecond) : null, extraFiles: extras })
    }
    workflows.push({ graph, inputs })
  }
  return new Blob([JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), workflows })], { type: 'application/json' })
}

export async function parseWorkflowArchive(file, supportedTypes) {
  let archive
  try { archive = JSON.parse(await file.text()) } catch { throw new Error('无法读取工作流包，请选择有效的 JSON 文件') }
  if (archive?.format !== FORMAT || archive.version !== 1 || !Array.isArray(archive.workflows)) throw new Error('不是受支持的 AI Flow 工作流包')
  const result = []
  // Validate and decode the entire archive before changing any stored workflow.
  for (const entry of archive.workflows) {
    const graph = entry?.graph
    if (!graph || typeof graph.name !== 'string' || !graph.name.trim() || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(entry.inputs)) throw new Error('工作流结构不完整')
    const ids = new Set()
    const attachmentIds = new Set(); walkNodes(graph.nodes, (node, key) => attachmentIds.add(key))
    for (const node of graph.nodes) {
      if (!node || typeof node.id !== 'string' || ids.has(node.id) || !supportedTypes.includes(node.type) || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error(`“${graph.name}”包含重复节点、无效位置或不支持的节点类型`)
      ids.add(node.id)
    }
    if (graph.edges.some(edge => !edge || !ids.has(edge.from) || !ids.has(edge.to) || typeof edge.toPort !== 'string')) throw new Error(`“${graph.name}”包含无效连线`)
    const inputs = new Map()
    for (const input of entry.inputs) {
      if (!attachmentIds.has(input?.id) || inputs.has(input.id)) throw new Error(`“${graph.name}”包含无效附件关联`)
      const extraFiles = Object.fromEntries(Object.entries(input.extraFiles || {}).map(([port, value]) => [port, decodeFile(value)]))
      inputs.set(input.id, { localFirst: decodeFile(input.localFirst), localSecond: decodeFile(input.localSecond), extraFiles })
    }
    const restored = structuredClone(graph.nodes)
    walkNodes(restored, (node, key) => { if (!supportedTypes.includes(node.type)) throw new Error('不支持的内部节点类型'); Object.assign(node, inputs.get(key) || {}) })
    result.push({ graph: { ...graph, name: graph.name.trim() }, nodes: restored })
  }
  return result
}

function resolveConflict(name) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog')
    dialog.className = 'workflow-name-dialog'
    dialog.innerHTML = '<h2>工作流重名</h2><p></p><label class="workflow-import-apply"><input type="checkbox"> 对后续所有重名工作流使用此选择</label><footer><button class="secondary-button" data-choice="skip">跳过</button><button class="secondary-button" data-choice="keep">保留两者</button><button class="primary-button" data-choice="overwrite">覆盖</button></footer><button class="workflow-import-cancel secondary-button" data-choice="cancel">取消剩余导入</button>'
    dialog.querySelector('p').textContent = `已存在“${name}”，请选择处理方式。`
    let result = { choice: 'cancel', applyAll: false }
    dialog.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => { result = { choice: button.dataset.choice, applyAll: dialog.querySelector('input').checked }; dialog.close() })
    dialog.addEventListener('close', () => { dialog.remove(); resolve(result) }, { once: true })
    document.body.append(dialog); dialog.showModal()
  })
}

export function mountWorkflowTransfer({ readSaved, writeSaved, supportedTypes, renderSaved }) {
  const exportButton = document.getElementById('workflow-export-all')
  const importButton = document.getElementById('workflow-import-all')
  const picker = document.getElementById('workflow-import-file')
  const feedback = document.getElementById('workflow-transfer-feedback')
  const lock = value => { exportButton.disabled = value; importButton.disabled = value }
  exportButton.onclick = async () => {
    lock(true); feedback.textContent = '正在打包全部工作流及输入文件…'
    try {
      const graphs = readSaved()
      if (!graphs.length) throw new Error('还没有可导出的工作流')
      const blob = await exportWorkflows(graphs), url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = `AI-Flow-工作流-${new Date().toISOString().slice(0, 10)}.json`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      feedback.textContent = `已导出 ${graphs.length} 个工作流，包含已保存的输入文件`
    } catch (error) { feedback.textContent = `导出失败：${error.message}` }
    finally { lock(false) }
  }
  importButton.onclick = () => { picker.value = ''; picker.click() }
  picker.onchange = async () => {
    const file = picker.files[0]; if (!file) return
    lock(true); feedback.textContent = '正在检查工作流包…'
    let imported = 0, skipped = 0, cancelled = false
    try {
      const entries = await parseWorkflowArchive(file, supportedTypes)
      let policy = null
      for (const { graph, nodes } of entries) {
        let saved = readSaved()
        let duplicate = saved.find(item => item.name.trim() === graph.name)
        let name = graph.name
        if (duplicate) {
          const decision = policy ? { choice: policy } : await resolveConflict(name)
          if (decision.choice === 'cancel') { cancelled = true; break }
          if (decision.applyAll) policy = decision.choice
          if (decision.choice === 'skip') { skipped++; continue }
          // Re-read after the dialog to include changes from other tabs.
          saved = readSaved(); duplicate = saved.find(item => item.name.trim() === name)
          if (decision.choice === 'keep') {
            let suffix = 2
            while (saved.some(item => item.name.trim() === name)) name = `${graph.name} (${suffix++})`
            duplicate = null
          }
        }
        const id = duplicate?.id || crypto.randomUUID()
        const importedGraph = { ...graph, id, name, updatedAt: Date.now() }
        const index = saved.findIndex(item => item.id === id)
        if (index < 0) saved.push(importedGraph); else saved[index] = importedGraph
        await saveWorkflowInputs(id, nodes, () => writeSaved(saved))
        imported++
      }
      feedback.textContent = `${cancelled ? '已取消剩余导入' : '导入完成'}：已导入 ${imported} 个，跳过 ${skipped} 个`
    } catch (error) { feedback.textContent = `导入失败：${error.message}${imported ? `；此前已导入 ${imported} 个` : '；原有工作流未改动'}` }
    finally { renderSaved(); lock(false); picker.value = '' }
  }
}
