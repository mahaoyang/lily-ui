export class ApiError extends Error {
  constructor(message, options) {
    super(message)
    this.name = 'ApiError'
    this.status = options?.status
    this.body = options?.body
  }
}


export function createBrowserManagerClient({ fetch, baseUrl = '', onUnauthorized } = {}) {
const resolve = path => baseUrl ? new URL(path, baseUrl).href : path;
let environment
async function spaceHeaders() {
  // The server resolves the installed OS space.  Keep this helper for callers
  // that still use it, but never let the UI override the space namespace.
  if (!environment) environment = (await (await fetch(resolve('/api/health'), { cache: 'no-store' })).json()).env
  return {}
}

async function apiFetch(path, options = {}) {
  // New static assets can be served by an old, still-running backend after a build.
  // Never silently discard new protection settings on that older API.
  if (options.body && ['POST', 'PATCH', 'PUT'].includes(options.method)) {
    let settings
    try { settings = JSON.parse(options.body)?.settings } catch {}
    if (settings && ('privacyEngine' in settings || 'hardwareProtection' in settings)) {
      const health = await fetch(resolve('/api/health'), { cache: 'no-store' })
      const state = await health.json().catch(() => null)
      if (!health.ok || state?.capabilities?.hardwarePolicyVersion !== 2) {
        throw new ApiError('后台仍是旧版本，请关闭活动环境并重启 FinPri 服务后再保存。此次未提交保护设置。')
      }
    }
  }
  const headers = new Headers(options.headers || {})
  if (path !== '/api/health') {
    for (const [key, value] of Object.entries(await spaceHeaders())) headers.set(key, value)
  }
  if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json')

  const res = await fetch(resolve(path), { ...options, headers })
  if (res.status === 401) onUnauthorized?.()
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '')

  if (!res.ok) {
    const msg = body?.error || `HTTP ${res.status}`
    throw new ApiError(msg, { status: res.status, body })
  }
  return body
}


return { apiFetch, spaceHeaders };
}
