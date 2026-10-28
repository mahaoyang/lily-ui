import { h } from '../lib/dom.js'
import { Sidebar } from './sidebar.js'
import { PageHeader } from './page-header.js'

export function mountShell(target) {
  const sidebar = Sidebar()
  const header = PageHeader()
  const panel = h('div', { id: 'panel', class: 'console-panel' })
  target.replaceWith(
    h('div', { class: 'desktop-titlebar' }, h('span', {}, 'FinPri Browser')),
    h('div', { class: 'console-shell' }, sidebar,
      h('div', { class: 'console-main' }, header.root, h('main', { class: 'console-content' }, panel))))
  return { panel, refreshBtn: header.refreshBtn, updateRoute(route) {
    header.update(route)
    sidebar.querySelectorAll('[data-route]').forEach(link => {
      const active = link.dataset.route === route
      link.dataset.active = String(active)
      if (active) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
  } }
}
