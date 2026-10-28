export const isTextNode = node => ['text-input', 'sensevoice', 'number-text', 'text-split'].includes(node?.type)
export const takesTextFile = node => ['text-input', 'number-text', 'text-split'].includes(node?.type)
export const acceptsText = node => ['indextts', 'chatterbox-read', 'chatterbox-mix'].includes(node?.type)
export const validTextFile = file => file && (/\.(txt|md|csv|srt|vtt)$/i.test(file.name) || file.type.startsWith('text/'))
export async function textOutput(node) {
  const text = node.params?.text ?? (node.localFirst ? await node.localFirst.text() : '')
  if (!text.trim()) throw new Error('请输入文本或拖入文本文件')
  return new File([text], 'text.txt', { type: 'text/plain;charset=utf-8' })
}
export const TEXT_EDIT_LIMIT = 512
export const TEXT_PREVIEW_LIMIT = 512
const characters = text => Array.from(text)
export async function openTextInput(node = { params: {} }, input = null, connections = {}) {
  const connected = !!connections.first
  const dialog = document.createElement('dialog')
  dialog.className = 'input-dialog text-input-dialog'
  dialog.innerHTML = '<form method="dialog"><header><h2>文本输入</h2></header><label class="task-audio-drop">拖入文本文件，或点击选择<input type="file" accept=".txt,.md,.csv,.srt,.vtt,text/*"></label><textarea rows="12" placeholder="直接输入文本…" aria-label="输入文本"></textarea><p role="status" aria-live="polite"></p><footer><button class="secondary-button" type="button" data-clear>清空</button><button class="primary-button" type="submit">完成</button></footer></form>'
  const area = dialog.querySelector('textarea'), drop = dialog.querySelector('label'), status = dialog.querySelector('p')
  const submit = dialog.querySelector('button[type="submit"]')
  let fullText = connected ? (input ? await input.text() : '') : node.params?.text || '', file = connected ? null : node.localFirst || null, revision = 0
  let reading = Promise.resolve()
  const display = () => {
    const chars = characters(fullText), previewOnly = chars.length > TEXT_EDIT_LIMIT
    area.readOnly = connected || previewOnly
    area.classList.toggle('is-preview-only', connected || previewOnly)
    area.value = chars.slice(0, TEXT_PREVIEW_LIMIT).join('')
    status.textContent = connected ? `连接：${connections.first} · 文本直接透传${!input ? ' · 等待上游运行' : ''}` : previewOnly
      ? `${chars.length} 字 · 超过 ${TEXT_EDIT_LIMIT} 字，仅支持预览${chars.length > TEXT_PREVIEW_LIMIT ? `（显示前 ${TEXT_PREVIEW_LIMIT} 字）` : ''}`
      : `${chars.length} / ${TEXT_EDIT_LIMIT} 字 · 可编辑`
  }
  const accept = selected => {
    if (connected) return
    if (!validTextFile(selected)) { status.textContent = '请选择文本文件'; return }
    const current = ++revision
    submit.disabled = true; area.readOnly = true; status.textContent = '正在读取文本…'
    reading = selected.text().then(text => {
      if (current !== revision) return
      fullText = text; file = selected; display()
    }).catch(error => { if (current === revision) { display(); status.textContent = error.message } })
      .finally(() => { if (current === revision) submit.disabled = false })
  }
  dialog.querySelector('[data-clear]').disabled = connected
  drop.inert = connected
  drop.classList.toggle('upstream-input-zone', connected)
  dialog.querySelector('[data-clear]').onclick = () => {
    if (connected) return
    ++revision
    fullText = ''; file = null
    drop.querySelector('input').value = ''
    submit.disabled = false
    display(); area.focus()
  }
  display()
  if (!connected && file && node.params?.text == null) accept(file)
  drop.ondragover = event => event.preventDefault()
  drop.ondrop = event => { event.preventDefault(); accept(event.dataTransfer.files[0]) }
  drop.querySelector('input').onchange = event => accept(event.target.files[0])
  area.oninput = () => {
    if (area.readOnly) return
    const caret = area.selectionStart
    fullText = characters(area.value).slice(0, TEXT_EDIT_LIMIT).join('')
    file = null; display()
    area.setSelectionRange(Math.min(caret, area.value.length), Math.min(caret, area.value.length))
  }
  document.body.append(dialog); dialog.showModal()
  return new Promise(resolve => { dialog.onclose = async () => {
    await reading
    const params = { ...node.params }
    if (connected) {
      delete params.text
      node.localFirst = null
    } else if (characters(fullText).length > TEXT_EDIT_LIMIT) {
      // Keep complete long text in the durable attachment store, never its preview
      // or a duplicate in localStorage workflow metadata.
      node.localFirst = file || new File([fullText], 'text.txt', { type: 'text/plain;charset=utf-8' })
      delete params.text
    } else {
      node.localFirst = file
      params.text = fullText
    }
    dialog.remove(); resolve({ params, model: node.model, output: null })
  } })
}
