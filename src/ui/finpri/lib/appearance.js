export function installAppearance() {
  try {
    const saved = localStorage.getItem('finpri.appearance')
    document.documentElement.dataset.appearance = ['light', 'dark'].includes(saved) ? saved : 'system'
  } catch { document.documentElement.dataset.appearance = 'system' }
  const systemDark = matchMedia('(prefers-color-scheme: dark)')
  const syncTone = () => {
    const appearance = document.documentElement.dataset.appearance
    document.documentElement.dataset.tone = appearance === 'dark' || (appearance !== 'light' && systemDark.matches) ? 'dark' : 'light'
  }
  new MutationObserver(syncTone).observe(document.documentElement, { attributes: true, attributeFilter: ['data-appearance'] })
  systemDark.addEventListener('change', syncTone)
  syncTone()

}
