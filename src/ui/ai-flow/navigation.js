// Apply navigation before loading workflow templates to avoid a default-tab flash.
(() => {
  const key = 'ai-flow-active-tab-v1'
  const titles = { saved: '工作流', running: '任务队列', overview: '基础节点', testing: '工作流编排' }
  window.aiFlowNavigate = (requested) => {
    const view = Object.hasOwn(titles, requested) ? requested : 'saved'
    const from = document.querySelector('.page-content').dataset.page
    if (from !== view && !window.dispatchEvent(new CustomEvent('ai-flow-before-navigate', { cancelable: true, detail: { from, to: view } }))) return from
    const taskCanvas=view==='testing'&&document.querySelector('#test-flow-page').dataset.taskView==='true'
    const tab=view==='testing'?(taskCanvas?'running':'saved'):view
    document.querySelector('.page-content').dataset.page = view
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === tab)
      if (item.dataset.view === tab) item.setAttribute('aria-current', 'page')
      else item.removeAttribute('aria-current')
    })
    document.querySelector('#view-title').textContent = taskCanvas?'任务画布':titles[view]
    document.querySelector('.page-intro').hidden = view !== 'saved'
    document.querySelector('.flows-section').hidden = view !== 'overview'
    document.querySelector('#test-flow-page').hidden = view !== 'testing'
    document.querySelector('#workflow-tasks-page').hidden = view !== 'running'
    document.querySelector('#saved-workflows-page').hidden = view !== 'saved'
    try { localStorage.setItem(key, tab) } catch {}
    return view
  }
  let initial = 'saved'
  try {
    const stored = localStorage.getItem(key)
    if (['saved', 'running', 'overview'].includes(stored)) initial = stored
  } catch {}
  window.aiFlowNavigate(initial)
  document.addEventListener('click', event => {
    if (window.aiFlowAppReady) return
    const item = event.target.closest('.nav-item[data-view]')
    if (item) window.aiFlowNavigate(item.dataset.view)
  })
})()
