// Dismiss environment action menus without owning page state.
  export function installMenuDismissal() {
  document.addEventListener('click', event => {
    document.querySelectorAll('.environment-more[open]').forEach(menu => {
      if (!menu.contains(event.target)) menu.open = false
    })
  }, true)
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    document.querySelectorAll('.environment-more[open]').forEach(menu => {
      menu.open = false
      menu.querySelector('summary')?.focus()
    })
  })

}
