import { mountInputClear } from '../../shared/input-clear.js'
import { runModelNode } from './node-model-runner.js'

export function mountLoudness({ preview, download }) {
  const el = id => document.getElementById(`loudness-${id}`)
  let node, file, output, controller, resolveClose, running = false
  let connected = false
  const label = () => { el('value').value = Number(el('target').value).toFixed(2); el('face').style.setProperty('--knob-angle', `${-135 + (Number(el('target').value) + 36) / 31 * 270}deg`) }
  const setTarget = value => window.jQuery(el('target')).val(value).trigger('change')
  window.jQuery(el('target')).knob({ min: -36, max: -5, step: .01, width: 124, height: 124, angleOffset: -135, angleArc: 270, fgColor: 'transparent', bgColor: 'transparent', displayInput: false, change: value => { el('target').value = value; label() } })
  el('target').addEventListener('change', label)
  const commitValue = () => {
    const value = el('value').valueAsNumber
    if (!running && Number.isFinite(value)) setTarget(Math.min(-5, Math.max(-36, Math.round(value * 100) / 100)))
    label()
  }
  el('value').addEventListener('input', () => {
    const value = el('value').valueAsNumber
    if (!running && Number.isFinite(value) && value >= -36 && value <= -5) {
      const typed = el('value').value
      window.jQuery(el('target')).val(Math.round(value * 100) / 100).trigger('change')
      el('value').value = typed
      // Keep the typed text intact until the user finishes editing.
      el('face').style.setProperty('--knob-angle', `${-135 + (value + 36) / 31 * 270}deg`)
    }
  })
  el('value').addEventListener('change', commitValue)
  el('value').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commitValue(); el('value').blur() } })
  const accept = audio => {
    if (!audio || running || connected) return
    if (!audio.type.startsWith('audio/') && !/\.(wav|mp3|m4a|flac|ogg|aac|opus|webm)$/i.test(audio.name)) { el('message').textContent = '请选择音频文件'; return }
    file = audio; output = null; preview('loudness-output-preview', null)
    el('filename').textContent = audio.name; el('run').disabled = false; el('download').disabled = true
    preview('loudness-input-preview', file)
  }
  const close = () => {
    if (running) { controller?.abort(); return }
    el('backdrop').hidden = true
    if (node) node.localFirst = connected ? null : file
    resolveClose?.({ params: { ...node?.params, ui: { 'loudness-target': Number(el('target').value) } }, model: node?.model, output })
    resolveClose = null
  }
  mountInputClear(el('drop'), { hasInput: () => !!file, blocked: () => running || connected, clear: () => { file = output = null; el('filename').textContent = '尚未选择文件'; preview('loudness-input-preview', null); preview('loudness-output-preview', null); el('run').disabled = el('download').disabled = true; el('message').textContent = '输入已清空'; el('percent').textContent = '0%'; el('bar').style.width = '0%' } })
  el('close').onclick = close
  el('pick').onclick = () => el('file').click()
  el('file').onchange = () => accept(el('file').files[0])
  el('drop').ondragover = event => event.preventDefault()
  el('drop').ondrop = event => { event.preventDefault(); accept(event.dataTransfer.files[0]) }
  el('stop').onclick = () => controller?.abort()
  el('download').onclick = () => output && download(output, 'loudness-balanced.wav')
  el('run').onclick = async () => {
    if (!file || running) return
    el('value').blur(); commitValue()
    running = true; el('value').disabled = true; controller = new AbortController(); output = null
    preview('loudness-output-preview', null); el('download').disabled = true
    el('run').disabled = true; el('stop').disabled = false; el('pick').disabled = true; el('file').disabled = true
    window.jQuery(el('target')).trigger('configure', { readOnly: true })
    const progress = (value, message) => { el('percent').textContent = `${value}%`; el('bar').style.width = `${value}%`; el('message').textContent = message }
    progress.signal = controller.signal
    try {
      progress(0, '正在上传音频')
      output = await runModelNode({ type: 'loudness', params: { ui: { 'loudness-target': Number(el('target').value) } } }, file, null, progress)
      preview('loudness-output-preview', output); el('download').disabled = false
    } catch (error) { el('message').textContent = controller.signal.aborted ? '已停止' : error.message }
    finally {
      running = false; el('value').disabled = false; el('run').disabled = false; el('stop').disabled = true
      el('pick').disabled = connected; el('file').disabled = connected
      window.jQuery(el('target')).trigger('configure', { readOnly: false })
    }
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !el('backdrop').hidden) close() })
  return { open(config = null, input = null, connections = {}) {
    node = config; connected = !!connections.first; file = null; output = config?.output || null
    el('backdrop').hidden = false; el('file').value = ''; el('run').disabled = true
    el('message').textContent = '准备就绪'; el('percent').textContent = '0%'; el('bar').style.width = '0%'
    el('drop').inert = false
    accept(input || config?.localFirst)
    // Connected input is readable, but cannot be replaced in the configuration dialog.
    if (connected) {
      file = input; el('filename').textContent = file?.name || '等待上游输出'; el('run').disabled = !file
      preview('loudness-input-preview', file || null)
    } else if (!file) { el('filename').textContent = '尚未选择文件'; preview('loudness-input-preview', null) }
    el('drop').inert = connected; el('drop').classList.toggle('upstream-input-zone', connected)
    el('pick').disabled = connected; el('file').disabled = connected
    setTarget(config?.params?.ui?.['loudness-target'] ?? config?.params?.lufs ?? -16); label()
    output = config?.output || null; preview('loudness-output-preview', output); el('download').disabled = !output
    return new Promise(resolve => { resolveClose = resolve })
  } }
}
