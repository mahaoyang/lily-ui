// Sentence boundaries preserve punctuation; commas and dashes are never boundaries.
export function splitText(text, threshold = 50, options = {}) {
  const mode = options.splitMode || 'sentences'
  if (!['sentences', 'lines'].includes(mode)) throw new Error('不支持的切割方式')
  threshold = Number(threshold)
  if (mode === 'sentences' && (!Number.isInteger(threshold) || threshold < 1 || threshold > 1000000)) throw new Error('分块字数需为 1 至 1000000 的整数')
  if (typeof text !== 'string' || !text.trim()) throw new Error('请输入文本或拖入文本文件')
  if (options.removeMarkdownHeadings) {
    text = text.replace(/^ {0,3}#{1,6}(?:[\t ]+[^\r\n]*|[\t ]*)$/gm, '')
      .replace(/^[^\r\n]+\r?\n {0,3}(?:=+|-+)[\t ]*$/gm, '')
  }
  if (options.cleanMarkdown) {
    text = text.replace(/^ {0,3}(?:`{3,}|~{3,})[^\r\n]*$/gm, '')
      .replace(/!\[([^\]]*)\]\([^\n]*?\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^\n]*?\)/g, '$1')
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      .replace(/^ {0,3}\[[^\]]+\]:[^\r\n]*$/gm, '')
      .replace(/^ {0,3}#{1,6}[\t ]+|[\t ]+#+[\t ]*$/gm, '')
      .replace(/^\s{0,3}(?:>[\t ]*)+/gm, '')
      .replace(/^ {0,3}(?:[-+*]|\d+[.)])[\t ]+(?:\[[ xX]\][\t ]+)?/gm, '')
      .replace(/^ {0,3}(?:(?:\*[\t ]*){3,}|(?:-[\t ]*){3,}|(?:_[\t ]*){3,}|=+)[\t ]*$/gm, '')
      .replace(/(`+)([^`\n]+)\1/g, '$2')
      .replace(/(\*\*|__|~~)(?=\S)(.+?)\1/g, '$2')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
      .replace(/\\([\\`*{}\[\]()#+.!_>~-])/g, '$1')
  }
  // Drop punctuation/symbol-only lines in both modes, independently of Markdown
  // cleanup. Keep line breaks so configured multi-newline separators still work.
  text = text.split(/\r\n|[\r\n\u2028\u2029]/u)
    .map(line => /^[\p{P}\p{S}\s]+$/u.test(line) ? '' : line).join('\n')
  if (mode === 'lines') {
    const breaks = Number(options.separatorNewlines ?? 1)
    if (!Number.isInteger(breaks) || breaks < 1 || breaks > 1000000) throw new Error('分隔换行数需为 1 至 1000000 的整数')
    const normalized = text.replace(/\r\n|[\r\u2028\u2029]/gu, '\n')
    const lines = normalized.split('\n'.repeat(breaks)).map(line => line.replace(/^[ \t]+|[ \t]+$/g, '')).filter(line => line.trim())
    return lines
  }
  const sentences = []
  for (const line of text.split(/\r\n|[\r\n\u2028\u2029]/u)) {
    let start = 0
    // A decimal point between digits is not a sentence terminator.
    const boundary = /[。！？!?]+[”’」』）》"']*|(?<!\d)\.+[”’」』）》"']*|\.+(?!\d)[”’」』）》"']*/gu
    for (const match of line.matchAll(boundary)) {
      const end = match.index + match[0].length
      const sentence = line.slice(start, end).trim()
      if (sentence) sentences.push(sentence)
      start = end
    }
    const tail = line.slice(start).trim()
    if (tail) sentences.push(tail)
  }
  const blocks = []; let block = '', length = 0
  for (const sentence of sentences) {
    block += sentence + (options.sentenceNewline ? '\n' : '')
    length += Array.from(sentence).length
    if (length > threshold) { blocks.push(block); block = ''; length = 0 }
  }
  if (block) blocks.push(block)
  return blocks
}
