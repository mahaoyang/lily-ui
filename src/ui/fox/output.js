export { contentText } from '../../headless/fox/content.js';
export function renderMarkdown(text) {
  const html = globalThis.marked.parse(String(text || ''), { gfm: true, breaks: true });
  return globalThis.DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','em','del','code','pre','blockquote','ul','ol','li','h1','h2','h3','h4','h5','h6','hr','table','thead','tbody','tr','th','td','a','input'],
    ALLOWED_ATTR: ['href','title','class','start','type','checked','disabled','align'],
    FORBID_TAGS: ['img','style','script'],
  });
}

// Keep long sections readable while streaming; expanded state is restored by key.
export function foldOutput(container, outputIndex, openDetails = new Set()) {
  const makeFold = (nodes, label, key) => {
    const details = document.createElement('details');
    details.className = 'output-fold'; details.dataset.detail = key;
    details.open = openDetails.has(key);
    const summary = document.createElement('summary');
    const title = document.createElement('span'); title.className = 'output-fold-title';
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.classList.add('lucide', 'output-fold-arrow'); arrow.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '/icons.svg#chevron-right'); arrow.append(use);
    title.append(arrow, document.createTextNode(label));
    const preview = document.createElement('span'); preview.className = 'output-preview';
    preview.textContent = nodes.map(node => node.textContent).join('\n').trim();
    const hint = document.createElement('span'); hint.className = 'output-expand-hint'; hint.textContent = '展开';
    summary.append(title, preview, hint);
    nodes[0].before(details);
    const body = document.createElement('div'); body.className = 'output-fold-body';
    body.append(...nodes); details.append(summary, body);
  };
  // Fold the content below each heading, retaining the heading as a compact title.
  let section = 0;
  for (const heading of [...container.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')]) {
    const nodes = [];
    let next = heading.nextElementSibling;
    while (next && !/^H[1-6]$/.test(next.tagName)) { nodes.push(next); next = next.nextElementSibling; }
    const length = nodes.reduce((sum, node) => sum + node.textContent.length, 0);
    const lines = nodes.reduce((sum, node) => sum + node.textContent.split('\n').length, 0);
    const key = `section-${outputIndex}-${section++}`;
    if (nodes.length && (length > 420 || lines > 10)) {
      makeFold(nodes, heading.textContent, key);
      heading.remove();
    }
  }
  let codeIndex = 0;
  for (const pre of [...container.querySelectorAll('pre')]) {
    if (pre.closest('.output-fold')) continue;
    const key = `code-${outputIndex}-${codeIndex++}`;
    if (pre.textContent.split('\n').length > 6) makeFold([pre], '代码', key);
  }
}
