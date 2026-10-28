import { h } from '../lib/dom.js'

export function Card(options) {
  const { class: className = '', children = [] } = options || {}
  return h(
    'div',
    { class: ['workspace-card', className].filter(Boolean).join(' ') },
    ...[].concat(children)
  )
}

export function SectionHeader(options) {
  const { title, right = null } = options || {}
  return h(
    'div',
    { class: 'console-section-header' },
    h('h2', { class: 'console-section-title' }, title || ''),
    right
  )
}

