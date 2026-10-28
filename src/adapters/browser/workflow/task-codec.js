const fileReferences = new WeakMap()
// JSON transport for durable task graphs; File identity is shared across snapshots.
export async function encodeTask(value) {
  if (value instanceof Blob) {
    if(fileReferences.has(value))return fileReferences.get(value)
    const pending = (async () => {
      const response = await fetch('/api/workflow-runtime/upload', { method: 'POST', body: value })
      const ref = await response.json()
      if (!response.ok) throw new Error(ref.error || '任务文件上传失败')
      return { ...ref, name: value.name || 'audio.wav', type: value.type, lastModified: value.lastModified }
    })()
    fileReferences.set(value, pending)
    try { const ref = await pending; fileReferences.set(value, ref); return ref }
    catch (error) { fileReferences.delete(value); throw error }
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeTask))
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).filter(([key]) => !['controller','configuring','deleted'].includes(key)).map(async ([k,v]) => [k, await encodeTask(v)])))
  return value
}
// Tasks and previews own live File objects. The decoder must not retain every
// historical retry result for the lifetime of the browser tab.
const files = new Map(), pendingFiles = new Map()
export async function decodeTask(value) {
  if (value?.__runtimeFile) {
    const key = `${value.__runtimeFile}/${value.name}/${value.type}`
    const existing = files.get(key)?.deref()
    if (existing) return existing
    if (!pendingFiles.has(key)) pendingFiles.set(key, (async () => {
      const r = await fetch(`/api/workflow-runtime/files/${value.__runtimeFile}`)
      if (!r.ok) throw new Error('无法读取任务文件')
      const file = new File([await r.blob()], value.name, {type:value.type,lastModified:value.lastModified})
      fileReferences.set(file,value); files.set(key,new WeakRef(file))
      if (files.size > 2048) for (const [id, ref] of files) if (!ref.deref()) files.delete(id)
      return file
    })())
    try { return await pendingFiles.get(key) } finally { pendingFiles.delete(key) }
  }
  if (Array.isArray(value)) return Promise.all(value.map(decodeTask))
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k,v]) => [k, await decodeTask(v)])))
  return value
}
