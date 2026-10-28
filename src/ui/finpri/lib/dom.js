export function h(tag, attrs = {}, ...children) {
  const svgTags = new Set([
    'svg',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'g',
    'defs',
    'clipPath',
    'mask',
    'linearGradient',
    'radialGradient',
    'stop',
    'text',
    'tspan'
  ])
  const isSvg = svgTags.has(tag)
  const el = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag)
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') {
      if (isSvg) el.setAttribute('class', String(v))
      else el.className = v
    }
    else if (k === 'style' && v && typeof v === 'object') Object.assign(el.style, v)
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else if (v === false || v === null || v === undefined) continue
    else el.setAttribute(k, String(v))
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined) continue
    if (typeof child === 'string') el.appendChild(document.createTextNode(child))
    else el.appendChild(child)
  }
  return el
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild)
}
