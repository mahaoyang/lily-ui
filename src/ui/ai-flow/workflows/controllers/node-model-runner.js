import { splitText } from './text-split.js'
import { mixConditions } from '../../shared/chatterbox-mix-options.js'
import { runAudioMerge } from './audio-merge.js'
import { normalizeMixEntries } from '../../../../headless/audio/mix-weights.js'
import { unpackConfigAudio } from './node-config.js'
import { waitForNodeJob } from './node-job-progress.js'
import { voicePorts } from './node-inputs.js'
// Canvas model tasks use the same HTTP endpoints as the basic nodes.
async function jsonRequest(url, options) {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '任务创建失败')
  return data
}
export async function runModelNode(node, first, second, progress, textInput = null, audioInputs = {}) {
  if (node.type === 'audio-merge') return runAudioMerge(node, { ...audioInputs, in: first }, progress)
  progress?.signal?.throwIfAborted()
  if (node.type === 'text-split') {
    const blocks = splitText(first ? await first.text() : node.params.text || '', node.params.threshold ?? 50, node.params)
    progress?.(100, `切割完成，共 ${blocks.length} 块`)
    return new File([JSON.stringify(blocks, null, 2)], 'text-blocks.json', { type: 'application/json' })
  }
  if (node.type === 'number-text') {
    const text = first ? await first.text() : node.params.text || ''
    progress?.(10, '正在分析数字、日期与时间')
    const data = await jsonRequest('/api/number-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language: node.params.language || 'zh' }), signal: progress?.signal })
    progress?.(100, '数字转换完成')
    return new File([data.text], 'normalized-text.txt', { type: 'text/plain;charset=utf-8' })
  }
  const ui = node.params.ui || {}
  const prefix = node.type === 'chatterbox-read' ? 'chatterbox' : node.type
  const params = { ...node.params,
    text: ui[`${prefix}-text`] ?? node.params.text,
    language: ui[`${prefix}-language`] ?? node.params.language,
  }
  if (textInput) params.text = await textInput.text()
  const model = ui[`${prefix}-model`] || node.model
  const headers = { 'X-Task-Priority': progress?.taskPriority || 'normal', 'Content-Type': first.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(first.name || 'audio.wav') }
  let task
  if (node.type === 'audio-input') {
    if (params.autoWav === false) { progress?.(100, '已输出原始音频'); return first }
    task = await jsonRequest('/api/audio-input/wav', { method: 'POST', headers, body: first, signal: progress?.signal })
  } else if (node.type === 'loudness') {
    task = await jsonRequest('/api/loudness', { method: 'POST', headers: { ...headers, 'X-Target-Lufs': String(ui['loudness-target'] ?? params.lufs ?? -16) }, body: first, signal: progress?.signal })
  } else if (node.type === 'sensevoice') {
    task = await jsonRequest('/api/sensevoice', { method: 'POST', headers: { ...headers, 'X-Language': params.language || 'auto', 'X-Enable-ITN': String(ui['sensevoice-itn'] ?? true), 'X-Keep-Tags': String(ui['sensevoice-keep-tags'] ?? false) }, body: first })
  } else if (node.type === 'indextts') {
    if (!params.text?.trim()) throw new Error('请输入生成文本')
    const emotionMode = params.emotionMode || 'voice'
    let emotionAudioId = ''
    if (emotionMode === 'audio') {
      const emotionFile = second || node.localSecond || unpackConfigAudio(params.emotionAudio)
      if (!emotionFile) throw new Error('请先配置情绪参考音频')
      const uploaded = await jsonRequest('/api/index-tts/emotion-audio', { method: 'POST', headers: { 'Content-Type': emotionFile.type || 'audio/wav' }, body: emotionFile, signal: progress?.signal })
      emotionAudioId = uploaded.audioId
    }
    task = await jsonRequest('/api/index-tts', { method: 'POST', headers: { ...headers, 'X-Balance-Enabled': String(ui['indextts-balance-enabled']??true), 'X-Balance-Lufs': String(ui['indextts-balance-lufs']??-16), 'X-Target-Text': encodeURIComponent(params.text), 'X-Language': params.language || 'zh', 'X-Emotion-Mode': emotionMode, 'X-Emotion-Strength': String(ui['indextts-emotion-strength'] ?? .65), 'X-Emotion-Vector': (params.emotionVector || [0,0,0,0,0,0,0,0]).join(','), 'X-Emotion-Text': encodeURIComponent(ui['indextts-emotion-description'] || ''), ...(emotionAudioId ? { 'X-Emotion-Audio-Id': emotionAudioId } : {}) }, body: first })
  } else {
    if (!params.text?.trim()) throw new Error('请输入朗读文本')
    const upload = (audio) => jsonRequest('/api/chatterbox/upload', { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/wav', 'X-Filename': encodeURIComponent(audio.name || 'audio.wav') }, body: audio })
    const a = await upload(first)
    const body = { text: params.text, model, language: model === 'english' ? 'en' : params.language || 'en' }
    if (node.type === 'chatterbox-mix') {
      const voices = {source:first,reference:second,...audioInputs}
      const refs = voicePorts(node).map(port => [port, voices[port]]).filter(([,file])=>file)
      const weights=node.params.voiceWeights || {a:80,b:20}
      body.mixConditions=mixConditions(ui)
      body.cfg=Number(ui['chatterbox-mix-cfg']??params.cfg??.5)
      body.voices=normalizeMixEntries(await Promise.all(refs.map(async ([port,file],i)=>({audioId:port==='source'?a.audioId:(await upload(file)).audioId,weight:Number(weights[port==='source'?'a':port==='reference'?'b':`v${port.slice(6)}`]??20)}))))
      Object.assign(body,{balanceEnabled:ui['chatterbox-mix-balance-enabled']??true,balanceLufs:Number(ui['chatterbox-mix-balance-lufs']??-16)})
    }
    else body.referenceAudio = a.audioId
    task = await jsonRequest(node.type === 'chatterbox-mix' ? '/api/chatterbox/mix' : '/api/chatterbox', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Task-Priority': progress?.taskPriority || 'normal' }, body: JSON.stringify(body) })
  }
  await waitForNodeJob(task.jobId, progress)
  const response = await fetch(`/api/jobs/${encodeURIComponent(task.jobId)}/output`)
  if (!response.ok) throw new Error('无法读取结果')
  return new File([await response.blob()], node.type === 'audio-input' ? (first.name || 'audio').replace(/\.[^.]+$/, '') + '.wav' : node.type === 'sensevoice' ? 'transcript.txt' : node.type === 'loudness' ? 'loudness-balanced.wav' : 'generated.wav', { type: node.type === 'sensevoice' ? 'text/plain' : 'audio/wav' })
}
