// View transforms, focus persistence and fullscreen controls are independent of execution.
export function mountCanvasViewport({ canvas, world, gridX: GRID_X, gridY: GRID_Y, getNodes, onChange }) {
  const view = { x: 24, y: 24, zoom: 1 }
  const applyView = () => { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`; canvas.style.backgroundSize = `${GRID_X * view.zoom}px ${GRID_Y * view.zoom}px`; canvas.style.backgroundPosition = `${view.x}px ${view.y}px` }
  const worldPoint = (x, y) => { const rect = canvas.getBoundingClientRect(); return { x: (x - rect.left - view.x) / view.zoom, y: (y - rect.top - view.y) / view.zoom } }
  const viewportSnapshot = () => {
    const rect = canvas.getBoundingClientRect()
    return { zoom: view.zoom, focusX: (rect.width / 2 - view.x) / view.zoom, focusY: (rect.height / 2 - view.y) / view.zoom }
  }
  const restoreViewport = (viewport) => {
    const rect = canvas.getBoundingClientRect()
    if (!viewport || !Number.isFinite(viewport.focusX) || !Number.isFinite(viewport.focusY) || !Number.isFinite(viewport.zoom)) {
      view.x = 24; view.y = 24; view.zoom = 1
    } else {
      view.zoom = Math.max(.05, Math.min(1.6, viewport.zoom))
      view.x = rect.width / 2 - viewport.focusX * view.zoom
      view.y = rect.height / 2 - viewport.focusY * view.zoom
    }
    applyView()
  }
  applyView()
  const canvasWrap = canvas.closest('.node-canvas-wrap')
  const workbenchActions=document.querySelector('.node-workbench-actions'), workbenchActionsHome=workbenchActions.parentElement
  const globalButton = document.createElement('button')
  globalButton.type = 'button'
  globalButton.className = 'secondary-button node-global-toggle'
  const setGlobalMode = (enabled) => {
    const viewport = viewportSnapshot()
    canvasWrap.classList.toggle('is-global-mode', enabled)
    if(enabled)canvasWrap.prepend(workbenchActions);else workbenchActionsHome.append(workbenchActions)
    globalButton.setAttribute('aria-pressed', String(enabled))
    globalButton.title = enabled ? '退出全局模式（Esc）' : '全局模式'
    globalButton.setAttribute('aria-label', globalButton.title)
    globalButton.innerHTML = `<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${enabled ? '<path d="m18 6-12 12M6 6l12 12"/>' : '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>'}</svg>`
    restoreViewport(viewport)
  }
  const centerButton = document.createElement('button')
  centerButton.type = 'button'
  centerButton.className = 'secondary-button node-global-toggle'
  centerButton.title = '回到中心'
  centerButton.setAttribute('aria-label', '回到中心')
  centerButton.innerHTML = '<svg class="lucide lucide-locate-fixed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h3m14 0h3M12 2v3m0 14v3"/><rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="12" cy="12" r="2"/></svg>'
  centerButton.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect()
    const items = [...getNodes()]
    if (!items.length) {
      view.x = rect.width / 2; view.y = rect.height / 2; view.zoom = 1
    } else {
      const left = Math.min(...items.map(n => n.x))
      const top = Math.min(...items.map(n => n.y))
      const right = Math.max(...items.map(n => n.x + GRID_X))
      const bottom = Math.max(...items.map(n => n.y + GRID_Y))
      view.zoom = Math.max(.05, Math.min(1, (rect.width - 80) / (right - left), (rect.height - 80) / (bottom - top)))
      view.x = rect.width / 2 - (left + right) / 2 * view.zoom
      view.y = rect.height / 2 - (top + bottom) / 2 * view.zoom
    }
    applyView()
    onChange()
  })
  canvasWrap.querySelector('.node-canvas-toolbar').append(centerButton, globalButton)
  globalButton.addEventListener('click', () => setGlobalMode(!canvasWrap.classList.contains('is-global-mode')))
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && canvasWrap.classList.contains('is-global-mode')) {
      event.preventDefault()
      setGlobalMode(false)
      globalButton.focus()
    }
  })
  setGlobalMode(false)
  return { view, applyView, worldPoint, viewportSnapshot, restoreViewport }
}
