import { writePageState,readPageState } from '../../../../adapters/browser/workflow/page-state.js'
import { graphEditKey } from '../../../../headless/workflow/graph/graph-edit-state.js'
import { clearRetryChain } from '../../../../headless/workflow/graph/retry-chain.js'
import { reviewGate } from './review-gate.js'
import { runtimeCommand } from '../../../../adapters/browser/workflow/runtime.js'
import { connectedInput, expansionAncestors } from '../../../../headless/workflow/graph/list-input.js'
import { mountCanvasViewport } from './canvas-viewport.js'
import { configureFor } from './for-config.js'
import { globalTaskPool } from '../../../../adapters/browser/workflow/runtime.js'
import { withTaskConfigLock } from './task-config-lock.js'
import { reviewItems, openQualityReview } from './quality-review.js'
import { compileOrder } from '../../../../headless/workflow/graph/execution-plan.js'
import { forSample, readForConnections, expandForGraph } from '../../../../headless/workflow/graph/for-node.js'
import { graphManifest, expandGraph, walkNodes, snapshotOutputs } from '../../../../headless/workflow/graph/compound-node.js'
import { isSourceNode, sourceOutput } from './source-node.js'
import { mountWorkflowTransfer } from './workflow-transfer.js'
import { copyNode } from './node-copy.js'
import { isTextNode, takesTextFile, validTextFile } from './text-input.js'
import { primaryPort, inputPorts, inputLabel, pruneInputEdges, inputFile, setInputFile, clearLocalInput, growVoicePorts, voicePorts } from './node-inputs.js'
import { readWorkflows, writeWorkflows, duplicateWorkflow, saveWorkflowInputs, restoreWorkflowInputs, deleteWorkflowInputs, cleanupWorkflowInputs } from '../../../../adapters/browser/workflow/runtime.js'
import { requestWorkflowName, confirmWorkflowDelete, confirmWorkflowOverwrite } from './workflow-name-dialog.js'
import { mountWorkflowTasks } from './workflow-tasks.js'
import { runModelNode } from './node-model-runner.js'
const byId = (id) => document.getElementById(id)
const DEFAULT_NODE_PARAMS = { ratio: 100, lufs: -16, points: 12, highpass: true, lowpass: true, compression: 2.2 }
const validAudio = (file) => file && (file.type.startsWith('audio/') || /\.(wav|mp3|m4a|flac|ogg|aac|opus|webm)$/i.test(file.name))

export function mountNodeWorkbench(actions) {
  let activeTask = null, taskLocked = true, restoringTask = false
  const openTask = async task => {
    if (activeTask?.id === task.id) { actions.navigate('testing'); return true }
    if (flowRunning || activeRuns.size || busy) { setHint('请先停止当前运行'); return false }
    if (hasUnsavedChanges() && !window.confirm('当前画布有未保存改动，确定切换任务吗？')) return false
    activeTask = task; taskLocked = true
    task.viewport=readPageState(`task:${task.id}`)||task.viewport
    byId('test-flow-page').dataset.taskView='true'
    restoringTask = true
    try { actions.navigate('testing'); loadSnapshot({ ...structuredClone(task), id: task.templateId, taskView: true }) } finally { restoringTask = false }
    flowStatus = task.status; pauseRequested=!!task.paused;restartFromBeginning=!!task.restartFromBeginning; render(); return true
  }
  const taskManager = mountWorkflowTasks({ ...actions,
    openTask,
    runtimeUpdate: task => {
      if(activeTask?.id!==task.id)return
      const sync=(source,target)=>source.forEach(n=>{const t=target.find(t=>t.id===n.id);if(!t)return;for(const k of ['output','results','iterationOutputs','iterationResults','iterationGraphs','running','progress','progressMessage','error','reviewUnheard','reviewChecked','reviewPassed'])t[k]=n[k];if(n.graph&&t.graph)sync(n.graph.nodes,t.graph.nodes)})
      const previous=new Map([...nodes.values()].map(n=>[n.id,n.output]))
      sync(task.nodes,rootTaskGraph().nodes)
      flowStatus=task.status;pauseRequested=!!task.paused;restartFromBeginning=!!task.restartFromBeginning
      // Runtime packets update the existing DOM so listening is not interrupted.
      for(const n of nodes.values()) {
        const card=[...cards.querySelectorAll('[data-node-card]')].find(c=>c.dataset.nodeCard===n.id)
        if(!card)continue
        card.classList.toggle('is-running',!!n.running);card.classList.toggle('has-error',!!n.error);card.classList.toggle('is-complete',!!n.output&&!n.running&&!n.error)
        card.querySelector('.node-runtime-status').textContent=n.running?`运行中 ${Math.round(n.progress||0)}%`:n.error?'失败':n.output?'完成':n.iterationOutputs?.some(Boolean)?`已完成 ${n.iterationOutputs.filter(Boolean).length} 项`:'待运行'
        card.querySelector('.node-progress-track i').style.width=`${n.output?100:n.progress||0}%`
        card.querySelector('[data-run-node]').disabled=!!(n.running||task.running||task.queued||busy)
        if(previous.get(n.id)!==n.output&&!isTextNode(n))actions.preview(`node-preview-${n.id}`,n.running?null:n.output)
      }
      updateControls()
    },
    openReview: async task => {
      if (!await openTask(task)) return
      const review = [...nodes.values()].reverse().find(node => node.type === 'quality-review' && reviewItems(node, nodes, edges).length)
      if (!review) return
      actions.navigate('running')
      cards.querySelector(`[data-node-card="${review.id}"] [data-open-node]`)?.click()
    },
    runTask: lease => runFlow(lease),
    stopTask: task => { if(activeTask?.id===task.id) byId('node-flow-stop').click() },
    deleteTask: task => { globalTaskPool.cancelOwner(task.id); if(activeTask?.id===task.id){activeTask=null;taskLocked=true} }
  })
  const canvas = byId('node-canvas')
  const cards = byId('node-cards')
  const edgesSvg = byId('node-edges')
  const world = document.createElement('div')
  world.className = 'node-world'
  canvas.append(world)
  world.append(edgesSvg, cards)
  const GRID_X = 288
  const GRID_Y = 216
  const snapX = (value) => Math.round(value)
  const snapY = (value) => Math.round(value)
  const { view, applyView, worldPoint, viewportSnapshot, restoreViewport } = mountCanvasViewport({
    canvas, world, gridX: GRID_X, gridY: GRID_Y,
    getNodes: () => nodes.values(), onChange: () => persistViewport(),
  })
  let canvasTool = 'select'
  let temporaryHand = false
  const selectedNodes = new Set()
  const selectionOutline = document.createElement('div')
  selectionOutline.className = 'node-selection-outline'; world.append(selectionOutline)
  const paintSelection = () => {
    cards.querySelectorAll('[data-node-card]').forEach(card => card.classList.toggle('is-selected', selectedNodes.has(card.dataset.nodeCard)))
    const selection = [...selectedNodes].map(id => nodes.get(id)).filter(Boolean)
    selectionOutline.hidden = selection.length < 2
    if (selection.length > 1) {
      const x = Math.min(...selection.map(n => n.x)) - 9, y = Math.min(...selection.map(n => n.y)) - 9
      Object.assign(selectionOutline.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(...selection.map(n => n.x + GRID_X)) - x + 9}px`, height: `${Math.max(...selection.map(n => n.y + GRID_Y)) - y + 9}px` })
    }
  }
  const setCanvasTool = (tool) => {
    canvasTool = tool
    canvas.classList.toggle('is-select-tool', tool === 'select')
    byId('node-tool-select').setAttribute('aria-pressed', String(tool === 'select'))
    byId('node-tool-hand').setAttribute('aria-pressed', String(tool === 'hand'))
  }
  byId('node-tool-select').addEventListener('click', () => { temporaryHand = false; setCanvasTool('select') })
  byId('node-tool-hand').addEventListener('click', () => { temporaryHand = false; setCanvasTool('hand') })
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return
    if (!canvas.getClientRects().length) return
    event.preventDefault()
    if (canvasTool === 'select') {
      temporaryHand = true
      setCanvasTool('hand')
    }
  })
  const releaseTemporaryHand = () => {
    if (!temporaryHand) return
    temporaryHand = false
    setCanvasTool('select')
  }
  window.addEventListener('keyup', event => { if (event.code === 'Space') releaseTemporaryHand() })
  window.addEventListener('blur', releaseTemporaryHand)
  setCanvasTool('select')
  const drillStack = []
  let nodes = new Map()
  let edges = []
  let nextId = 1
  let pendingOutput = 'out'
  let pending = null
  let busy = false
  let flowRunning = false
  let pauseRequested = false
  let restartFromBeginning = false
  let stopRequested = false
  let flowStatus = '就绪'
  const activeRuns = new Map()
  let workflowName = '未命名工作流'
  let editingWorkflowId = null

  const taskLockButton = document.createElement('button'), taskSaveButton = document.createElement('button')
  taskLockButton.id='node-task-lock'; taskLockButton.className='secondary-button task-lock-toggle'; taskLockButton.type='button';taskLockButton.hidden=true
  taskSaveButton.id='node-task-save';taskSaveButton.className='secondary-button';taskSaveButton.type='button';taskSaveButton.textContent='保存任务';taskSaveButton.hidden=true
  byId('node-workflow-save').before(taskSaveButton,taskLockButton)
  taskLockButton.onclick = () => {
    if(!activeTask)return
    if(flowRunning || activeRuns.size || busy || activeTask?.running)return
    if(!taskLocked && hasUnsavedChanges()){setHint('请先保存任务，再锁定',true);return}
    taskLocked=!taskLocked;pending=null;closeConnectionMenu();render()
  }
  const rootTaskGraph = () => ({ nodes: drillStack.length ? drillStack[0].nodes : [...nodes.values()], edges: drillStack.length ? drillStack[0].edges : edges })
  const syncTask = (commit=false) => {
    if(!activeTask || activeTask.deleted || restoringTask || !commit)return
    const graph=rootTaskGraph()
    activeTask.nodes=structuredClone(graph.nodes);activeTask.edges=structuredClone(graph.edges);activeTask.viewport=viewportSnapshot()
    return runtimeCommand('save',activeTask).then(()=>{activeTask.runtimeManaged=true;return taskManager.checkpoint(activeTask)})
  }
  const saveTask = async () => {
    if(!activeTask || saving || busy || flowRunning || activeRuns.size || activeTask.running)return
    while(drillStack.length)if(!leaveCompound())return
    captureHistory()
    const submittedKey = history[historyIndex]?.key
    saving = true
    try{await syncTask(true);savedStateKey=submittedKey;setHint('当前任务已保存，仅影响本次任务')}catch(error){setHint(`任务保存失败：${error.message}`,true)}finally{saving=false;updateControls()}
  }
  taskSaveButton.onclick=saveTask
  const readSaved = () => readWorkflows().map(graph=>({...graph,viewport:readPageState(`workflow:${graph.id}`)||graph.viewport}))
  const writeSaved = writeWorkflows
  const persistViewport = () => {
    if(drillStack.length)return
    const key=activeTask?`task:${activeTask.id}`:editingWorkflowId?`workflow:${editingWorkflowId}`:null
    if(key)writePageState(key,viewportSnapshot())
  }
  const snapshot = () => graphManifest({ name: workflowName, nodes: [...nodes.values()], edges: edges.map(edge => ({ ...edge })) })
  const setHint = (text, error = false) => { const hint = byId('node-connection-hint'); hint.textContent = text; hint.classList.toggle('error', error) }
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
  // Basic-node cards are the source of truth for names, icons and available types.
  const catalog = [...document.querySelectorAll('#flow-list [data-node-type]')].map((card) => ({
    type: card.dataset.nodeType, title: card.querySelector('h3').textContent,
    icon: card.querySelector('.flow-badge').innerHTML,
  }))
  catalog.push({ type: 'compound', title: '复合节点', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h8v8H8z"/></svg>' })
  const availableNodes = catalog

  const isDual = (node) => ['enhance', 'chatterbox-mix'].includes(node.type)
  const incoming = (id, port = 'in') => edges.find((edge) => edge.to === id && edge.toPort === port)
  const history = []
  let historyIndex = -1
  let restoringHistory = false
  let savedStateKey = null
  let saving = false
  let abandonedEditKey = null
  const currentEditKey = () => JSON.stringify([
    graphEditKey({ name: workflowName, nodes: [...nodes.values()], edges }),
    ...drillStack.map(frame => frame.history[frame.historyIndex]?.key),
  ])
  const hasUnsavedChanges = () => currentEditKey() !== abandonedEditKey && (!activeTask || !taskLocked) && (
    (savedStateKey !== null && graphEditKey({ name: workflowName, nodes: [...nodes.values()], edges }) !== savedStateKey) ||
    drillStack.some(frame => frame.savedStateKey !== null && frame.history[frame.historyIndex]?.key !== frame.savedStateKey)
  )
  window.addEventListener('beforeunload', event => {
    if (!hasUnsavedChanges()) return
    event.preventDefault(); event.returnValue = ''
  })
  window.addEventListener('ai-flow-before-navigate', event => {
    if (event.detail.to === 'testing' && event.detail.from !== 'testing' && activeTask?.deleted) activeTask = null
    if (event.detail.from !== 'testing' || event.detail.to === 'testing' || !hasUnsavedChanges()) return
    if (!window.confirm('工作流有未保存的改动，确定离开吗？')) { event.preventDefault(); return }
    // Acknowledging this draft must also dismiss guards on the hidden canvas.
    // Keep the saved baseline intact: a subsequent edit needs confirmation again.
    abandonedEditKey = currentEditKey()
    updateWorkflowName()
  })
  const captureHistory = () => {
    const key = graphEditKey({ name: workflowName, nodes: [...nodes.values()], edges })
    const state = { key, nodes: [...nodes.values()].map(n => ({ ...n, params: structuredClone(n.params), ...(n.graph ? { graph: structuredClone(n.graph), inputs: structuredClone(n.inputs), outputs: structuredClone(n.outputs) } : {}), extraFiles: {...n.extraFiles} })), edges: edges.map(e => ({ ...e })), nextId }
    if (history[historyIndex]?.key === key) { history[historyIndex] = state; return }
    history.splice(historyIndex + 1)
    history.push(state)
    if (history.length > 60) history.shift()
    historyIndex = history.length - 1
  }
  const travelHistory = (direction) => {
    if (graphLocked() || historyIndex + direction < 0 || historyIndex + direction >= history.length) return
    historyIndex += direction
    const state = history[historyIndex]
    nodes.forEach(n => actions.preview(`node-preview-${n.id}`, null))
    nodes.clear()
    state.nodes.forEach(n => nodes.set(n.id, { ...n, ...(n.graph ? { graph: structuredClone(n.graph) } : {}), params: structuredClone(n.params), running: false }))
    edges = state.edges.map(e => ({ ...e })); nextId = state.nextId
    pending = null; selectedNodes.clear(); closeConnectionMenu()
    restoringHistory = true
    try { render() } finally { restoringHistory = false }
    setHint(`${direction < 0 ? '已撤销' : '已重做'} · ${historyIndex + 1}/${history.length}`)
  }
  byId('node-undo').addEventListener('click', () => travelHistory(-1))
  byId('node-redo').addEventListener('click', () => travelHistory(1))
  window.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]') || !canvas.getClientRects().length) return
    if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') {
      event.preventDefault()
      travelHistory(event.shiftKey || event.key.toLowerCase() === 'y' ? 1 : -1)
    }
  })
  const updateWorkflowName = () => {
    const name = workflowName?.trim()
    byId('node-workflow-name').textContent = (!name || name === '未命名工作流' ? '未命名' : name) + (hasUnsavedChanges() ? ' *' : '')
    byId('node-workflow-name').title = byId('node-workflow-name').textContent
  }
  const updateControls = () => {
    updateWorkflowName()
    byId('test-flow-page').dataset.taskView=String(!!activeTask)
    if(document.querySelector('.page-content').dataset.page==='testing'){
      document.querySelectorAll('.nav-item[data-view]').forEach(item=>item.classList.toggle('active',item.dataset.view===(activeTask?'running':'saved')))
      byId('view-title').textContent=activeTask?'任务画布':'工作流编排'
    }
    taskLockButton.hidden = taskSaveButton.hidden = !activeTask
    taskLockButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="${taskLocked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'}"/></svg>${taskLocked ? '已锁定' : '已解锁'}`
    taskLockButton.setAttribute('aria-pressed', String(taskLocked)); taskLockButton.title = taskLocked ? '解锁任务编辑' : '锁定任务'
    byId('node-workflow-save').textContent = activeTask ? '保存模板' : '保存并退出'
    taskSaveButton.disabled = !activeTask || activeTask.running || flowRunning || busy || activeRuns.size > 0
    taskLockButton.disabled = !activeTask || activeTask.running || flowRunning || busy || activeRuns.size > 0
    byId('node-workflow-save').disabled=!!activeTask&&taskLocked||flowRunning||busy||activeRuns.size>0
    for(const id of ['node-add-trigger','node-workflow-arrange']) byId(id).disabled = !!activeTask && taskLocked
    byId('test-flow-title').textContent = activeTask ? '任务画布' : '工作流编排'
    document.querySelector('.test-flow-heading h1 + p').textContent=activeTask ? (taskLocked?'查看执行状态、试听结果，或替换最外层输入；解锁后可编辑。':'保存任务仅影响本次任务；保存模板会同步更新原工作流。') : '拖入节点，连线时选择输入；直接运行，按需配置，满意后保存。'
    document.querySelector('.test-flow-heading [data-view-link]').textContent = activeTask ? '返回任务队列' : '返回工作流'
    document.querySelector('.test-flow-heading [data-view-link]').dataset.viewLink = activeTask ? 'running' : 'saved'
    byId('node-undo').disabled = !!activeTask && taskLocked || busy || flowRunning || activeRuns.size > 0 || historyIndex <= 0
    byId('node-redo').disabled = !!activeTask && taskLocked || busy || flowRunning || activeRuns.size > 0 || historyIndex >= history.length - 1
    byId('node-flow-run').disabled = !!(activeTask?.running || activeTask?.queued) || flowRunning || busy || activeRuns.size > 0
    byId('node-flow-pause').disabled = !(flowRunning || activeTask?.running) || pauseRequested || stopRequested
    byId('node-flow-stop').disabled = !activeTask?.running && !activeTask?.queued && !flowRunning && !activeRuns.size && !pauseRequested
    byId('node-workflow-clear').disabled = flowRunning || activeRuns.size > 0
    byId('node-workflow-arrange').disabled = !!activeTask && taskLocked || busy || flowRunning || activeRuns.size > 0
    byId('node-flow-state').textContent = activeTask ? activeTask.status : globalTaskPool.snapshot().active?.priority > 0 ? '优先重抽中' : stopRequested ? '正在停止' : pauseRequested && flowRunning ? '当前节点完成后暂停' : flowRunning ? '运行中' : pauseRequested ? '已暂停' : flowStatus
  }
  const orderedNodes = () => compileOrder([...nodes.values()], edges)
  const runFlow = async lease => {
    if (activeTask) { await syncTask(true); await runtimeCommand('run',activeTask,{scope:drillStack.map(d=>d.group.id)}); activeTask.runtimeManaged=true; return }
    if (flowRunning || busy || activeRuns.size) return
    flowRunning = true; pauseRequested = false; stopRequested = false; if (activeTask) activeTask.interrupted = false; updateControls();syncTask()
    try {
      const order = orderedNodes()
      const runContext={nodes:new Map(nodes),edges,poolLease:lease}
      // Continue from valid outputs; when everything is complete, play runs the graph again.
      if (restartFromBeginning || (order.length && order.every(node => node.output))) order.filter(node => !isSourceNode(node)).forEach(node => invalidate(node.id))
      restartFromBeginning = false
      for (const node of order) {
        if (pauseRequested || stopRequested) break
        if (node.output) continue
        if (!await executeNode(node,runContext)) { if (!stopRequested) { flowStatus = '运行失败'; setHint(node.error || '流程已停止', true) }; break }
      }
      if (!pauseRequested && !stopRequested && order.every(node => node.output)) { flowStatus = '已完成'; setHint('整个流程已完成') }
    } catch (error) { flowStatus = '运行失败'; setHint(error.message, true) }
    finally { flowRunning = false; if (stopRequested) { pauseRequested = false; flowStatus = '已停止'; setHint('流程已停止') }; stopRequested = false; render() }
  }
  byId('node-flow-run').addEventListener('click', () => {
    if (flowRunning || busy || activeRuns.size) return
    const graphNodes = nodes
    const ticket = globalTaskPool.enqueue({ owner: activeTask?.id || graphNodes, label: workflowName, run: lease => graphNodes === nodes ? runFlow(lease) : undefined })
    ticket.promise.catch(error => setHint(error.message, true))
  })
  byId('node-flow-pause').addEventListener('click', () => { if(activeTask){runtimeCommand('pause',activeTask).catch(e=>setHint(e.message,true));return}; pauseRequested = true; updateControls();syncTask(); setHint('当前节点完成后暂停；点击运行继续') })
  byId('node-flow-stop').addEventListener('click', () => {
    if(activeTask){runtimeCommand('stop',activeTask).catch(e=>setHint(e.message,true));return}
    restartFromBeginning = true
    stopRequested = true; pauseRequested = false
    activeRuns.forEach(controller => controller.abort())
    if (!flowRunning && !activeRuns.size) { stopRequested = false; flowStatus = '已停止'; setHint('已停止，下次运行将从头开始') }
    updateControls();syncTask()
  })
  const renderNode = (node) => {
    const number = String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')
    const title = escapeHtml(node.title)
    const canInspect = node.type === 'quality-review' || (!!activeTask && taskLocked && node.type==='compound')
    const status = node.running ? `运行中 ${Math.round(node.progress || 0)}%` : node.error || (node.output ? '已完成' : '待运行')
    const ports = inputPorts(node)
    const outputMarkup = (node.type === 'compound' ? node.outputs || [] : [{ id: 'out', label: '输出' }]).map((p, i, list) => `<button class="node-port output-port" data-connect-from="${p.id}" ${p.count === 0 ? 'disabled' : ''} style="top:${(i + 1) * 100 / (list.length + 1)}%" type="button" title="${escapeHtml(p.label)}" aria-label="连接输出">${node.type === 'compound' ? `<span class="for-port-label">${escapeHtml(p.label)}</span>` : ''}</button>`).join('')
    const inputMarkup = ports.map((port, index) => `<button class="node-port input-port${port === 'text' || ['text-input', 'number-text', 'text-split'].includes(node.type) ? ' text-port' : ''}" data-connect-to="${port}" style="top:${(index + 1) * 100 / (ports.length + 1)}%" type="button" title="${inputLabel(node, port)}" aria-label="${inputLabel(node, port)}"></button>`).join('')
    return `<article class="workflow-node-card node-editor-card${node.type === 'compound' ? ' is-compound' : ''}${node.running ? ' is-running' : ''}${node.error ? ' has-error' : ''}${node.output && !node.running && !node.error ? ' is-complete' : ''}" data-node-card="${number}" style="left:${node.x}px;top:${node.y}px" tabindex="0" aria-label="${title}" title="${escapeHtml(status)}"><header class="node-editor-heading"><h3>${title}</h3>${node.type === 'compound' ? `<span class="compound-kind">${node.params?.forLoop ? 'For 循环' : '复合'} · ${node.graph?.nodes.length || 0} 个节点</span>` : ''}</header>${inputMarkup}${outputMarkup}<button class="primary-button node-run-button" data-run-node="${number}" type="button" title="运行节点" aria-label="运行节点" ${node.running || flowRunning || busy || activeTask?.running || activeTask?.queued ? 'disabled' : ''}><svg class="lucide lucide-play" viewBox="0 0 24 24" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg></button><footer class="node-editor-footer"><div class="audio-preview node-result-preview" id="node-preview-${number}"><button type="button" disabled aria-label="播放预览">▶</button></div><span class="node-runtime-status" aria-live="polite">${node.running ? `运行中 ${Math.round(node.progress || 0)}%` : node.error ? '失败' : node.output ? '完成' : '待运行'}</span><button class="secondary-button small" data-open-node="${number}" type="button" ${!canInspect && (node.running || flowRunning || busy) ? 'disabled' : ''}>配置</button></footer><div class="node-progress-track"><i style="width:${node.running ? node.progress || 0 : node.output ? 100 : node.progress || 0}%"></i></div></article>`
  }

  const drawEdges = () => {
    const bounds = world.getBoundingClientRect()
    edgesSvg.setAttribute('viewBox', '0 0 1 1')
    edgesSvg.replaceChildren()
    for (const edge of edges) {
      const from = cards.querySelector(`[data-node-card="${edge.from}"] .output-port[data-connect-from="${edge.fromPort || 'out'}"]`)
      const to = cards.querySelector(`[data-node-card="${edge.to}"] .input-port[data-connect-to="${edge.toPort}"]`)
      if (!from || !to) continue
      const a = from.getBoundingClientRect(); const b = to.getBoundingClientRect()
      const x1 = (a.left + a.width / 2 - bounds.left) / view.zoom; const y1 = (a.top + a.height / 2 - bounds.top) / view.zoom
      const x2 = (b.left + b.width / 2 - bounds.left) / view.zoom; const y2 = (b.top + b.height / 2 - bounds.top) / view.zoom
      const bend = Math.max(48, Math.abs(x2 - x1) * .42)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const lane = inputPorts(nodes.get(edge.to)).length > 1 ? (edge.toPort === 'reference' ? 30 : -30) : 0
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + bend} ${y1 + lane}, ${x2 - bend} ${y2 + lane}, ${x2} ${y2}`)
      path.setAttribute('class', `node-edge ${isTextNode(nodes.get(edge.from)) ? 'is-text' : 'is-audio'}`)
      path.style.pointerEvents = 'stroke'
      path.addEventListener('contextmenu', (event) => {
        event.preventDefault(); event.stopPropagation(); closeConnectionMenu()
        if (graphLocked()) return
        edges = edges.filter((item) => item !== edge)
        invalidate(edge.to); pending = null; render(); setHint('连线已删除')
      })
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', x2 - 24)
      label.setAttribute('y', y2 + (edge.toPort === 'reference' ? 24 : -12))
      label.setAttribute('text-anchor', 'end')
      label.setAttribute('class', 'node-edge-label')
      label.textContent = portLabel(nodes.get(edge.to), edge.toPort)
      const description = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      description.textContent = `${nodes.get(edge.from)?.title} → ${nodes.get(edge.to)?.title} · ${label.textContent}（右键删除连线）`
      path.append(description)
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      hit.setAttribute('d', path.getAttribute('d'))
      hit.setAttribute('class', 'node-edge-hit')
      hit.style.pointerEvents = 'stroke'
      hit.addEventListener('contextmenu', event => {
        event.preventDefault(); event.stopPropagation()
        path.dispatchEvent(new MouseEvent('contextmenu', { bubbles: false, cancelable: true }))
      })
      hit.addEventListener('pointerenter', () => path.classList.add('is-hovered'))
      hit.addEventListener('pointerleave', () => path.classList.remove('is-hovered'))
      edgesSvg.append(hit, path, label)
    }
  }
  const executeNode = async (node, context = { nodes, edges }) => {
        await globalTaskPool.checkpoint(context.poolLease)
        if (stopRequested) return false
        const { nodes, edges } = context
        const visiting = context.visiting || new Set()
        if (visiting.has(node.id)) { node.error = '连线存在循环，无法执行'; render(); return false }
        const nextVisiting = new Set(visiting).add(node.id)
        for (const edge of edges.filter(e => e.to === node.id)) {
          const source = nodes.get(edge.from)
          if (!source) { node.error = '上游节点不存在'; render(); return false }
          if (!source.output && !await executeNode(source, { ...context, visiting: nextVisiting })) return false
        }
        if (isSourceNode(node)) {
          const edge = edges.find(e => e.to === node.id && e.toPort === 'in')
          if (edge) {
            const source = nodes.get(edge.from)
            node.output = source?.type === 'compound' ? source.results?.[edge.fromPort || 'out'] : source?.output
            node.error = node.output ? '' : '上游没有可透传的结果'
            node.progress = node.output ? 100 : 0
            node.progressMessage = '输入已透传'
            context.onProgress?.(); syncTask(); render()
            return !!node.output
          }
        }
        if (node.type === 'quality-review') {
          const items = reviewItems(node, nodes, edges)
          if (!reviewGate(node,items)) { node.progressMessage='等待质检确认'; node.error=''; render(); return false }
          node.output = items.filter(i => i.file).at(-1)?.file || null
          node.progress = node.output ? 100 : 0; node.error = node.output ? '' : '上游没有可质检的结果'; render(); return !!node.output
        }
        if (!context.forExpanded || node.params?.forLoop) {
          const ancestors = expansionAncestors(node.id, context.nodes, context.edges)
          if ([...context.nodes.values()].some(n => n.params?.forLoop && ancestors.has(n.id))) {
            // Completed loop rows survive continuation; input edits and Stop invalidate separately.
            const controller = new AbortController(); activeRuns.set(node.id, controller); node.running = true; node.error = ''; node.iterationOutputs ||= []; node.iterationResults ||= []; render()
            try {
              for (const n of context.nodes.values()) if (ancestors.has(n.id) && n.params?.forLoop) await readForConnections(n, context.edges, context.nodes)
              const graph = expandForGraph({ nodes: [...context.nodes.values()].filter(n => ancestors.has(n.id)), edges: context.edges.filter(e => ancestors.has(e.from) && ancestors.has(e.to)) })
              graph.nodes.forEach(child => { if (child.originId) { const original = context.nodes.get(child.originId); child.output = original?.iterationOutputs?.[child.iteration] || null; child.results = original?.iterationResults?.[child.iteration] || null } })
              const map = new Map(graph.nodes.map(n => [n.id, n]))
              const plan = compileOrder(graph.nodes, graph.edges)
              const remaining = new Set(plan.map(n => n.id))
              while (remaining.size) {
                controller.signal.throwIfAborted()
                const ready = plan.filter(n => remaining.has(n.id)).slice(0, 1).map(n => n.id)
                if (!ready.length) throw new Error('循环连线')
                for (const id of ready) {
                  controller.signal.throwIfAborted()
                  const child = map.get(id)
                  if (!child.output && !await executeNode(child, { ...context, nodes: map, edges: graph.edges, forExpanded: true })) throw new Error(child.error || '循环执行失败')
                  if (child.originId) { const original = context.nodes.get(child.originId); if (original) { original.iterationOutputs ||= []; original.iterationOutputs[child.iteration] = child.output; original.results = child.results; original.iterationResults ||= []; original.iterationResults[child.iteration] = child.results }; if (child.originId !== node.id && original) original.output = child.output }
                  remaining.delete(id); node.progress = 100 * (map.size - remaining.size) / map.size; render()
                }
              }
              node.output = node.iterationOutputs.at(-1) || map.get(node.id)?.output || null; node.results = map.get(node.id)?.results || node.results; return true
            } catch (error) { node.error = controller.signal.aborted ? '' : error.message; return false }
            finally { activeRuns.delete(node.id); node.running = false; render() }
          }
        }
        const incoming = (id, port = 'in') => edges.find(e => e.to === id && e.toPort === port)
        const resolveInput = (id, port = 'in') => connectedInput(id, port, nodes, edges)
        if (node.type === 'compound') {
          let syncCompoundChildren
          const controller = new AbortController(); activeRuns.set(node.id, controller)
          node.running = true; node.error = ''; node.progress = 0; node.output = null; node.results = null; render()
          try {
            const graph = expandGraph(node.graph)
            graph.nodes.forEach(child => { if (!isSourceNode(child)) { child.output = null; child.results = null } })
            const map = new Map(graph.nodes.map(n => [n.id, n]))
            const syncChildren = () => {
              const sync = (children, prefix = '') => children.forEach(child => {
                const flat = map.get(prefix + child.id)
                if (flat) for (const field of ['output', 'results', 'error', 'progress', 'iterationOutputs','iterationResults', 'running', 'progressMessage']) child[field] = flat[field]
                if (child.graph) sync(child.graph.nodes, prefix + child.id + '__')
              })
              sync(node.graph.nodes)
            }
            syncCompoundChildren = syncChildren
            for (const port of node.inputs || []) {
              const edge = incoming(node.id, port.id)
              if (edge) {
                const source = nodes.get(edge.from)
                if (isSourceNode(source) && !source.output) source.output = await sourceOutput(source, Object.assign(() => {}, { signal: controller.signal }))
                const marker = { id: `boundary-${port.id}`, type: 'audio-input', output: resolveInput(node.id, port.id) }
                if (!marker.output) throw new Error('请先运行上游节点')
                map.set(marker.id, marker)
                // Resolve nested boundary targets through the same expansion mechanism.
                const bridge = expandGraph({ nodes: node.graph.nodes.concat(marker), edges: node.graph.edges.concat({ from: marker.id, to: port.node, toPort: port.port }) })
                graph.edges.push(...bridge.edges.filter(e => e.from === marker.id))
              }
            }
            const plan = compileOrder(graph.nodes, graph.edges)
            const remaining = new Set(plan.map(n => n.id))
            while (remaining.size) {
              if (controller.signal.aborted) throw new Error('已停止')
              const ready = plan.filter(n => remaining.has(n.id)).slice(0, 1).map(n => n.id)
              if (!ready.length) throw new Error('复合节点内部存在循环')
              for (const id of ready) {
                const child = map.get(id)
                if (controller.signal.aborted) throw new Error('已停止')
                if (!await executeNode(child, { ...context, visiting: new Set(), nodes: map, edges: graph.edges, onProgress:()=>{syncChildren();node.progress=100*(graph.nodes.length-remaining.size+(child.progress||0)/100)/Math.max(1,graph.nodes.length);context.onProgress?.();const status=cards.querySelector(`[data-node-card="${node.id}"] .node-runtime-status`);if(status){status.textContent=`运行中 ${Math.round(node.progress)}%`;status.closest('[data-node-card]').querySelector('.node-progress-track i').style.width=`${node.progress}%`}} })) throw new Error(child.error || '内部节点运行失败')
                remaining.delete(id); node.progress = 100 * (graph.nodes.length - remaining.size) / graph.nodes.length; render()
              }
            }
            const outputs = expandGraph({ nodes: [node], edges: (node.outputs || []).map(p => ({ from: node.id, fromPort: p.id, to: '__result', toPort: p.id })) }).edges.filter(e => e.to === '__result')
            node.results = Object.fromEntries(outputs.map(e => [e.toPort, map.get(e.from.slice(node.id.length + 2))?.output]))
            node.output = Object.values(node.results).at(-1) || null
            node.progress = 100; return true
          } catch (error) { node.error = error.message; return false }
          finally { syncCompoundChildren?.(); activeRuns.delete(node.id); node.running = false; render() }
        }
        if (isSourceNode(node) && node.output) return true
        if (node.running || busy && !context.retry) return false
        const controller = new AbortController()
        activeRuns.set(node.id, controller)
        try {
          // Source nodes are data, so running a consumer prepares them on demand.
          for (const edge of edges.filter(edge => edge.to === node.id)) {
            const source = nodes.get(edge.from)
            if (isSourceNode(source) && !source.output) {
              source.output = await sourceOutput(source, Object.assign(() => {}, { signal: controller.signal }))
              source.error = ''; source.progress = 100
            }
          }
          const firstPort = primaryPort(node)
          const first = incoming(node.id, firstPort) ? resolveInput(node.id, firstPort) : node.localFirst
          const second = incoming(node.id, 'reference') ? resolveInput(node.id, 'reference') : node.localSecond
          if (node.type !== 'audio-merge' && node.type !== 'text-input' && !(['number-text', 'text-split'].includes(node.type) && node.params?.text?.trim() && !incoming(node.id, primaryPort(node))) && (!first || (isDual(node) && !second))) throw new Error('请先准备输入音频或运行上游节点')
          if(node.type==='chatterbox-mix' && voicePorts(node).some(port=>incoming(node.id,port)&&!resolveInput(node.id,port))) throw new Error('请先运行所有上游音色节点')
          if (incoming(node.id, 'text') && !resolveInput(node.id, 'text')) throw new Error('请先运行上游文本节点')
          invalidate(node.id,context)
          node.running = true; node.progress = 0; context.onProgress?.();render()
          const progress = (value, message) => {
            node.progress = value; node.progressMessage = message; context.onProgress?.();syncTask()
            const status = cards.querySelector(`[data-node-card="${node.id}"] .node-runtime-status`)
            if (status) { status.textContent = `运行中 ${Math.round(value || 0)}%`; status.closest('[data-node-card]').querySelector('.node-progress-track i').style.width = `${Math.max(0, Math.min(100, value || 0))}%`; status.closest('[data-node-card]').title = message || '正在运行' }
          }
          progress.signal = controller.signal
          progress.taskPriority = context.retry ? 'retry' : 'normal'
          const ui = node.params.ui || {}
          if (isSourceNode(node)) node.output = await sourceOutput(node, progress, incoming(node.id, firstPort) ? first : null)
          else if (node.type === 'uvr') node.output = await actions.extract(first, ui['denoise-model-select'] || node.model, progress)
          else if (node.type === 'enhance') node.output = await actions.enhance(first, second, {
            enhanceRatio: Number(ui['mix-enhance-ratio'] ?? node.params.ratio) / 100,
            balanceEnabled: ui['mix-balance-enabled'] ?? true, sharedLufs: Number(ui['mix-shared-lufs'] ?? node.params.lufs),
            pointCount: Math.round(Number(ui['mix-point-count'] ?? node.params.points)),
            highpassEnabled: ui['mix-highpass-enabled'] ?? node.params.highpass,
            lowpassEnabled: ui['mix-lowpass-enabled'] ?? node.params.lowpass,
            compressionRatio: Number(ui['mix-compression-ratio'] ?? node.params.compression),
          }, progress)
          else node.output = await runModelNode(node, first, second, progress, resolveInput(node.id, 'text'), Object.fromEntries((node.type === 'audio-merge' ? inputPorts(node) : voicePorts(node)).map(port=>[port,incoming(node.id,port)?resolveInput(node.id,port):inputFile(node,port)])))
          if (controller.signal.aborted) { node.output = null; return false }
          node.progress = 100
          return true
        } catch (error) { node.error = controller.signal.aborted ? '' : error.message || '运行失败'; if (controller.signal.aborted) node.progress = 0; return false }
        finally { activeRuns.delete(node.id); node.running = false; context.onProgress?.(); if (!flowRunning && stopRequested) { stopRequested = false; flowStatus = '已停止' }; render() }
      }

  const uniqueNodeTitle = (title, excludeId) => {
    const occupied = new Set([...nodes.values()].filter(n => n.id !== excludeId).map(n => n.title))
    if (!occupied.has(title)) return title
    const base = title.replace(/-\d+$/, '')
    let suffix = 1
    while (occupied.has(`${base}-${suffix}`)) suffix++
    return `${base}-${suffix}`
  }
  const renameCompound = async (id) => {
    if (graphLocked()) return
    const node = nodes.get(id)
    if (node?.type !== 'compound') return
    closeConnectionMenu()
    const name = await requestWorkflowName('重命名复合节点', node.title, '节点名称')
    if (!name || nodes.get(id) !== node || graphLocked()) return
    node.title = uniqueNodeTitle(name.trim(), id)
    render()
    setHint(`节点已重命名为“${node.title}”`)
  }
  const render = () => {
    const seenTitles = new Set()
    for (const node of nodes.values()) {
      if (seenTitles.has(node.title)) node.title = uniqueNodeTitle(node.title, node.id)
      seenTitles.add(node.title)
    }
    for (const node of nodes.values()) if (node.params?.forLoop) {
      node.params.columns ||= [{ id: 'list-0', name: 'A', items: [] }]
      for (const c of node.params.columns) c.connected = edges.some(e => e.to === node.id && e.toPort === c.id)
    }
    if (!restoringHistory) captureHistory()
    cards.innerHTML = [...nodes.values()].map(renderNode).join('')
    for (const node of nodes.values()) {
      if (!isTextNode(node) && node.output && !node.running) actions.preview(`node-preview-${node.id}`, node.output)
    }
    cards.querySelectorAll('[data-node-card]').forEach((card) => {
      const open = async () => {
        const node = nodes.get(card.dataset.nodeCard)
        if (node.params?.forLoop) { if (activeTask && taskLocked) {
          const editable=!drillStack.length
          const result=await withTaskConfigLock(()=>configureFor(structuredClone(node)),{files:editable,text:editable})
          if(result&&editable){const old=node.params.columns||[];node.params={...node.params,columns:old.map(c=>({...result.params.columns.find(v=>v.id===c.id),id:c.id,name:c.name}))};node.extraFiles=result.extraFiles;invalidate(node.id);syncTask(true);render();savedStateKey=history[historyIndex]?.key;updateWorkflowName()}
          return
        }; if (graphLocked()) return; const result = await configureFor(node); if (result) { node.params = result.params; node.extraFiles = result.extraFiles; const allowed = new Set((node.outputs || []).map(p => p.id)); const removed = edges.filter(e => e.from === node.id && !allowed.has(e.fromPort)); edges = edges.filter(e => !removed.includes(e)); invalidate(node.id); removed.forEach(e => invalidate(e.to)); render() }; return }
        if (node.type === 'compound') { enterCompound(node); return }
        if (node.type === 'quality-review') {
          const reviewNodes = nodes, reviewEdges = edges, reviewTask = activeTask
          await openQualityReview(node, () => reviewItems(node, reviewNodes, reviewEdges), actions, async (item, lease) => {
            const nodes = reviewNodes, edges = reviewEdges
            const resolveInput = (id, port = 'in') => { const edge = edges.find(e => e.to === id && e.toPort === port); const source = edge && nodes.get(edge.from); return source?.type === 'compound' ? source.results?.[edge.fromPort || 'out'] : source?.output }
            const previousFlowRunning = flowRunning
            const context = { nodes, edges, poolLease: lease, retry: true }
            flowRunning = true
            try {
              if (item.index !== undefined) {
                const ancestors = new Set([item.source.id]); let changed = true
                while (changed) { changed = false; for (const e of edges) if (ancestors.has(e.to) && !ancestors.has(e.from)) { ancestors.add(e.from); changed = true } }
                for (const n of nodes.values()) if (ancestors.has(n.id) && n.params?.forLoop) await readForConnections(n, edges, nodes)
                const graph = expandForGraph({ nodes: [...nodes.values()].filter(n => ancestors.has(n.id)), edges: edges.filter(e => ancestors.has(e.from) && ancestors.has(e.to)) })
                graph.nodes.forEach(n => { if (n.originId) { n.output = nodes.get(n.originId)?.iterationOutputs?.[n.iteration] || null; n.results = nodes.get(n.originId)?.iterationResults?.[n.iteration] || null } })
                const target = graph.nodes.find(n => n.originId === item.source.id && n.iteration === item.index)
                if (!target) throw new Error('找不到对应循环结果，请重新运行上游')
                clearRetryChain(target,graph.nodes,graph.edges,item.port)
                if (!await executeNode(target, { ...context, nodes: new Map(graph.nodes.map(n => [n.id, n])), edges: graph.edges, forExpanded: true })) throw new Error(target.error || '重抽失败')
                item.source.iterationOutputs[item.index] = target.output
                item.source.iterationResults ||= []; item.source.iterationResults[item.index] = target.results
                item.source.results = item.source.iterationResults.at(-1) || item.source.results
                item.source.output = item.source.iterationOutputs.at(-1)
                invalidate(node.id, context); node.output = item.source.output; return item.port ? target.results?.[item.port] : target.output
              }
              if (item.port && item.source.type === 'compound') {
                const group = item.source, port = group.outputs.find(p => p.id === item.port)
                if (!port) throw new Error('输出映射失效')
                const graph = expandGraph(group.graph), map = new Map(graph.nodes.map(n => [n.id, n]))
                for (const input of group.inputs || []) {
                  const edge = edges.find(e => e.to === group.id && e.toPort === input.id)
                  if (!edge) continue
                  const marker = { id: `quality-boundary-${input.id}`, type: 'audio-input', output: resolveInput(group.id, input.id) }
                  map.set(marker.id, marker)
                  const bridge = expandGraph({ nodes: group.graph.nodes.concat(marker), edges: [{ from: marker.id, to: input.node, toPort: input.port }] })
                  graph.edges.push(...bridge.edges.filter(e => e.from === marker.id))
                }
                const bridge = expandGraph({ nodes: [group], edges: [{ from: group.id, fromPort: item.port, to: '__review', toPort: 'in' }] })
                const targetId = bridge.edges.find(e => e.to === '__review')?.from.slice(group.id.length + 2)
                const target = map.get(targetId)
                if (!target) throw new Error('找不到对应的内部节点')
                clearRetryChain(target,map,graph.edges)
                if (!await executeNode(target, { ...context, nodes: map, edges: graph.edges })) throw new Error(target.error || '重抽失败')
                group.results[item.port] = target.output; group.output = Object.values(group.results).at(-1)
                const sync = (children, prefix = '') => children.forEach(child => { const flat = map.get(prefix + child.id); if (flat) for (const key of ['output', 'results', 'iterationOutputs','iterationResults', 'progress', 'error']) child[key] = flat[key]; if (child.graph) sync(child.graph.nodes, prefix + child.id + '__') })
                sync(group.graph.nodes); invalidate(node.id, context); node.output = group.output; return target.output
              }
              const previous = item.source.output
              clearRetryChain(item.source,nodes,edges,item.port)
              if (!await executeNode(item.source, context)) { item.source.output = previous; throw new Error(item.source.error || '重抽失败') }
              node.output = item.source.output; return item.source.output
            } finally { flowRunning = previousFlowRunning; if (reviewTask && !reviewTask.deleted) { const sync = (source, target) => source.forEach(n => { const t = target.find(t => t.id === n.id); if (!t) return; for (const key of ['output','results','iterationOutputs','iterationResults','error','progress']) t[key] = n[key]; if (n.graph && t.graph) sync(n.graph.nodes, t.graph.nodes) }); sync([...reviewNodes.values()], reviewTask.nodes); await taskManager.checkpoint(reviewTask) }; render() }
          }, { onGate: async value => {
            if(reviewTask) { await runtimeCommand('review-gate',reviewTask,{reviewId:node.id,...value}); const sync=children=>children.forEach(child=>{if(child.id===node.id){child.params={...child.params,reviewSkipChecks:node.params?.reviewSkipChecks};if(value.pass)child.reviewPassed=true}if(child.graph)sync(child.graph.nodes)});sync(reviewTask.nodes) }
            else { if(value.pass)node.reviewPassed=true; node.params||={}; if('skipChecks' in value)node.params.reviewSkipChecks=value.skipChecks; render() }
          }, isUpstreamRunning: () => reviewEdges.filter(e=>e.to===node.id).some(e=>{const source=reviewNodes.get(e.from);return !source?.output || source.running}), enqueueRemote: reviewTask ? item => runtimeCommand('retry',reviewTask,{sourceId:item.source.id,index:item.index,port:item.port,reviewId:node.id}) : null, remoteJobs: () => reviewTask?.retries || [], onHeard: key => reviewTask && runtimeCommand('heard',reviewTask,{reviewId:node.id,key}), onChecked: reviewTask ? async (key, checked) => {
            node.reviewChecked ||= {}
            if (checked) node.reviewChecked[key] = true
            else delete node.reviewChecked[key]
            const sync = children => children.forEach(child => { if (child.id === node.id) child.reviewChecked = { ...node.reviewChecked }; if (child.graph) sync(child.graph.nodes) })
            sync(reviewTask.nodes)
            await runtimeCommand('review-check', reviewTask, { reviewId: node.id, key, checked })
            await taskManager.checkpoint(reviewTask)
          } : null, owner: reviewTask?.id || reviewNodes, isRunning: () => reviewTask?.running || flowRunning || busy || activeRuns.size > 0, onChange: async () => {
            if (reviewTask && !reviewTask.deleted) {
              const sync = children => children.forEach(child => { if (child.id === node.id) child.reviewUnheard = { ...node.reviewUnheard }; if (child.graph) sync(child.graph.nodes) })
              sync(reviewTask.nodes)
              await taskManager.checkpoint(reviewTask)
            }
          } }); return
        }

        if (busy || flowRunning || activeRuns.size || activeTask?.running && !taskLocked) return
        busy = true; updateControls()
        try {
          const locked = !!activeTask && taskLocked, editableInput = locked && !drillStack.length
          const draft = locked ? { ...structuredClone(node), localFirst:node.localFirst, localSecond:node.localSecond, extraFiles:{...node.extraFiles} } : node
          const allowText = editableInput && !(node.type === 'text-input' && incoming(node.id, primaryPort(node))) && !incoming(node.id,'text') && ['text-input','number-text','text-split','indextts','chatterbox-read','chatterbox-mix'].includes(node.type)
          const openConfig = onReady => actions.openNode(draft, resolveInput(node.id, primaryPort(node)), resolveInput(node.id, 'reference'), { onReady, audioInputs: Object.fromEntries((node.type === 'audio-merge' ? inputPorts(node) : voicePorts(node)).map(port=>[port,incoming(node.id,port)?resolveInput(node.id,port):inputFile(node,port)])), audioConnections: Object.fromEntries((node.type === 'audio-merge' ? inputPorts(node) : voicePorts(node)).filter(port=>incoming(node.id,port)).map(port=>[port,'上游节点'])), text: incoming(node.id, 'text') ? nodes.get(incoming(node.id, 'text').from)?.title : null, textInput: resolveInput(node.id, 'text'), first: incoming(node.id, primaryPort(node)) ? nodes.get(incoming(node.id, primaryPort(node)).from)?.title : null, second: incoming(node.id, 'reference') ? nodes.get(incoming(node.id, 'reference').from)?.title : null })
          let result = locked ? await withTaskConfigLock(openConfig,{files:editableInput&&freePorts(node).length>0,text:allowText,deferred:!['audio-merge','audio-input','text-input','number-text','text-split','loudness'].includes(node.type)}) : await openConfig()
          if(locked) {
            const previousInputs=freePorts(node).map(slot=>inputFile(node,slot))
            const previousParams=JSON.stringify(node.params)
            const params = structuredClone(node.params)
            if(allowText && result) {
              if(node.type==='text-input'||['number-text','text-split'].includes(node.type)) { if('text'in result.params)params.text=result.params.text;else delete params.text }
              else {params.ui={...params.ui};for(const[k,v]of Object.entries(result.params.ui||{}))if(k.endsWith('-text')&&!k.includes('emotion'))params.ui[k]=v}
            }
            if(editableInput)for(const slot of freePorts(node))setInputFile(node,slot,inputFile(draft,slot))
            if(editableInput&&node.type==='indextts'&&!incoming(node.id,'reference')&&node.params.emotionMode==='audio'){node.emotionFile=draft.emotionFile;params.emotionAudio=draft.params.emotionAudio}
            if(!editableInput){result=null}
            else if(previousParams===JSON.stringify(params)&&freePorts(node).every((slot,i)=>inputFile(node,slot)===previousInputs[i]))result=null
            else result={params,model:node.model,output:node.type==='audio-input'?result?.output:null}
          }
          if(result)invalidate(node.id)
          if (result) { node.params = result.params; growVoicePorts(node, edges); node.model = result.model; node.output = result.output; edges = pruneInputEdges(edges, node); if(locked) {syncTask(true);captureHistory();savedStateKey=history[historyIndex]?.key} }
        } catch (error) { node.error = error.message || '打开节点失败' }
        finally { busy = false; render(); if (isSourceNode(node) && !node.output && (node.localFirst || node.params?.text)) executeNode(node) }
      }
      const run = () => {
        if (flowRunning || activeRuns.size) return
        const runNodes = nodes, runEdges = edges, target = nodes.get(card.dataset.nodeCard)
        if(activeTask){syncTask(true).then(()=>runtimeCommand('run',activeTask,{targetId:target.id,scope:drillStack.map(d=>d.group.id)})).catch(e=>setHint(e.message,true));return}
        const ticket = globalTaskPool.enqueue({ owner: activeTask?.id || runNodes, label: target.title, run: async lease => {
          if (nodes !== runNodes) throw new Error('画布已切换，请重新运行节点')
          flowRunning = true; pauseRequested = false; stopRequested = false; render()
          try { await executeNode(target, { nodes: runNodes, edges: runEdges, poolLease: lease }) }
          finally { flowRunning = false; stopRequested = false; render() }
        } })
        ticket.promise.catch(error => setHint(error.message, true))
      }
      card.querySelector('[data-open-node]').addEventListener('click', () => open())
      card.querySelector('[data-run-node]').addEventListener('click', run)
      card.addEventListener('dragover', (event) => {
        if (![...event.dataTransfer.types].includes('Files')) return
        event.preventDefault(); event.stopPropagation()
        const node = nodes.get(card.dataset.nodeCard)
        const allowed = !busy && (!flowRunning && !node.running || activeTask && !drillStack.length) && freePorts(node).length > 0
        event.dataTransfer.dropEffect = allowed ? 'copy' : 'none'
        card.classList.toggle('drag-over', allowed)
      })
      card.addEventListener('dragleave', (event) => { if (!card.contains(event.relatedTarget)) card.classList.remove('drag-over') })
      card.addEventListener('drop', (event) => {
        if (![...event.dataTransfer.types].includes('Files')) return
        event.preventDefault(); event.stopPropagation(); card.classList.remove('drag-over')
        const node = nodes.get(card.dataset.nodeCard)
        if (busy || (flowRunning || node.running) && (!activeTask || drillStack.length)) return
        const ports = activeTask && taskLocked && drillStack.length ? [] : freePorts(node)
        const files = [...event.dataTransfer.files].filter(takesTextFile(node) ? validTextFile : validAudio)
        if (!ports.length) { setHint('输入已连接上游，请先删除连线再上传文件', true); return }
        if (!files.length) { setHint('请拖入音频文件', true); return }
        if (ports.length === 1 || files.length > 1) {
          ports.slice(0, files.length).forEach((port, index) => setLocalAudio(node, port, files[index]))
          return
        }
        closeConnectionMenu()
        const heading = document.createElement('strong'); heading.textContent = '文件用作'
        connectionMenu.append(heading)
        ports.forEach((port) => {
          const button = document.createElement('button')
          button.type = 'button'; button.textContent = portLabel(node, port)
          button.addEventListener('click', () => { setLocalAudio(node, port, files[0]); closeConnectionMenu() })
          connectionMenu.append(button)
        })
        placeContextMenu(event.clientX, event.clientY, connectionMenu.querySelector('button'))
      })
    })
    cards.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteNode(button.dataset.delete)))
    cards.querySelectorAll('[data-connect-from]').forEach((button) => button.addEventListener('click', () => { const id = button.closest('[data-node-card]').dataset.nodeCard; if(activeTask&&taskLocked)return; pendingOutput = button.dataset.connectFrom; pending = pending === id ? null : id; setHint(pending ? '现在选择目标节点的输入端口' : '选择输出端口开始连线'); button.classList.toggle('selected', Boolean(pending)) }))
    cards.querySelectorAll('[data-connect-to]').forEach((button) => button.addEventListener('click', (event) => chooseConnection(button.closest('[data-node-card]').dataset.nodeCard, event.clientX, event.clientY, button.dataset.connectTo)))
    cards.querySelectorAll('[data-download]').forEach((button) => button.addEventListener('click', () => { const node = nodes.get(button.dataset.download); if (node?.output) actions.download(node.output, `${node.title.replace(/\s+/g, '-')}.wav`) }))
    paintSelection(); updateControls(); syncTask(); requestAnimationFrame(drawEdges)
  }
  const reaches = (start, target) => { const seen = new Set(); const queue = [start]; while (queue.length) { const current = queue.shift(); if (current === target) return true; if (seen.has(current)) continue; seen.add(current); edges.filter((edge) => edge.from === current).forEach((edge) => queue.push(edge.to)) } return false }
  const portLabel = inputLabel
  const connectionMenu = document.createElement('div')
  connectionMenu.className = 'node-connection-menu'
  connectionMenu.hidden = true
  connectionMenu.setAttribute('role', 'menu')
  document.body.append(connectionMenu)
  const closeConnectionMenu = () => { connectionMenu.hidden = true; connectionMenu.replaceChildren(); byId('node-add-trigger').setAttribute('aria-expanded', 'false') }
  const chooseConnection = (target, x, y, requestedPort = null) => {
    const node = nodes.get(target)
    if (!pending || !node) { setHint('从输出圆点拖到目标节点即可连线'); return }
    if (pending === target || reaches(target, pending)) { setHint('不能连接自身或形成循环', true); return }
    
    closeConnectionMenu()
    const from = pending
    const heading = document.createElement('strong')
    heading.textContent = '连接到 ' + node.title
    connectionMenu.append(heading)
    const matchesOutput = port => (port === 'text' || ['number-text', 'text-split'].includes(node.type)) === isTextNode(nodes.get(from))
    const options = inputPorts(node).filter(port => !requestedPort || port === requestedPort)
      .sort((a, b) => Number(matchesOutput(b)) - Number(matchesOutput(a))
        || Number(Boolean(incoming(target, a))) - Number(Boolean(incoming(target, b))))
    for (const port of options) {
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('role', 'menuitem')
      button.classList.add(port === 'text' || ['number-text', 'text-split'].includes(node.type) ? 'connection-text' : 'connection-audio')
      const current = incoming(target, port)
      const label = document.createElement('span')
      label.textContent = portLabel(node, port)
      button.append(label)
      if (current) {
        const existing = document.createElement('small')
        existing.textContent = '替换 · ' + (nodes.get(current.from)?.title || '')
        button.append(existing)
      }
      button.addEventListener('click', () => {
        pending = from
        connect(target, port)
        closeConnectionMenu()
      })
      connectionMenu.append(button)
    }
    if (!connectionMenu.querySelector('button')) { setHint('该节点没有输入端口', true); return }
    connectionMenu.hidden = false
    const rect = connectionMenu.getBoundingClientRect()
    connectionMenu.style.left = `${Math.max(8, Math.min(x, innerWidth - rect.width - 8))}px`
    connectionMenu.style.top = `${Math.max(8, Math.min(y, innerHeight - rect.height - 8))}px`
    connectionMenu.querySelector('button')?.focus({ preventScroll: true })
  }
  document.addEventListener('pointerdown', (event) => { if (!connectionMenu.contains(event.target)) closeConnectionMenu() })
  document.addEventListener('keydown', (event) => {
    if (connectionMenu.hidden) return
    if (event.key === 'Escape') { closeConnectionMenu(); pending = null }
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      const options = [...connectionMenu.querySelectorAll('button:not(:disabled)')]
      const index = options.indexOf(document.activeElement)
      options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus()
    }
  })
  const connect = (target, port) => {
    if (graphLocked()) return
    if (!pending) { setHint('先选择一个节点的输出端口', true); return }
    
    if (pending === target || reaches(target, pending)) { setHint('该连线会形成循环，请选择其他节点', true); return }
    if (!inputPorts(nodes.get(target)).includes(port)) return
    const source = nodes.get(pending)
    edges = edges.filter((edge) => !(edge.to === target && edge.toPort === port))
    const node = nodes.get(target)
    clearLocalInput(node, port)
    edges.push({ from: pending, fromPort: pendingOutput, to: target, toPort: port }); growVoicePorts(node, edges); invalidate(target); pending = null; setHint('连线已建立'); render()
  }
  const invalidate = (id, context={nodes,edges}) => { const {nodes,edges}=context; const queue = [id]; const seen = new Set(); while (queue.length) { const current = queue.shift(); if (seen.has(current)) continue; seen.add(current); const node = nodes.get(current); if (node) { node.output = null; node.connectedLists = {}; node.results = null; node.iterationOutputs = null; node.iterationResults = null; node.error = ''; node.progress = 0 } edges.filter((edge) => edge.from === current).forEach((edge) => queue.push(edge.to)) } }
  const freePorts = (node) => node.type === 'compound' ? [] : (['text-input', 'audio-input'].includes(node.type) ? ['in'] : inputPorts(node).filter(port => port !== 'text')).filter((port) => !incoming(node.id, port))
  const setLocalAudio = (node, port, file) => {
    if(activeTask && !drillStack.length && (flowRunning||activeRuns.size)) {
      stopRequested=true;pauseRequested=false;restartFromBeginning=false
      activeRuns.forEach(controller=>controller.abort())
      setHint('输入已更新，当前执行停止后可点击运行继续')
    }
    if (activeTask && taskLocked && drillStack.length) return
    if (!(takesTextFile(node) ? validTextFile(file) : validAudio(file)) || busy || node.running && !activeTask || incoming(node.id, port)) return
    setInputFile(node, port, file); growVoicePorts(node, edges)
    if (takesTextFile(node)) delete node.params.text
    invalidate(node.id); if(activeTask && taskLocked) {syncTask(true);captureHistory();savedStateKey=history[historyIndex]?.key} render(); setHint(portLabel(node, port) + '已上传：' + file.name)
    if (isSourceNode(node)) executeNode(node)
  }
  const addNode = (type, data = {}) => {
    const id = String(data.id || `node-${nextId++}`); const defaults = { uvr: 'UVR5 音频处理', enhance: '参考音色频谱增强' }
    nodes.set(id, { id, type, x: snapX(data.x ?? (nodes.size % 3) * GRID_X * 2), y: snapY(data.y ?? Math.floor(nodes.size / 3) * GRID_Y * 2), title: data.title || catalog.find((item) => item.type === type)?.title || defaults[type], model: data.model || (type.startsWith('chatterbox') ? 'english' : 'kim-vocal-2'), params: { ...DEFAULT_NODE_PARAMS, ...(type === 'text-split' ? { splitMode: 'lines', separatorNewlines: 2 } : {}), ...(data.params || {}) }, ...(type === 'compound' ? { graph: { nodes: [], edges: [] }, inputs: [], outputs: [] } : {}), localFirst: null, localSecond: null, output: null, error: '' }); render()
  }
  const resolveInput = (nodeId, port = 'in') => connectedInput(nodeId, port, nodes, edges)
  const loadSnapshot = (data) => {
    abandonedEditKey = null
    if(!data.taskView)activeTask=null
    drillStack.length = 0; if (typeof breadcrumbs !== 'undefined') breadcrumbs.hidden = true
    for (const node of nodes.values()) actions.preview(`node-preview-${node.id}`, null)
    history.length = 0; historyIndex = -1
    selectedNodes.clear(); nodes.clear(); edges = []; nextId = 1; pauseRequested = false; flowStatus = '就绪'; workflowName = data.name || '未命名工作流'; editingWorkflowId = data.id || null
    for (const [index, node] of (data.nodes || []).filter((node) => catalog.some((item) => item.type === node.type)).entries()) {
      nodes.set(String(node.id), { ...node, x: snapX(node.x ?? Math.floor(index / 2) * GRID_X * 2), y: snapY(node.y ?? (index % 2) * GRID_Y * 2), params: { ...DEFAULT_NODE_PARAMS, ...(node.params || {}) }, model: node.model || 'kim-vocal-2', id: String(node.id), localFirst: node.localFirst || null, localSecond: node.localSecond || null, output: data.taskView ? node.output : null, error: data.taskView ? node.error || '' : '' })
      const n = Number(String(node.id).replace(/\D/g, '')); if (n >= nextId) nextId = n + 1
    }
    edges = (data.edges || []).filter((edge) => nodes.has(String(edge.from)) && nodes.has(String(edge.to))).map((edge) => ({ ...edge, from: String(edge.from), to: String(edge.to) }))
    nodes.forEach(node=>growVoicePorts(node,edges))
    pending = null; savedStateKey = null; temporaryHand = false; setCanvasTool('select'); restoreViewport(data.viewport); render()
    savedStateKey = history[historyIndex]?.key; updateWorkflowName()
    nodes.forEach(node => { if (!data.taskView && isSourceNode(node) && (node.localFirst || node.params?.text)) executeNode(node) })
  }
  const renderSaved = () => {
    const list = byId('saved-workflow-list'); const saved = readSaved(); byId('saved-workflow-empty').hidden = saved.length > 0
    const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`
    list.innerHTML = saved.map((item) => {
      const types = [...new Set((item.nodes || []).map(node => node.type))].filter(type => type !== 'audio')
      const labels = types.map(type => catalog.find(entry => entry.type === type)?.title || type)
      const date = new Date(item.updatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      return `<article class="saved-flow-card" data-saved-id="${escapeHtml(item.id)}">
        <header class="saved-flow-heading"><span class="saved-flow-icon">${icon('<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h3a6 6 0 0 1 6 6v3"/>')}</span><div class="saved-flow-heading-copy"><div class="saved-flow-title"><h3 title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h3></div><p>${(item.nodes || []).length} 个节点<span>·</span>${(item.edges || []).length} 条连线</p></div><button class="saved-flow-delete danger-text" data-remove="${escapeHtml(item.id)}" type="button" title="删除工作流" aria-label="删除工作流">${icon('<path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6M10 10v7M14 10v7"/>')}</button></header>
        <div class="saved-flow-types">${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div>
        ${item.description && item.id !== 'example-voice-enhancement' ? `<p class="saved-flow-description">${escapeHtml(item.description)}</p>` : ''}
        <p class="saved-flow-date">更新于 ${escapeHtml(date)}</p>
        <footer class="saved-flow-footer"><button class="saved-flow-open" data-launch="${escapeHtml(item.id)}" type="button">建立任务</button><button class="saved-flow-edit" data-open="${escapeHtml(item.id)}" type="button">${icon('<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>')}编辑工作流</button><button class="saved-flow-copy" data-copy="${escapeHtml(item.id)}" type="button" title="复制工作流" aria-label="复制工作流">${icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>')}</button><button class="saved-flow-settings" data-rename="${escapeHtml(item.id)}" type="button" title="重命名" aria-label="重命名">${icon('<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.32 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831 2.34 2.34 0 0 1 2.33-4.033 2.34 2.34 0 0 0 3.32-1.915"/><circle cx="12" cy="12" r="3"/>')}</button></footer>
      </article>`
    }).join('')
    list.querySelectorAll('[data-launch]').forEach(button => button.addEventListener('click', async () => { button.disabled = true; try { const graph = readSaved().find(item => item.id === button.dataset.launch); if (graph) await taskManager.create(await restoreWorkflowInputs(graph)) } catch (error) { setHint(`建立任务失败：${error.message || '无法读取已保存的输入文件'}`, true) } finally { button.disabled = false } }))
    list.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', async () => {
      if(flowRunning || activeRuns.size || busy){setHint('请先停止当前运行');return}
      if(activeTask&&hasUnsavedChanges()&&!window.confirm('当前任务有未保存改动，确定切换吗？'))return
      const selected = readSaved().find((item) => item.id === button.dataset.open)
      if (!selected) return
      try {
        const graph = await restoreWorkflowInputs(selected)
        actions.navigate('testing')
        loadSnapshot(graph)
      } catch { setHint('无法读取工作流输入文件', true) }
    }))
    list.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true
      try {
        const copy = await duplicateWorkflow(button.dataset.copy)
        renderSaved()
        setHint(`已复制为“${copy.name}”`)
      } catch (error) {
        button.disabled = false
        setHint(`复制失败：${error.message || '请重试'}`, true)
      }
    }))
    list.querySelectorAll('[data-rename]').forEach((button) => button.addEventListener('click', async () => { const saved = readSaved(); const item = saved.find((entry) => entry.id === button.dataset.rename); const name = await requestWorkflowName('重命名工作流', item?.name || ''); if (name?.trim() && item) { item.name = name.trim(); item.updatedAt = Date.now(); await writeSaved(saved); renderSaved() } }))
    list.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', async () => {
      const item = readSaved().find(entry => entry.id === button.dataset.remove)
      if (!item || !await confirmWorkflowDelete(item.name)) return
      button.disabled = true
      try {
        await deleteWorkflowInputs(item.id, () => writeSaved(readSaved().filter(entry => entry.id !== item.id)))
        renderSaved()
      } catch {
        button.disabled = false
        const error = document.createElement('p')
        error.className = 'input-dialog-error'; error.setAttribute('role', 'alert')
        error.textContent = '删除失败，工作流及输入文件已保留，请重试。'
        list.querySelector('[data-delete-error]')?.remove()
        error.dataset.deleteError = ''
        list.prepend(error)
      }
    }))
  }

  const graphLocked = () => {
    if (activeTask && taskLocked) { setHint('任务已锁定，可查看、运行或替换最外层输入；解锁后可编辑'); return true }
    if (!activeTask?.running && !saving && !busy && !flowRunning && ![...nodes.values()].some((node) => node.running)) return false
    setHint('请等待节点运行或关闭配置后再修改节点和连线', true)
    return true
  }
  const deleteNodes = (ids) => {
    if (graphLocked()) return
    const boundary = drillStack.at(-1)?.group
    const protectedIds = new Set(boundary ? [...boundary.inputs, ...boundary.outputs].map(p => p.node) : [])
    if ([...ids].some(id => protectedIds.has(id))) { setHint('该节点是复合节点的边界，请先返回上层解除复合再删除', true); return }
    const deleting = new Set([...ids].filter(id => nodes.has(id)))
    if (!deleting.size) return
    deleting.forEach(id => {
      invalidate(id)
      actions.preview(`node-preview-${id}`, null)
      nodes.delete(id); selectedNodes.delete(id)
    })
    edges = edges.filter(edge => !deleting.has(edge.from) && !deleting.has(edge.to))
    pending = null; closeConnectionMenu(); render(); setHint(`已删除 ${deleting.size} 个节点`)
  }
  const deleteNode = id => deleteNodes([id])
  window.addEventListener('keydown', event => {
    if (!['Delete', 'Backspace'].includes(event.key) || event.isComposing ||
        event.target.closest('input, textarea, select, [contenteditable]') ||
        document.querySelector('dialog[open], .workflow-backdrop:not([hidden])') ||
        !canvas.getClientRects().length || !selectedNodes.size) return
    event.preventDefault()
    deleteNodes(selectedNodes)
  })
  const duplicateNode = (id, mode = 'deep') => {
    const source = nodes.get(id)
    if (!source || graphLocked()) return
    const position = { x: source.x + GRID_X, y: source.y }
    // Place the independent copy beside the source without covering another block.
    while ([...nodes.values()].some(node => Math.abs(node.x - position.x) < GRID_X && Math.abs(node.y - position.y) < GRID_Y)) {
      position.y += GRID_Y
    }
    const copy = copyNode(source, `node-${nextId++}`, position, mode)
    nodes.set(copy.id, copy)
    selectedNodes.clear(); selectedNodes.add(copy.id)
    pending = null; closeConnectionMenu(); render()
    setHint(mode === 'shallow' ? '已浅拷贝：节点和参数独立，复用输入文件' : '已深拷贝：节点、参数和输入文件均已复制，保存后持久保留')
  }
  const replaceNode = (id, type) => {
    const node = nodes.get(id)
    if (!node || node.type === type || graphLocked()) return
    invalidate(id)
    actions.preview(`node-preview-${id}`, null)
    // Keep the block identity and compatible audio connections; reset model-specific settings.
    edges = edges.flatMap(edge => {
      if (edge.from === id) {
        const target = nodes.get(edge.to)
        return inputPorts(target).includes(edge.toPort) ? [edge] : []
      }
      if (edge.to !== id) return [edge]
      const port = edge.toPort === 'text' ? 'text' : edge.toPort === 'reference' ? 'reference' : primaryPort({ type })
      return inputPorts({ type }).includes(port) ? [{ ...edge, toPort: port }] : []
    })
    pending = null; closeConnectionMenu()
    addNode(type, { id, x: node.x, y: node.y })
    setHint('节点已替换，兼容连线已保留')
  }
  const placeContextMenu = (x, y, focusTarget) => {
    connectionMenu.hidden = false
    const rect = connectionMenu.getBoundingClientRect()
    connectionMenu.style.left = `${Math.max(8, Math.min(x, innerWidth - rect.width - 8))}px`
    connectionMenu.style.top = `${Math.max(8, Math.min(y, innerHeight - rect.height - 8))}px`
    focusTarget?.focus({ preventScroll: true })
  }
  const searchNodes = (x, y, replaceId = null, addPoint = null) => {
    closeConnectionMenu(); pending = null
    const point = addPoint || worldPoint(x, y)
    const search = document.createElement('input')
    search.type = 'search'
    search.placeholder = replaceId ? '搜索替换节点…' : '搜索节点…'
    search.setAttribute('aria-label', search.placeholder)
    search.autocomplete = 'off'
    const results = document.createElement('div')
    results.className = 'node-search-results'
    results.setAttribute('role', 'group')
    const normalize = (text) => text.toLocaleLowerCase().replace(/[\s._-]+/g, '')
    const matches = (title, query) => {
      let index = 0
      for (const char of title) if (char === query[index]) index++
      return index === query.length
    }
    const update = () => {
      const query = normalize(search.value)
      const items = availableNodes.filter((item) => (!replaceId || item.type !== nodes.get(replaceId)?.type) && matches(normalize(item.title + item.type), query))
      results.replaceChildren()
      for (const item of items) {
        const button = document.createElement('button')
        button.type = 'button'; button.setAttribute('role', 'menuitem')
        const icon = document.createElement('span')
        icon.className = 'node-search-icon'; icon.innerHTML = item.icon
        const title = document.createElement('span'); title.textContent = item.title
        button.append(icon, title)
        button.draggable = true
        button.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData('application/x-ai-flow-node', item.type)
          event.dataTransfer.effectAllowed = 'copy'
        })
        button.addEventListener('dragend', closeConnectionMenu)
        button.addEventListener('click', () => {
          if (graphLocked()) return
          if (replaceId) replaceNode(replaceId, item.type)
          else { addNode(item.type, point); closeConnectionMenu(); setHint('节点已添加') }
        })
        results.append(button)
      }
      if (!items.length) { const empty = document.createElement('p'); empty.textContent = '没有匹配的节点'; results.append(empty) }
    }
    search.addEventListener('input', update)
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); results.querySelector('button')?.click() }
    })
    connectionMenu.append(search, results); update(); placeContextMenu(x, y, search)
  }
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault(); pending = null; closeConnectionMenu()
    const card = event.target.closest('[data-node-card]')
    const point = worldPoint(event.clientX, event.clientY)
    const selection = [...selectedNodes].map(id => nodes.get(id)).filter(Boolean)
    if(activeTask && taskLocked) {
      if(card && nodes.get(card.dataset.nodeCard)?.type==='compound'){const b=document.createElement('button');b.textContent='下钻';b.onclick=()=>{closeConnectionMenu();enterCompound(nodes.get(card.dataset.nodeCard))};connectionMenu.append(b);placeContextMenu(event.clientX,event.clientY,b)}
      return
    }
    const inSelection = card ? selectedNodes.has(card.dataset.nodeCard) : selection.length > 1 &&
      point.x >= Math.min(...selection.map(n => n.x)) && point.x <= Math.max(...selection.map(n => n.x + GRID_X)) &&
      point.y >= Math.min(...selection.map(n => n.y)) && point.y <= Math.max(...selection.map(n => n.y + GRID_Y))
    if (selection.length > 1 && inSelection) {
      const heading = document.createElement('strong'); heading.textContent = `已选择 ${selection.length} 个节点`
      const remove = document.createElement('button')
      remove.type = 'button'; remove.setAttribute('role', 'menuitem'); remove.className = 'danger-text'
      remove.textContent = '删除节点'; remove.disabled = busy || flowRunning || activeRuns.size > 0
      remove.addEventListener('click', () => deleteNodes(selection.map(n => n.id)))
      const merge = document.createElement('button'); merge.type = 'button'; merge.textContent = '合并为复合节点'; merge.disabled = remove.disabled; merge.onclick = () => groupSelection(selection);
      const loopShell = document.createElement('button'); loopShell.type = 'button'; loopShell.textContent = '复合为 For 循环'; loopShell.disabled = remove.disabled; loopShell.onclick = () => groupSelection(selection, true);
      connectionMenu.append(heading, merge, loopShell, remove); placeContextMenu(event.clientX, event.clientY, remove)
      return
    }
    if (!card) { searchNodes(event.clientX, event.clientY); return }
    const id = card.dataset.nodeCard
    selectedNodes.clear(); selectedNodes.add(id); paintSelection()
    const heading = document.createElement('strong'); heading.textContent = nodes.get(id)?.title || '节点'
    connectionMenu.append(heading)
    for (const [title, action] of [
      ...(nodes.get(id)?.type === 'compound' ? [['下钻', () => enterCompound(nodes.get(id))], ['重命名', () => renameCompound(id)], ['解除复合节点', () => ungroup(nodes.get(id))]] : []),
      ...(nodes.get(id)?.type === 'compound'
        ? [['深拷贝（含输入文件）', () => duplicateNode(id, 'deep')], ['浅拷贝（复用输入文件）', () => duplicateNode(id, 'shallow')]]
        : [['复制节点', () => duplicateNode(id)]]),
      ...(!nodes.get(id)?.params?.forLoop ? [['复合为 For 循环', () => groupSelection([nodes.get(id)], true)]] : []),
      ['替换节点', () => searchNodes(event.clientX, event.clientY, id)],
      ['删除节点', () => deleteNode(id)],
    ]) {
      const button = document.createElement('button')
      button.type = 'button'; button.setAttribute('role', 'menuitem'); button.textContent = title
      button.disabled = busy || [...nodes.values()].some((node) => node.running)
      if (title === '删除节点') button.classList.add('danger-text')
      button.addEventListener('click', action); connectionMenu.append(button)
    }
    placeContextMenu(event.clientX, event.clientY, connectionMenu.querySelector('button:not(:disabled)'))
  })

  const breadcrumbs = document.createElement('div'); breadcrumbs.className = 'compound-breadcrumbs'; breadcrumbs.hidden = true; canvas.before(breadcrumbs)
  const updateBreadcrumbs = () => {
    breadcrumbs.hidden = !drillStack.length
    breadcrumbs.replaceChildren()
    const back = document.createElement('button'); back.className = 'secondary-button'; back.textContent = '← 返回上层'; back.onclick = leaveCompound
    const path = document.createElement('strong'); path.textContent = [workflowName, ...drillStack.map(frame => frame.group.title)].join(' / ')
    const note = document.createElement('span'); note.textContent = '内部配置随工作流保存 · 边界端口保持创建时的映射'
    breadcrumbs.append(back, path, note)
  }
  const groupSelection = (selection, forLoop = false) => {
    if (graphLocked()) return
    const ids = new Set(selection.map(n => n.id)), id = `node-${nextId++}`
    const x = Math.min(...selection.map(n => n.x)), y = Math.min(...selection.map(n => n.y))
    const inputs = [], outputs = snapshotOutputs(selection, edges)
    const mapped = edges.filter(e => !(ids.has(e.from) && ids.has(e.to))).map(e => {
      if (ids.has(e.to)) {
        let port = inputs.find(p => p.node === e.to && p.port === e.toPort)
        if (!port) { port = { id: `input-${inputs.length}`, node: e.to, port: e.toPort, label: `${nodes.get(e.to).title} · ${inputLabel(nodes.get(e.to), e.toPort)}` }; inputs.push(port) }
        return { ...e, to: id, toPort: port.id }
      }
      if (ids.has(e.from)) {
        let port = outputs.find(p => p.node === e.from && p.port === (e.fromPort || 'out'))
        return { ...e, from: id, fromPort: port.id }
      }
      return e
    })
    if (forLoop) {
      for (const n of selection) for (const port of inputPorts(n)) {
        if (edges.some(e => e.to === n.id && e.toPort === port) || inputs.some(p => p.node === n.id && p.port === port)) continue
        inputs.push({ id: `input-${inputs.length}`, node: n.id, port, label: `${n.title} · ${inputLabel(n, port)}` })
      }
    }
    const group = { id, type: 'compound', title: forLoop ? 'For 循环' : '复合节点', x, y, params: forLoop ? { forLoop: true, columns: inputs.map((p, i) => ({ id: p.id, name: p.label, items: [], enabled: true })) } : {}, inputs, outputs, graph: { nodes: selection.map(n => ({ ...n, x: n.x - x, y: n.y - y })), edges: edges.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => ({ ...e })) } }
    expandGraph({ nodes: [...nodes.values()].filter(n => !ids.has(n.id)).concat(group), edges: mapped })
    // Grouping non-contiguous parts of a DAG can introduce a boundary cycle.
    const remaining = new Set([...nodes.keys()].filter(n => !ids.has(n)).concat(id))
    while (remaining.size) { const ready = [...remaining].filter(n => !mapped.some(e => e.to === n && remaining.has(e.from))); if (!ready.length) { setHint('这些节点合并后会形成循环，请一起选择中间节点', true); return }; ready.forEach(n => remaining.delete(n)) }
    ids.forEach(n => nodes.delete(n)); nodes.set(id, group); edges = mapped
    selectedNodes.clear(); selectedNodes.add(id); closeConnectionMenu(); render(); setHint(forLoop ? '已复合为 For 循环；点击配置设置各输入列表，右键下钻或解除' : '已合并为复合节点；右键菜单可下钻或解除')
  }
  const ungroup = group => {
    if (graphLocked()) return
    const idMap = new Map(group.graph.nodes.map(n => [n.id, `node-${nextId++}`]))
    const mapped = edges.map(e => {
      const result = { ...e }
      if (e.to === group.id) { const p = group.inputs.find(p => p.id === e.toPort); result.to = idMap.get(p.node); result.toPort = p.port }
      if (e.from === group.id) { const p = group.outputs.find(p => p.id === (e.fromPort || 'out')); result.from = idMap.get(p.node); result.fromPort = p.port }
      return result
    })
    nodes.delete(group.id); selectedNodes.clear()
    group.graph.nodes.forEach(n => { const id = idMap.get(n.id); nodes.set(id, { ...n, id, x: n.x + group.x, y: n.y + group.y }); selectedNodes.add(id) })
    edges = mapped.concat(group.graph.edges.map(e => ({ ...e, from: idMap.get(e.from), to: idMap.get(e.to) })))
    closeConnectionMenu(); render(); setHint('已解除复合节点，内部节点和连线已恢复')
  }
  const enterCompound = async group => {
    if (busy || (flowRunning || activeRuns.size) && (!activeTask || !taskLocked)) return
    drillStack.push({ group, nodes: [...nodes.values()], edges, history: history.slice(), historyIndex, savedStateKey, nextId, viewport: viewportSnapshot() })
    const boundaryValues = []
    for (const port of group.inputs || []) {
      const file = group.params?.forLoop && group.params.columns?.some(c => c.id === port.id && c.enabled !== false) ? forSample(group, port.id) : resolveInput(group.id, port.id)
      let child = group.graph.nodes.find(n => n.id === port.node), slot = port.port
      while (child?.type === 'compound') {
        const inner = child.inputs?.find(p => p.id === slot)
        if (!inner) break
        slot = inner.port; child = child.graph.nodes.find(n => n.id === inner.node)
      }
      if (!child || !file) continue
      const binding = { child, slot, file, original: inputFile(child, slot), originalParams: child.params }
      if (slot === 'text') {
        const text = await file.text(), prefix = child.type === 'chatterbox-read' ? 'chatterbox' : child.type
        child.params = { ...child.params, text, ui: { ...child.params?.ui, [`${prefix}-text`]: text } }
        binding.boundParams = child.params
      } else setInputFile(child, slot, file)
      boundaryValues.push(binding)
    }
    drillStack.at(-1).boundaryValues = boundaryValues
    nodes=new Map(group.graph.nodes.map(n=>[n.id,n])); edges = group.graph.edges.map(e => ({ ...e }))
    nextId = Math.max(0, ...[...nodes.keys()].map(id => Number(id.replace(/\D/g, '')) || 0)) + 1
    history.length = 0; historyIndex = -1; savedStateKey = null; selectedNodes.clear(); pending = null; closeConnectionMenu(); restoreViewport(group.graph.viewport); render(); savedStateKey=history[historyIndex]?.key; updateWorkflowName(); updateBreadcrumbs()
  }
  const leaveCompound = () => {
    if (busy || (flowRunning || activeRuns.size) && (!activeTask || !taskLocked) || !drillStack.length) return
    const frame = drillStack[drillStack.length - 1]
    if (frame.group.inputs.some(p => !nodes.has(p.node)) || frame.group.outputs.some(p => !nodes.has(p.node))) { setHint('边界节点已删除，请撤销删除后返回；边界映射需要保持有效', true); return false }
    for (const { child, slot, file, original, originalParams, boundParams } of frame.boundaryValues || []) {
      if (slot === 'text') { if (child.params === boundParams) child.params = originalParams }
      else if (inputFile(child, slot) === file) setInputFile(child, slot, original || null)
    }
    frame.group.graph = { nodes: [...nodes.values()], edges, viewport: viewportSnapshot() }
    drillStack.pop(); nodes=new Map(frame.nodes.map(n=>[n.id,n])); edges = frame.edges
    history.splice(0, history.length, ...frame.history); historyIndex = frame.historyIndex; savedStateKey = frame.savedStateKey; nextId = frame.nextId
    const priorOutput = frame.group.output
    const newResults = Object.fromEntries((frame.group.outputs || []).map(p => [p.id, frame.group.graph.nodes.find(n => n.id === p.node)?.type === 'compound' ? frame.group.graph.nodes.find(n => n.id === p.node)?.results?.[p.port || 'out'] : frame.group.graph.nodes.find(n => n.id === p.node)?.output]))
    const newOutput = Object.values(newResults).at(-1) || null
    if(!flowRunning && !activeRuns.size){
      if(!activeTask || !taskLocked || newOutput !== priorOutput)invalidate(frame.group.id)
      frame.group.results=newResults;frame.group.output=newOutput
    }
    selectedNodes.clear(); restoreViewport(frame.viewport); closeConnectionMenu(); render(); updateBreadcrumbs(); return true
  }
  const addTrigger = byId('node-add-trigger')
  addTrigger.addEventListener('pointerdown', (event) => event.stopPropagation())
  addTrigger.addEventListener('click', () => {
    if (addTrigger.getAttribute('aria-expanded') === 'true') { closeConnectionMenu(); return }
    const anchor = addTrigger.getBoundingClientRect()
    const rect = canvas.getBoundingClientRect()
    searchNodes(anchor.left, anchor.bottom + 8, null, worldPoint(rect.left + rect.width / 2 - GRID_X / 2, rect.top + 24))
    addTrigger.setAttribute('aria-expanded', 'true')
  })
  canvas.addEventListener('dragover', (event) => { if ([...event.dataTransfer.types].includes('application/x-ai-flow-node')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' } })
  canvas.addEventListener('drop', (event) => { const type = event.dataTransfer.getData('application/x-ai-flow-node'); if (!catalog.some((item) => item.type === type)) return; event.preventDefault(); if (graphLocked()) return; addNode(type, worldPoint(event.clientX, event.clientY)) })
  canvas.addEventListener('click', (event) => {
    if (!pending || event.target.closest('button')) return
    const card = event.target.closest('[data-node-card]')
    if (card) chooseConnection(card.dataset.nodeCard, event.clientX, event.clientY)
  })
  canvas.addEventListener('wheel', (event) => {
    if (event.target.closest('select, textarea, input')) return
    event.preventDefault()
    const point = worldPoint(event.clientX, event.clientY)
    const rect = canvas.getBoundingClientRect()
    view.zoom = Math.max(.05, Math.min(1.6, view.zoom * Math.exp(-event.deltaY * .001)))
    view.x = event.clientX - rect.left - point.x * view.zoom
    view.y = event.clientY - rect.top - point.y * view.zoom
    applyView()
    persistViewport()
  }, { passive: false })
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    const port = event.target.closest('.node-port')
    const heading = event.target.closest('[data-node-card]')
    const card = event.target.closest('[data-node-card]')
    if (event.target.closest('button, audio, input, select, textarea')) { if (!port) return }
    if (activeTask && taskLocked && (port || heading)) return
    if (!port && !heading && card) return
    if (!port && !heading && event.target.closest('path')) return
    event.preventDefault()
    const start = { x: event.clientX, y: event.clientY }
    const node = card && nodes.get(card.dataset.nodeCard)
    const origin = heading ? { x: node.x, y: node.y } : { x: view.x, y: view.y }
    const selecting = !port && !heading && canvasTool === 'select'
    const selectionStart = worldPoint(start.x, start.y)
    if (heading && !port && !selectedNodes.has(node.id)) { selectedNodes.clear(); selectedNodes.add(node.id); paintSelection() }
    const dragOrigins = new Map([...selectedNodes].filter(id => nodes.has(id)).map(id => [id, { x: nodes.get(id).x, y: nodes.get(id).y }]))
    let selectionBox = null
    if (selecting) {
      selectedNodes.clear(); paintSelection()
      selectionBox = document.createElement('div'); selectionBox.className = 'node-selection-box'; world.append(selectionBox)
    }
    let moved = false
    let ghost = null
    if (port) {
      ghost = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      ghost.setAttribute('class', 'node-edge node-edge-preview')
      edgesSvg.append(ghost)
    }
    const move = (e) => {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4 && !moved) return
      moved = true
      if (port) {
        const rect = port.getBoundingClientRect()
        const a = worldPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        const b = worldPoint(e.clientX, e.clientY)
        ghost.setAttribute('d', `M ${a.x} ${a.y} C ${a.x + 80} ${a.y}, ${b.x - 80} ${b.y}, ${b.x} ${b.y}`)
      } else if (selecting) {
        const point = worldPoint(e.clientX, e.clientY)
        const left = Math.min(selectionStart.x, point.x), top = Math.min(selectionStart.y, point.y)
        const right = Math.max(selectionStart.x, point.x), bottom = Math.max(selectionStart.y, point.y)
        Object.assign(selectionBox.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, right - left)}px`, height: `${Math.max(0, bottom - top)}px` })
        selectedNodes.clear()
        nodes.forEach(n => { if (n.x < right && n.x + GRID_X > left && n.y < bottom && n.y + GRID_Y > top) selectedNodes.add(n.id) })
        paintSelection()
      } else if (heading) {
        const dx = (e.clientX - start.x) / view.zoom
        const dy = (e.clientY - start.y) / view.zoom
        dragOrigins.forEach((position, id) => {
          const n = nodes.get(id); n.x = snapX(position.x + dx); n.y = snapY(position.y + dy)
          const element = cards.querySelector(`[data-node-card="${id}"]`)
          if (element) { element.style.left = `${n.x}px`; element.style.top = `${n.y}px` }
        })
        paintSelection(); drawEdges()
      } else { view.x = origin.x + e.clientX - start.x; view.y = origin.y + e.clientY - start.y; applyView() }
    }
    const up = (e) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel)
      ghost?.remove(); selectionBox?.remove()
      if (moved && heading && !port) render()
      if (moved) {
        canvas.addEventListener('click', (click) => { click.stopPropagation(); click.preventDefault() }, { capture: true, once: true })
        if (!heading && !port && !selecting) persistViewport()
        if (port) {
          const targetElement = document.elementFromPoint(e.clientX, e.clientY)
          const targetCard = targetElement?.closest('[data-node-card]')
          if (port.matches('.output-port') && targetCard && targetCard !== card) {
            pendingOutput = port.dataset.connectFrom; pending = card.dataset.nodeCard
            chooseConnection(targetCard.dataset.nodeCard, e.clientX, e.clientY, targetElement?.closest('.input-port')?.dataset.connectTo)
          } else if (port.matches('.input-port')) {
            const output = targetElement?.closest('.output-port')
            if (output) { pendingOutput = output.dataset.connectFrom; pending = output.closest('[data-node-card]').dataset.nodeCard; chooseConnection(card.dataset.nodeCard, e.clientX, e.clientY, port.dataset.connectTo) }
          }
        }
      }
    }
    const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); ghost?.remove(); selectionBox?.remove() }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel)
  })
  new ResizeObserver(() => requestAnimationFrame(drawEdges)).observe(cards)
  const saveWorkflow = async (exit = false) => {
    if(activeTask){if(taskLocked){setHint('请先解锁任务再保存模板');return};exit=false}
    while (drillStack.length) { if (!leaveCompound()) return }
    if (graphLocked() || saving) return
    const data = snapshot(); if (!data.nodes.length) { setHint('先添加至少一个节点再保存', true); return }
    saving = true
    try {
      const existing = readSaved().find(item => item.id === editingWorkflowId)
      const name = existing ? existing.name : await requestWorkflowName('保存工作流', workflowName === '未命名工作流' ? '' : workflowName)
      if (!name?.trim()) return
      const saved = readSaved()
      const duplicate = !existing && saved.find(item => item.name.trim() === name.trim())
      if (duplicate && !await confirmWorkflowOverwrite(name.trim())) return
      const id = existing?.id || duplicate?.id || crypto.randomUUID?.() || `flow-${Date.now()}`
      const graph = { ...snapshot(), viewport: viewportSnapshot(), name: name.trim(), id, updatedAt: Date.now() }
      const index = saved.findIndex(item => item.id === id)
      if (index < 0) saved.unshift(graph)
      else saved[index] = graph
      await saveWorkflowInputs(id, [...nodes.values()], () => writeSaved(saved))
      workflowName = graph.name; editingWorkflowId = id; if(activeTask){activeTask.templateId=id;await syncTask(true)}
      // Commit attachments first. Until this succeeds, undo keeps the old files alive.
      captureHistory(); savedStateKey = history[historyIndex]?.key; updateWorkflowName()
      if (exit) loadSnapshot({ name: '未命名工作流', nodes: [], edges: [] })
      renderSaved()
      if (exit) actions.navigate('saved')
      if(activeTask) {taskManager.checkpoint(activeTask);setHint('已保存当前任务，并更新工作流模板')} else setHint('工作流、输入文件及节点配置已保存')
      cleanupWorkflowInputs().catch(error => console.warn('工作流附件清理失败，将在下次打开时重试', error))
    } catch { setHint('保存失败，请检查后台服务与磁盘空间', true) }
    finally { saving = false }
  }
  byId('node-workflow-save').addEventListener('click', () => saveWorkflow(true))
  window.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 's' || document.querySelector('.page-content')?.dataset.page !== 'testing') return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.repeat) return
    if (saving) { setHint('正在保存，请稍候'); return }
    if ([...document.querySelectorAll('dialog[open], .workflow-backdrop')].some(el => el.getClientRects().length)) { setHint('请先关闭配置窗口，再保存工作流'); return }
    if(activeTask)saveTask();else saveWorkflow()
  }, { capture: true })
  byId('node-workflow-arrange').addEventListener('click', () => {
    if (graphLocked()) return
    // Cards and major cells have identical dimensions, so aligned origins center the cards.
    nodes.forEach((node) => {
      node.x = Math.round(node.x / GRID_X) * GRID_X
      node.y = Math.round(node.y / GRID_Y) * GRID_Y
    })
    render()
    setHint('已整理到就近大格子中心')
  })
  byId('node-workflow-clear').addEventListener('click', () => {
    if (saving || busy || flowRunning || activeRuns.size) return
    if (hasUnsavedChanges() && !window.confirm('工作流有未保存的改动，确定新建吗？')) return
    loadSnapshot({ name: '未命名工作流', nodes: [], edges: [] })
    restoreViewport(null)
    setHint('添加节点开始编排')
    actions.navigate('testing')
  })
  window.addEventListener('resize', drawEdges)
  mountWorkflowTransfer({ readSaved, writeSaved, supportedTypes: catalog.map(item => item.type), renderSaved })
  loadSnapshot({ name: '未命名工作流', nodes: [], edges: [] })
  renderSaved()

}
