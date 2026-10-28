import { h } from '../lib/dom.js'

export function Switch(options) {
  const {
    checked = false,
    variant = 'surface', // surface | classic | soft
    size = 2,
    accent = 'gray',
    disabled = false,
    title = '',
    onChange,
    class: className = ''
  } = options || {}

  const thumb = h('span', { class: 'console-switch-thumb', 'data-state': checked ? 'checked' : 'unchecked', ...(disabled ? { 'data-disabled': '' } : {}) })
  const btn = h(
    'button',
    {
      class: [ 'console-switch', `is-${variant}`, className].filter(Boolean).join(' '),

      role: 'switch',
      type: 'button',
      'aria-checked': checked ? 'true' : 'false',
      'data-state': checked ? 'checked' : 'unchecked',
      ...(title ? { title } : {}),
      ...(disabled ? { 'data-disabled': '' } : {}),
    },
    thumb
  )

  function set(next) {
    const v = !!next
    btn.setAttribute('aria-checked', v ? 'true' : 'false')
    btn.setAttribute('data-state', v ? 'checked' : 'unchecked')
    thumb.setAttribute('data-state', v ? 'checked' : 'unchecked')
  }

  function setDisabled(next) {
    const v = !!next
    if (v) {
      btn.setAttribute('data-disabled', '')
      thumb.setAttribute('data-disabled', '')
    } else {
      btn.removeAttribute('data-disabled')
      thumb.removeAttribute('data-disabled')
    }
  }

  btn.addEventListener('click', () => {
    if (btn.hasAttribute('data-disabled')) return
    const next = btn.getAttribute('aria-checked') !== 'true'
    set(next)
    onChange?.(next)
  })

  return { root: btn, button: btn, setChecked: set, setDisabled }
}

export function TextField(options) {
  const { value = '', placeholder = '', type = 'text', size = 2, variant = 'surface', disabled = false, min, max, step } = options || {}
  const input = h('input', {
    class: 'console-input',
    type,
    value,
    placeholder,
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
    ...(step !== undefined ? { step } : {}),
    ...(disabled ? { disabled: true } : {})
  })
  const root = h(
    'div',
    { class: `console-field is-${variant}`, ...(disabled ? { 'data-disabled': true } : {}) },
    input
  )
  return { root, input }
}

export function TextAreaField(options) {
  const { value = '', placeholder = '', rows = 3, size = 2, variant = 'surface', disabled = false } = options || {}
  const input = h('textarea', {
    class: 'console-input console-textarea',
    rows,
    placeholder,
    ...(disabled ? { disabled: true } : {})
  }, String(value ?? ''))
  const root = h(
    'div',
    { class: `console-field is-${variant}`, ...(disabled ? { 'data-disabled': true } : {}) },
    input
  )
  return { root, input }
}

export function SelectField(options = {}) {
  const { value = '', items = [], disabled = false, placeholder = '' } = options
  const select = h('select', { disabled }, ...items.map(item => {
    const opt = typeof item === 'string' ? { value: item, label: item } : item
    return h('option', { value: opt.value, disabled: !!opt.disabled }, String(opt.label ?? opt.value))
  }))
  if (placeholder) select.dataset.placeholder = placeholder
  select.value = String(value)
  const root = h('div', { class: 'console-select-root' }, select)
  const setValue = next => {
    if (select.tomselect) select.tomselect.setValue(String(next))
    else { select.value = String(next); select.dispatchEvent(new Event('change', { bubbles: true })) }
  }
  return { root, select, trigger: select, setValue }
}

export function LabeledInput(label, type = 'text', value = '', placeholder = '') {
  const input = h('input', { type, value, placeholder, autocomplete: 'off' })
  return { input, root: h('label', { class: 'privacy-field' }, h('span', {}, label), input) }
}
