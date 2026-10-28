// Preserve native values/change events; one shared library for every select.
export function installSelectControls() {
  if (!window.TomSelect) return
  const instances = new Map()
  const position = control => {
    const parent = control.dropdown.parentElement
    const overlay = parent.classList.contains('console-modal-overlay')
    const origin = overlay ? parent.getBoundingClientRect() : { left: 0, top: 0 }
    const padding = 8, gap = 4
    // The library's initial top:100%/width:100% can create a scrollbar before
    // the first measurement, shifting the right-aligned runtime selector.
    // Keep the measuring box out of document overflow from its first frame.
    Object.assign(control.dropdown.style, {
      position: overlay ? 'absolute' : 'fixed', left: '0px', top: '0px',
      right: 'auto', bottom: 'auto', width: '1px'
    })
    // Measure options before applying the available-space limit, including the first open.
    control.dropdown_content.style.maxHeight = '280px'
    const previousDisplay = control.dropdown.style.display
    control.dropdown.style.display = 'block'
    const anchor = control.control.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const width = Math.min(anchor.width, viewportWidth - padding * 2)
    control.dropdown.style.width = `${width}px`
    const below = window.innerHeight - anchor.bottom - padding - gap
    const above = anchor.top - padding - gap
    const up = below < Math.min(240, control.dropdown_content.scrollHeight) && above > below
    const available = Math.max(0, Math.min(280, up ? above : below))
    Object.assign(control.dropdown_content.style, { maxHeight: `${available}px`, overflowY: 'auto' })
    Object.assign(control.dropdown.style, {
      left: `${Math.max(padding, Math.min(anchor.left, viewportWidth - width - padding)) - origin.left}px`,
      top: `${(up ? anchor.top - gap - Math.min(control.dropdown.scrollHeight, available + 2) : anchor.bottom + gap) - origin.top}px`
    })
    control.dropdown.style.display = previousDisplay
  }
  const reposition = event => {
    for (const control of instances.values()) {
      if (!control.isOpen || control.dropdown.contains(event?.target)) continue
      const anchor = control.control.getBoundingClientRect()
      const scroller = control.wrapper.closest('.console-modal-body') || control.wrapper.closest('.console-modal-card')
      const bounds = scroller?.getBoundingClientRect()
      if (bounds && (anchor.bottom <= bounds.top || anchor.top >= bounds.bottom)) control.close()
      else position(control)
    }
  }
  window.addEventListener('resize', reposition)
  document.addEventListener('scroll', reposition, true)
  let queued = false
  const update = () => {
    queued = false
    for (const [select, control] of instances) {
      if (!select.isConnected) { control.destroy(); instances.delete(select); continue }
      const disabled = select.disabled || select.hasAttribute('data-disabled')
      if (disabled !== control.isDisabled) disabled ? control.disable() : control.enable()
    }
    document.querySelectorAll('select:not(.tomselected)').forEach(select => {
      if (select.getAttribute('aria-hidden') === 'true') return
      const control = new window.TomSelect(select, {
        create: false, maxItems: 1, allowEmptyOption: true,
        placeholder: select.dataset.placeholder || '输入关键字筛选…',
        searchField: select.options.length > 6 ? ['text'] : [],
        // TomSelect treats an explicit `undefined` as "no input" and falls
        // back to a focus-only control.  Large geo lists need a real input so
        // users can type a rough keyword before choosing an option.
        controlInput: select.options.length > 6 ? '<input type="text" autocomplete="off" size="1" />' : null,
        dropdownParent: select.closest('.console-modal-overlay') || document.body,
        render: { no_results: () => '<div class="no-results">没有匹配的选项</div>' }
      })
      control.positionDropdown = () => position(control)
      control.control_input.setAttribute('aria-label', select.getAttribute('aria-label') || select.closest('label')?.querySelector('span')?.textContent || '选择选项')
      instances.set(select, control)
    })
  }
  const schedule = () => { if (!queued) { queued = true; queueMicrotask(update) } }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'data-disabled'] })
  schedule()
}
