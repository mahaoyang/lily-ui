// Initial loads reserve space; refreshes retain content and never flash a skeleton.
export function loadingRegion(element, initialHTML = '') {
  if (!element.hasChildNodes() && initialHTML) element.innerHTML = initialHTML;
  element.setAttribute('aria-busy', 'true');
  return () => element.removeAttribute('aria-busy');
}

// Preserve unchanged nodes, focus and custom selects across polling.
export function reconcileRows(container, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const wanted = [...template.content.children];
  const keys = new Set(wanted.map(row => row.dataset.key));
  for (const row of [...container.children]) if (!keys.has(row.dataset.key)) row.remove();
  wanted.forEach((next, index) => {
    const signature = next.outerHTML;
    let current = [...container.children].find(row => row.dataset.key === next.dataset.key);
    if (!current) current = next;
    else if (current.dataset.render !== signature) {
      current.replaceChildren(...next.childNodes);
    }
    current.dataset.render = signature;
    if (container.children[index] !== current) container.insertBefore(current, container.children[index] || null);
  });
}
