import { globalTaskPool } from '../../../../adapters/browser/workflow/runtime.js'
import { reviewItemId } from '../../../../headless/workflow/graph/review-item.js'
const reviewQueues = new WeakMap()
// Review keeps the actual producer identity: retry only that producer, never its siblings.
export function reviewItems(node, nodes, edges) {
  const map = nodes instanceof Map ? nodes : new Map(nodes.map(n => [n.id, n]))
  return edges.filter(e => e.to === node.id).flatMap(edge => {
    const source = map.get(edge.from)
    if (!source) return []
    if (source.iterationOutputs?.length) {
      const port = source.type === 'compound' ? edge.fromPort || 'out' : null
      const label = source.outputs?.find(p => p.id === port)?.label
      return source.iterationOutputs.map((file, index) => ({ file: port ? source.iterationResults?.[index]?.[port] || (source.outputs?.length === 1 ? file : null) : file, source, index, ...(port ? { port } : {}), label: `${source.title}${label ? ` · ${label}` : ''} · ${index + 1}` })).filter(item => item.file)
    }
    if (source.results) return Object.entries(source.results).filter(([port]) => source.type !== 'compound' || port === (edge.fromPort || 'out')).map(([port, file]) => ({ file, source, port, label: `${source.title} · ${port}` }))
    return source.output ? [{ file: source.output, source, label: source.title }] : []
  })
}
export async function openQualityReview(node, items, actions, retry, options = {}) {
  const read = typeof items === 'function' ? items : () => items
  const dialog = document.createElement('dialog'); dialog.className = 'workflow-name-dialog quality-review-dialog'
  dialog.innerHTML = '<header><h2>质检重抽</h2><button class="secondary-button" data-close aria-label="关闭">×</button></header><div data-items></div><p data-status aria-live="polite"></p><footer class="review-gate-controls"><label class="review-gate-toggle"><input type="checkbox" data-skip-checks> <span>忽略打勾，直接自动执行<small data-gate-label></small></span></label><button class="secondary-button" data-pass>Pass · 放行</button></footer>'
  const host = dialog.querySelector('[data-items]'), status = dialog.querySelector('[data-status]')
  const skip = dialog.querySelector('[data-skip-checks]'), pass = dialog.querySelector('[data-pass]')
  const gateLabel = dialog.querySelector('[data-gate-label]')
  const updateGateLabel = () => { gateLabel.textContent = skip.checked ? '已开启' : '已关闭 · 全部打勾后自动执行' }
  skip.checked = node.params?.reviewSkipChecks === true
  updateGateLabel()
  skip.onchange = async () => {
    updateGateLabel()
    node.params ||= {}; node.params.reviewSkipChecks = skip.checked
    try { await options.onGate?.({skipChecks:skip.checked}); await options.onChange?.() } catch(error) { status.textContent=error.message }
  }
  pass.onclick = async () => {
    pass.disabled=true
    try { await checkedSave; await options.onGate?.({pass:true}); node.reviewPassed=true; await options.onChange?.(); refresh() } catch(error) { status.textContent=error.message; pass.disabled=false }
  }
  const rows = new Map()
  const checkedEdits = new Map()
  const pendingRetries = new Map()
  let checkedSave = Promise.resolve()
  let queue = reviewQueues.get(node)
  if (!queue) { queue = { jobs: [], message: '' }; reviewQueues.set(node, queue) }
  const owner = options.owner || node
  const clearChecked = key => {
    node.reviewPassed=false
    checkedEdits.set(key, false)
    if (node.reviewChecked) delete node.reviewChecked[key]
    checkedSave = checkedSave.then(() => options.onChecked?.(key, false)).catch(error => {
      queue.message = `检查标记保存失败：${error.message}`
    })
  }
  const enqueue = item => {
    const key = reviewItemId(item)
    if(options.enqueueRemote) {
      if(pendingRetries.has(key) || options.remoteJobs?.().some(job=>job.key===key&&job.state==='queued'))return
      clearChecked(key)
      pendingRetries.set(key, { key, label: item.label, state: 'queued', previousIds: new Set((options.remoteJobs?.() || []).map(job => job.id)) })
      refresh()
      Promise.resolve().then(() => options.enqueueRemote(item)).catch(e=>{
        pendingRetries.delete(key)
        queue.message = `重抽提交失败：${item.label} · ${e.message}`
        queue.jobs.push({ key, label: item.label, state: 'failed', error: e.message })
      }).finally(() => { refresh() })
      return
    }
    if (queue.jobs.some(job => job.key === key && job.state === 'queued')) return
    clearChecked(key)
    const job = { key, label: item.label, state: 'queued', error: '' }
    queue.jobs.push(job)
    const ticket = globalTaskPool.enqueue({ owner, key, label: item.label, priority: 1, run: async lease => {
      const latest = read().find(value => reviewItemId(value) === key)
      if (!latest) throw new Error('该结果已被删除，无法重抽')
      job.state = 'running'; refresh()
      const file = await retry(latest, lease)
      if (!file) throw new Error('重抽没有返回结果')
      latest.file = file
      node.reviewUnheard ||= {}
      node.reviewUnheard[key] = true
      await options.onChange?.()
      return file
    } })
    job.id = ticket.id
    ticket.promise.then(() => { job.state = 'complete'; queue.message = `重抽完成：${job.label}` }, error => { job.state = 'failed'; job.error = error.message; queue.message = `重抽失败：${job.label} · ${error.message}` }).finally(() => { if (dialog.isConnected) refresh() })
    refresh()
  }
  const refresh = () => {
    if (!dialog.isConnected) return
    const remoteJobs = options.remoteJobs?.() || []
    for (const [key, pending] of pendingRetries) {
      if (remoteJobs.some(job => job.key === key && !pending.previousIds.has(job.id))) pendingRetries.delete(key)
    }
    const current = read(), keys = new Set()
    const upstreamRunning = options.isUpstreamRunning?.() ?? options.isRunning?.()
    const retryBusy = [...queue.jobs,...remoteJobs,...pendingRetries.values()].some(job=>['running','queued'].includes(job.state))
    pass.disabled = !current.length || !!upstreamRunning || retryBusy || !!node.reviewPassed
    pass.textContent = node.reviewPassed ? '已 Pass' : 'Pass · 放行'
    pass.title = upstreamRunning ? '上游 For 完成后可放行' : '无需全部打勾，手动放行后续节点' 
    current.forEach((item, i) => {
      const key = reviewItemId(item); keys.add(key)
      let entry = rows.get(key)
      if (!entry) {
        const row = document.createElement('section'); row.className = 'quality-review-row'
        const checked = document.createElement('input'); checked.type = 'checkbox'; checked.className = 'review-checked'; checked.setAttribute('aria-label', `标记第 ${i + 1} 项已检查`); checked.title = '已检查'
        const label = document.createElement('span')
        const preview = document.createElement('div'); preview.className = 'audio-preview'; preview.id = `quality-${crypto.randomUUID()}`
        const reset = document.createElement('button'); reset.className = 'secondary-button review-retry-button'; reset.title = '只重跑此结果'
        reset.innerHTML = '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10a9 9 0 1 1 2.5 8M3 4v6h6"/></svg>'
        entry = { row, checked, label, preview, reset, item, file: null }; rows.set(key, entry)
        checked.onchange = () => {
          const value = checked.checked
          checkedEdits.set(key, value)
          node.reviewChecked ||= {}
          if (value) node.reviewChecked[key] = true
          else delete node.reviewChecked[key]
          checkedSave = checkedSave.then(() => options.onChecked?.(key, value)).catch(error => {
            queue.message = `检查标记保存失败：${error.message}`
            status.textContent = queue.message
          })
        }
        reset.onclick = () => enqueue(entry.item)
        preview.addEventListener('playing', () => {
          if (!node.reviewUnheard?.[key]) return
          delete node.reviewUnheard[key]
          options.onHeard?.(key)
          options.onChange?.()
          refresh()
        }, true)
        row.append(checked, label, preview, reset); host.append(row)
      }
      entry.item = item; entry.label.textContent = item.label
      entry.checked.checked = checkedEdits.has(key) ? checkedEdits.get(key) : !!node.reviewChecked?.[key]
      entry.reset.setAttribute('aria-label', `重抽第 ${i + 1} 项`)
      const jobs = [...queue.jobs, ...(options.remoteJobs?.() || []), ...pendingRetries.values()].filter(job => job.key === key)
      const queued = jobs.filter(job => job.state === 'queued').length
      entry.reset.disabled = !retry || queued > 0
      entry.reset.setAttribute('aria-busy', String(queued > 0 || jobs.some(job => job.state === 'running')))
      const running = jobs.some(job => job.state === 'running')
      const failed = jobs.at(-1)?.state === 'failed'
      const complete = jobs.at(-1)?.state === 'complete'
      const unheard = !!node.reviewUnheard?.[key]
      entry.row.dataset.retryState = running ? 'running' : queued ? 'queued' : failed ? 'failed' : complete ? 'complete' : ''
      entry.reset.title = queued ? '已有一次待重抽' : running ? '重抽中 · 可预约下一次' : failed ? jobs.at(-1).error : '加入重抽队列'
      if (running || queued || failed || (complete && !unheard)) {
        const badge = document.createElement('b')
        badge.className = 'review-retry-badge'
        badge.textContent = running ? (queued ? '重抽中 · 已预约' : '重抽中') : queued ? '已排队' : failed ? '重抽失败' : '重抽完成'
        if (failed) badge.title = jobs.at(-1).error || ''
        entry.label.append(badge)
      }
      entry.row.dataset.unheard = String(unheard)
      if (unheard) { const badge = document.createElement('b'); badge.className = 'review-unheard-badge'; badge.textContent = '未试听'; entry.label.append(' ', badge) }
      if (entry.file !== item.file) { entry.file = item.file; actions.preview(entry.preview.id, item.file) }
    })
    for (const [key, entry] of rows) if (!keys.has(key)) { actions.preview(entry.preview.id, null); entry.row.remove(); rows.delete(key) }
    const jobs=[...queue.jobs,...(options.remoteJobs?.()||[]),...pendingRetries.values()]
    const pending = jobs.filter(job => job.state === 'queued').length
    const active = jobs.find(job => job.state === 'running')
    const activeItem = active && current.find(item => reviewItemId(item) === active.key)
    const activeLabel = activeItem?.label || active?.label || (Number.isInteger(active?.index) ? `第 ${active.index + 1} 项` : '当前结果')
    status.textContent = active ? `正在重抽 ${activeLabel}${pending ? ` · 等待 ${pending} 项` : ''}` : pending ? `等待当前节点完成 · 重抽队列 ${pending} 项` : options.isRunning?.() ? `已产生 ${current.length} 项结果 · 持续累积中` : queue.message || (current.length ? `共 ${current.length} 项结果` : '暂无结果，上游完成后会自动显示。')
  }
  document.body.append(dialog); dialog.showModal(); refresh()
  const unsubscribe = globalTaskPool.subscribe(() => { if (dialog.isConnected) refresh() })
  const timer = setInterval(refresh, 250)
  await new Promise(resolve => { const close = () => { unsubscribe(); clearInterval(timer); rows.forEach(entry => actions.preview(entry.preview.id, null)); dialog.close(); dialog.remove(); resolve() }; dialog.querySelector('[data-close]').onclick = close; dialog.oncancel = e => { e.preventDefault(); close() } })
}
