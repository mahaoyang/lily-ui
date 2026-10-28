export function getRoute() {
  const hash = window.location.hash || '#/dashboard'
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  const parts = path.split('/').filter(Boolean)
  return { parts, path: '/' + parts.join('/') }
}

export function onRouteChange(fn) {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

