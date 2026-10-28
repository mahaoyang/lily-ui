import { h } from '../lib/dom.js'

const groups = [
  ['浏览器环境', [['profiles', 'panels-top-left', '所有环境'], ['sessions', 'circle-play', '运行中']]],
  ['管理与保护', [['nodes', 'package', '代理包'], ['privacy', 'shield-check', '隐私检查'], ['settings', 'sliders-horizontal', '偏好设置']]]
]

export function Sidebar() {
  return h('aside', { class: 'workspace-sidebar' },
    h('a', { class: 'workspace-brand', href: '#/profiles' }, h('img', { class: 'brand-clover', src: '/src/themes/shared/clover.svg', alt: '' }), h('span', {}, 'FinPri Browser', h('small', {}, '独立环境工作台'))),
    h('nav', { class: 'finpri-topbar-tabs', 'aria-label': '导航' }, ...groups.flatMap(([caption, links]) => [
      h('span', { class: 'nav-caption' }, caption),
      ...links.map(([route, icon, label]) => h('a', { class: 'finpri-tab', href: `#/${route}`, 'data-route': route }, h('i', { 'data-lucide': icon, 'aria-hidden': 'true' }), h('span', {}, label)))
    ])),
    h('div', { class: 'sidebar-caption' }, h('span', { class: 'connection-dot' }), ' 本地工作台', h('small', {}, '浏览数据保存在这台设备上')))
}
