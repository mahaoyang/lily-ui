import { mergePorts } from './audio-merge.js'
import { acceptsText } from './text-input.js'
// Shared input schema for the editor and task queue. Keep the primary port stable.
export const primaryPort = node => ['enhance', 'chatterbox-mix'].includes(node.type) ? 'source' : 'in'
export const hasEmotionInput = node => node.type === 'indextts' && node.params?.emotionMode === 'audio'
export const voicePorts = node => ['source', 'reference', ...Array.from({length: Math.max(0,(node.params?.voiceCount || 2)-2)}, (_,i)=>`voice-${i+2}`)]
export const setInputFile = (node, port, file) => { if(port.startsWith('voice-')) node.extraFiles={...node.extraFiles,[port]:file}; else node[port === 'reference' ? 'localSecond' : 'localFirst']=file }
export function clearLocalInput(node, port) {
  if (node.params?.forLoop) { node.connectedLists = {}; const c = node.params?.columns?.find(c => c.id === port); if (c) { c.items = []; delete c.files; delete c.raw }; return }
  if (port !== 'text') { setInputFile(node, port, null); if (['text-input', 'number-text', 'text-split'].includes(node.type)) { node.params = { ...node.params }; delete node.params.text }; return }
  // Text and the primary audio share a node, but are independent inputs.
  const ui = { ...node.params?.ui }
  const prefix = node.type === 'chatterbox-read' ? 'chatterbox' : node.type
  delete ui[`${prefix}-text`]
  const params = { ...node.params, ui }
  delete params.text
  node.params = params
}
export function growVoicePorts(node, edges=[]) { if(node.type === 'audio-merge'){const ports=mergePorts(node);if(ports.every(port=>inputFile(node,port)||edges.some(e=>e.to===node.id&&e.toPort===port)))node.params.inputCount=ports.length+1;return}if(node.type !== 'chatterbox-mix')return;const ports=voicePorts(node);if(ports.length < 32 && ports.every(port=>inputFile(node,port)||edges.some(e=>e.to===node.id && e.toPort===port)))node.params.voiceCount=ports.length+1 }
export const inputPorts = node => node.type === 'audio-merge' ? mergePorts(node) : node.type === 'compound' ? (node.inputs || []).map(p => p.id) : node.type === 'chatterbox-mix' ? [...voicePorts(node), 'text'] :  [primaryPort(node), ...(acceptsText(node) ? ['text'] : []), ...(['enhance', 'chatterbox-mix'].includes(node.type) || hasEmotionInput(node) ? ['reference'] : [])]
export const inputLabel = (node, port) => node.type === 'audio-merge' ? `音频 / 列表 ${mergePorts(node).indexOf(port)+1}` : node.type === 'compound' ? node.inputs?.find(p => p.id === port)?.label || port : ['text-input', 'number-text', 'text-split'].includes(node.type) ? '文本输入' : port.startsWith('voice-') ? `音色 ${Number(port.slice(6))+1}` : port === 'text' ? '生成文本' : node.type === 'indextts' ? (port === 'reference' ? '情绪参考音频' : '音色参考音频') : port === 'source' ? (node.type === 'chatterbox-mix' ? '音色 A' : '主体音频') : port === 'reference' ? (node.type === 'chatterbox-mix' ? '音色 B' : '目标音色') : '音频输入'
export const inputFile = (node, port) => port.startsWith('voice-') ? node.extraFiles?.[port] : port === 'reference' ? node.localSecond : node.localFirst
export const pruneInputEdges = (edges, node) => edges.filter(edge => edge.to !== node.id || inputPorts(node).includes(edge.toPort))
