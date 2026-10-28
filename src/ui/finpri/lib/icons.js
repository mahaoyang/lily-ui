let scheduled = false

export function hydrateIcons() {
  const lucide = window.lucide
  if (!lucide?.createIcons) return
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    try {
      lucide.createIcons()
    } catch {
      // ignore
    }
  })
}

export function installIconAutoHydrator(root = document.body) {
  const lucide = window.lucide
  if (!lucide?.createIcons) return () => {}
  if (!window.MutationObserver) {
    hydrateIcons()
    return () => {}
  }

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches?.('i[data-lucide]') || node.querySelector?.('i[data-lucide]')) {
          hydrateIcons()
          return
        }
      }
    }
  })

  obs.observe(root, { childList: true, subtree: true })
  hydrateIcons()
  return () => obs.disconnect()
}

