import { h } from '../lib/dom.js'
import { hydrateIcons } from '../lib/icons.js'

let wrap = null

function ensureWrap() {
  if (wrap) return wrap
  wrap = h('div', { class: 'console-toast-wrap' })
  document.body.appendChild(wrap)
  return wrap
}

async function copyText(text) {
  const value = String(text ?? '')
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {}

  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', 'true')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export function toast(message, options = {}) {
  const w = ensureWrap()
  const text = String(message ?? '')

  const msg = h('div', { class: 'console-toast-text text-2 text-gray-12', title: '双击复制' }, text)
  const btnCopy = h(
    'button',
    {
      class: 'console-toast-action',
      type: 'button',
      title: '复制',
      'aria-label': '复制',
      onclick: async () => {
        const ok = await copyText(text)
        if (ok) {
          btnCopy.setAttribute('data-copied', 'true')
          setTimeout(() => btnCopy.removeAttribute('data-copied'), 1200)
        }
      },
    },
    h('i', { 'data-lucide': 'copy', 'aria-hidden': 'true' })
  )
  const btnClose = h(
    'button',
    {
      class: 'console-toast-action',
      type: 'button',
      title: '关闭',
      'aria-label': '关闭',
      onclick: () => remove(),
    },
    h('i', { 'data-lucide': 'x', 'aria-hidden': 'true' })
  )

  const actions = h('div', { class: 'console-toast-actions' }, btnCopy, btnClose)
  const el = h(
    'div',
    {
      class: 'console-toast-card',
      role: 'status',
      'aria-live': 'polite',
      tabindex: '0',
    },
    msg,
    actions
  )
  w.appendChild(el)
  hydrateIcons()

  const ttl = options.ttlMs ?? 10000
  let remaining = Math.max(0, ttl)
  let timer = null
  let startedAt = Date.now()

  function schedule(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return
    startedAt = Date.now()
    timer = setTimeout(() => remove(), ms)
  }

  function pause() {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    remaining = Math.max(0, remaining - (Date.now() - startedAt))
  }

  function resume() {
    if (timer) return
    if (remaining <= 0) return
    schedule(remaining)
  }

  function remove() {
    try {
      if (timer) clearTimeout(timer)
    } catch {}
    el.remove()
    if (w.childElementCount === 0) {
      w.remove()
      wrap = null
    }
  }

  if (ttl > 0) schedule(remaining)

  el.addEventListener('mouseenter', pause)
  el.addEventListener('mouseleave', resume)
  el.addEventListener('focusin', pause)
  el.addEventListener('focusout', resume)

  msg.addEventListener('dblclick', async () => {
    const ok = await copyText(text)
    if (ok) {
      btnCopy.setAttribute('data-copied', 'true')
      setTimeout(() => btnCopy.removeAttribute('data-copied'), 1200)
    }
  })
}
