import { cleanupWorkflowInputs } from '../../../../adapters/browser/workflow/runtime.js'

export function mountSettings() {
  const dialog = document.createElement('dialog')
  dialog.className = 'workflow-name-dialog settings-dialog'
  dialog.innerHTML = `<h2>设置</h2><section><h3>处理缓存</h3><p>清理处理缓存、过期上传，以及不再关联任何已保存工作流的附件。保留工作流正在引用的文件、任务队列、已保存结果和模型，不影响当前编辑的撤销记录。</p><button class="secondary-button" data-clear>清理缓存</button><p data-feedback role="status"></p></section><footer><button class="primary-button" data-close>完成</button></footer>`
  document.body.append(dialog)
  document.getElementById('settings-open').onclick = () => dialog.showModal()
  dialog.querySelector('[data-close]').onclick = () => dialog.close()
  dialog.querySelector('[data-clear]').onclick = async event => {
    const button = event.currentTarget, feedback = dialog.querySelector('[data-feedback]')
    button.disabled = true; feedback.textContent = '正在清理…'
    try {
      const response = await fetch('/api/cache/clear', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '清理失败')
      const cacheSummary = `处理缓存释放 ${(result.removedBytes / 1024 / 1024).toFixed(1)} MB`
      try {
        const result = await cleanupWorkflowInputs()
        feedback.textContent = result.deferred
          ? `${cacheSummary}；任务正在运行，附件清理待空闲后重试`
          : `清理完成，${cacheSummary}；清理 ${result.removedFiles} 个游离附件，释放 ${(result.removedBytes / 1024 / 1024).toFixed(1)} MB`
      } catch {
        feedback.textContent = `${cacheSummary}；游离附件检查失败，请重试`
      }
    } catch (error) { feedback.textContent = error.message }
    finally { button.disabled = false }
  }
}
