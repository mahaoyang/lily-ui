import { mountShell } from './components/shell.js'
import { installAppearance } from './lib/appearance.js'
import { installMenuDismissal } from './components/menu.js'
import { apiFetch } from '../../adapters/browser/browser-manager/client.js'
import { installIconAutoHydrator, hydrateIcons } from './lib/icons.js'
import { getRoute, onRouteChange } from './router.js'
import { toast } from './components/toast.js'
import { renderWorkspace } from './views/workspace.js'
import { renderSessions } from './views/sessions.js'
import { installMagneticControls } from './lib/magnetic.js'
import { installSelectControls } from './lib/select.js'
import { renderNodes } from './views/nodes.js'

const { panel, refreshBtn, updateRoute } = mountShell(document.getElementById('app'))

installIconAutoHydrator(document.body)
installMagneticControls()
installSelectControls()
installAppearance()
installMenuDismissal()


async function render() {
  panel.syncSessions = null
  document.querySelectorAll('[data-workspace-control]').forEach(el => el.remove())
  const route = getRoute()
  const top = route.parts[0] === 'network' ? 'nodes' : route.parts[0] || 'profiles'
  updateRoute(top)

  try {
    if (top === 'nodes') { await renderNodes(panel); hydrateIcons(); return }
    if (['profiles', 'privacy', 'settings'].includes(top)) {
      await renderWorkspace(panel, top)
      hydrateIcons()
      return
    }
    if (top === 'sessions') {
      await renderSessions(panel)
      hydrateIcons()
      return
    }
    window.location.hash = '#/profiles'
  } catch (e) {
    console.error(e)
    toast(e?.message || '渲染失败')
  }
}

onRouteChange(render)
if (refreshBtn) refreshBtn.addEventListener('click', () => render())
render()


// One small request at a time; hidden tabs do no background polling.
let sessionPollBusy = false
async function syncSessionState() {
  const update = panel.syncSessions
  if (document.hidden || sessionPollBusy || !update) return
  sessionPollBusy = true
  try {
    const response = await apiFetch('/api/sessions', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!document.hidden && panel.syncSessions === update) await update(response.items || [])
  } catch {
    // Keep the last known state on network errors; retry on the next tick.
  } finally {
    sessionPollBusy = false
  }
}
setInterval(syncSessionState, 3000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSessionState() })
window.addEventListener('focus', syncSessionState)
