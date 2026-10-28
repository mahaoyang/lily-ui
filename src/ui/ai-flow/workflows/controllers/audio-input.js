import { mountInputClear } from '../../shared/input-clear.js'
import { sourceOutput } from './source-node.js'

export function openAudioInput(node = { type: 'audio-input', params: {} }, { preview, download }, input = null, connections = {}) {
  const connected = !!connections.first
  const dialog = document.createElement('div')
  dialog.className = 'workflow-backdrop audio-input-backdrop'
  dialog.innerHTML = `
    <section class="workflow-panel audio-input-panel" role="dialog" aria-modal="true" aria-labelledby="audio-input-title">
      <button class="modal-close" data-close type="button" aria-label="关闭">×</button>
      <div class="workflow-header"><div><p class="eyebrow blue">AUDIO · INPUT</p><h2 id="audio-input-title">音频输入</h2><p>上传音频，供工作流中的多个节点复用。</p></div></div>
      <div class="audio-input-canvas">
        <article class="workflow-node-card denoise-input-card">
          <div class="denoise-input-heading"><div><span class="node-number">01 · INPUT</span><h3>输入音频</h3></div><span class="node-type">WAV · MP3 · M4A · FLAC · OGG</span></div>
          <div class="audio-drop-zone" data-drop><span class="drop-mark">↓</span><span>拖拽音频到这里，或</span><button class="secondary-button node-button" data-pick type="button">选择音频</button></div>
          <input type="file" accept="audio/*,.wav,.mp3,.m4a,.flac,.ogg,.aac,.opus,.webm" hidden>
          <p class="file-display" data-name></p><div class="audio-preview" id="audio-input-source-preview" hidden></div>
        </article>
        <article class="workflow-node-card denoise-settings-card">
          <div><span class="node-number">02 · PARAMETERS</span><h3>输出设置</h3></div>
          <label class="parameter-toggle"><input type="checkbox" role="switch"><span>自动转 WAV</span></label>
          <p class="file-display">开启后保留原采样率和声道；关闭则输出原文件。</p>
        </article>
        <article class="workflow-node-card audio-input-output">
          <div class="denoise-input-heading"><div><span class="node-number">03 · OUTPUT</span><h3>输出音频</h3></div><button class="text-button" data-download type="button" disabled>下载结果 ↗</button></div>
          <p class="file-display" data-result-empty>上传后自动准备输出，可试听、下载或连接到其他节点。</p>
          <div class="audio-preview" id="audio-input-result-preview" hidden></div>
        </article>
      </div>
      <div class="workflow-footer"><div class="progress-area"><div class="progress-copy"><span data-status role="status">准备就绪</span><b data-percent>0%</b></div><div class="progress-track"><i data-bar></i></div></div><div class="workflow-actions"><button class="secondary-button" data-stop type="button" disabled>停止</button><button class="primary-button" data-run type="button">输出音频</button></div></div>
    </section>`
  document.body.append(dialog)
  const el = selector => dialog.querySelector(selector)
  let file = connected ? input : node.localFirst || null, output = connected ? input : node.output || null, controller, running = false
  const toggle = el('[role="switch"]'), picker = el('input[type="file"]')
  toggle.checked = node.params?.autoWav !== false
  toggle.disabled = picker.disabled = el('[data-pick]').disabled = connected
  el('[data-drop]').inert = connected
  el('[data-drop]').classList.toggle('upstream-input-zone', connected)
  if (connected) {
    el('[data-status]').textContent = `连接：${connections.first} · 音频原样透传`
    el('.denoise-settings-card p').textContent = '已连接上游，直接透传，不重复转换 WAV。'
  }
  const display = () => {
    el('[data-name]').textContent = file?.name || (connected ? '等待上游运行' : '尚未选择文件')
    preview('audio-input-source-preview', file); preview('audio-input-result-preview', output)
    el('[data-result-empty]').hidden = !!output
    el('[data-run]').disabled = !file || running || !!output; el('[data-download]').disabled = !output || running
  }
  const accept = selected => {
    if (connected || !selected || running) return
    if (!selected.type.startsWith('audio/') && !/\.(wav|mp3|m4a|flac|ogg|aac|opus|webm)$/i.test(selected.name)) { el('[data-status]').textContent = '请选择音频文件'; return }
    file = selected; output = null; display(); el('[data-run]').click()
  }
  mountInputClear(el('[data-drop]'), { hasInput: () => !!file, blocked: () => connected || running, clear: () => { file = output = null; picker.value = ''; el('[data-status]').textContent = '输入已清空'; el('[data-percent]').textContent = '0%'; el('[data-bar]').style.width = '0%'; display() } })
  picker.onchange = () => accept(picker.files[0])
  el('[data-pick]').onclick = () => picker.click()
  const drop = el('[data-drop]')
  drop.ondragover = event => { event.preventDefault(); if (!running) drop.classList.add('drag-over') }
  drop.ondragleave = () => drop.classList.remove('drag-over')
  drop.ondrop = event => { event.preventDefault(); drop.classList.remove('drag-over'); accept(event.dataTransfer.files[0]) }
  toggle.onchange = () => { output = null; display(); if (file) el('[data-run]').click() }
  el('[data-run]').onclick = async () => {
    if (connected || !file || running || output) return
    running = true; controller = new AbortController(); output = null
    picker.disabled = toggle.disabled = el('[data-pick]').disabled = true; el('[data-stop]').disabled = false; display()
    const progress = (value, message) => { el('[data-percent]').textContent = `${Math.round(value)}%`; el('[data-bar]').style.width = `${value}%`; el('[data-status]').textContent = message }
    progress.signal = controller.signal
    try { output = await sourceOutput({ type: 'audio-input', localFirst: file, params: { autoWav: toggle.checked } }, progress) }
    catch (error) { el('[data-status]').textContent = controller.signal.aborted ? '已停止' : error.message }
    finally { running = false; picker.disabled = toggle.disabled = el('[data-pick]').disabled = false; el('[data-stop]').disabled = true; display() }
  }
  el('[data-stop]').onclick = () => controller?.abort()
  el('[data-download]').onclick = () => output && download(output, output.name)
  display()
  if (!connected && file && !output) el('[data-run]').click()
  const previousFocus = document.activeElement
  el('[data-close]').focus()
  return new Promise(resolve => {
    const close = () => {
      if (running) { controller?.abort(); return }
      node.localFirst = connected ? null : file
      const result = { params: { ...node.params, autoWav: toggle.checked }, model: node.model, output }
      preview('audio-input-source-preview', null); preview('audio-input-result-preview', null)
      document.removeEventListener('keydown', onKeydown)
      dialog.remove(); previousFocus?.focus(); resolve(result)
    }
    el('[data-close]').onclick = close
    const onKeydown = event => { if (event.key === 'Escape') { event.preventDefault(); close() } }
    document.addEventListener('keydown', onKeydown)
    dialog.addEventListener('click', event => { if (event.target === dialog) close() })
  })
}
