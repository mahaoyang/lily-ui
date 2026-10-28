export function createJobEvents({ fetch, EventSource, baseUrl = '' }) {
// One SSE lifecycle for basic nodes and graph execution.
function watchJobEvents(jobId, { signal, onStatus, onStream } = {}) {
  return new Promise((resolve, reject) => {
    let events, settled = false
    const finish = error => {
      if (settled) return
      settled = true
      events?.close()
      onStream?.(null)
      signal?.removeEventListener('abort', cancel)
      error ? reject(error) : resolve()
    }
    const cancel = () => {
      fetch(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }).catch(() => {})
      finish(new DOMException('已停止', 'AbortError'))
    }
    if (signal?.aborted) { cancel(); return }
    signal?.addEventListener('abort', cancel, { once: true })
    events = new EventSource(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}/events`)
    onStream?.(events)
    events.onmessage = ({ data }) => {
      let status
      try { status = JSON.parse(data) } catch { return }
      onStatus?.(status)
      if (status.phase === 'complete') finish()
      else if (['error', 'cancelled'].includes(status.phase)) finish(new Error(status.error || status.message || '处理失败'))
    }
    events.onerror = () => finish(new Error('进度连接中断，请重新运行'))
  })
}

return { watchJobEvents };
}
