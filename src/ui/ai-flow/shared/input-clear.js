/** Keep local input clearing consistent across basic nodes and their canvas dialogs. */
export function mountInputClear(zone, { hasInput, clear, blocked = () => false }) {
  const button = document.createElement('button')
  button.type = 'button'; button.className = 'text-button input-clear-button'; button.textContent = '清空'; button.setAttribute('aria-label', '清空输入')
  const isUpload = zone.matches('.audio-drop-zone')
  if (isUpload) {
    button.className = 'input-clear-button file-clear-button'
    button.title = '清除文件'
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>'
    let filename = zone.querySelector('[id$="-name"], [id$="-file-name"]')
    if (!filename) {
      let sibling = zone.nextElementSibling
      while (sibling && sibling.matches('input[type="file"]')) sibling = sibling.nextElementSibling
      if (sibling?.matches('.file-display')) filename = sibling
    }
    if (filename) {
      const row = document.createElement('div')
      row.className = 'input-file-row'
      filename.before(row); row.append(filename, button)
    } else zone.append(button)
  } else zone.append(button)
  const sync = () => {
    const populated = !!hasInput()
    const disabled = !populated || blocked() || zone.inert || !!zone.closest('[inert]') || zone.classList.contains('disabled')
    if (button.disabled !== disabled) button.disabled = disabled
    if (isUpload && button.hidden !== !populated) button.hidden = !populated
  }
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation(); sync()
    if (button.disabled) return
    clear()
    zone.closest('article')?.querySelectorAll('input[type="file"]').forEach(input => { input.value = '' })
    sync()
  })
  new MutationObserver(sync).observe(zone.closest('[role="dialog"], .workflow-panel') || zone, { subtree: true, attributes: true, attributeFilter: ['disabled', 'inert', 'class', 'hidden'], childList: true, characterData: true })
  sync()
  return button
}
