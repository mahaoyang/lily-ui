export function connectionCheckMessage(item) {
  if (!item?.ok) return item?.connectionOk
    ? `连接成功 · 地区未确认：${item.error || '请重试检测'}`
    : `连接失败：${item?.error || '请检查代理配置'}`
  const geo = item.geo || {}
  if (!item.geoOk) return `连接成功 · ${item.ip || '出口可用'} · ${item.latency || 0} ms`
  const location = [geo.countryCode, geo.region, geo.city].filter(Boolean).join(' · ')
  return `检测成功 · ${item.ip}${location ? ` · ${location}` : ''} · ${geo.timezone} · ${item.latency || 0} ms`
}
