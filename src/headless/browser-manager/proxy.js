// Share links stay in the local workbench; never send them to a parsing service.
export function formatProxy(proxy) {
  if (!proxy) return ''
  const host = proxy.host.includes(':') && !proxy.host.startsWith('[') ? `[${proxy.host}]` : proxy.host
  const params = new URLSearchParams()
  let auth = ''
  if (proxy.type === 'ss') {
    const bytes = new TextEncoder().encode(`${proxy.method || 'aes-256-gcm'}:${proxy.password || ''}`)
    auth = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    if (proxy.plugin) params.set('plugin', proxy.plugin + (proxy.pluginOpts ? `;${proxy.pluginOpts}` : ''))
  } else if (proxy.type === 'hy2') {
    auth = encodeURIComponent(proxy.password || '')
    if (proxy.serverName) params.set('sni', proxy.serverName)
    if (proxy.insecure) params.set('insecure', '1')
    if (proxy.obfsPassword) { params.set('obfs', 'salamander'); params.set('obfs-password', proxy.obfsPassword) }
  } else if (proxy.username) {
    auth = encodeURIComponent(proxy.username) + (proxy.password !== undefined ? `:${encodeURIComponent(proxy.password)}` : '')
  }
  return `${proxy.type}://${auth ? `${auth}@` : ''}${host}:${proxy.port}${params.size ? `?${params}` : ''}`
}

export function parseProxy(value) {
  if (!value.trim()) return undefined
  try {
    let text = value.trim()
    const base64 = value => {
      const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
      return new TextDecoder().decode(Uint8Array.from(decoded, c => c.charCodeAt(0)))
    }
    if (text.startsWith('ss://') && !text.slice(5).split(/[?#]/)[0].includes('@')) {
      const end = text.slice(5).search(/[?#]/)
      const body = end < 0 ? text.slice(5) : text.slice(5, end + 5)
      const suffix = end < 0 ? '' : text.slice(end + 5)
      text = `ss://${base64(body)}${suffix}`
    }
    const url = new URL(text)
    const type = url.protocol === 'hysteria2:' ? 'hy2' : url.protocol.slice(0, -1)
    if (!['http', 'https', 'socks5', 'ss', 'hy2'].includes(type) || !url.hostname || (url.pathname && url.pathname !== '/')) throw Error()
    const port = Number(url.port || (type === 'hy2' ? 443 : type === 'http' ? 80 : type === 'https' ? 443 : 0))
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error()
    const proxy = { type, host: url.hostname.replace(/^\[|\]$/g, ''), port }
    const user = decodeURIComponent(url.username), password = decodeURIComponent(url.password)
    if (type === 'ss') {
      const credentials = url.password ? `${user}:${password}` : base64(user)
      const colon = credentials.indexOf(':')
      if (colon < 1) throw Error()
      proxy.method = credentials.slice(0, colon); proxy.password = credentials.slice(colon + 1)
      if (!proxy.password) throw Error()
      for (const key of url.searchParams.keys()) if (key !== 'plugin') throw Error()
      const plugin = url.searchParams.get('plugin')
      if (plugin) { const split = plugin.indexOf(';'); proxy.plugin = split < 0 ? plugin : plugin.slice(0, split); proxy.pluginOpts = split < 0 ? '' : plugin.slice(split + 1) }
    } else if (type === 'hy2') {
      for (const key of url.searchParams.keys()) if (!['sni', 'insecure', 'obfs', 'obfs-password'].includes(key)) throw Error()
      proxy.password = user + (url.password ? `:${password}` : '')
      if (!proxy.password) throw Error()
      if (url.searchParams.has('sni')) proxy.serverName = url.searchParams.get('sni')
      const insecure = url.searchParams.get('insecure')
      if (insecure && !['0', '1', 'true', 'false'].includes(insecure)) throw Error()
      proxy.insecure = insecure === '1' || insecure === 'true'
      const obfs = url.searchParams.get('obfs')
      if (obfs && obfs !== 'salamander') throw Error()
      if (obfs === 'salamander') { proxy.obfsPassword = url.searchParams.get('obfs-password'); if (!proxy.obfsPassword) throw Error() }
      else if (url.searchParams.has('obfs-password')) throw Error()
    } else {
      if (url.search || url.hash) throw Error()
      if (user) proxy.username = user
      if (password) proxy.password = password
    }
    return proxy
  } catch {
    throw new Error('节点链接无效或含暂不支持的参数。支持 HTTP、SOCKS5、SS 和 HY2；HY2 支持 SNI、证书校验选项和 Salamander 混淆。')
  }
}
