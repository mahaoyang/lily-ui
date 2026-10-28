import { h } from '../lib/dom.js'
import { apiFetch } from '../../../adapters/browser/browser-manager/client.js'

// Only catalog identifiers leave the browser UI. Credentials stay on the server.
export function NodePicker(profile = {}) {
  const node = h('select', { 'aria-label': '代理节点' })
  const protocol = h('select', { 'aria-label': '节点协议' })
  const note = h('p', { class: 'settings-note', role: 'status' }, '正在读取节点…')
  const root = h('div', { class: 'settings-grid node-binding-picker' },
    h('label', { class: 'settings-field' }, h('span', {}, '代理节点'), node),
    h('label', { class: 'settings-field' }, h('span', {}, '协议'), protocol),
    h('div', { class: 'node-picker-caption' }, note, h('a', { href: '#/nodes', onclick: () => document.querySelector('.console-modal-close')?.click() }, '管理代理包')))
  let nodes = []
  let loaded = false
  const reset = select => { if (select.tomselect) select.tomselect.destroy(); select.replaceChildren() }
  const sync = (preferred) => {
    reset(protocol)
    const selected = nodes.find(n => n.id === node.value)
    for (const type of selected?.protocols || []) protocol.append(h('option', { value: type }, type === 'hy2' ? 'Hysteria 2' : type.toUpperCase()))
    if (selected?.protocols.includes(preferred)) protocol.value = preferred
    protocol.disabled = !selected
    note.textContent = node.value && !selected ? '缺少绑定节点，请导入代理包或重新选择。' : selected ? `地区：${selected.geo?.timezone || '未设置，请在代理包维护'}` : '使用本机网络出口。'
  }
  const ready = apiFetch('/api/nodes').then(data => {
    nodes = data.items || []
    reset(node)
    node.append(h('option', { value: '' }, '不使用代理（直连）'))
    for (const item of nodes) node.append(h('option', { value: item.id }, item.name))
    if (profile.proxyNodeId && !nodes.some(n => n.id === profile.proxyNodeId)) node.append(h('option', { value: profile.proxyNodeId }, '缺少绑定节点'))
    node.value = profile.proxyNodeId || ''
    sync(profile.settings?.proxyProtocol)
    loaded = true
  }).catch(error => { note.textContent = `节点库读取失败：${error.message}` })
  node.addEventListener('change', () => sync(protocol.value))
  return { root, ready, node, protocol,
    value() {
      if (!loaded) throw new Error('节点库尚未加载成功。')
      if (node.value && !nodes.some(n => n.id === node.value)) throw new Error('缺少绑定节点，请先复制节点库。')
      return { proxyNodeId: node.value || null, protocol: protocol.value || undefined }
    },
    check(profileId) {
      const value = this.value()
      if (!value.proxyNodeId) throw new Error('请先选择代理节点。')
      return apiFetch('/api/proxy/check', { method: 'POST', body: JSON.stringify({ nodeId: value.proxyNodeId, protocol: value.protocol, profileId }) })
    }
  }
}
