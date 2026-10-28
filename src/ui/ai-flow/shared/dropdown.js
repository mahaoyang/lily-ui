export function closeDropdown(menu, trigger, returnFocus = false) {
  menu.hidden = true
  trigger.setAttribute('aria-expanded', 'false')
  if (returnFocus) trigger.focus()
}

export function bindDropdown({ select, trigger, menu, label, optionAttribute, onSelect }) {
  const enabledOptions = () => [...menu.querySelectorAll(`[${optionAttribute}]`)].filter(option => !option.hidden && !option.disabled)
  trigger.addEventListener('click', () => {
    const open = menu.hidden
    document.querySelectorAll('.model-select-wrap .model-select-menu').forEach((otherMenu) => { otherMenu.hidden = true })
    document.querySelectorAll('.model-select-wrap .model-select-trigger').forEach((otherTrigger) => otherTrigger.setAttribute('aria-expanded', 'false'))
    menu.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
    if (open) (enabledOptions().find(option => option.getAttribute('aria-selected') === 'true') || enabledOptions()[0])?.focus()
  })
  trigger.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    if (menu.hidden) trigger.click()
    const options = enabledOptions()
    ;(event.key === 'ArrowUp' ? options.at(-1) : options[0])?.focus()
  })
  // A single binding owns dismissal, including menus mounted in dynamic dialogs.
  const onOutside = event => {
    if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) closeDropdown(menu, trigger)
  }
  document.addEventListener('pointerdown', onOutside)
  menu.addEventListener('click', (event) => {
    const option = event.target.closest(`[${optionAttribute}]`)
    if (!option || option.hidden || option.disabled) return
    select.value = option.getAttribute(optionAttribute)
    label.textContent = option.textContent.trim()
    menu.querySelectorAll(`[${optionAttribute}]`).forEach((item) => item.setAttribute('aria-selected', String(item === option)))
    closeDropdown(menu, trigger, true)
    onSelect?.(select.value)
  })
  menu.addEventListener('keydown', (event) => {
    const options = enabledOptions()
    const current = options.indexOf(document.activeElement)
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDropdown(menu, trigger, true); return }
    if (event.key === 'Tab') { closeDropdown(menu, trigger); return }
    if (!options.length) return
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      ;(event.key === 'Home' ? options[0] : options.at(-1)).focus()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    options[(current + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length].focus()
  })
  return () => document.removeEventListener('pointerdown', onOutside)
}

