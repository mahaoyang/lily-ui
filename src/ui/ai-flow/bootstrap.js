import { workflows } from './workflows/registry.js'

const root = document.querySelector('#workflow-root')
let pendingView = ''
window.aiFlowAppReady = false
document.addEventListener('click', (event) => {
  if (window.aiFlowAppReady) return
  const navItem = event.target.closest('.nav-item[data-view]')
  if (navItem) pendingView = navItem.dataset.view
}, true)

try {
  const templates = await Promise.all(workflows.map(async (workflow) => {
    if (window.aiFlow?.loadWorkflowTemplate) return window.aiFlow.loadWorkflowTemplate(workflow.id)
    const response = await fetch(workflow.template)
    if (!response.ok) throw new Error(`工作流界面加载失败：${workflow.id}`)
    return response.text()
  }))
  root.innerHTML = templates.join('\n')
  await import('./app.js')
  window.aiFlowAppReady = true
  if (pendingView) window.dispatchEvent(new CustomEvent('ai-flow:navigate', { detail: pendingView }))
} catch (error) {
  root.textContent = error.message || '工作流界面加载失败'
  console.error('[AI Flow] workflow bootstrap failed', error)
}
