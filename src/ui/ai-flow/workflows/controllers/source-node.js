import { textOutput } from './text-input.js'
import { runModelNode } from './node-model-runner.js'

export const isSourceNode = node => ['audio-input', 'text-input'].includes(node?.type)
// Cache immutable File objects, rather than filenames: replacing a file always
// prepares fresh data, even when its name/size match the old one.
const audioCache = new WeakMap()
export async function sourceOutput(node, progress, input = null) {
  if (input) {
    progress?.signal?.throwIfAborted()
    progress?.(100, '输入已透传')
    return input
  }
  if (node.type === 'text-input') {
    progress?.signal?.throwIfAborted()
    const output = input || await textOutput(node)
    progress?.(100, input ? '文本已透传' : '输入已就绪')
    return output
  }
  const file = node.localFirst
  if (!file) throw new Error('请先上传输入音频')
  if (node.params?.autoWav === false) {
    progress?.signal?.throwIfAborted()
    progress?.(100, '输入已就绪')
    return file
  }
  let cached = audioCache.get(file)
  if (!cached) {
    cached = runModelNode(node, file, null, progress)
    audioCache.set(file, cached)
    cached.catch(() => { if (audioCache.get(file) === cached) audioCache.delete(file) })
  }
  const output = await cached
  progress?.signal?.throwIfAborted()
  progress?.(100, '输入已就绪')
  return output
}
