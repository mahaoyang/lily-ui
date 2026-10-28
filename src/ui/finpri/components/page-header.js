import { h } from '../lib/dom.js'

const headerMap = {
  nodes: { title: '代理包', subtitle: '独立导入节点，再为环境选择连接。' },
  profiles: { title: '环境', subtitle: '每个账号，一个独立环境。' },
  privacy: { title: '隐私检查', subtitle: '保护范围清晰可见，不承诺无法关联。' },
  settings: { title: '设置', subtitle: '外观、备份与保护边界。' },
  sessions: { title: '运行中的环境', subtitle: '查看并关闭浏览器。' }
}

export function PageHeader() {
  const title = h('div', { id: 'pageTitle', class: 'console-page-title' }, '环境')
  const subtitle = h('div', { id: 'pageSubtitle', class: 'console-muted text-2' }, headerMap.profiles.subtitle)
  const refreshBtn = h('button', { id: 'refreshBtn', class: 'console-icon-action', type: 'button', title: '刷新', 'aria-label': '刷新' }, h('i', { 'data-lucide': 'refresh-cw' }))
  const root = h('header', { class: 'console-topbar' }, h('div', { class: 'console-topbar-inner' },
    h('div', { class: 'console-topbar-title' }, title, subtitle),
    h('div', { class: 'console-header-actions' }, refreshBtn)))
  return { root, refreshBtn, update(route) {
    const header = headerMap[route] || headerMap.profiles
    title.textContent = header.title
    subtitle.textContent = header.subtitle
  } }
}
