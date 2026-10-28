import { validTextFile, TEXT_EDIT_LIMIT, TEXT_PREVIEW_LIMIT } from './text-input.js'
import { runModelNode } from './node-model-runner.js'

export async function openNumberText(node = { type: 'number-text', params: {} }, input = null, connections = {}) {
  const splitting = node.type === 'text-split'
  const dialog = document.createElement('div')
  dialog.className = 'workflow-backdrop number-text-backdrop'
  dialog.innerHTML = `<section class="workflow-panel number-text-panel" role="dialog" aria-modal="true" aria-labelledby="number-text-title">
    <button class="modal-close" data-close type="button" aria-label="关闭">×</button>
    <div class="workflow-header"><div><p class="eyebrow blue">TEXT · NORMALIZATION</p><h2 id="number-text-title">数字文本转换</h2><p>识别日期、时间与普通数值，转换为中文读法。</p></div></div>
    <div class="number-text-grid">
      <article class="workflow-node-card"><div class="denoise-input-heading"><h3>输入文本</h3><span class="node-type">TXT · MD · SRT · VTT</span></div>
        <div data-input-zone><label class="task-audio-drop">拖入文本文件，或点击选择<input type="file" accept=".txt,.md,.csv,.srt,.vtt,text/*"></label>
        <p class="file-display"><span data-filename></span><button class="text-button file-clear-button" data-clear-file type="button" aria-label="清除文件" hidden>×</button></p>
        <textarea data-input rows="10" placeholder="输入含数字的文本…" aria-label="输入文本"></textarea><div class="number-text-input-footer"><button class="text-button" data-clear type="button">清空</button><span class="file-display" data-count></span></div></div>
      </article>
      <article class="workflow-node-card"><div class="denoise-input-heading"><h3>转换结果</h3><button class="text-button" data-download disabled type="button">下载 TXT ↗</button></div><textarea data-output rows="10" readonly aria-label="转换结果" placeholder="运行后显示转换结果"></textarea><p class="file-display" data-result-note></p></article>
    </div>
    <div class="number-text-settings"><span>语言</span><button class="secondary-button" type="button" aria-label="语言：中文" aria-haspopup="listbox" aria-expanded="false" data-language><span>中文</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div role="listbox" aria-label="语言" hidden><button class="secondary-button" type="button" role="option" aria-selected="true">中文</button></div></div>
    <div class="workflow-footer"><div class="progress-area"><div class="progress-copy"><span data-status role="status">准备就绪</span><b data-percent>0%</b></div><div class="progress-track"><i data-bar></i></div></div><div class="workflow-actions"><button class="primary-button" data-run type="button">开始转换</button></div></div>
  </section>`
  if (splitting) {
    dialog.querySelector('h2').textContent = '文本切割'
    dialog.querySelector('.eyebrow').textContent = 'TEXT · SENTENCE SPLIT'
    dialog.querySelector('.workflow-header p:last-child').textContent = '选择切割方式，将文本拆成可供 For 循环使用的列表。'
    dialog.querySelector('[data-input]').placeholder = '输入需要切割的文本…'
    dialog.querySelector('[data-output]').setAttribute('aria-label', '切割结果')
    dialog.querySelector('[data-output]').placeholder = '每块作为一个列表项，输出给 For 循环'
    dialog.querySelector('[data-output]').closest('article').querySelector('h3').textContent = '文本块列表'
    dialog.querySelector('[data-download]').textContent = '下载 JSON ↗'
    dialog.querySelector('[data-run]').textContent = '开始切割'
    dialog.querySelector('.number-text-settings').classList.add('text-split-settings')
    dialog.querySelector('.number-text-settings').innerHTML = `<section class="split-settings-group"><h3>切割方式</h3><div class="split-mode-buttons" role="group" aria-label="切割方式"><button class="secondary-button" type="button" data-split-mode="sentences">按字数合并句子</button><button class="secondary-button" type="button" data-split-mode="lines">按换行切分</button></div><div data-sentence-options class="split-option-row"><label>目标字数 <input data-threshold type="number" min="1" max="1000000" step="1" aria-label="目标字数"></label><label class="parameter-toggle"><input data-sentence-newline type="checkbox" role="switch"><span>句子后补充换行</span></label><p class="split-setting-note">保留完整句子，累计字数超过目标后生成一块。</p></div><div data-line-options class="split-option-row" hidden><label>分隔符换行数 <input data-separator-newlines type="number" min="1" max="1000000" step="1" aria-label="分隔符换行数"></label><p class="split-setting-note">以连续 N 个换行组成分隔符。例如 N=2 使用 \\n\\n 切分；单个换行保留，不累计。</p></div></section><section class="split-settings-group"><h3>文本清理</h3><div class="split-option-row"><label class="parameter-toggle"><input data-remove-headings type="checkbox" role="switch"><span>移除 Markdown 标题行</span></label><label class="parameter-toggle"><input data-clean-markdown type="checkbox" role="switch"><span>清洗 Markdown 符号</span></label></div></section>`
    dialog.querySelector('[data-separator-newlines]').value = node.params?.separatorNewlines ?? 2
    dialog.querySelector('[data-threshold]').value = node.params?.threshold ?? 50
    dialog.querySelector('[data-clean-markdown]').checked = !!node.params?.cleanMarkdown
    dialog.querySelector('[data-remove-headings]').checked = !!node.params?.removeMarkdownHeadings
    dialog.querySelector('[data-sentence-newline]').checked = !!node.params?.sentenceNewline
  }
  document.body.append(dialog)
  const el = selector => dialog.querySelector(selector)
  let splitMode = node.params?.splitMode || 'lines'
  const splitParams = () => ({ splitMode, separatorNewlines: Number(el('[data-separator-newlines]')?.value ?? 2), threshold: Number(el('[data-threshold]')?.value ?? 50), cleanMarkdown: !!el('[data-clean-markdown]')?.checked, removeMarkdownHeadings: !!el('[data-remove-headings]')?.checked, sentenceNewline: !!el('[data-sentence-newline]')?.checked })
  const connected = !!connections.first
  const area = el('[data-input]'), picker = el('input[type="file"]'), drop = el('.task-audio-drop')
  let file = connected ? input : node.localFirst || null
  let text = file ? await file.text() : node.params?.text || ''
  let output = node.output || null, revision = 0, reading = false, running = false, controller
  const count = value => Array.from(value)
  const display = () => {
    const chars = count(text), long = chars.length > TEXT_EDIT_LIMIT
    area.value = chars.slice(0, TEXT_PREVIEW_LIMIT).join(''); area.readOnly = connected || long || running
    area.classList.toggle('is-preview-only', connected || long)
    el('[data-count]').textContent = connected ? `连接：${connections.first}` : long ? `${chars.length} 字 · 仅预览前 ${TEXT_PREVIEW_LIMIT} 字` : `${chars.length} / ${TEXT_EDIT_LIMIT} 字 · 可编辑`
    el('[data-filename]').textContent = file?.name || ''
    el('[data-clear-file]').hidden = !file
    el('[data-run]').disabled = running || reading || !text.trim()
    el('[data-clear]').disabled = connected || running || reading
    picker.disabled = connected || running
    el('[data-clear-file]').disabled = connected || running || reading
    el('[data-download]').disabled = !output || running
    drop.classList.toggle('upstream-input-zone', connected)
    drop.inert = connected || running
  }
  const invalidate = () => { output = null; el('[data-output]').value = ''; el('[data-result-note]').textContent = ''; el('[data-status]').textContent = '准备就绪'; el('[data-percent]').textContent = '0%'; el('[data-bar]').style.width = '0%' }
  const showOutput = async () => {
    if (!output) return
    const result = await output.text()
    el('[data-output]').value = count(result).slice(0, TEXT_PREVIEW_LIMIT).join('')
    el('[data-result-note]').textContent = count(result).length > TEXT_PREVIEW_LIMIT ? `预览前 ${TEXT_PREVIEW_LIMIT} 字 · 下载及下游使用完整结果` : `${count(result).length} 字`
  }
  const accept = async selected => {
    if (connected || running || !selected) return
    if (!validTextFile(selected)) { el('[data-status]').textContent = '请选择文本文件'; return }
    const current = ++revision
    reading = true; display(); area.readOnly = true
    try { const value = await selected.text(); if (current !== revision) return; text = value; file = selected; invalidate() }
    catch (error) { el('[data-status]').textContent = error.message }
    finally { if (current === revision) { reading = false; display() } }
  }
  picker.onchange = () => accept(picker.files[0])
  drop.ondragover = event => event.preventDefault()
  drop.ondrop = event => { event.preventDefault(); accept(event.dataTransfer.files[0]) }
  area.oninput = () => { if (area.readOnly) return; text = count(area.value).slice(0, TEXT_EDIT_LIMIT).join(''); file = null; invalidate(); const caret = area.selectionStart; display(); area.setSelectionRange(caret, caret) }
  el('[data-clear]').onclick = el('[data-clear-file]').onclick = () => { if (connected || running) return; ++revision; reading = false; file = null; text = ''; picker.value = ''; invalidate(); display() }
  const language = el('[data-language]'), options = el('[role="listbox"]')
  if (language) language.onclick = () => { options.hidden = !options.hidden; language.setAttribute('aria-expanded', String(!options.hidden)) }
  if (options) options.querySelector('button').onclick = () => { options.hidden = true; language.setAttribute('aria-expanded', 'false') }
  el('[data-download]').onclick = () => { if (!output) return; const url = URL.createObjectURL(output), a = document.createElement('a'); a.href = url; a.download = output.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  el('[data-run]').onclick = async () => {
    if (running || reading || !text.trim()) return
    running = true; invalidate(); controller = new AbortController(); display()
    const progress = (value, message) => { el('[data-status]').textContent = message; el('[data-percent]').textContent = `${value}%`; el('[data-bar]').style.width = `${value}%` }
    progress.signal = controller.signal
    try { output = await runModelNode({ type: node.type, params: { language: 'zh', text, ...splitParams() } }, null, null, progress); await showOutput() }
    catch (error) { el('[data-status]').textContent = error.message }
    finally { running = false; display() }
  }
  if (splitting) {
    const showMode = () => {
      el('[data-sentence-options]').hidden = splitMode !== 'sentences'
      el('[data-line-options]').hidden = splitMode !== 'lines'
      for (const button of dialog.querySelectorAll('[data-split-mode]')) button.setAttribute('aria-pressed', String(button.dataset.splitMode === splitMode))
    }
    for (const button of dialog.querySelectorAll('[data-split-mode]')) button.onclick = () => { splitMode = button.dataset.splitMode; showMode(); invalidate(); display() }
    showMode()
    for (const selector of ['[data-threshold]', '[data-separator-newlines]']) el(selector).oninput = () => { invalidate(); display() }
    for (const selector of ['[data-clean-markdown]', '[data-remove-headings]', '[data-sentence-newline]']) el(selector).onchange = () => { invalidate(); display() }
  }
  display(); await showOutput()
  return new Promise(resolve => {
    const close = () => {
      if (reading) return
      controller?.abort()
      const params = { ...node.params, language: 'zh', ...(splitting ? { ...splitParams() } : {}) }
      if (connected) { delete params.text; node.localFirst = null }
      else if (count(text).length > TEXT_EDIT_LIMIT) { delete params.text; node.localFirst = file || new File([text], 'text.txt', { type: 'text/plain' }) }
      else { params.text = text; node.localFirst = file }
      document.removeEventListener('keydown', onKey)
      dialog.remove(); resolve({ params, model: node.model, output })
    }
    const onKey = event => { if (event.key === 'Escape') close() }
    el('[data-close]').onclick = close
    document.addEventListener('keydown', onKey)
  })
}
