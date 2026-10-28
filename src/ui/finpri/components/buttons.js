import { h } from '../lib/dom.js'

export function IconButton(options) {
  const {
    icon,
    variant = 'ghost',
    size = 1,
    accent = 'gray',
    title = '',
    onclick,
    disabled = false,
    class: className = ''
  } = options || {}

  const classes = [
    'console-icon-btn',
    `is-${variant}`,
    className
  ].filter(Boolean).join(' ')

  const attrs = {
    class: classes,
    type: 'button',

    ...(title ? { title } : {}),
    ...(onclick ? { onclick } : {}),
    ...(disabled ? { disabled: true } : {})
  }

  return h('button', attrs, h('i', { 'data-lucide': icon }))
}

export function Button(options) {
  const {
    variant = 'soft', // solid | soft | ghost
    size = 2,
    accent = null, // e.g. 'gray', 'grass'
    href = null,
    target = null,
    rel = null,
    type = 'button',
    disabled = false,
    class: className = '',
    onclick,
    children
  } = options || {}

  const classes = [
    'console-btn',
    `is-${variant}`,
    className
  ].filter(Boolean).join(' ')

  const attrs = {
    class: classes,

    ...(onclick ? { onclick } : {}),
    ...(disabled ? { 'data-disabled': true, disabled: true } : {}),
  }

  const content = children ?? []

  if (href) {
    return h('a', { ...attrs, href, target: target || undefined, rel: rel || undefined }, ...[].concat(content))
  }

  return h('button', { ...attrs, type }, ...[].concat(content))
}

export function Badge(options) {
  const { text, accent = 'gray', variant = 'soft', size = 1, class: className = '' } = options || {}
  return h(
    'span',
    {
      class: ['console-badge', `is-${variant}`, className].filter(Boolean).join(' '),
    },
    text
  )
}
