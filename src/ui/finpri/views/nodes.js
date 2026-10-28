import { h, clear } from '../lib/dom.js'
import { Button } from '../components/ui.js'
import { apiFetch } from '../../../adapters/browser/browser-manager/client.js'
import { connectionCheckMessage } from '../lib/connection-check.js'
import { openModal } from '../components/modal.js'
import { editGeo } from '../components/node-region-dialog.js'

function confirmDelete(node, bound, refresh) {
  const status = h('p', { class: 'privacy-caption', role: 'status' })
  const modal = openModal({ title: `删除 ${node.name}？`, closeOnEscape: true,
    body: h('div', { class: 'console-stack' }, h('p', {}, bound.length
      ? `仍被 ${bound.map(profile => profile.name).join('、')} 使用，请先在环境设置中更换节点。`
      : '将从本地节点库删除此节点。需要时可以重新导入代理包。'), status) })
  modal.footer.append(Button({ children: [bound.length ? '知道了' : '取消'], variant: 'soft', onclick: () => modal.close() }))
  if (bound.length) return
  const remove = Button({ children: ['确认删除'], variant: 'solid', onclick: async () => {
    remove.disabled = true
    try {
      await apiFetch('/api/nodes/delete', { method: 'POST', body: JSON.stringify({ nodeId: node.id }) })
      modal.close(); await refresh()
    } catch (error) { status.textContent = error.message }
    finally { remove.disabled = false }
  } })
  modal.footer.append(remove)
}

export async function renderNodes(root) {
  clear(root)
  const [catalog, profiles] = await Promise.all([apiFetch('/api/nodes'), apiFetch('/api/profiles')])
  const status = h('p', { class: 'privacy-caption', role: 'status' })
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true })
  const importButton = Button({ children: [h('i', { 'data-lucide': 'download' }), '导入代理包'], variant: 'solid', onclick: () => file.click() })
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]
    if (!selected) return
    importButton.disabled = true
    try {
      if (selected.size > 1024 * 1024) throw new Error('代理包不能超过 1 MB。')
      const body = JSON.parse(await selected.text())
      const result = await apiFetch('/api/nodes/import', { method: 'POST', body: JSON.stringify(body) })
      await renderNodes(root)
      root.querySelector('[role=status]').textContent = `已导入 ${result.count} 个节点。`
    } catch (error) { status.textContent = error.message || '导入失败。' }
    finally { importButton.disabled = false; file.value = '' }
  })
  root.append(h('section', { class: 'workspace-card node-package-toolbar' },
    h('div', {}, h('h2', {}, '本地节点库'), h('p', { class: 'privacy-caption' }, '统一维护连接和地区，环境只需选择节点。')),
    importButton, file), status)
  const list = h('div', { class: 'node-catalog-list' })
  for (const node of catalog.items || []) {
    const bound = (profiles.items || []).filter(profile => profile.proxyNodeId === node.id)
    const protocol = h('select', { 'aria-label': `${node.name} 检测协议` }, ...node.protocols.map(type => h('option', { value: type }, type === 'hy2' ? 'Hysteria 2' : type.toUpperCase())))
    const result = h('p', { class: 'privacy-caption node-check-result', role: 'status' })
    const check = Button({ children: ['检测连接'], variant: 'soft', onclick: async () => {
      check.disabled = true; result.textContent = '正在检测…'
      try { result.textContent = connectionCheckMessage((await apiFetch('/api/proxy/check', { method: 'POST', body: JSON.stringify({ nodeId: node.id, protocol: protocol.value }) })).item) }
      catch (error) { result.textContent = error.message }
      finally { check.disabled = false }
    } })
    const redetect = Button({ children: ['重检测地区'], variant: 'soft', onclick: async () => {
      redetect.disabled = true; result.textContent = '正在重新查询出口地区…'
      try {
        const { item } = await apiFetch('/api/nodes/geo/check', { method: 'POST', body: JSON.stringify({ nodeId: node.id, protocol: protocol.value }) })
        if (!item.ok) { result.textContent = `${connectionCheckMessage(item)}；原地区已保留。`; return }
        await renderNodes(root)
        root.querySelector('[role=status]').textContent = `${node.name}：地区已更新。`
      } catch (error) { result.textContent = `${error.message}；原地区已保留。` }
      finally { redetect.disabled = false }
    } })
    list.append(h('section', { class: 'workspace-card node-catalog-item' },
      h('div', { class: 'node-catalog-heading' }, h('span', { class: 'node-package-icon' }, h('i', { 'data-lucide': 'server' })),
        h('div', {}, h('h2', {}, node.name), h('p', { class: 'privacy-caption' }, node.protocols.map(type => type === 'hy2' ? 'Hysteria 2' : type.toUpperCase()).join(' · ')))),
      h('p', { class: 'node-bound-environments' }, bound.length ? `已绑定：${bound.map(profile => profile.name).join('、')}` : '尚未绑定环境'),
      h('div', { class: 'node-region-summary' },
        h('strong', {}, node.geo?.timezone || '尚未设置地区'),
        h('p', { class: 'privacy-caption' }, node.geo ? [node.geo.countryCode, node.geo.city, node.geo.locale, node.geo.source === 'detected' ? '检测结果' : '预置地区'].filter(Boolean).join(' · ') : '先预置地区或重检测，跟随地区的环境即可启动。'),
        ...(node.geo?.checkedAt ? [h('p', { class: 'privacy-caption' }, `上次地区检测：${new Date(node.geo.checkedAt).toLocaleString()}`)] : [])),
      h('div', { class: 'node-check-controls' }, protocol, check),
      h('div', { class: 'finpri-actions node-region-actions' }, Button({ children: ['预置地区'], variant: 'soft', onclick: () => editGeo(node, () => renderNodes(root)) }), redetect, Button({ children: [h('i', { 'data-lucide': 'trash-2' }), '删除节点'], variant: 'soft', onclick: () => confirmDelete(node, bound, () => renderNodes(root)) })), result))
  }
  if (!catalog.items?.length) list.append(h('section', { class: 'workspace-card' }, h('h2', {}, '还没有代理节点'), h('p', { class: 'privacy-caption' }, '导入代理包后，新建环境或在“环境设置 → 网络”中选择节点。')))
  root.append(list)
}
