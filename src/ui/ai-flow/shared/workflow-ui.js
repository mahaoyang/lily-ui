/** Shared shell contract used by every workflow: modal dismissal and audio drop binding. */
export function mountWorkflowBase({ backdropId, closeButtonId, onClose }) {
  const backdrop = document.getElementById(backdropId)
  document.getElementById(closeButtonId).addEventListener('click', onClose)
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) onClose() })
  return backdrop
}

export function bindAudioDrop(zoneId, handler) {
  const zone = typeof zoneId === 'string' ? document.getElementById(zoneId) : zoneId
  zone.addEventListener('drop', handler)
}

export function byId(id) { return document.getElementById(id) }
