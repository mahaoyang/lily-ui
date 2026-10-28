export function mountSidebar() {
  const sidebar = document.querySelector('.sidebar')
  const toggle = document.getElementById('sidebar-toggle')
  const storageKey = 'ai-flow-sidebar-collapsed'
  const apply = (collapsed) => {
    sidebar.classList.toggle('is-collapsed', collapsed)
    toggle.setAttribute('aria-expanded', String(!collapsed))
    toggle.setAttribute('aria-label', collapsed ? '展开侧栏' : '折叠侧栏')
    toggle.title = collapsed ? '展开侧栏' : '折叠侧栏'
    sidebar.querySelectorAll('.nav-item').forEach((item) => {
      const label = item.querySelector('.nav-text').textContent
      item.setAttribute('aria-label', label)
      if (collapsed) item.title = label
      else item.removeAttribute('title')
    })
  }
  let collapsed = false
  try { collapsed = localStorage.getItem(storageKey) === 'true' } catch {}
  apply(collapsed)
  toggle.addEventListener('click', () => {
    collapsed = !collapsed
    apply(collapsed)
    try { localStorage.setItem(storageKey, String(collapsed)) } catch {}
  })
}
