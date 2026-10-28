export function createTaskRuntimeClient({ fetch, encodeTask, decodeTask }) {
async function runtimeCommand(command, task, extra = {}) {
  const response = await fetch(`/api/workflow-runtime/${command}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:task.id,...(['run','save'].includes(command)?{task:await encodeTask(task)}:{}),...extra})})
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '后台任务操作失败')
  return data
}
function watchRuntimeTasks(apply, onError, onIds, initial = []) {
  const versions = Object.fromEntries(initial.map(task => [task.id, task.runtimeRevision]))
  const controller = new AbortController()
  let stopped = false, timer, previousIds = JSON.stringify(initial.map(task => task.id))
  const poll = async () => {
    try {
      const response = await fetch('/api/workflow-runtime?versions=' + encodeURIComponent(JSON.stringify(versions)), {signal:controller.signal})
      if (!response.ok) throw new Error((await response.json()).error || '无法连接后台任务队列')
      const data = await response.json()
      if (stopped) return
      const ids = JSON.stringify(data.ids), present = new Set(data.ids)
      for (const id of Object.keys(versions)) if (!present.has(id)) delete versions[id]
      // Idle polls must not rebuild all queue cards or redownload initial files.
      if (ids !== previousIds) { onIds?.(data.ids); previousIds = ids }
      for (const packed of data.tasks) {
        const task = await decodeTask(packed)
        if (stopped) return
        await apply(task); versions[task.id] = task.runtimeRevision
      }
    } catch (error) { if (!stopped) onError?.(error) }
    if (!stopped) timer = setTimeout(poll, 800)
  }
  poll()
  return () => { stopped = true; clearTimeout(timer); controller.abort() }
}
return { runtimeCommand, watchRuntimeTasks };
}
