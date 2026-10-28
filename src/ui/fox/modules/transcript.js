// Shared transcript presentation for live conversations and saved previews.
import { esc, icon } from './ui.js';
import { aiMarker } from './indicators.js';
import { renderMarkdown, foldOutput } from '../output.js';

export function renderTranscriptMessage(m, index, { openDetails = new Set(), streaming = false } = {}) {
  if (m.role === 'tool') {
    const labels = { pending: '等待', in_progress: '执行中', completed: '完成', failed: '失败', cancelled: '已停止' };
    return `<details class="tool-card output-detail" data-detail="${index}" ${openDetails.has(String(index)) ? 'open' : ''}><summary>${icon('chevron-right')} <span class="tool-title">${esc(m.title)}</span> <span class="tool-status" data-status="${esc(m.status)}">${esc(labels[m.status] || m.status)}</span></summary>${m.input ? `<pre class="tool-input">${esc(m.input)}</pre>` : ''}${m.output ? `<pre>${esc(m.output)}</pre>` : ''}</details>`;
  }
  if (m.role === 'thought') return `<details class="output-detail thought-card" data-detail="${index}" ${openDetails.has(String(index)) ? 'open' : ''}><summary>${icon('chevron-right')}思考过程</summary><div class="markdown-output" data-output-index="${index}">${renderMarkdown(m.text)}</div></details>`;
  const status = m.error ? 'error' : streaming && !m.final ? 'streaming' : 'done';
  const marker = m.role === 'user' ? '<span class="user-marker" aria-label="用户">&gt;</span>' : aiMarker(status);
  return `<div class="message ${m.role}">${marker}<div data-output-index="${index}" class="message-bubble ${m.role === 'assistant' ? 'markdown-output' : ''}">${m.role === 'assistant' ? renderMarkdown(m.text) : esc(m.text)}</div></div>`;
}

export function enhanceTranscript(box, offset = 0, openDetails = new Set()) {
  box.querySelectorAll('.markdown-output').forEach((output, index) => foldOutput(output, output.dataset.outputIndex ?? index + offset, openDetails));
  box.querySelectorAll('.markdown-output a').forEach(link => { link.target = '_blank'; link.rel = 'noopener noreferrer'; });
}
