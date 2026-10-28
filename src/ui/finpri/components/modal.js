import { h } from '../lib/dom.js'
import { hydrateIcons } from '../lib/icons.js'
let dialogCounter = 0

export function openModal(options) {
  const closeOnOverlay = options?.closeOnOverlay === true
  const closeOnEscape = options?.closeOnEscape === true

  const previousFocus = document.activeElement
  const titleId = `dialog-${++dialogCounter}`
  const overlay = h('div', { class: 'console-modal-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId })
  // The modal owns its surface and spacing. Do not also apply the Radix Card
  // surface here: its padding/pseudo-surface creates a second background layer
  // that can bleed through the rounded corners.
  const modal = h('div', { class: 'console-modal-card' })
  const inner = h('div', { class: 'console-modal-inner' })

  const titleEl = h('div', { id: titleId, class: 'text-4 font-bold text-gray-12' }, options.title || 'Modal')
  const closeBtn = h(
    'button',
    { class: 'console-modal-close', type: 'button', onclick: () => close(), title: '关闭', 'aria-label': '关闭' },
    h('i', { 'data-lucide': 'x', 'aria-hidden': 'true' })
  )

  const header = h('div', { class: 'console-modal-header' }, titleEl)
  const body = h('div', { class: 'console-modal-body' }, options.body || '')
  const footer = h('div', { class: 'console-modal-footer' }, ...(options.footer || []))

  inner.appendChild(header)
  inner.appendChild(body)
  inner.appendChild(footer)
  modal.appendChild(closeBtn)
  modal.appendChild(inner)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  hydrateIcons()

  let isClosed = false
  const close = () => {
    if (isClosed) return
    isClosed = true
    document.removeEventListener('keydown', onKeyDown)
    overlay.remove()
    if (previousFocus?.isConnected) previousFocus.focus()
    options.onClose?.()
  }

  overlay.addEventListener('click', (e) => {
    if (!closeOnOverlay) return
    if (e.target === overlay) close()
  })

  function onKeyDown(e) {
    if (Array.from(document.querySelectorAll('.console-modal-overlay')).at(-1) !== overlay) return
    if (e.key === 'Escape' && closeOnEscape) close()
    if (e.key === 'Tab') {
      const focusable = Array.from(overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')).filter(el => el.getClientRects().length)
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (!first) { e.preventDefault(); return }
      if (e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { e.preventDefault(); first.focus() }
    }
  }
  document.addEventListener('keydown', onKeyDown)
  requestAnimationFrame(() => { if (!isClosed) (overlay.querySelector('input,select,textarea') || closeBtn).focus() })

  return { close, body, footer }
}
