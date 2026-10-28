import { mountInputClear } from '../../shared/input-clear.js'
export function createAudioInputDialog(actions) {
  const backdrop = document.createElement('div')
  backdrop.className = 'workflow-backdrop'
  backdrop.hidden = true
  backdrop.innerHTML = `<section class="workflow-panel audio-input-panel" role="dialog" aria-modal="true" aria-labelledby="audio-input-title"><button class="modal-close" type="button" aria-label="关闭">×</button><div class="workflow-header"><div><h2 id="audio-input-title">音频输入</h2><p>拖入音频文件，作为后续节点的输入。</p></div></div><article class="workflow-node-card"><div class="audio-drop-zone"><span class="drop-mark">↓</span><span>拖拽音频到这里，或</span><button class="secondary-button" type="button" data-pick>选择音频</button></div><div class="file-display"></div><div class="audio-preview" id="canvas-input-dialog-preview" hidden></div><p class="input-dialog-error" role="status"></p></article></section>`
  document.body.append(backdrop)
  let current = null
  let previousFocus = null
  const close = () => { backdrop.hidden = true; actions.preview('canvas-input-dialog-preview', null); current = null; previousFocus?.focus() }
  const accept = (file) => {
    if (!file || !current) return
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|flac|ogg|aac|opus|webm)$/i.test(file.name)) { backdrop.querySelector('[role="status"]').textContent = '请选择音频文件'; return }
    current.file = file
    current.onChange(file)
    backdrop.querySelector('.file-display').textContent = file.name
    backdrop.querySelector('[role="status"]').textContent = ''
    actions.preview('canvas-input-dialog-preview', file)
  }
  mountInputClear(backdrop.querySelector('.audio-drop-zone'), { hasInput: () => !!current?.file, clear: () => { current.file = null; current.onChange(null); backdrop.querySelector('.file-display').textContent = '尚未选择文件'; actions.preview('canvas-input-dialog-preview', null) } })
  backdrop.querySelector('.modal-close').addEventListener('click', close)
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close() })
  // Keep Escape local to this dialog, ahead of the basic-node global shortcuts.
  document.addEventListener('keydown', (event) => { if (!backdrop.hidden && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close() } }, true)
  backdrop.querySelector('[data-pick]').addEventListener('click', async () => { const owner = current; const file = await actions.pick(); if (current === owner) accept(file) })
  const zone = backdrop.querySelector('.audio-drop-zone')
  zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('drag-over') })
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))
  zone.addEventListener('drop', (event) => { event.preventDefault(); event.stopPropagation(); zone.classList.remove('drag-over'); accept(event.dataTransfer.files[0]) })
  return (node, onChange) => {
    previousFocus = document.activeElement
    current = { file: node.file, onChange }
    backdrop.querySelector('#audio-input-title').textContent = node.title
    backdrop.querySelector('.file-display').textContent = node.file?.name || '尚未选择文件'
    backdrop.querySelector('[role="status"]').textContent = ''
    backdrop.hidden = false
    actions.preview('canvas-input-dialog-preview', node.file)
    backdrop.querySelector('.modal-close').focus()
  }
}
