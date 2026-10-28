import { loadWorkflows } from '../../adapters/browser/workflow/runtime.js'
import { loadPageState } from '../../adapters/browser/workflow/page-state.js'
await Promise.all([loadWorkflows(),loadPageState()])
import { closeDropdown, bindDropdown } from './shared/dropdown.js'
import { watchJobEvents } from '../../adapters/browser/workflow/runtime.js'
import { biquadCoefficients } from '../../headless/audio/spectrum-dsp.js'
import { spectrumTargets } from '../../headless/audio/spectrum-processing.js'
import { readMixConditions, MIX_CONDITIONS } from './shared/chatterbox-mix-options.js'
import { openQualityReview } from './workflows/controllers/quality-review.js'
import { openAudioMerge, mergePorts } from './workflows/controllers/audio-merge.js'
import { openNumberText } from './workflows/controllers/number-text.js'
import { parameterKnob } from './shared/parameter-knob.js'
import { mountInputClear } from './shared/input-clear.js'
import { openAudioInput } from './workflows/controllers/audio-input.js'
import { mountAudioBalance } from './workflows/controllers/audio-balance-ui.js'
import { mountMultiVoice } from './workflows/controllers/multi-voice.js'
import { openTextInput } from './workflows/controllers/text-input.js'
import { mountLoudness } from './workflows/controllers/loudness.js'
import { packConfigAudio, unpackConfigAudio } from './workflows/controllers/node-config.js'
import { mountSettings } from './workflows/controllers/settings.js'
import { mountSidebar } from './workflows/controllers/sidebar.js'
import { waitForNodeJob } from './workflows/controllers/node-job-progress.js'
import { mountUvr5 } from './workflows/controllers/uvr5.js'
import { mountSpectrumEnhance } from './workflows/controllers/spectrum-enhance.js'
import { mountSenseVoice } from './workflows/controllers/sensevoice.js'
import { mountIndexTts } from './workflows/controllers/indextts.js'
import { mountChatterboxRead } from './workflows/controllers/chatterbox-read.js'
import { mountChatterboxMix } from './workflows/controllers/chatterbox-mix.js'
import { mountNodeWorkbench } from './workflows/controllers/node-workbench.js'

const navItems = [...document.querySelectorAll('.nav-item')]
mountSidebar()
mountSettings()
const viewTitle = document.querySelector('#view-title')
const flowSubtitle = document.querySelector('#flow-subtitle')
const flowList = document.querySelector('#flow-list')
const emptyState = document.querySelector('#empty-state')
const searchInput = document.querySelector('#search-input')
const workflowBackdrop = document.querySelector('#workflow-backdrop')
const inputFileDisplay = document.querySelector('#input-file-display')
const processState = document.querySelector('#process-state')
const processStateText = processState.querySelector('span')
const progressMessage = document.querySelector('#progress-message')
const progressPercent = document.querySelector('#progress-percent')
const progressBar = document.querySelector('#progress-bar')
const runDenoiseButton = document.querySelector('#run-denoise-button')
const denoiseModelSelect = document.querySelector('#denoise-model-select')
const denoiseModelDescription = document.querySelector('#denoise-model-description')
const denoiseModelTrigger = document.querySelector('#denoise-model-trigger')
const denoiseModelMenu = document.querySelector('#denoise-model-menu')
const denoiseModelLabel = document.querySelector('#denoise-model-label')
const workflowResultText = document.querySelector('#workflow-result-text')
const downloadOutputButton = document.querySelector('#open-output-button')
const downloadInputButton = document.querySelector('#download-input-button')
const inputDownloadStatus = document.querySelector('#input-download-status')
const runtimeApi = window.aiFlow || null
const mixBackdrop = document.querySelector('#mix-backdrop')
const indexTtsBackdrop = document.querySelector('#indextts-backdrop')
const chatterboxBackdrop = document.querySelector('#chatterbox-backdrop')
const chatterboxMixBackdrop = document.querySelector('#chatterbox-mix-backdrop')
const senseVoiceBackdrop = document.querySelector('#sensevoice-backdrop')
const mixAFileDisplay = document.querySelector('#mix-a-file-display')
const mixBFileDisplay = document.querySelector('#mix-b-file-display')
const mixProcessState = document.querySelector('#mix-process-state')
const mixProcessStateText = mixProcessState.querySelector('span')
const mixProgressMessage = document.querySelector('#mix-progress-message')
const mixProgressPercent = document.querySelector('#mix-progress-percent')
const mixProgressBar = document.querySelector('#mix-progress-bar')
const runMixButton = document.querySelector('#run-mix-button')
const mixResult = document.querySelector('#mix-result')
const mixResultText = document.querySelector('#mix-result-text')
const mixEnhanceRatioInput = document.querySelector('#mix-enhance-ratio')
const mixEnhanceRatioValue = document.querySelector('#mix-enhance-ratio-value')
const mixSharedLufsInput = document.querySelector('#mix-shared-lufs')
const mixSharedLufsValue = document.querySelector('#mix-shared-lufs-value')
const mixPointCountInput = document.querySelector('#mix-point-count')
const mixPointCountValue = document.querySelector('#mix-point-count-value')
const mixHighpassEnabledInput = document.querySelector('#mix-highpass-enabled')
const mixLowpassEnabledInput = document.querySelector('#mix-lowpass-enabled')
const mixCompressionRatioInput = document.querySelector('#mix-compression-ratio')
let selectedInputPath = ''
let selectedInputFile = null
let completedOutputPath = ''
let completedOutputBlob = null
let workflowRunning = false
let cancelRequested = false
let latestDenoiseProgress = 0
let activeBrowserJobId = ''
let activeBrowserEvents = null
let selectedMixAFile = null
let selectedMixBFile = null
let completedMixOutputPath = ''
let completedMixBlob = null
let mixRunning = false
let mixCancelRequested = false
const previewAudioCache = new WeakMap()
let previewTimer = 0
let previewRevision = 0
let spectrumAnimation = 0
let eqAnimation = 0
let previewCurves = Array.from({ length: 3 }, () => new Float64Array(240).fill(-80))
let eqResponseCurve = new Float64Array(240)
let previewWorker = null
let synthesisWorker = null
const audioPlayers = new Map()
let indexTtsReferenceFile = null
let indexTtsEmotionFile = null
let indexTtsEmotionAudioId = ''
let indexTtsEmotionMode = 'voice'
let indexTtsJobId = ''
let indexTtsEvents = null
let indexTtsUploadRequest = null
let indexTtsRunning = false
let indexTtsCancelRequested = false
let indexTtsOutputBlob = null
let indexTtsOutputName = 'indextts2.wav'
let chatterboxFile = null
let chatterboxAudioId = ''
let chatterboxRunning = false
let chatterboxJobId = ''
let chatterboxEvents = null
let chatterboxCancelRequested = false
let chatterboxOutputBlob = null
let chatterboxOutputName = 'chatterbox-reading.wav'
let chatterboxMixFiles = { a: null, b: null }
let chatterboxMixAudioIds = { a: '', b: '' }
let chatterboxMixRunning = false
let chatterboxMixJobId = ''
let chatterboxMixEvents = null
let chatterboxMixCancelRequested = false
let chatterboxMixOutputBlob = null
let chatterboxMixOutputName = 'chatterbox-mix.wav'
let senseVoiceFile = null
let senseVoiceJobId = ''
let senseVoiceEvents = null
let senseVoiceRunning = false
let senseVoiceCancelRequested = false
let senseVoiceOutputName = 'transcript.txt'
let senseVoiceOutputText = ''

function setAudioPreview(id, blob) {
  const container = document.getElementById(id)
  const previous = audioPlayers.get(id)
  if (previous) { previous.audio.pause(); previous.audio.removeAttribute('src'); previous.audio.load(); URL.revokeObjectURL(previous.url); audioPlayers.delete(id) }
  container.replaceChildren()
  container.hidden = !blob
  if (!blob) return
  const audio = document.createElement('audio')
  audio.preload = 'metadata'
  const url = URL.createObjectURL(blob)
  audio.src = url
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '▶'
  button.setAttribute('aria-label', '播放预览')
  const seek = document.createElement('input')
  seek.type = 'range'; seek.min = '0'; seek.max = '100'; seek.step = '.1'; seek.value = '0'
  seek.setAttribute('aria-label', '播放进度')
  const time = document.createElement('time')
  const format = value => { const seconds = Number.isFinite(value) ? Math.floor(value) : 0; return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
  const update = () => { seek.value = audio.duration ? audio.currentTime / audio.duration * 100 : 0; time.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}` }
  button.onclick = async () => {
    if (!audio.paused) { audio.pause(); return }
    for (const player of audioPlayers.values()) if (player.audio !== audio) player.audio.pause()
    try { await audio.play() } catch { time.textContent = '无法播放此格式'; button.setAttribute('aria-label', '重试播放') }
  }
  seek.oninput = () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration }
  audio.onplay = () => { button.textContent = 'Ⅱ'; button.setAttribute('aria-label', '暂停预览') }
  audio.onpause = audio.onended = () => { button.textContent = '▶'; button.setAttribute('aria-label', '播放预览') }
  audio.ontimeupdate = audio.onloadedmetadata = update
  audio.onerror = () => { time.textContent = '无法播放此格式' }
  container.append(button, seek, time, audio)
  audioPlayers.set(id, { audio, url })
  update()
}

function invalidateMixResult() {
  completedMixBlob = null
  completedMixOutputPath = ''
  mixResult.hidden = true
  setAudioPreview('mix-result-player', null)
}

function resetEqPreview() {
  clearTimeout(previewTimer)
  previewRevision += 1
  previewWorker?.terminate()
  animateSpectrumCurves(null, '上传主体与参考音频后自动分析')
  animateEqResponse(null, null)
}

function scheduleEqPreview() {
  invalidateMixResult()
  clearTimeout(previewTimer)
  const revision = ++previewRevision
  previewWorker?.terminate()
  previewTimer = setTimeout(() => refreshEqPreview(revision), 30)
}

function previewAudio(file) {
  if (!previewAudioCache.has(file)) {
    const promise = (async () => {
      const context = new (window.AudioContext || window.webkitAudioContext)()
      try {
        const buffer = await context.decodeAudioData(await file.arrayBuffer())
        return await new Promise((resolve, reject) => {
          const worker = new Worker(new URL('./workflows/audio/spectrum-worker.js', import.meta.url), { type: 'module' })
          worker.onmessage = ({ data }) => {
            worker.terminate()
            data.error ? reject(new Error(data.error)) : resolve(data.audio)
          }
          worker.onerror = (error) => { worker.terminate(); reject(new Error(error.message)) }
          const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).slice())
          worker.postMessage({ prepare: true, channels, sampleRate: buffer.sampleRate }, channels.map((channel) => channel.buffer))
        })
      } finally { await context.close() }
    })()
    previewAudioCache.set(file, promise)
    promise.catch(() => previewAudioCache.delete(file))
  }
  return previewAudioCache.get(file)
}

async function refreshEqPreview(revision) {
  const sourceFile = selectedMixAFile
  const referenceFile = selectedMixBFile
  if (!sourceFile && !referenceFile) return
  const caption = document.querySelector('#spectrum-overlay-caption')
  caption.textContent = '正在分析频谱…'
  document.querySelector('#eq-preview-caption').textContent = '正在计算 EQ 响应…'
  try {
    const parameters = readMixParameters()
    const tracks = [null, null]
    await Promise.all([sourceFile, referenceFile].map(async (file, index) => {
      if (!file) return
      tracks[index] = await previewAudio(file)
      if (revision !== previewRevision) return
      previewWorker?.terminate()
      const worker = previewWorker = new Worker(new URL('./workflows/audio/spectrum-worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        if (revision !== previewRevision || previewWorker !== worker) return
        worker.terminate()
        if (data.error) {
          caption.textContent = `预览失败：${data.error}`
          return
        }
        const both = tracks.every(Boolean)
        animateSpectrumCurves(null, both ? `${data.points.length} 个自动频点 · ${parameters.balanceEnabled === false ? '保留输入响度' : '同响度对比'} · 共享频谱标尺` : tracks[0] ? '主体频谱已分析 · 当前显示基础处理预览' : '参考频谱已分析 · 继续上传主体音频以生成预览', data.curves)
        animateEqResponse(data.points, parameters)
        if (!both) document.querySelector('#eq-preview-caption').textContent = tracks[0] ? '基础滤波响应 · 上传参考音频后自动匹配频点' : '参考音频已就绪 · 等待主体音频'
      }
      worker.onerror = (error) => {
        if (revision === previewRevision && previewWorker === worker) caption.textContent = `预览失败：${error.message}`
        worker.terminate()
      }
      worker.postMessage({ source: tracks[0], reference: tracks[1], parameters })
    }))
  } catch (error) {
    if (revision !== previewRevision) return
    caption.textContent = `预览失败：${error.message}`
    document.querySelector('#eq-preview-caption').textContent = 'EQ 预览失败'
  }
}

function animateSpectrumCurves(audioTracks, caption, preparedTargets) {
  const targets = preparedTargets || spectrumTargets(audioTracks)
  cancelAnimationFrame(spectrumAnimation)
  const from = previewCurves.map((curve) => curve.slice())
  const start = performance.now()
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320
  document.querySelector('#spectrum-overlay-caption').textContent = caption
  const paths = [
    ['#source-spectrum-path', '#eq-source-path', '#eq-reference-source-path'].map((selector) => document.querySelector(selector)),
    ['#target-spectrum-path', '#eq-target-path', '#eq-reference-target-path'].map((selector) => document.querySelector(selector)),
    [document.querySelector('#eq-response-path')],
  ]
  const axisLabels = document.querySelectorAll('#eq-preview .eq-axis-labels text')
  axisLabels[0].textContent = '0'
  axisLabels[1].textContent = '−40'
  axisLabels[2].textContent = '−80'
  const frame = (now) => {
    const progress = duration ? Math.min(1, (now - start) / duration) : 1
    const eased = progress * progress * (3 - 2 * progress)
    previewCurves = targets.map((target, track) => Float64Array.from(target, (value, index) => from[track][index] + (value - from[track][index]) * eased))
    previewCurves.forEach((curve, track) => {
      paths[track].forEach((path) => {
        if (!path) return
        const mini = path.id === 'source-spectrum-path' || path.id === 'target-spectrum-path'
        const eqReference = path.id.startsWith('eq-reference-')
        const xStart = mini ? 30 : 32
        const width = mini ? 320 : 316
        const yStart = mini ? 12 : eqReference ? 18 : 20
        const height = mini ? 96 : eqReference ? 112 : 110
        const pathData = Array.from(curve, (value, index) => `${index ? 'L' : 'M'}${(xStart + index / 239 * width).toFixed(2)} ${(yStart - value / 80 * height).toFixed(2)}`).join(' ')
        path.setAttribute('d', pathData)
      })
    })
    if (progress < 1) spectrumAnimation = requestAnimationFrame(frame)
  }
  spectrumAnimation = requestAnimationFrame(frame)
}

function animateEqResponse(points, parameters) {
  const filters = []
  if (parameters) {
    if (parameters.highpassEnabled) filters.push(biquadCoefficients('highpass', 65, Math.SQRT1_2, 24000))
    if (parameters.lowpassEnabled) filters.push(biquadCoefficients('lowpass', 11200, Math.SQRT1_2, 24000))
    points.forEach(({ frequency, gain }) => filters.push(biquadCoefficients('peaking', frequency, 1, 24000, gain * parameters.enhanceRatio)))
  }
  const target = Float64Array.from({ length: 240 }, (_, index) => {
    const frequency = 20 * (11900 / 20) ** (index / 239)
    const w = 2 * Math.PI * frequency / 24000
    let db = 0
    for (const { b0, b1, b2, a1, a2 } of filters) {
      const numerator = Math.hypot(b0 + b1 * Math.cos(w) + b2 * Math.cos(2 * w), b1 * Math.sin(w) + b2 * Math.sin(2 * w))
      const denominator = Math.hypot(1 + a1 * Math.cos(w) + a2 * Math.cos(2 * w), a1 * Math.sin(w) + a2 * Math.sin(2 * w))
      db += 40 * Math.log10(Math.max(1e-12, numerator / Math.max(1e-12, denominator)))
    }
    return Math.max(-12, Math.min(12, db))
  })
  cancelAnimationFrame(eqAnimation)
  const from = eqResponseCurve.slice()
  const start = performance.now()
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320
  const path = document.querySelector('#eq-response-preview-path')
  const caption = document.querySelector('#eq-preview-caption')
  caption.textContent = parameters ? `${points.length} 个自动频点 · 当前滤波响应` : '上传主体与参考音频后自动分析'
  const frame = (now) => {
    const progress = duration ? Math.min(1, (now - start) / duration) : 1
    const eased = progress * progress * (3 - 2 * progress)
    eqResponseCurve = Float64Array.from(target, (value, index) => from[index] + (value - from[index]) * eased)
    path.setAttribute('d', Array.from(eqResponseCurve, (value, index) => `${index ? 'L' : 'M'}${(32 + index / 239 * 316).toFixed(2)} ${(74 - value / 12 * 56).toFixed(2)}`).join(' '))
    if (progress < 1) eqAnimation = requestAnimationFrame(frame)
  }
  eqAnimation = requestAnimationFrame(frame)
}

const titles = { overview: '基础节点', running: '任务队列', testing: '工作流编排', saved: '工作流' }
let activeView = 'saved'

function filterFlowCards() {
  const query = searchInput.value.trim().toLowerCase()
  let visible = 0
  document.querySelectorAll('.flow-card').forEach((card) => {
    const matchesQuery = card.dataset.name.toLowerCase().includes(query)
    const matchesView = activeView !== 'running' || Boolean(card.querySelector('.status-pill.running'))
    card.hidden = !matchesQuery || !matchesView
    if (!card.hidden) visible += 1
  })
  emptyState.hidden = visible > 0
  emptyState.textContent = activeView === 'running' && !query
    ? '当前没有正在运行的流程'
    : '没有找到匹配的流程'
}

function setView(view) {
  activeView = window.aiFlowNavigate(view)
  flowSubtitle.textContent = activeView === 'running'
    ? '当前正在运行的自动化'
    : activeView === 'testing'
      ? '组合本机处理节点，连线测试后保存为工作流'
      : activeView === 'saved'
        ? '查看并管理已保存的节点工作流'
      : '独立使用，或组合成工作流'
  filterFlowCards()
}

function fileName(filePath) {
  return String(filePath || '').split(/[\\/]/).pop() || filePath
}

function setWorkflowStatus(message, state = '') {
  processState.className = `process-state ${state}`.trim()
  processStateText.textContent = message
}

function formatEta(seconds) {
  const value = Math.max(0, Math.ceil(Number(seconds) || 0))
  if (value < 60) return `${value} 秒`
  const minutes = Math.floor(value / 60)
  const remainder = value % 60
  return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分钟`
}

function setProgress(progress, message, etaSeconds) {
  const value = Math.max(0, Math.min(100, Number(progress) || 0))
  latestDenoiseProgress = value
  progressBar.style.width = `${value}%`
  progressPercent.textContent = `${value}%`
  if (message) {
    const eta = Number(etaSeconds)
    progressMessage.textContent = Number.isFinite(eta) && eta > 0
      ? `${message} · 预计剩余 ${formatEta(eta)}`
      : message
  }
}

function getAudioDuration(id) {
  const audio = audioPlayers.get(id)?.audio
  if (!audio) return Promise.resolve(0)
  if (Number.isFinite(audio.duration) && audio.duration > 0) return Promise.resolve(audio.duration)
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout)
      audio.removeEventListener('loadedmetadata', finish)
      audio.removeEventListener('durationchange', finish)
      resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0)
    }
    const timeout = setTimeout(finish, 2500)
    audio.addEventListener('loadedmetadata', finish, { once: true })
    audio.addEventListener('durationchange', finish, { once: true })
  })
}

function setWorkflowRunning(running) {
  workflowRunning = running
  runDenoiseButton.disabled = running || (!selectedInputPath && !selectedInputFile)
  runDenoiseButton.textContent = running ? '处理中…' : '开始处理'
  document.querySelector('#pick-audio-button').disabled = running
  denoiseModelSelect.disabled = running
  denoiseModelTrigger.disabled = running
  downloadInputButton.disabled = running || (!selectedInputPath && !selectedInputFile)
  document.querySelector('#denoise-drop-zone').classList.toggle('disabled', running)
}

function openAudioPicker(accept = 'audio/*,.wav,.mp3,.m4a,.flac,.ogg,.aac,.webm') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] || null)
    input.click()
  })
}

function openWorkflow() {
  workflowBackdrop.hidden = false
  workflowResultText.textContent = '处理结果将在这里试听和下载'
  downloadOutputButton.hidden = true
  setAudioPreview('denoise-input-player', null)
  setAudioPreview('denoise-result-player', null)
  selectedInputPath = ''
  selectedInputFile = null
  completedOutputPath = ''
  completedOutputBlob = null
  downloadInputButton.disabled = true
  inputDownloadStatus.textContent = ''
  inputFileDisplay.textContent = '尚未选择文件'
  setProgress(0, '准备就绪')
  setWorkflowStatus('等待输入')
  setWorkflowRunning(false)
}

function closeWorkflow() {
  if (workflowRunning) return
  workflowBackdrop.hidden = true
  for (const player of audioPlayers.values()) player.audio.pause()
}

async function pickAudio() {
  const file = await openAudioPicker()
  if (!file) return
  if (runtimeApi?.cacheAudio && file.path) {
    applyDenoiseInput(await runtimeApi.cacheAudio(file.path))
  } else {
    applyDenoiseInput(file)
  }
}

async function applyDenoiseInput(picked) {
  selectedInputFile = picked.file || (picked?.arrayBuffer && picked?.name ? picked : null)
  selectedInputPath = picked.path || ''
  inputFileDisplay.textContent = `${picked.name || fileName(selectedInputPath)} · 已上传`
  if (!selectedInputFile && selectedInputPath && runtimeApi?.readAudio) {
    const bytes = await runtimeApi.readAudio(selectedInputPath)
    selectedInputFile = new File([bytes], picked.name || fileName(selectedInputPath), { type: 'audio/wav' })
  }
  setAudioPreview('denoise-input-player', selectedInputFile)
  downloadInputButton.disabled = !selectedInputPath && !selectedInputFile
  workflowResultText.textContent = '处理结果将在这里试听和下载'
  downloadOutputButton.hidden = true
  setAudioPreview('denoise-result-player', null)
  completedOutputPath = ''
  completedOutputBlob = null
  inputDownloadStatus.textContent = ''
  setWorkflowStatus('输入已就绪', 'success')
  progressMessage.textContent = '可以开始处理'
  setProgress(0, '可以开始处理')
  setWorkflowRunning(false)
}

async function runDenoise() {
  if ((!selectedInputPath && !selectedInputFile) || workflowRunning) return
  completedOutputPath = ''
  completedOutputBlob = null
  setAudioPreview('denoise-result-player', null)
  workflowResultText.textContent = '正在执行所选 UVR5 模型…'
  downloadOutputButton.hidden = true
  cancelRequested = false
  setWorkflowRunning(true)
  setWorkflowStatus('正在处理', 'running')
  setProgress(1, '启动 UVR5 模型处理')
  try {
    const durationSeconds = await getAudioDuration('denoise-input-player')
    let outputName
    if (runtimeApi) {
      const result = await runtimeApi.runDenoise({ inputPath: selectedInputPath, modelId: denoiseModelSelect.value, durationSeconds })
      completedOutputPath = result.outputPath
      const outputBytes = await runtimeApi.readAudio(completedOutputPath)
      completedOutputBlob = new Blob([outputBytes], { type: 'audio/wav' })
      outputName = fileName(completedOutputPath)
    } else {
      if (!selectedInputFile) throw new Error('请先选择要处理的音频文件')
      const { jobId } = await createBrowserDenoiseJob(selectedInputFile, durationSeconds)
      activeBrowserJobId = jobId
      await watchBrowserDenoiseJob(jobId)
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/output`)
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '下载处理结果失败')
      completedOutputBlob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      outputName = encodedName ? decodeURIComponent(encodedName) : `${selectedInputFile.name.replace(/\.[^.]+$/, '')}-denoised.wav`
      completedOutputPath = outputName
    }
    setAudioPreview('denoise-result-player', new File([completedOutputBlob], outputName, { type: 'audio/wav' }))
    setProgress(100, '模型处理完成')
    setWorkflowStatus('处理完成', 'success')
    workflowResultText.textContent = `已输出：${outputName}`
    downloadOutputButton.hidden = false
  } catch (error) {
    if (!cancelRequested) {
      setProgress(Math.max(1, latestDenoiseProgress), error.message || '处理失败')
      setWorkflowStatus('处理失败', 'error')
      workflowResultText.textContent = error.message || '处理失败，可检查模型和输入后重试。'
    }
  } finally {
    activeBrowserEvents?.close()
    activeBrowserEvents = null
    activeBrowserJobId = ''
    setWorkflowRunning(false)
  }
}

function createBrowserDenoiseJob(file, durationSeconds, modelId = denoiseModelSelect.value, onProgress = null) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/denoise')
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.setRequestHeader('X-Filename', encodeURIComponent(file.name))
    request.setRequestHeader('X-Model-Id', modelId)
    request.setRequestHeader('X-Task-Priority', onProgress?.taskPriority || 'normal')
    request.setRequestHeader('X-Audio-Duration', String(durationSeconds || 0))
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.round(event.loaded / event.total * 100)
      setProgress(Math.min(8, Math.max(1, Math.round(percent * 0.08))), `上传音频 ${percent}%`)
      onProgress?.(Math.min(8, Math.max(1, Math.round(percent * 0.08))), `上传音频 ${percent}%`)
    }
    request.onerror = () => reject(new Error('无法连接本地音频服务，请确认 localhost:4173 服务正在运行'))
    request.onload = () => {
      let payload = {}
      try { payload = JSON.parse(request.responseText) } catch { /* handled below */ }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(payload.error || `创建 UVR5 处理任务失败（HTTP ${request.status}）`))
        return
      }
      resolve(payload)
    }
    request.send(file)
  })
}

function watchBrowserDenoiseJob(jobId) {
  return watchJobEvents(jobId, {
    onStream: events => { activeBrowserEvents = events },
    onStatus: payload => {
      setProgress(payload.progress, payload.message, payload.etaSeconds)
    },
  })
}

function measureAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    const finish = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    audio.addEventListener('loadedmetadata', finish, { once: true })
    audio.addEventListener('error', finish, { once: true })
    audio.src = url
  })
}

async function runPipelineUvr(file, modelId, onProgress) {
  onProgress?.signal?.throwIfAborted()
  const duration = await measureAudioDuration(file)
  onProgress(1, '提交 UVR5 任务')
  onProgress?.signal?.throwIfAborted()
  const { jobId } = await createBrowserDenoiseJob(file, duration, modelId, onProgress)
  await waitForNodeJob(jobId, onProgress)
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/output`)
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '读取 UVR5 人声输出失败')
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const outputName = encodedName ? decodeURIComponent(encodedName) : `${file.name.replace(/\.[^.]+$/, '')}-vocals.wav`
  onProgress(100, '人声提取完成')
  return new File([blob], outputName, { type: 'audio/wav' })
}

async function runPipelineEnhancement(source, reference, parameters, onProgress) {
  onProgress(10, '读取两段人声并分析频谱')
  const result = await morphVoiceFiles(source, reference, parameters, onProgress)
  return new File([result.blob], result.name, { type: 'audio/wav' })
}

function setMixStatus(message, state = '') {
  mixProcessState.className = `process-state ${state}`.trim()
  mixProcessStateText.textContent = message
}

function setMixProgress(progress, message) {
  const value = Math.max(0, Math.min(100, Number(progress) || 0))
  mixProgressBar.style.width = `${value}%`
  mixProgressPercent.textContent = `${value}%`
  if (message) mixProgressMessage.textContent = message
}

function setMixRunning(running) {
  mixRunning = running
  runMixButton.disabled = running || !selectedMixAFile || !selectedMixBFile
  runMixButton.textContent = running ? '正在调整音色…' : '开始参考音色增强'
  document.querySelector('#pick-mix-a-button').disabled = running
  document.querySelector('#pick-mix-b-button').disabled = running
  document.querySelector('#mix-a-drop-zone').classList.toggle('disabled', running)
  document.querySelector('#mix-b-drop-zone').classList.toggle('disabled', running)
  mixBackdrop.querySelector('.parameter-panel').inert = running
}

function openMixWorkflow() {
  mixBalance.reset()
  mixBackdrop.hidden = false
  mixResult.hidden = true
  selectedMixAFile = null
  selectedMixBFile = null
  completedMixOutputPath = ''
  completedMixBlob = null
  mixAFileDisplay.textContent = '尚未选择文件'
  mixBFileDisplay.textContent = '尚未选择文件'
  for (const id of ['mix-a-player', 'mix-b-player', 'mix-result-player']) setAudioPreview(id, null)
  setMixProgress(0, '准备就绪')
  setMixStatus('等待主体与参考音频')
  setMixRunning(false)
  resetEqPreview()
}

function closeMixWorkflow() {
  if (mixRunning) return
  mixBackdrop.hidden = true
  for (const player of audioPlayers.values()) player.audio.pause()
}

async function pickMixAudio(which) {
  const file = await openAudioPicker()
  if (!file) return
  await applyMixInput(which, file)
}

async function applyMixInput(which, picked) {
  const inputPath = picked.path || ''
  let file = picked.file || (picked?.arrayBuffer && picked?.name ? picked : null)
  if (!file && inputPath && runtimeApi?.readAudio) {
    const bytes = await runtimeApi.readAudio(inputPath)
    file = new File([bytes], picked.name || fileName(inputPath), { type: 'audio/wav' })
  }
  if (which === 'a') {
    selectedMixAFile = file
    mixAFileDisplay.textContent = `${picked.name || fileName(inputPath)} · 已上传`
  } else {
    selectedMixBFile = file
    mixBFileDisplay.textContent = `${picked.name || fileName(inputPath)} · 已上传`
  }
  setAudioPreview(which === 'a' ? 'mix-a-player' : 'mix-b-player', file)
  setMixStatus(selectedMixAFile && selectedMixBFile ? '主体与参考音频已就绪 · 音量已平衡' : '等待另一段音频', selectedMixAFile && selectedMixBFile ? 'success' : '')
  setMixProgress(0, selectedMixAFile && selectedMixBFile ? '可以开始参考音色增强' : '请选择主体与参考音频')
  setMixRunning(false)
  scheduleEqPreview()
}

function signedNumber(value, digits = 1) {
  const number = Number(value)
  return `${number < 0 ? '−' : ''}${Math.abs(number).toFixed(digits)}`
}

function readMixParameters() {
  const numberValue = (input, fallback) => {
    const value = Number(input?.value)
    return Number.isFinite(value) ? value : fallback
  }
  return {
    enhanceRatio: numberValue(mixEnhanceRatioInput, 100) / 100,
    sharedLufs: numberValue(mixSharedLufsInput, -16),
    balanceEnabled: document.querySelector('#mix-balance-enabled')?.checked ?? true,
    pointCount: Math.max(1, Math.min(12, Math.round(numberValue(mixPointCountInput, 12)))),
    highpassEnabled: Boolean(mixHighpassEnabledInput?.checked),
    lowpassEnabled: Boolean(mixLowpassEnabledInput?.checked),
    compressionRatio: numberValue(mixCompressionRatioInput, 2.2),
  }
}

function bindMixParameterControls() {
  const knobFaces = new Map([
    [mixEnhanceRatioInput, document.querySelector('#mix-enhance-ratio-knob')],
    [mixSharedLufsInput, document.querySelector('#mix-shared-lufs-knob')],
    [mixPointCountInput, document.querySelector('#mix-point-count-knob')],
  ])
  const updateKnob = (input, face) => {
    if (!face) return
    const min = Number(input.dataset.min)
    const max = Number(input.dataset.max)
    const value = Number(input.value)
    const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : .5
    face.style.setProperty('--knob-angle', `${-135 + ratio * 270}deg`)
    input.closest('.knob-shell').querySelector('canvas')?.setAttribute('aria-valuenow', String(value))
  }
  const updateLabels = () => {
    mixEnhanceRatioValue.textContent = `${Number(mixEnhanceRatioInput.value).toFixed(0)}%`
    mixSharedLufsValue.textContent = `${signedNumber(mixSharedLufsInput.value, 2)} LUFS`
    mixPointCountValue.textContent = `${mixPointCountInput.value} 个`
    knobFaces.forEach((face, input) => updateKnob(input, face))
  }
  mixEnhanceRatioInput.addEventListener('input', updateLabels)
  mixSharedLufsInput.addEventListener('input', updateLabels)
  mixPointCountInput.addEventListener('input', updateLabels)
  knobFaces.forEach((face, input) => {
    if (!window.jQuery?.fn?.knob) return
    const discrete = input === mixPointCountInput
    window.jQuery(input).knob({
      width: 78,
      height: 78,
      min: Number(input.dataset.min),
      max: Number(input.dataset.max),
      step: Number(input.dataset.step),
      angleOffset: -135,
      angleArc: 270,
      displayInput: false,
      bgColor: 'transparent',
      fgColor: 'transparent',
      change(value) {
        if (discrete) {
          // Keep Knob's native mouse/touch angle tracking. Add only a
          // detent transfer curve and hysteresis around integer boundaries.
          const raw = Math.max(1, Math.min(12, Number(value)))
          let next = Math.round(Number(input.value))
          while (raw - next > .58 && next < 12) next += 1
          while (raw - next < -.58 && next > 1) next -= 1
          const changed = next !== Number(input.value)
          this.change(next)
          updateLabels()
          const position = raw - 1
          const resisted = position - .12 * Math.sin(2 * Math.PI * position)
          face.style.setProperty('--knob-angle', `${-135 + resisted * 270 / 11}deg`)
          if (changed) scheduleEqPreview()
          return false
        }
        input.value = value
        updateLabels()
        scheduleEqPreview()
      },
      release(value) {
        input.value = value
        updateLabels()
        scheduleEqPreview()
      },
    })
    const shell = input.closest('.knob-shell')
    shell.title = '拖动旋转 · 滚轮微调 · 方向键调节'
    const canvas = shell.querySelector('canvas')
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'slider')
    canvas.setAttribute('aria-label', input.getAttribute('aria-label'))
    canvas.setAttribute('aria-valuemin', input.dataset.min)
    canvas.setAttribute('aria-valuemax', input.dataset.max)
    if (discrete) {
      shell.title = '旋转逐档调节 · 滚轮微调 · 方向键调节'
      shell.classList.add('discrete-knob')
    }
    canvas.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      window.jQuery(input).trigger(window.jQuery.Event('keydown', { keyCode: event.keyCode }))
      updateLabels()
      scheduleEqPreview()
    })
    canvas.addEventListener('keyup', (event) => {
      window.jQuery(input).trigger(window.jQuery.Event('keyup', { keyCode: event.keyCode }))
    })
  })
  ;[mixHighpassEnabledInput, mixLowpassEnabledInput, mixCompressionRatioInput].forEach((input) => {
    input.addEventListener('input', scheduleEqPreview)
  })
  updateLabels()
}


async function morphVoiceFiles(fileA, fileB, parameterOverrides = null, onProgress = null) {
  const parameters = { ...readMixParameters(), ...parameterOverrides, exportAudio: true }
  const [source, reference] = await Promise.all([previewAudio(fileA), previewAudio(fileB)])
  onProgress?.signal?.throwIfAborted()
  if (!onProgress && mixCancelRequested) throw new Error('已取消')
  onProgress?.(35, '已分析两段人声频谱，正在生成 EQ')
  setMixProgress(25, '正在合成音色与平衡响度')
  return new Promise((resolve, reject) => {
    const worker = synthesisWorker = new Worker(new URL('./workflows/audio/spectrum-worker.js', import.meta.url), { type: 'module' })
    const cancel = () => { finish(); reject(new DOMException('已停止', 'AbortError')) }
    const finish = () => { onProgress?.signal?.removeEventListener('abort', cancel); worker.terminate(); if (synthesisWorker === worker) synthesisWorker = null }
    onProgress?.signal?.addEventListener('abort', cancel, { once: true })
    worker.onmessage = ({ data }) => {
      finish()
      if (data.error) { reject(new Error(data.error)); return }
      animateSpectrumCurves(null, data.points.length + ' 个自动频点 · 实际输出频谱', data.curves)
      animateEqResponse(data.points, parameters)
      onProgress?.(100, '频谱增强完成')
      resolve({ blob: data.blob, name: fileA.name.replace(/\.[^.]+$/, '') + '.spectral-enhanced.wav' })
    }
    worker.onerror = error => { finish(); reject(new Error(error.message)) }
    worker.cancel = () => { finish(); reject(new Error('已取消')) }
    worker.postMessage({ source, reference, parameters })
  })
}

async function handleAudioDrop(event, onReady, setStatus, setProgress) {
  event.preventDefault()
  event.stopPropagation()
  event.currentTarget.classList.remove('drag-over')
  const item = [...(event.dataTransfer?.items || [])].find((entry) => entry.kind === 'file')
  const file = item?.getAsFile?.() || event.dataTransfer?.files?.[0]
  if (!file) {
    setStatus('无法读取拖入的文件', 'error')
    setProgress(0, '请拖入本机音频文件')
    return
  }
  try {
    await onReady(file)
    setStatus(`已上传：${file.name}`, 'success')
    setProgress(0, '文件已进入临时内存，可以开始处理')
  } catch (error) {
    setStatus(error.message || '上传失败', 'error')
    setProgress(0, error.message || '上传失败')
  }
}

async function runMix() {
  if (!selectedMixAFile || !selectedMixBFile || mixRunning) return
  clearTimeout(previewTimer)
  previewRevision += 1
  previewWorker?.terminate()
  mixResult.hidden = true
  mixCancelRequested = false
  setMixRunning(true)
  setMixStatus('正在调整参考音色', 'running')
  setMixProgress(1, '分析参考频谱并生成 EQ')
  try {
    const result = await morphVoiceFiles(selectedMixAFile, selectedMixBFile)
    if (mixCancelRequested) return
    completedMixBlob = result.blob
    completedMixOutputPath = result.name
    setAudioPreview('mix-result-player', result.blob)
    setMixProgress(100, '参考音色增强完成')
    setMixStatus('处理完成', 'success')
    mixResultText.textContent = `已生成：${completedMixOutputPath}`
    mixResult.hidden = false
  } catch (error) {
    if (!mixCancelRequested) {
      setMixProgress(0, error.message || '参考音色增强失败')
      setMixStatus('处理失败', 'error')
    }
  } finally {
    setMixRunning(false)
  }
}

async function downloadFile(outputPath, resultText, resultElement, statusSetter) {
  if (!runtimeApi || !outputPath) return
  try {
    const result = await runtimeApi.downloadFile(outputPath)
    if (!result) return
    resultText.textContent = `已下载：${fileName(result.path)}`
    resultElement.hidden = false
    statusSetter('已下载', 'success')
  } catch (error) {
    statusSetter(error.message || '下载失败', 'error')
  }
}

function downloadBlob(blob, name, updateMixStatus = true) {
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name || 'ai-flow-mixed.wav'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  if (updateMixStatus) {
    mixResultText.textContent = `已下载：${name}`
    setMixStatus('已下载', 'success')
  }
}

function setChatterboxStatus(message, state = '') {
  const stateElement = document.querySelector('#chatterbox-state')
  stateElement.className = `process-state ${state}`.trim()
  stateElement.querySelector('span').textContent = message
}

function setChatterboxProgress(progress, message) {
  const value = Math.max(0, Math.min(100, Number(progress) || 0))
  document.querySelector('#chatterbox-progress-bar').style.width = `${value}%`
  document.querySelector('#chatterbox-progress-percent').textContent = `${value}%`
  if (message) document.querySelector('#chatterbox-progress-message').textContent = message
}

function setChatterboxRunning(running) {
  chatterboxRunning = running
  const ready = Boolean(chatterboxAudioId && document.querySelector('#chatterbox-text').value.trim())
  document.querySelector('#chatterbox-run').disabled = running || !ready
  document.querySelector('#chatterbox-run').textContent = running ? '正在生成…' : '开始朗读'
  document.querySelectorAll('#chatterbox-model, #chatterbox-language, #chatterbox-model-trigger, #chatterbox-language-trigger, #chatterbox-text, #chatterbox-pick-a').forEach((control) => { control.disabled = running })
  document.querySelector('#chatterbox-a-drop').classList.toggle('disabled', running)
}

const chatterboxModelSelect = document.querySelector('#chatterbox-model')
const chatterboxLanguageSelect = document.querySelector('#chatterbox-language')
const chatterboxModelMenu = document.querySelector('#chatterbox-model-menu')
const chatterboxLanguageMenu = document.querySelector('#chatterbox-language-menu')
const chatterboxModelTrigger = document.querySelector('#chatterbox-model-trigger')
const chatterboxLanguageTrigger = document.querySelector('#chatterbox-language-trigger')
function syncChatterboxLanguage(languageSelect, languageMenu, languageLabel, languageField, optionAttribute, model) {
  const multilingual = model === 'multilingual'
  const fixedLanguage = 'en'
  languageField.hidden = !multilingual
  languageMenu.querySelectorAll(`[${optionAttribute}]`).forEach((item) => {
    item.hidden = !multilingual && item.getAttribute(optionAttribute) !== fixedLanguage
    item.disabled = !multilingual && item.getAttribute(optionAttribute) !== fixedLanguage
  })
  Array.from(languageSelect.options).forEach((option) => {
    option.hidden = !multilingual && option.value !== fixedLanguage
    option.disabled = !multilingual && option.value !== fixedLanguage
  })
  if (!multilingual || !languageSelect.value) languageSelect.value = fixedLanguage
  languageLabel.textContent = languageSelect.selectedOptions[0]?.textContent || '英文'
  languageMenu.querySelectorAll(`[${optionAttribute}]`).forEach((item) => {
    item.setAttribute('aria-selected', String(item.getAttribute(optionAttribute) === languageSelect.value))
  })
}
bindDropdown({
  select: chatterboxModelSelect,
  trigger: chatterboxModelTrigger,
  menu: chatterboxModelMenu,
  label: document.querySelector('#chatterbox-model-label'),
  optionAttribute: 'data-chatterbox-model',
  onSelect: (value) => syncChatterboxLanguage(chatterboxLanguageSelect, chatterboxLanguageMenu, document.querySelector('#chatterbox-language-label'), document.querySelector('#chatterbox-language-field'), 'data-chatterbox-language', value),
})
bindDropdown({
  select: chatterboxLanguageSelect,
  trigger: chatterboxLanguageTrigger,
  menu: chatterboxLanguageMenu,
  label: document.querySelector('#chatterbox-language-label'),
  optionAttribute: 'data-chatterbox-language',
})
const chatterboxMixModelSelect = document.querySelector('#chatterbox-mix-model')
const chatterboxMixLanguageSelect = document.querySelector('#chatterbox-mix-language')
const chatterboxMixModelMenu = document.querySelector('#chatterbox-mix-model-menu')
const chatterboxMixLanguageMenu = document.querySelector('#chatterbox-mix-language-menu')
const chatterboxMixModelTrigger = document.querySelector('#chatterbox-mix-model-trigger')
const chatterboxMixLanguageTrigger = document.querySelector('#chatterbox-mix-language-trigger')
bindDropdown({
  select: chatterboxMixModelSelect,
  trigger: chatterboxMixModelTrigger,
  menu: chatterboxMixModelMenu,
  label: document.querySelector('#chatterbox-mix-model-label'),
  optionAttribute: 'data-chatterbox-mix-model',
  onSelect: (value) => syncChatterboxLanguage(chatterboxMixLanguageSelect, chatterboxMixLanguageMenu, document.querySelector('#chatterbox-mix-language-label'), document.querySelector('#chatterbox-mix-language-field'), 'data-chatterbox-mix-language', value),
})
bindDropdown({
  select: chatterboxMixLanguageSelect,
  trigger: chatterboxMixLanguageTrigger,
  menu: chatterboxMixLanguageMenu,
  label: document.querySelector('#chatterbox-mix-language-label'),
  optionAttribute: 'data-chatterbox-mix-language',
})
const senseVoiceLanguageSelect = document.querySelector('#sensevoice-language')
const senseVoiceLanguageMenu = document.querySelector('#sensevoice-language-menu')
const senseVoiceLanguageTrigger = document.querySelector('#sensevoice-language-trigger')
bindDropdown({
  select: senseVoiceLanguageSelect,
  trigger: senseVoiceLanguageTrigger,
  menu: senseVoiceLanguageMenu,
  label: document.querySelector('#sensevoice-language-label'),
  optionAttribute: 'data-sensevoice-language',
})
const mixBalance = mountAudioBalance(document.querySelector('#mix-backdrop .parameter-panel'), 'mix', mixSharedLufsInput)
document.querySelector('#mix-balance-enabled').addEventListener('change',scheduleEqPreview)
const indexBalance = mountAudioBalance(document.querySelector('#indextts-backdrop .indextts-emotion-card') || document.querySelector('#indextts-backdrop .workflow-node-card'), 'indextts')
const chatterBalance = mountAudioBalance(document.querySelector('#chatterbox-mix-model').closest('article'), 'chatterbox-mix')
const cfgHost=document.createElement('div');cfgHost.className='balance-knob';document.querySelector('#chatterbox-mix-backdrop .audio-balance-control').append(cfgHost)
const chatterMixCfg=parameterKnob(cfgHost,{id:'chatterbox-mix-cfg',label:'CFG',value:.5,min:0,max:1,step:.01,unit:''})
const multiVoice = mountMultiVoice({apply:applyChatterboxMixAudio,pick:side=>{const input=document.createElement('input');input.type='file';input.accept='audio/*';input.onchange=()=>applyChatterboxMixAudio(side,input.files[0]).catch(()=>{});input.click()},preview:setAudioPreview,files:()=>chatterboxMixFiles,ids:()=>chatterboxMixAudioIds})

function openChatterboxWorkflow() {
  chatterboxBackdrop.hidden = false
  chatterboxFile = null
  chatterboxAudioId = ''
  chatterboxOutputBlob = null
  chatterboxOutputName = 'chatterbox-reading.wav'
  chatterboxJobId = ''
  chatterboxModelSelect.value = 'english'
  chatterboxLanguageSelect.value = 'en'
  document.querySelector('#chatterbox-model-label').textContent = '标准英文'
  document.querySelector('#chatterbox-language-label').textContent = '英文'
  closeDropdown(chatterboxModelMenu, chatterboxModelTrigger)
  closeDropdown(chatterboxLanguageMenu, chatterboxLanguageTrigger)
  chatterboxModelMenu.querySelectorAll('[data-chatterbox-model]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.chatterboxModel === 'english')))
  chatterboxLanguageMenu.querySelectorAll('[data-chatterbox-language]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.chatterboxLanguage === 'en')))
  syncChatterboxLanguage(chatterboxLanguageSelect, chatterboxLanguageMenu, document.querySelector('#chatterbox-language-label'), document.querySelector('#chatterbox-language-field'), 'data-chatterbox-language', 'english')
  document.querySelector('#chatterbox-text').value = ''
  document.querySelector('#chatterbox-a-name').textContent = '拖拽参考音频到这里，或'
  for (const id of ['chatterbox-a-player', 'chatterbox-output-player']) setAudioPreview(id, null)
  document.querySelector('#chatterbox-result').hidden = true
  setChatterboxStatus('等待输入')
  setChatterboxProgress(0, '准备就绪')
  setChatterboxRunning(false)
}

function closeChatterboxWorkflow() {
  if (chatterboxRunning) return
  chatterboxBackdrop.hidden = true
  for (const player of audioPlayers.values()) player.audio.pause()
}

async function applyChatterboxAudio(file) {
  if (!file) return
  chatterboxFile = file
  chatterboxAudioId = ''
  document.querySelector('#chatterbox-a-name').textContent = `${file.name} · 上传中`
  setAudioPreview('chatterbox-a-player', file)
  setChatterboxRunning(false)
  try {
    const response = await fetch('/api/chatterbox/upload', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) },
      body: file,
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || '参考音频上传失败')
    if (chatterboxFile !== file) return
    chatterboxAudioId = payload.audioId
    document.querySelector('#chatterbox-a-name').textContent = `${file.name} · 已就绪`
    setChatterboxStatus('参考音频已就绪', 'success')
    setChatterboxProgress(0, '输入朗读文本后即可生成')
    setChatterboxRunning(false)
  } catch (error) {
    if (chatterboxFile === file) {
      chatterboxAudioId = ''
      document.querySelector('#chatterbox-a-name').textContent = `${file.name} · 上传失败`
      setChatterboxStatus(error.message || '参考音频上传失败', 'error')
      setChatterboxRunning(false)
    }
    throw error
  }
}

function watchChatterboxJob(jobId) {
  return watchJobEvents(jobId, {
    onStream: events => { chatterboxEvents = events },
    onStatus: payload => {
      const eta = payload.etaSeconds > 0 ? ` · 预计剩余 ${formatEta(payload.etaSeconds)}` : ''
      setChatterboxProgress(payload.progress, `${payload.message || ''}${eta}`)
      if (payload.phase === 'loading' || payload.phase === 'inference' || payload.phase === 'conditioning' || payload.phase === 'finalizing') setChatterboxStatus(payload.message, 'running')
    },
  })
}

async function runChatterbox() {
  if (chatterboxRunning || !chatterboxAudioId) return
  const text = document.querySelector('#chatterbox-text').value.trim()
  if (!text) return
  chatterboxCancelRequested = false
  chatterboxOutputBlob = null
  document.querySelector('#chatterbox-result').hidden = true
  setChatterboxRunning(true)
  setChatterboxStatus('正在启动 Chatterbox', 'running')
  setChatterboxProgress(1, '正在创建朗读任务')
  try {
    const response = await fetch('/api/chatterbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceAudio: chatterboxAudioId, text,
        model: document.querySelector('#chatterbox-model').value,
        language: chatterboxModelSelect.value === 'english' ? 'en' : chatterboxLanguageSelect.value,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Chatterbox 任务创建失败')
    chatterboxJobId = payload.jobId
    if (chatterboxCancelRequested) {
      await fetch(`/api/jobs/${encodeURIComponent(chatterboxJobId)}/cancel`, { method: 'POST' }).catch(() => {})
      return
    }
    await watchChatterboxJob(chatterboxJobId)
    const outputResponse = await fetch(`/api/jobs/${encodeURIComponent(chatterboxJobId)}/output`)
    if (!outputResponse.ok) throw new Error('无法读取 Chatterbox 输出文件')
    chatterboxOutputBlob = await outputResponse.blob()
    const encodedName = outputResponse.headers.get('X-Output-Filename')
    chatterboxOutputName = encodedName ? decodeURIComponent(encodedName) : 'chatterbox-reading.wav'
    setAudioPreview('chatterbox-output-player', new File([chatterboxOutputBlob], chatterboxOutputName, { type: 'audio/wav' }))
    document.querySelector('#chatterbox-result-name').textContent = `已生成：${chatterboxOutputName}`
    document.querySelector('#chatterbox-result').hidden = false
    setChatterboxProgress(100, 'Chatterbox 朗读完成')
    setChatterboxStatus('朗读完成', 'success')
  } catch (error) {
    if (!chatterboxCancelRequested) {
      setChatterboxProgress(0, error.message || '朗读失败')
      setChatterboxStatus('朗读失败', 'error')
    }
  } finally {
    chatterboxEvents?.close()
    chatterboxEvents = null
    chatterboxJobId = ''
    setChatterboxRunning(false)
  }
}

function setChatterboxMixStatus(message, state = '') {
  const element = document.querySelector('#chatterbox-mix-state')
  element.className = `process-state ${state}`.trim()
  element.querySelector('span').textContent = message
}

function setChatterboxMixProgress(progress, message) {
  const value = Math.max(0, Math.min(100, Number(progress) || 0))
  document.querySelector('#chatterbox-mix-progress-bar').style.width = `${value}%`
  document.querySelector('#chatterbox-mix-progress-percent').textContent = `${value}%`
  if (message) document.querySelector('#chatterbox-mix-progress-message').textContent = message
}

function setChatterboxMixRunning(running) {
  chatterboxMixRunning = running
  multiVoice.setRunning(running)
  chatterMixCfg.disabled(running)
  document.querySelector('#chatterbox-mix-backdrop .chatterbox-mix-switches').inert=running
  const ready = Boolean(chatterboxMixAudioIds.a && chatterboxMixAudioIds.b && multiVoice.ready() && Object.keys(chatterboxMixFiles).every(key=>!chatterboxMixFiles[key]||chatterboxMixAudioIds[key]) && document.querySelector('#chatterbox-mix-text').value.trim())
  document.querySelector('#chatterbox-mix-run').disabled = running || !ready
  document.querySelector('#chatterbox-mix-run').textContent = running ? '正在混音…' : '开始混音'
  document.querySelectorAll('#chatterbox-mix-model, #chatterbox-mix-language, #chatterbox-mix-model-trigger, #chatterbox-mix-language-trigger, #chatterbox-mix-text, #chatterbox-mix-pick-a, #chatterbox-mix-pick-b').forEach((control) => { control.disabled = running })
  document.querySelector('#chatterbox-mix-backdrop .multi-voice-controls').inert=running
  document.querySelector('#chatterbox-mix-backdrop .audio-balance-control').inert=running
  document.querySelectorAll('#chatterbox-mix-a-drop, #chatterbox-mix-b-drop').forEach((zone) => zone.classList.toggle('disabled', running))
}

function openChatterboxMixWorkflow() {
  chatterboxMixBackdrop.hidden = false
  chatterboxMixFiles = { a: null, b: null }
  chatterBalance.reset()
  chatterboxMixAudioIds = { a: '', b: '' }
  chatterboxMixOutputBlob = null
  chatterboxMixOutputName = 'chatterbox-mix.wav'
  chatterboxMixJobId = ''
  chatterboxMixModelSelect.value = 'english'
  chatterboxMixLanguageSelect.value = 'en'
  document.querySelector('#chatterbox-mix-model-label').textContent = '标准英文'
  document.querySelector('#chatterbox-mix-language-label').textContent = '英文'
  chatterboxMixModelMenu.querySelectorAll('[data-chatterbox-mix-model]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.chatterboxMixModel === 'english')))
  chatterboxMixLanguageMenu.querySelectorAll('[data-chatterbox-mix-language]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.chatterboxMixLanguage === 'en')))
  closeDropdown(chatterboxMixModelMenu, chatterboxMixModelTrigger)
  closeDropdown(chatterboxMixLanguageMenu, chatterboxMixLanguageTrigger)
  syncChatterboxLanguage(chatterboxMixLanguageSelect, chatterboxMixLanguageMenu, document.querySelector('#chatterbox-mix-language-label'), document.querySelector('#chatterbox-mix-language-field'), 'data-chatterbox-mix-language', 'english')
  multiVoice.reset()
  for(const [key,value] of Object.entries(MIX_CONDITIONS)) document.getElementById(`chatterbox-mix-${key.replaceAll('_','-')}`).checked=value
  chatterMixCfg.set(.5)
  document.querySelector('#chatterbox-mix-text').value = ''
  for (const side of ['a', 'b']) document.querySelector(`#chatterbox-mix-${side}-name`).textContent = `拖拽音色 ${side.toUpperCase()} 音频，或`
  for (const id of ['chatterbox-mix-a-player', 'chatterbox-mix-b-player', 'chatterbox-mix-output-player']) setAudioPreview(id, null)
  document.querySelector('#chatterbox-mix-result').hidden = true
  setChatterboxMixStatus('等待输入')
  setChatterboxMixProgress(0, '准备就绪')
  setChatterboxMixRunning(false)
}

function closeChatterboxMixWorkflow() {
  if (chatterboxMixRunning) return
  chatterboxMixBackdrop.hidden = true
  for (const player of audioPlayers.values()) player.audio.pause()
}

async function applyChatterboxMixAudio(side, file) {
  if (!file) return
  chatterboxMixFiles[side] = file
  chatterboxMixAudioIds[side] = ''
  document.querySelector(`#chatterbox-mix-${side}-name`).textContent = `${file.name} · 上传中`
  setAudioPreview(`chatterbox-mix-${side}-player`, file)
  setChatterboxMixRunning(false)
  try {
    const response = await fetch('/api/chatterbox/upload', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) },
      body: file,
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || '参考音频上传失败')
    if (chatterboxMixFiles[side] !== file) return
    chatterboxMixAudioIds[side] = payload.audioId
    multiVoice.ensure()
    document.querySelector(`#chatterbox-mix-${side}-name`).textContent = `${file.name} · 已就绪`
    const bothReady = Boolean(chatterboxMixAudioIds.a && chatterboxMixAudioIds.b)
    setChatterboxMixStatus(bothReady ? `${Object.values(chatterboxMixAudioIds).filter(Boolean).length} 路音色已就绪` : `音色 ${side.toUpperCase()} 已就绪`, 'success')
    setChatterboxMixProgress(0, bothReady ? '输入文本后即可混音' : '请再添加另一段参考音频')
    setChatterboxMixRunning(false)
  } catch (error) {
    if (chatterboxMixFiles[side] === file) {
      chatterboxMixAudioIds[side] = ''
      document.querySelector(`#chatterbox-mix-${side}-name`).textContent = `${file.name} · 上传失败`
      setChatterboxMixStatus(error.message || '参考音频上传失败', 'error')
      setChatterboxMixRunning(false)
    }
    throw error
  }
}

function watchChatterboxMixJob(jobId) {
  return watchJobEvents(jobId, {
    onStream: events => { chatterboxMixEvents = events },
    onStatus: payload => {
      const eta = payload.etaSeconds > 0 ? ` · 预计剩余 ${formatEta(payload.etaSeconds)}` : ''
      setChatterboxMixProgress(payload.progress, `${payload.message || ''}${eta}`)
      if (['loading', 'inference', 'conditioning', 'finalizing'].includes(payload.phase)) setChatterboxMixStatus(payload.message, 'running')
    },
  })
}

async function runChatterboxMix() {
  if (chatterboxMixRunning || !multiVoice.ready() || !chatterboxMixAudioIds.a || !chatterboxMixAudioIds.b || Object.keys(chatterboxMixFiles).some(key=>chatterboxMixFiles[key]&&!chatterboxMixAudioIds[key])) return
  const text = document.querySelector('#chatterbox-mix-text').value.trim()
  if (!text) return
  chatterboxMixCancelRequested = false
  chatterboxMixOutputBlob = null
  document.querySelector('#chatterbox-mix-result').hidden = true
  setChatterboxMixRunning(true)
  setChatterboxMixStatus('正在启动 Chatterbox', 'running')
  setChatterboxMixProgress(1, '正在创建音色混合任务')
  try {
    const response = await fetch('/api/chatterbox/mix', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mixConditions: readMixConditions(), voices: multiVoice.entries(), cfg: Number(chatterMixCfg.input.value), ...chatterBalance.read(), text,
        model: chatterboxMixModelSelect.value,
        language: chatterboxMixModelSelect.value === 'english' ? 'en' : chatterboxMixLanguageSelect.value,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Chatterbox 混音任务创建失败')
    chatterboxMixJobId = payload.jobId
    if (chatterboxMixCancelRequested) {
      await fetch(`/api/jobs/${encodeURIComponent(chatterboxMixJobId)}/cancel`, { method: 'POST' }).catch(() => {})
      return
    }
    await watchChatterboxMixJob(chatterboxMixJobId)
    const outputResponse = await fetch(`/api/jobs/${encodeURIComponent(chatterboxMixJobId)}/output`)
    if (!outputResponse.ok) throw new Error('无法读取 Chatterbox 混音输出文件')
    chatterboxMixOutputBlob = await outputResponse.blob()
    const encodedName = outputResponse.headers.get('X-Output-Filename')
    chatterboxMixOutputName = encodedName ? decodeURIComponent(encodedName) : 'chatterbox-mix.wav'
    setAudioPreview('chatterbox-mix-output-player', new File([chatterboxMixOutputBlob], chatterboxMixOutputName, { type: 'audio/wav' }))
    document.querySelector('#chatterbox-mix-result-name').textContent = `已生成：${chatterboxMixOutputName}`
    document.querySelector('#chatterbox-mix-result').hidden = false
    setChatterboxMixProgress(100, 'Chatterbox 音色混合完成')
    setChatterboxMixStatus('混音完成', 'success')
  } catch (error) {
    if (!chatterboxMixCancelRequested) {
      setChatterboxMixProgress(0, error.message || '音色混合失败')
      setChatterboxMixStatus('混音失败', 'error')
    }
  } finally {
    chatterboxMixEvents?.close()
    chatterboxMixEvents = null
    chatterboxMixJobId = ''
    setChatterboxMixRunning(false)
  }
}

function setSenseVoiceStatus(message, state = '') {
  const element = document.querySelector('#sensevoice-state')
  element.className = `process-state ${state}`.trim()
  element.querySelector('span').textContent = message
}

function setSenseVoiceProgress(progress, message) {
  const value = Math.max(0, Math.min(100, Number(progress) || 0))
  document.querySelector('#sensevoice-progress-bar').style.width = `${value}%`
  document.querySelector('#sensevoice-progress-percent').textContent = `${value}%`
  if (message) document.querySelector('#sensevoice-progress-message').textContent = message
}

function setSenseVoiceRunning(running) {
  senseVoiceRunning = running
  document.querySelector('#sensevoice-run').disabled = running || !senseVoiceFile
  document.querySelector('#sensevoice-run').textContent = running ? '正在识别…' : '开始识别'
  document.querySelectorAll('#sensevoice-language, #sensevoice-language-trigger, #sensevoice-itn, #sensevoice-tags, #sensevoice-pick-button').forEach((control) => { control.disabled = running })
  if (running) closeDropdown(senseVoiceLanguageMenu, senseVoiceLanguageTrigger)
  document.querySelector('#sensevoice-drop-zone').classList.toggle('disabled', running)
}

function openSenseVoiceWorkflow() {
  senseVoiceBackdrop.hidden = false
  senseVoiceFile = null
  senseVoiceJobId = ''
  senseVoiceOutputText = ''
  senseVoiceOutputName = 'transcript.txt'
  senseVoiceLanguageSelect.value = 'auto'
  document.querySelector('#sensevoice-language-label').textContent = '自动检测'
  senseVoiceLanguageMenu.querySelectorAll('[data-sensevoice-language]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.sensevoiceLanguage === 'auto')))
  closeDropdown(senseVoiceLanguageMenu, senseVoiceLanguageTrigger)
  document.querySelector('#sensevoice-itn').checked = true
  document.querySelector('#sensevoice-tags').checked = false
  document.querySelector('#sensevoice-file-display').textContent = '尚未选择文件'
  document.querySelector('#sensevoice-transcript').value = ''
  document.querySelector('#sensevoice-copy').disabled = true
  document.querySelector('#sensevoice-download').disabled = true
  setAudioPreview('sensevoice-input-player', null)
  setSenseVoiceStatus('等待输入')
  setSenseVoiceProgress(0, '准备就绪')
  setSenseVoiceRunning(false)
}

function closeSenseVoiceWorkflow() {
  if (senseVoiceRunning) return
  senseVoiceBackdrop.hidden = true
  for (const player of audioPlayers.values()) player.audio.pause()
}

async function applySenseVoiceAudio(file) {
  if (!file) return
  senseVoiceFile = file
  document.querySelector('#sensevoice-file-display').textContent = `${file.name} · 已选择`
  document.querySelector('#sensevoice-transcript').value = ''
  senseVoiceOutputText = ''
  document.querySelector('#sensevoice-copy').disabled = true
  document.querySelector('#sensevoice-download').disabled = true
  setAudioPreview('sensevoice-input-player', file)
  setSenseVoiceStatus('音频已就绪', 'success')
  setSenseVoiceProgress(0, '可以开始语音识别')
  setSenseVoiceRunning(false)
}

function watchSenseVoiceJob(jobId) {
  return watchJobEvents(jobId, {
    onStream: events => { senseVoiceEvents = events },
    onStatus: payload => {
      const eta = payload.etaSeconds > 0 ? ` · 预计剩余 ${formatEta(payload.etaSeconds)}` : ''
      setSenseVoiceProgress(payload.progress, `${payload.message || ''}${eta}`)
      if (['preparing', 'loading', 'inference', 'finalizing'].includes(payload.phase)) setSenseVoiceStatus(payload.message, 'running')
    },
  })
}

function createSenseVoiceJob(file, duration) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/sensevoice')
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.setRequestHeader('X-Filename', encodeURIComponent(file.name))
    request.setRequestHeader('X-Audio-Duration', String(duration || 0))
    request.setRequestHeader('X-Language', senseVoiceLanguageSelect.value)
    request.setRequestHeader('X-Enable-ITN', String(document.querySelector('#sensevoice-itn').checked))
    request.setRequestHeader('X-Keep-Tags', String(document.querySelector('#sensevoice-tags').checked))
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return
      const percent = Math.round(event.loaded / event.total * 100)
      setSenseVoiceProgress(Math.min(8, Math.max(1, Math.round(percent * 0.08))), `上传音频 ${percent}%`)
    }
    request.onerror = () => reject(new Error('音频上传失败，请检查本地服务连接'))
    request.onload = () => {
      let payload
      try { payload = JSON.parse(request.responseText) } catch { reject(new Error('SenseVoice 服务返回了无效响应')); return }
      if (request.status < 200 || request.status >= 300) { reject(new Error(payload.error || 'SenseVoice 任务创建失败')); return }
      resolve(payload)
    }
    request.send(file)
  })
}

async function runSenseVoice() {
  if (senseVoiceRunning || !senseVoiceFile) return
  senseVoiceCancelRequested = false
  senseVoiceOutputText = ''
  document.querySelector('#sensevoice-transcript').value = ''
  document.querySelector('#sensevoice-copy').disabled = true
  document.querySelector('#sensevoice-download').disabled = true
  setSenseVoiceRunning(true)
  setSenseVoiceStatus('正在启动 SenseVoice', 'running')
  setSenseVoiceProgress(1, '正在上传音频并创建识别任务')
  try {
    const duration = await getAudioDuration('sensevoice-input-player')
    const payload = await createSenseVoiceJob(senseVoiceFile, duration)
    senseVoiceJobId = payload.jobId
    if (senseVoiceCancelRequested) {
      await fetch(`/api/jobs/${encodeURIComponent(senseVoiceJobId)}/cancel`, { method: 'POST' }).catch(() => {})
      return
    }
    await watchSenseVoiceJob(senseVoiceJobId)
    const outputResponse = await fetch(`/api/jobs/${encodeURIComponent(senseVoiceJobId)}/output`)
    if (!outputResponse.ok) throw new Error('无法读取 SenseVoice 识别文本')
    senseVoiceOutputText = await outputResponse.text()
    const encodedName = outputResponse.headers.get('X-Output-Filename')
    senseVoiceOutputName = encodedName ? decodeURIComponent(encodedName) : 'transcript.txt'
    document.querySelector('#sensevoice-transcript').value = senseVoiceOutputText
    document.querySelector('#sensevoice-copy').disabled = !senseVoiceOutputText
    document.querySelector('#sensevoice-download').disabled = !senseVoiceOutputText
    setSenseVoiceProgress(100, 'SenseVoice 识别完成')
    setSenseVoiceStatus('识别完成', 'success')
  } catch (error) {
    if (!senseVoiceCancelRequested) {
      setSenseVoiceProgress(0, error.message || '识别失败')
      setSenseVoiceStatus('识别失败', 'error')
    }
  } finally {
    senseVoiceEvents?.close()
    senseVoiceEvents = null
    senseVoiceJobId = ''
    setSenseVoiceRunning(false)
  }
}

function setIndexTtsStatus(message, state = '') {
  const status = document.querySelector('#indextts-state')
  status.className = `process-state ${state}`.trim()
  status.querySelector('span').textContent = message
}

function setIndexTtsProgress(progress, message) {
  const value = Math.max(0, Math.min(100, Number(progress) || 0))
  document.querySelector('#indextts-progress-bar').style.width = `${value}%`
  document.querySelector('#indextts-progress-percent').textContent = `${value}%`
  if (message) document.querySelector('#indextts-progress-message').textContent = message
}

function setIndexTtsRunning(running) {
  indexTtsRunning = running
  const emotionReady = indexTtsEmotionMode !== 'audio' || Boolean(indexTtsEmotionFile)
  const ready = Boolean(indexTtsReferenceFile && document.querySelector('#indextts-text').value.trim() && emotionReady)
  document.querySelector('#indextts-run').disabled = running || !ready
  document.querySelector('#indextts-run').textContent = running ? '正在生成…' : '开始生成'
  document.querySelector('#indextts-pick-button').disabled = running
  document.querySelector('#indextts-drop-zone').classList.toggle('disabled', running)
  document.querySelector('#indextts-emotion-drop-zone').classList.toggle('disabled', running)
  document.querySelector('#indextts-text').disabled = running
  document.querySelector('#indextts-language').disabled = running
  document.querySelector('#indextts-language-trigger').disabled = running
  document.querySelectorAll('.indextts-emotion-card input, .indextts-emotion-card textarea, .indextts-emotion-card button').forEach((element) => { element.disabled = running })
  document.querySelector('#indextts-backdrop .audio-balance-control').inert=running
  if(!running)indexBalance.sync()
}

function openIndexTtsWorkflow() {
  indexBalance.reset()
  indexTtsBackdrop.hidden = false
  indexTtsReferenceFile = null
  indexTtsOutputBlob = null
  indexTtsOutputName = 'indextts2.wav'
  document.querySelector('#indextts-text').value = ''
  indexTtsEmotionFile = null
  indexTtsEmotionAudioId = ''
  indexTtsEmotionMode = 'audio'
  document.querySelectorAll('[data-emotion-mode]').forEach((button) => button.classList.toggle('active', button.dataset.emotionMode === 'audio'))
  document.querySelectorAll('[data-emotion-panel]').forEach((panel) => { panel.hidden = panel.dataset.emotionPanel !== 'audio' })
  document.querySelector('.indextts-strength').hidden = false
  document.querySelector('#indextts-emotion-file').value = ''
  document.querySelector('#indextts-emotion-file-name').textContent = '拖拽情绪音频到这里，或选择文件'
  document.querySelector('#indextts-emotion-description').value = ''
  document.querySelector('#indextts-emotion-strength').value = '0.65'
  document.querySelector('#indextts-emotion-strength-value').textContent = '65%'
  document.querySelectorAll('[data-vector-index]').forEach((slider) => { slider.value = '0'; slider.nextElementSibling.textContent = '0%' })
  setAudioPreview('indextts-emotion-audio-player', null)
  document.querySelectorAll('[data-emotion-preset]').forEach((button) => button.classList.remove('active'))
  document.querySelector('#indextts-language').value = 'zh'
  document.querySelector('#indextts-language-label').textContent = '中文'
  document.querySelectorAll('#indextts-language-menu [data-language]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.language === 'zh')))
  closeIndexTtsLanguageMenu()
  document.querySelector('#indextts-char-count').textContent = '0'
  document.querySelector('#indextts-file-display').textContent = '建议使用清晰、少噪声的人声片段'
  document.querySelector('#indextts-result').hidden = true
  setAudioPreview('indextts-input-player', null)
  setAudioPreview('indextts-output-player', null)
  setIndexTtsProgress(0, '准备就绪')
  setIndexTtsStatus('等待输入')
  setIndexTtsRunning(false)
}

function closeIndexTtsWorkflow() {
  if (indexTtsRunning) return
  indexTtsBackdrop.hidden = true
  for (const player of audioPlayers.values()) player.audio.pause()
}

async function applyIndexTtsReference(file) {
  if (!file?.arrayBuffer || !file.name) throw new Error('无法读取参考音频')
  if (!file.name.toLowerCase().endsWith('.wav')) throw new Error('IndexTTS 参考音频请使用 WAV 文件')
  indexTtsReferenceFile = file
  indexTtsOutputBlob = null
  document.querySelector('#indextts-file-display').textContent = `${file.name} · 已就绪`
  document.querySelector('#indextts-result').hidden = true
  setAudioPreview('indextts-input-player', file)
  setIndexTtsStatus('参考音频已就绪', 'success')
  setIndexTtsProgress(0, '输入文本后即可开始生成')
  setIndexTtsRunning(false)
}

function applyIndexTtsEmotionAudio(file) {
  if (!file?.arrayBuffer || !file.name) throw new Error('无法读取情绪参考音频')
  if (!file.name.toLowerCase().endsWith('.wav')) throw new Error('情绪参考音频请使用 WAV 文件')
  indexTtsEmotionFile = file
  indexTtsEmotionAudioId = ''
  indexTtsEmotionMode = 'audio'
  document.querySelector('#indextts-emotion-file-name').textContent = `${file.name} · 已就绪`
  document.querySelectorAll('[data-emotion-mode]').forEach((item) => item.classList.toggle('active', item.dataset.emotionMode === 'audio'))
  document.querySelectorAll('[data-emotion-panel]').forEach((panel) => { panel.hidden = panel.dataset.emotionPanel !== 'audio' })
  document.querySelector('.indextts-strength').hidden = false
  document.querySelectorAll('[data-emotion-preset]').forEach((item) => item.classList.remove('active'))
  setAudioPreview('indextts-emotion-audio-player', file)
  setIndexTtsStatus('情绪参考音频已就绪', 'success')
  setIndexTtsRunning(false)
}

async function uploadIndexTtsEmotionAudio(file) {
  const response = await fetch('/api/index-tts/emotion-audio', { method: 'POST', headers: { 'Content-Type': file.type || 'audio/wav' }, body: file })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '情绪音频上传失败')
  return payload.audioId
}

function createBrowserIndexTtsJob(file, text, language, emotion) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    indexTtsUploadRequest = request
    request.open('POST', '/api/index-tts')
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.setRequestHeader('X-Filename', encodeURIComponent(file.name))
    request.setRequestHeader('X-Target-Text', encodeURIComponent(text))
    request.setRequestHeader('X-Language', language)
    request.setRequestHeader('X-Balance-Enabled', String(indexBalance.read().balanceEnabled))
    request.setRequestHeader('X-Balance-Lufs', String(indexBalance.read().balanceLufs))
    request.setRequestHeader('X-Emotion-Mode', emotion.mode)
    request.setRequestHeader('X-Emotion-Strength', emotion.strength)
    request.setRequestHeader('X-Emotion-Vector', emotion.vector.join(','))
    if (emotion.text) request.setRequestHeader('X-Emotion-Text', encodeURIComponent(emotion.text))
    if (emotion.audioId) request.setRequestHeader('X-Emotion-Audio-Id', emotion.audioId)
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.round(event.loaded / event.total * 100)
      setIndexTtsProgress(Math.min(8, Math.max(1, Math.round(percent * 0.08))), `上传参考音频 ${percent}%`)
    }
    request.onerror = () => { indexTtsUploadRequest = null; reject(new Error('无法连接本地 AI Flow 服务，请确认 localhost:4173 服务正在运行')) }
    request.onabort = () => { indexTtsUploadRequest = null; reject(new Error('上传已取消')) }
    request.onload = () => {
      indexTtsUploadRequest = null
      let payload = {}
      try { payload = JSON.parse(request.responseText) } catch { /* handled below */ }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(payload.error || `创建语音生成任务失败（HTTP ${request.status}）`))
        return
      }
      resolve(payload)
    }
    request.send(file)
  })
}

function watchIndexTtsJob(jobId) {
  return watchJobEvents(jobId, {
    onStream: events => { indexTtsEvents = events },
    onStatus: payload => {
      setIndexTtsProgress(payload.progress, payload.etaSeconds > 0 ? `${payload.message} · 预计剩余 ${formatEta(payload.etaSeconds)}` : payload.message)
      if (payload.phase === 'loading' || payload.phase === 'inference') setIndexTtsStatus(payload.message, 'running')
    },
  })
}

async function runIndexTts() {
  const text = document.querySelector('#indextts-text').value.trim()
  if (!indexTtsReferenceFile || !text || indexTtsRunning || (indexTtsEmotionMode === 'audio' && !indexTtsEmotionFile)) return
  indexTtsCancelRequested = false
  indexTtsOutputBlob = null
  document.querySelector('#indextts-result').hidden = true
  setIndexTtsRunning(true)
  setIndexTtsStatus('正在启动 audio.cpp', 'running')
  setIndexTtsProgress(1, '准备参考音频和文本')
  try {
    let emotionAudioId = ''
    if (indexTtsEmotionMode === 'audio' && indexTtsEmotionFile) {
      setIndexTtsProgress(1, '上传情绪参考音频')
      emotionAudioId = await uploadIndexTtsEmotionAudio(indexTtsEmotionFile)
    }
    const result = await createBrowserIndexTtsJob(
      indexTtsReferenceFile,
      text,
      document.querySelector('#indextts-language').value,
      {
        mode: indexTtsEmotionMode,
        text: document.querySelector('#indextts-emotion-description').value.trim(),
        strength: document.querySelector('#indextts-emotion-strength').value,
        vector: [...document.querySelectorAll('[data-vector-index]')].map((slider) => slider.value),
        audioId: emotionAudioId || indexTtsEmotionAudioId,
      },
    )
    indexTtsJobId = result.jobId
    if (indexTtsCancelRequested) {
      await fetch(`/api/jobs/${encodeURIComponent(indexTtsJobId)}/cancel`, { method: 'POST' }).catch(() => {})
      return
    }
    await watchIndexTtsJob(indexTtsJobId)
    const response = await fetch(`/api/jobs/${encodeURIComponent(indexTtsJobId)}/output`)
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '读取语音生成结果失败')
    indexTtsOutputBlob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') || ''
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    indexTtsOutputName = encodedName ? decodeURIComponent(encodedName) : 'indextts2.wav'
    setAudioPreview('indextts-output-player', new File([indexTtsOutputBlob], indexTtsOutputName, { type: 'audio/wav' }))
    document.querySelector('#indextts-result-name').textContent = `已生成：${indexTtsOutputName}`
    document.querySelector('#indextts-result').hidden = false
    setIndexTtsProgress(100, '语音生成完成')
    setIndexTtsStatus('生成完成', 'success')
  } catch (error) {
    if (!indexTtsCancelRequested) {
      setIndexTtsProgress(0, error.message || '生成失败')
      setIndexTtsStatus('生成失败', 'error')
    }
  } finally {
    indexTtsEvents?.close()
    indexTtsEvents = null
    indexTtsJobId = ''
    setIndexTtsRunning(false)
  }
}

navItems.forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)))
window.addEventListener('ai-flow:navigate', (event) => setView(event.detail))
document.querySelectorAll('[data-view-link]').forEach((item) => item.addEventListener('click', () => setView(item.dataset.viewLink)))
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  if (!senseVoiceLanguageMenu.hidden) { closeDropdown(senseVoiceLanguageMenu, senseVoiceLanguageTrigger, true); return }
  if (!chatterboxMixModelMenu.hidden) { closeDropdown(chatterboxMixModelMenu, chatterboxMixModelTrigger, true); return }
  if (!chatterboxMixLanguageMenu.hidden) { closeDropdown(chatterboxMixLanguageMenu, chatterboxMixLanguageTrigger, true); return }
  if (!chatterboxModelMenu.hidden) { closeDropdown(chatterboxModelMenu, chatterboxModelTrigger, true); return }
  if (!chatterboxLanguageMenu.hidden) { closeDropdown(chatterboxLanguageMenu, chatterboxLanguageTrigger, true); return }
  if (!indexTtsLanguageMenu.hidden) { closeIndexTtsLanguageMenu(true); return }
  if (!workflowBackdrop.hidden) closeWorkflow()
  if (!mixBackdrop.hidden) closeMixWorkflow()
  if (!indexTtsBackdrop.hidden) closeIndexTtsWorkflow()
  if (!chatterboxBackdrop.hidden) closeChatterboxWorkflow()
  if (!chatterboxMixBackdrop.hidden) closeChatterboxMixWorkflow()
  if (!senseVoiceBackdrop.hidden) closeSenseVoiceWorkflow()
})
function closeDenoiseModelMenu(returnFocus = false) {
  denoiseModelMenu.hidden = true
  denoiseModelTrigger.setAttribute('aria-expanded', 'false')
  if (returnFocus) denoiseModelTrigger.focus()
}

function closeIndexTtsLanguageMenu(returnFocus = false) {
  const menu = document.querySelector('#indextts-language-menu')
  const trigger = document.querySelector('#indextts-language-trigger')
  menu.hidden = true
  trigger.setAttribute('aria-expanded', 'false')
  if (returnFocus) trigger.focus()
}

const indexTtsLanguageTrigger = document.querySelector('#indextts-language-trigger')
const indexTtsLanguageMenu = document.querySelector('#indextts-language-menu')
indexTtsLanguageTrigger.addEventListener('click', () => {
  const open = indexTtsLanguageMenu.hidden
  indexTtsLanguageMenu.hidden = !open
  indexTtsLanguageTrigger.setAttribute('aria-expanded', String(open))
  if (open) indexTtsLanguageMenu.querySelector('[aria-selected="true"]')?.focus()
})
indexTtsLanguageMenu.addEventListener('click', (event) => {
  const option = event.target.closest('[data-language]')
  if (!option) return
  const language = option.dataset.language
  document.querySelector('#indextts-language').value = language
  const languageNames = { zh: '中文', en: '英文' }
  document.querySelector('#indextts-language-label').textContent = languageNames[language]
  indexTtsLanguageMenu.querySelectorAll('[data-language]').forEach((item) => item.setAttribute('aria-selected', String(item === option)))
  closeIndexTtsLanguageMenu(true)
})
indexTtsLanguageMenu.addEventListener('keydown', (event) => {
  const options = [...indexTtsLanguageMenu.querySelectorAll('[data-language]')]
  const current = options.indexOf(document.activeElement)
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeIndexTtsLanguageMenu(true); return }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  options[(current + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length].focus()
})

denoiseModelTrigger.addEventListener('click', () => {
  const open = denoiseModelMenu.hidden
  denoiseModelMenu.hidden = !open
  denoiseModelTrigger.setAttribute('aria-expanded', String(open))
  if (open) denoiseModelMenu.querySelector('[aria-selected="true"]')?.focus()
})
denoiseModelMenu.addEventListener('click', (event) => {
  const option = event.target.closest('[data-model-id]')
  if (!option) return
  denoiseModelSelect.value = option.dataset.modelId
  denoiseModelMenu.querySelectorAll('[data-model-id]').forEach((item) => item.setAttribute('aria-selected', String(item === option)))
  const labels = {
    'denoise-lite': ['UVR-DeNoise-Lite', '降噪', '分离并抑制噪声，输出降噪后的音频。'],
    'kim-vocal-2': ['Kim Vocal 2', '人声提取', '从混合音频中分离并输出人声声部。'],
    'inst-hq-3': ['UVR-MDX-NET Inst HQ 3', '伴奏提取', '从混合音频中分离并输出伴奏声部。'],
  }
  const [name, type, description] = labels[denoiseModelSelect.value]
  denoiseModelLabel.replaceChildren(document.createTextNode(name))
  const typeLabel = document.createElement('small')
  typeLabel.textContent = type
  denoiseModelLabel.append(typeLabel)
  denoiseModelDescription.textContent = description
  closeDenoiseModelMenu(true)
})
denoiseModelMenu.addEventListener('keydown', (event) => {
  const options = [...denoiseModelMenu.querySelectorAll('[data-model-id]')]
  const current = options.indexOf(document.activeElement)
  if (event.key === 'Escape') { event.preventDefault(); closeDenoiseModelMenu(true); return }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  options[(current + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length].focus()
})
document.addEventListener('click', (event) => {
  if (!event.target.closest('.model-select-wrap')) {
    closeDenoiseModelMenu()
    closeIndexTtsLanguageMenu()
    closeDropdown(chatterboxModelMenu, chatterboxModelTrigger)
    closeDropdown(chatterboxLanguageMenu, chatterboxLanguageTrigger)
    closeDropdown(chatterboxMixModelMenu, chatterboxMixModelTrigger)
    closeDropdown(chatterboxMixLanguageMenu, chatterboxMixLanguageTrigger)
    closeDropdown(senseVoiceLanguageMenu, senseVoiceLanguageTrigger)
  }
})

mountUvr5({
  close: closeWorkflow,
  pick: pickAudio,
  run: runDenoise,
  drop: (event) => handleAudioDrop(event, applyDenoiseInput, setWorkflowStatus, setProgress),
  cancel: async () => {
    if (workflowRunning) {
      cancelRequested = true
      if (runtimeApi) await runtimeApi.cancelWorkflow()
      else if (activeBrowserJobId) {
        activeBrowserEvents?.close()
        await fetch(`/api/jobs/${encodeURIComponent(activeBrowserJobId)}/cancel`, { method: 'POST' }).catch(() => {})
      }
      setWorkflowRunning(false); setWorkflowStatus('已取消'); setProgress(0, '已取消')
      workflowResultText.textContent = '处理已取消，可调整后重新开始。'
    } else closeWorkflow()
  },
  downloadOutput: () => {
    if (runtimeApi?.downloadFile && completedOutputPath) runtimeApi.downloadFile(completedOutputPath).then(result => { if (result) setWorkflowStatus('已下载', 'success') }).catch(error => setWorkflowStatus(error.message || '下载失败', 'error'))
    else if (completedOutputBlob) { downloadBlob(completedOutputBlob, completedOutputPath || 'denoised.wav', false); setWorkflowStatus('已开始下载', 'success') }
  },
  downloadInput: async () => {
    if (selectedInputPath && runtimeApi?.downloadFile) {
      inputDownloadStatus.textContent = '正在准备下载…'
      try { const result = await runtimeApi.downloadFile(selectedInputPath); inputDownloadStatus.textContent = result ? `已下载：${fileName(result.path)}` : '' }
      catch (error) { inputDownloadStatus.textContent = error.message || '下载失败' }
    } else if (selectedInputFile) { downloadBlob(selectedInputFile, selectedInputFile.name || 'ai-flow-input-audio.wav', false); inputDownloadStatus.textContent = '已开始下载' }
  },
})

mountSpectrumEnhance({
  close: closeMixWorkflow,
  pick: pickMixAudio,
  run: runMix,
  dropA: (event) => handleAudioDrop(event, (file) => applyMixInput('a', file), setMixStatus, setMixProgress),
  dropB: (event) => handleAudioDrop(event, (file) => applyMixInput('b', file), setMixStatus, setMixProgress),
  cancel: () => { if (mixRunning) { mixCancelRequested = true; synthesisWorker?.cancel(); setMixStatus('已取消'); setMixProgress(0, '已取消') } else closeMixWorkflow() },
  download: () => downloadBlob(completedMixBlob, completedMixOutputPath),
  bindParameters: bindMixParameterControls,
})

const canvasControlDefaults = Object.fromEntries([...document.querySelectorAll('.workflow-backdrop input[id], .workflow-backdrop select[id], .workflow-backdrop textarea[id]')].filter(control => control.type !== 'file' && !control.readOnly).map(control => [control.id, control.type === 'checkbox' ? control.checked : control.value]))

const loudnessNode = mountLoudness({ preview: (id, audio) => setAudioPreview(id, audio), download: (audio, name) => { const url = URL.createObjectURL(audio); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) } })

// Reuse the basic-node dialogs for canvas nodes, including their existing controls and runners.
async function openCanvasNode(node, first, second, connections = {}) {
  if (node.type === 'audio-merge') { const ports = mergePorts(node); const incoming = connections.audioConnections || {}; return openAudioMerge(node, Object.fromEntries(ports.map(p => [p, p === 'in' ? first : connections.audioInputs?.[p]])), incoming, { preview: setAudioPreview, download: (file, name) => downloadBlob(file, name, false) }) }
  if (node.type === 'audio-input') return openAudioInput(node, { preview: setAudioPreview, download: (file, name) => downloadBlob(file, name, false) }, first, connections)
  if (node.type === 'text-input') return openTextInput(node, first, connections)
  if (['number-text', 'text-split'].includes(node.type)) return openNumberText(node, first, connections)
  if (node.type === 'loudness') return loudnessNode.open(node, first, connections)
  const dialogs = {
    uvr: { id: 'workflow-backdrop', open: openWorkflow },
    enhance: { id: 'mix-backdrop', open: openMixWorkflow },
    sensevoice: { id: 'sensevoice-backdrop', open: openSenseVoiceWorkflow },
    indextts: { id: 'indextts-backdrop', open: openIndexTtsWorkflow },
    'chatterbox-read': { id: 'chatterbox-backdrop', open: openChatterboxWorkflow },
    'chatterbox-mix': { id: 'chatterbox-mix-backdrop', open: openChatterboxMixWorkflow },
  }
  const spec = dialogs[node.type]
  if (!spec) throw new Error('未找到基础节点界面')
  spec.open()
  const dialog = document.getElementById(spec.id)
  const locks = []
  const inputZones = {
    uvr: ['denoise-drop-zone'], enhance: ['mix-a-drop-zone', 'mix-b-drop-zone'],
    sensevoice: ['sensevoice-drop-zone'], indextts: ['indextts-drop-zone', 'indextts-emotion-drop-zone'],
    'chatterbox-read': ['chatterbox-a-drop'], 'chatterbox-mix': ['chatterbox-mix-a-drop', 'chatterbox-mix-b-drop'],
  }
  let releaseText = () => {}
  const releaseLocks = () => { releaseText(); for (const { zone, card, note, block } of locks) { zone.inert = false; zone.classList.remove('upstream-input-zone'); card?.classList.remove('upstream-input-card'); note.remove(); for (const event of ['dragover', 'drop', 'click']) zone.removeEventListener(event, block, true) } }
  inputZones[node.type].forEach((id, index) => {
    const source = index === 0 ? connections.first : connections.second
    if (!source) return
    const zone = document.getElementById(id)
    if (!zone) return
    const card = zone.closest('.workflow-node-card')
    const note = document.createElement('div')
    note.className = 'upstream-input-note'
    note.textContent = `来自上游节点 · ${source}`
    zone.before(note)
    zone.inert = true
    zone.classList.add('upstream-input-zone')
    card?.classList.add('upstream-input-card')
    const block = (event) => { event.preventDefault(); event.stopImmediatePropagation() }
    for (const event of ['dragover', 'drop', 'click']) zone.addEventListener(event, block, true)
    locks.push({ zone, card, note, block })
  })
  const setControl = (id, value) => {
    const control = document.getElementById(id)
    if (!control || value === undefined) return
    if (control.type === 'checkbox') control.checked = Boolean(value)
    else control.value = value
    control.dispatchEvent(new Event('input', { bubbles: true }))
    control.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const controls = { ...Object.fromEntries(Object.entries(canvasControlDefaults).filter(([id]) => dialog.querySelector(`#${id}`))), ...(node.params.ui || {}) }
  if (!node.params.ui) {
    if (node.type === 'uvr') controls['denoise-model-select'] = node.model
    if (node.type === 'enhance') Object.assign(controls, {
      'mix-enhance-ratio': node.params.ratio, 'mix-shared-lufs': node.params.lufs,
      'mix-point-count': node.params.points, 'mix-highpass-enabled': node.params.highpass,
      'mix-lowpass-enabled': node.params.lowpass, 'mix-compression-ratio': node.params.compression,
    })
    const prefix = node.type === 'chatterbox-read' ? 'chatterbox' : node.type
    if (['indextts', 'chatterbox-read', 'chatterbox-mix'].includes(node.type)) {
      controls[`${prefix}-text`] = node.params.text || ''
      if (node.params.language) controls[`${prefix}-language`] = node.params.language
      if (node.type.startsWith('chatterbox')) controls[`${prefix}-model`] = ['english', 'multilingual'].includes(node.model) ? node.model : 'english'
    }
  }
  for (const [id, value] of Object.entries(controls)) setControl(id, value)
  // Custom dropdowns own their labels and model/language dependencies.
  const optionMenus = {
    'denoise-model-select': ['denoise-model-menu', 'data-model-id'],
    'chatterbox-model': ['chatterbox-model-menu', 'data-chatterbox-model'],
    'chatterbox-language': ['chatterbox-language-menu', 'data-chatterbox-language'],
    'chatterbox-mix-model': ['chatterbox-mix-model-menu', 'data-chatterbox-mix-model'],
    'chatterbox-mix-language': ['chatterbox-mix-language-menu', 'data-chatterbox-mix-language'],
    'indextts-language': ['indextts-language-menu', 'data-language'],
    'sensevoice-language': ['sensevoice-language-menu', 'data-sensevoice-language'],
  }
  for (const [id, [menuId, attribute]] of Object.entries(optionMenus)) {
    if (!dialog.querySelector(`#${id}`)) continue
    const value = document.getElementById(id).value
    const menu = document.getElementById(menuId)
    const option = [...(menu?.querySelectorAll(`[${attribute}]`) || [])].find((item) => item.getAttribute(attribute) === value)
    option?.click()
  }
  if (node.type.startsWith('chatterbox')) {
    const prefix = node.type === 'chatterbox-read' ? 'chatterbox' : 'chatterbox-mix'
    syncChatterboxLanguage(
      document.getElementById(`${prefix}-language`), document.getElementById(`${prefix}-language-menu`),
      document.getElementById(`${prefix}-language-label`), document.getElementById(`${prefix}-language-field`),
      `data-${prefix}-language`, document.getElementById(`${prefix}-model`).value,
    )
  }
  if (connections.text) {
    const prefix = node.type === 'chatterbox-read' ? 'chatterbox' : node.type
    const control = dialog.querySelector(`#${prefix}-text`)
    if (control) {
      const original = control.value
      control.value = connections.textInput ? await connections.textInput.text() : ''
      control.readOnly = true; control.classList.add('upstream-input-zone')
      const note = document.createElement('div'); note.className = 'upstream-input-note'; note.textContent = `文本来自上游节点 · ${connections.text}`; control.before(note)
      control.dispatchEvent(new Event('input', { bubbles: true }))
      releaseText = () => { control.value = original; control.readOnly = false; control.classList.remove('upstream-input-zone'); note.remove() }
    }
  }
  if (node.type === 'chatterbox-mix') multiVoice.reset(node,connections.audioConnections||{})
  mixBalance.sync();indexBalance.sync();chatterBalance.sync()
  if (node.type === 'indextts' && node.params.emotionVector) dialog.querySelectorAll('[data-vector-index]').forEach((slider, index) => { slider.value = node.params.emotionVector[index]; slider.dispatchEvent(new Event('input', { bubbles: true })) })
  if (node.type === 'indextts' && node.params.emotionMode) dialog.querySelector(`[data-emotion-mode="${node.params.emotionMode}"]`)?.click()
  const asFile = (audio) => audio && (audio.name ? audio : new File([audio], 'upstream.wav', { type: audio.type || 'audio/wav' }))
  first = asFile(first || (!connections.first ? node.localFirst : null)); second = asFile(second || (!connections.second ? node.localSecond : null))
  try {
    if (node.type === 'uvr' && first) await applyDenoiseInput(first)
    if (node.type === 'enhance') { if (first) await applyMixInput('a', first); if (second) await applyMixInput('b', second) }
    if (node.type === 'sensevoice' && first) await applySenseVoiceAudio(first)
    if (node.type === 'indextts' && first) await applyIndexTtsReference(first)
    if (node.type === 'chatterbox-read' && first) await applyChatterboxAudio(first)
    if (node.type === 'chatterbox-mix') { if (first) await applyChatterboxMixAudio('a', first); if (second) await applyChatterboxMixAudio('b', second); await multiVoice.restore(node,connections.audioInputs,connections.audioConnections) }
    if (node.type === 'indextts') {
      node.emotionFile ||= unpackConfigAudio(node.params.emotionAudio)
      const emotionFile = connections.second ? second : (node.localSecond || unpackConfigAudio(node.params.emotionAudio))
      if (emotionFile) applyIndexTtsEmotionAudio(emotionFile)
      // Loading an attachment must not override the saved mode.
      dialog.querySelector(`[data-emotion-mode="${node.params.emotionMode || 'voice'}"]`)?.click()
    }
    if (node.output) {
      const playerIds = { uvr: 'denoise-result-player', enhance: 'mix-result-player', indextts: 'indextts-output-player', 'chatterbox-read': 'chatterbox-output-player', 'chatterbox-mix': 'chatterbox-mix-output-player' }
      if (playerIds[node.type]) setAudioPreview(playerIds[node.type], node.output)
      if (node.type === 'uvr') { completedOutputBlob = node.output; downloadOutputButton.hidden = false }
      if (node.type === 'enhance') { completedMixBlob = node.output; mixResult.hidden = false }
      if (node.type === 'indextts') { indexTtsOutputBlob = node.output; document.querySelector('#indextts-result').hidden = false }
      if (node.type === 'chatterbox-read') { chatterboxOutputBlob = node.output; document.querySelector('#chatterbox-result').hidden = false }
      if (node.type === 'chatterbox-mix') { chatterboxMixOutputBlob = node.output; document.querySelector('#chatterbox-mix-result').hidden = false }
      if (node.type === 'sensevoice') { senseVoiceOutputText = await node.output.text(); document.querySelector('#sensevoice-transcript').value = senseVoiceOutputText; document.querySelector('#sensevoice-copy').disabled = false; document.querySelector('#sensevoice-download').disabled = false }
    }
  } catch (error) { releaseLocks(); dialog.hidden = true; throw error }
  connections.onReady?.()
  return new Promise((resolve) => {
    const finish = async () => {
      if (!dialog.hidden) return
      observer.disconnect()
      releaseLocks()
      const ui = {}
      dialog.querySelectorAll('input[id], select[id], textarea[id]').forEach((control) => {
        if (control.type !== 'file' && !control.readOnly) ui[control.id] = control.type === 'checkbox' ? control.checked : control.value
      })
      const outputs = { uvr: completedOutputBlob, enhance: completedMixBlob, indextts: indexTtsOutputBlob, 'chatterbox-read': chatterboxOutputBlob, 'chatterbox-mix': chatterboxMixOutputBlob }
      if (node.type === 'sensevoice' && senseVoiceOutputText) outputs.sensevoice = new File([senseVoiceOutputText], 'transcript.txt', { type: 'text/plain' })
      const localInputs = { uvr: [selectedInputFile], enhance: [selectedMixAFile, selectedMixBFile], sensevoice: [senseVoiceFile], indextts: [indexTtsReferenceFile, indexTtsEmotionFile], 'chatterbox-read': [chatterboxFile], 'chatterbox-mix': [chatterboxMixFiles.a, chatterboxMixFiles.b] }
      if(node.type==='chatterbox-mix'){Object.assign(node.params,multiVoice.snapshot());node.extraFiles=Object.fromEntries(Object.entries(chatterboxMixFiles).filter(([key])=>key.startsWith('v')).map(([key,file])=>[`voice-${key.slice(1)}`,connections.audioConnections?.[`voice-${key.slice(1)}`]?null:file]))}
      node.localFirst = connections.first ? null : localInputs[node.type][0]
      node.localSecond = connections.second ? null : localInputs[node.type][1]
      if (node.type === 'indextts') {
        node.emotionFile = connections.second ? null : indexTtsEmotionFile
        try { node.params.emotionAudio = await packConfigAudio(node.emotionFile) }
        catch (error) { setIndexTtsStatus('情绪参考音频保存失败', 'error'); resolve(null); return }
      }
      resolve({ output: outputs[node.type] || null, model: ui['denoise-model-select'] || ui['chatterbox-model'] || ui['chatterbox-mix-model'] || node.model, params: { ...node.params, ui, emotionVector: node.type === 'indextts' ? [...dialog.querySelectorAll('[data-vector-index]')].map(slider => Number(slider.value)) : undefined, emotionMode: node.type === 'indextts' ? indexTtsEmotionMode : undefined } })
    }
    const observer = new MutationObserver(finish)
    observer.observe(dialog, { attributes: true, attributeFilter: ['hidden'] })
    finish()
  })
}

document.querySelector('.open-audio-input-button')?.addEventListener('click', () => openAudioInput(undefined, { preview: setAudioPreview, download: (file, name) => downloadBlob(file, name, false) }))
document.querySelector('.open-text-input-button')?.addEventListener('click', () => openTextInput())

mountNodeWorkbench({
  openNode: openCanvasNode,
  pick: () => openAudioPicker(),
  preview: (id, audio) => setAudioPreview(id, audio),
  extract: runPipelineUvr,
  enhance: runPipelineEnhancement,
  download: (blob, name) => downloadBlob(blob, name, false),
  navigate: setView,
})

mountSenseVoice({
  close: closeSenseVoiceWorkflow,
  pick: async () => { const file = await openAudioPicker(); if (file) await applySenseVoiceAudio(file) },
  drop: (event) => handleAudioDrop(event, applySenseVoiceAudio, setSenseVoiceStatus, setSenseVoiceProgress),
  run: runSenseVoice,
  copy: async () => {
    if (!senseVoiceOutputText) return
    try { await navigator.clipboard.writeText(senseVoiceOutputText); setSenseVoiceStatus('识别文本已复制', 'success') }
    catch { const output = document.querySelector('#sensevoice-transcript'); output.focus(); output.select(); setSenseVoiceStatus('已选中文本，可复制', 'success') }
  },
  download: () => { if (senseVoiceOutputText) downloadBlob(new Blob([senseVoiceOutputText], { type: 'text/plain;charset=utf-8' }), senseVoiceOutputName, false) },
  cancel: async () => {
    if (!senseVoiceRunning) { closeSenseVoiceWorkflow(); return }
    senseVoiceCancelRequested = true; senseVoiceEvents?.close()
    if (senseVoiceJobId) await fetch(`/api/jobs/${encodeURIComponent(senseVoiceJobId)}/cancel`, { method: 'POST' }).catch(() => {})
    setSenseVoiceStatus('已取消'); setSenseVoiceProgress(0, '语音识别已取消'); setSenseVoiceRunning(false)
  },
})

mountIndexTts({
  close: closeIndexTtsWorkflow,
  pick: async () => { const file = await openAudioPicker('audio/wav,.wav'); if (file) await applyIndexTtsReference(file) },
  textInput: (event) => { document.querySelector('#indextts-char-count').textContent = String(event.target.value.length); setIndexTtsRunning(false) },
  setEmotionMode: (button) => {
    indexTtsEmotionMode = button.dataset.emotionMode
    document.querySelector('.indextts-strength').hidden = indexTtsEmotionMode === 'voice'
    document.querySelectorAll('[data-emotion-mode]').forEach(item => item.classList.toggle('active', item === button))
    document.querySelectorAll('[data-emotion-panel]').forEach(panel => { panel.hidden = panel.dataset.emotionPanel !== indexTtsEmotionMode })
    setIndexTtsRunning(false)
  },
  emotionFile: (event) => { const file = event.target.files?.[0]; if (!file) return; try { applyIndexTtsEmotionAudio(file) } catch (error) { event.target.value = ''; setIndexTtsStatus(error.message, 'error') } },
  pickEmotion: () => document.querySelector('#indextts-emotion-file').click(),
  dropEmotion: (event) => handleAudioDrop(event, applyIndexTtsEmotionAudio, setIndexTtsStatus, setIndexTtsProgress),
  preset: async (button) => {
    const id = button.dataset.emotionPreset
    try {
      const response = await fetch(`./assets/indextts/emotion/emo_${id}.wav`)
      if (!response.ok) throw new Error('预置情绪音频读取失败')
      const presetFile = new File([await response.blob()], `emo_${id}.wav`, { type: 'audio/wav' })
      applyIndexTtsEmotionAudio(presetFile)
      document.querySelector('#indextts-emotion-file-name').textContent = `${id === 'hate' ? '愤怒' : '悲伤'} · 预置音频`
      document.querySelectorAll('[data-emotion-preset]').forEach(item => item.classList.toggle('active', item === button))
      setIndexTtsRunning(false)
    } catch (error) { setIndexTtsStatus(error.message, 'error') }
  },
  vectorInput: (slider) => {
    slider.nextElementSibling.textContent = `${Math.round(Number(slider.value) * 100)}%`; indexTtsEmotionMode = 'vector'
    document.querySelector('.indextts-strength').hidden = false
    document.querySelectorAll('[data-emotion-mode]').forEach(item => item.classList.toggle('active', item.dataset.emotionMode === 'vector'))
    document.querySelectorAll('[data-emotion-panel]').forEach(panel => { panel.hidden = panel.dataset.emotionPanel !== 'vector' })
  },
  vectorPreset: (button) => {
    const emotionIndices = { happy: 0, angry: 1, sad: 2, afraid: 3, disgusted: 4, melancholic: 5, surprised: 6, calm: 7 }
    document.querySelectorAll('[data-vector-index]').forEach(slider => { const value = Number(slider.dataset.vectorIndex) === emotionIndices[button.dataset.emotionVector] ? 0.8 : 0; slider.value = String(value); slider.nextElementSibling.textContent = `${Math.round(value * 100)}%` })
    indexTtsEmotionMode = 'vector'; document.querySelector('.indextts-strength').hidden = false
    document.querySelectorAll('[data-emotion-mode]').forEach(item => item.classList.toggle('active', item.dataset.emotionMode === 'vector'))
    document.querySelectorAll('[data-emotion-panel]').forEach(panel => { panel.hidden = panel.dataset.emotionPanel !== 'vector' })
  },
  strengthInput: (event) => { document.querySelector('#indextts-emotion-strength-value').textContent = `${Math.round(Number(event.target.value) * 100)}%` },
  run: runIndexTts,
  cancel: async () => {
    if (!indexTtsRunning) { closeIndexTtsWorkflow(); return }
    indexTtsCancelRequested = true; indexTtsEvents?.close(); indexTtsUploadRequest?.abort()
    if (indexTtsJobId) await fetch(`/api/jobs/${encodeURIComponent(indexTtsJobId)}/cancel`, { method: 'POST' }).catch(() => {})
    setIndexTtsStatus('已取消'); setIndexTtsProgress(0, '语音生成已取消'); setIndexTtsRunning(false)
  },
  download: () => downloadBlob(indexTtsOutputBlob, indexTtsOutputName, false),
  dropReference: (event) => handleAudioDrop(event, applyIndexTtsReference, setIndexTtsStatus, setIndexTtsProgress),
})

mountChatterboxRead({
  close: closeChatterboxWorkflow,
  pick: async () => { const file = await openAudioPicker(); if (file) await applyChatterboxAudio(file) },
  drop: (event) => handleAudioDrop(event, applyChatterboxAudio, setChatterboxStatus, setChatterboxProgress),
  textInput: () => setChatterboxRunning(false), run: runChatterbox,
  cancel: async () => {
    if (!chatterboxRunning) { closeChatterboxWorkflow(); return }
    chatterboxCancelRequested = true; chatterboxEvents?.close()
    if (chatterboxJobId) await fetch(`/api/jobs/${encodeURIComponent(chatterboxJobId)}/cancel`, { method: 'POST' }).catch(() => {})
    setChatterboxStatus('已取消'); setChatterboxProgress(0, '朗读任务已取消'); setChatterboxRunning(false)
  },
  download: () => downloadBlob(chatterboxOutputBlob, chatterboxOutputName, false),
})

mountChatterboxMix({
  close: closeChatterboxMixWorkflow,
  pick: async (side) => { const file = await openAudioPicker(); if (file) await applyChatterboxMixAudio(side, file) },
  dropA: (event) => handleAudioDrop(event, (file) => applyChatterboxMixAudio('a', file), setChatterboxMixStatus, setChatterboxMixProgress),
  dropB: (event) => handleAudioDrop(event, (file) => applyChatterboxMixAudio('b', file), setChatterboxMixStatus, setChatterboxMixProgress),
  textInput: () => setChatterboxMixRunning(false), run: runChatterboxMix,
  cancel: async () => {
    if (!chatterboxMixRunning) { closeChatterboxMixWorkflow(); return }
    chatterboxMixCancelRequested = true; chatterboxMixEvents?.close()
    if (chatterboxMixJobId) await fetch(`/api/jobs/${encodeURIComponent(chatterboxMixJobId)}/cancel`, { method: 'POST' }).catch(() => {})
    setChatterboxMixStatus('已取消'); setChatterboxMixProgress(0, '音色混合任务已取消'); setChatterboxMixRunning(false)
  },
  download: () => downloadBlob(chatterboxMixOutputBlob, chatterboxMixOutputName, false),
})

document.querySelectorAll('.audio-drop-zone').forEach((zone) => {
  zone.addEventListener('dragenter', (event) => { event.preventDefault(); zone.classList.add('drag-over') })
  zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('drag-over') })
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over')
  })
})
document.addEventListener('dragover', (event) => event.preventDefault())
document.addEventListener('drop', (event) => {
  if (!event.target.closest('.audio-drop-zone')) event.preventDefault()
})

if (runtimeApi) runtimeApi.onProgress((payload) => {
    console.info('[AI Flow] UVR5 IPC progress received', payload)
    setProgress(payload.progress, payload.message, payload.etaSeconds)
    if (payload.phase === 'complete') setWorkflowStatus('处理完成', 'success')
})

searchInput.addEventListener('input', () => {
  filterFlowCards()
})

flowList.addEventListener('click', (event) => {
  if (event.target.closest('.open-loudness-button')) { loudnessNode.open(); return }
  const senseVoiceButton = event.target.closest('.open-sensevoice-button')
  if (senseVoiceButton) {
    openSenseVoiceWorkflow()
    return
  }
  const chatterboxButton = event.target.closest('.open-chatterbox-button')
  if (chatterboxButton) {
    openChatterboxWorkflow()
    return
  }
  const chatterboxMixButton = event.target.closest('.open-chatterbox-mix-button')
  if (chatterboxMixButton) {
    openChatterboxMixWorkflow()
    return
  }
  const mixButton = event.target.closest('.open-mix-button')
  if (mixButton) {
    openMixWorkflow()
    return
  }
  const workflowButton = event.target.closest('.open-workflow-button')
  if (workflowButton) {
    openWorkflow()
    return
  }
  const indexTtsButton = event.target.closest('.open-indextts-button')
  if (indexTtsButton) {
    openIndexTtsWorkflow()
    return
  }
  const button = event.target.closest('.run-button')
  if (!button) return
  button.textContent = button.textContent === '打开流程' ? '已打开' : '打开流程'
})

setView(document.querySelector('.page-content').dataset.page)

// Clear only the chosen local input; connected zones remain inert.
function bindLocalAudioClear(zoneId, hasInput, clear, blocked) {
  mountInputClear(document.getElementById(zoneId), { hasInput, clear, blocked })
}
bindLocalAudioClear('denoise-drop-zone', () => selectedInputFile || selectedInputPath, () => openWorkflow(), () => workflowRunning)
for (const side of ['a', 'b']) {
  bindLocalAudioClear(`mix-${side}-drop-zone`, () => side === 'a' ? selectedMixAFile : selectedMixBFile, () => {
    if (side === 'a') { selectedMixAFile = null; mixAFileDisplay.textContent = '尚未选择文件' }
    else { selectedMixBFile = null; mixBFileDisplay.textContent = '尚未选择文件' }
    completedMixBlob = null; completedMixOutputPath = ''; mixResult.hidden = true
    setAudioPreview(`mix-${side}-player`, null); setAudioPreview('mix-result-player', null)
    setMixRunning(false); setMixProgress(0, '输入已清空'); scheduleEqPreview()
  }, () => mixRunning)
}
bindLocalAudioClear('sensevoice-drop-zone', () => senseVoiceFile, () => {
  senseVoiceFile = null; senseVoiceOutputText = ''; document.getElementById('sensevoice-file-display').textContent = '尚未选择文件'
  document.getElementById('sensevoice-transcript').value = ''; document.getElementById('sensevoice-copy').disabled = document.getElementById('sensevoice-download').disabled = true
  setAudioPreview('sensevoice-input-player', null); setSenseVoiceRunning(false); setSenseVoiceProgress(0, '输入已清空')
}, () => senseVoiceRunning)
bindLocalAudioClear('indextts-drop-zone', () => indexTtsReferenceFile, () => {
  indexTtsReferenceFile = null; clearIndexTtsResult(); document.getElementById('indextts-file-display').textContent = '尚未选择文件'; setAudioPreview('indextts-input-player', null)
}, () => indexTtsRunning)
function clearIndexTtsResult() {
  indexTtsOutputBlob = null; document.getElementById('indextts-result').hidden = true; setAudioPreview('indextts-output-player', null); setIndexTtsRunning(false); setIndexTtsProgress(0, '输入已清空')
}
bindLocalAudioClear('indextts-emotion-drop-zone', () => indexTtsEmotionFile, () => {
  indexTtsEmotionFile = null; indexTtsEmotionAudioId = ''; document.getElementById('indextts-emotion-file-name').textContent = '尚未选择文件'
  setAudioPreview('indextts-emotion-audio-player', null)
  clearIndexTtsResult()
}, () => indexTtsRunning)
bindLocalAudioClear('chatterbox-a-drop', () => chatterboxFile, () => {
  chatterboxFile = null; chatterboxAudioId = ''; chatterboxOutputBlob = null
  document.getElementById('chatterbox-a-name').textContent = '尚未选择文件'; document.getElementById('chatterbox-result').hidden = true
  setAudioPreview('chatterbox-a-player', null); setAudioPreview('chatterbox-output-player', null); setChatterboxRunning(false); setChatterboxProgress(0, '输入已清空')
}, () => chatterboxRunning)
for (const side of ['a', 'b']) {
  bindLocalAudioClear(`chatterbox-mix-${side}-drop`, () => chatterboxMixFiles[side], () => clearChatterboxVoice(side), () => chatterboxMixRunning)
}
function clearChatterboxVoice(side) {
  chatterboxMixFiles[side] = null; chatterboxMixAudioIds[side] = ''; chatterboxMixOutputBlob = null
  document.getElementById(`chatterbox-mix-${side}-name`).textContent = '尚未选择文件'; document.getElementById('chatterbox-mix-result').hidden = true
  setAudioPreview(`chatterbox-mix-${side}-player`, null); setAudioPreview('chatterbox-mix-output-player', null); setChatterboxMixRunning(false); setChatterboxMixProgress(0, '输入已清空')
}
document.getElementById('chatterbox-mix-backdrop').addEventListener('audio-input-cleared', () => {
  chatterboxMixOutputBlob = null; document.getElementById('chatterbox-mix-result').hidden = true; setAudioPreview('chatterbox-mix-output-player', null); setChatterboxMixRunning(false)
})
for (const prefix of ['indextts', 'chatterbox', 'chatterbox-mix']) {
  const control = document.getElementById(`${prefix}-text`)
  const button = mountInputClear(control.parentElement, {
    hasInput: () => !!control.value,
    blocked: () => control.readOnly || control.disabled,
    clear: () => { control.value = ''; control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true })) },
  })
  control.after(button)
  control.addEventListener('input', () => { button.disabled = !control.value || control.readOnly || control.disabled })
}

document.querySelector('.open-text-split-button')?.addEventListener('click', () => openNumberText({ type: 'text-split', params: {} }))
document.querySelector('.open-number-text-button')?.addEventListener('click', () => openNumberText())

document.querySelector('.open-audio-merge-button')?.addEventListener('click', () => openAudioMerge(undefined, {}, {}, { preview: setAudioPreview, download: (file, name) => downloadBlob(file, name, false) }))

document.querySelector('.open-quality-review-button')?.addEventListener('click', () => openQualityReview({}, [], { preview: setAudioPreview }))
