// Bound initial Markdown/DOM work by approximate visual rows, not chunk count.
export function createTranscriptWindow() {
  let source, start = 0;
  const rows = (message, columns) => 2 + String(message.text || message.output || message.input || '').split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / columns)), 0);
  function earlier(messages, end, budget, columns) {
    let used = 0, index = Math.min(end, messages.length);
    while (index > 0 && used < budget) used += rows(messages[--index], columns);
    return index;
  }
  return {
    range(messages, height, width) {
      if (messages !== source) {
        source = messages;
        const budget = Math.max(60, Math.min(150, Math.ceil(height / 22) * 3));
        start = earlier(messages, messages.length, budget, Math.max(25, Math.floor(width / 8)));
      }
      return start;
    },
    more(messages, height, width) {
      if (source !== messages) { source = messages; start = messages.length; }
      start = earlier(messages, start, Math.max(60, Math.ceil(height / 22) * 2), Math.max(25, Math.floor(width / 8)));
      return start;
    },
  };
}
