import { h, clear } from '../lib/dom.js'
import { Card, SectionHeader } from '../components/layout.js'
import { Button, Badge } from '../components/ui.js'
import { toast } from '../components/toast.js'
import { apiFetch } from '../../../adapters/browser/browser-manager/client.js'
import { selectedRuntime, sessionRuntime } from '../../../headless/browser-manager/runtime.js'

const isMissingSession = error => error?.status === 404 || /session not found/i.test(String(error?.message || ''))

function formatIso(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts || '—')
  return d.toLocaleString()
}

export async function renderSessions(root) {
  root.syncSessions = null
  clear(root)

  root.appendChild(SectionHeader({
    title: '已打开的环境',
    right: h('div', { class: 'finpri-actions' },
      Button({ variant: 'soft', children: ['返回所有环境'], onclick: () => { window.location.hash = '#/profiles' } })
    )
  }))

  const [res, health] = await Promise.all([apiFetch('/api/sessions'), apiFetch('/api/health')])
  const headerActions = document.querySelector('.console-header-actions')
  headerActions?.querySelectorAll('[data-workspace-control]').forEach(el => el.remove())
  const items = (Array.isArray(res?.items) ? res.items : []).filter(s => sessionRuntime(s, health.env) === selectedRuntime(health.env))

  const runtime = selectedRuntime(health.env)
  const signature = rows => rows.map(s => s.id).sort().join('|')
  root.syncSessions = next => {
    if (selectedRuntime(health.env) !== runtime) return
    if (signature(next.filter(s => sessionRuntime(s, health.env) === runtime)) !== signature(items)) return renderSessions(root)
  }

  if (items.length === 0) {
    root.appendChild(h('section', { class: 'workspace-empty' }, h('h3', {}, '还没有打开的环境'), h('p', {}, '返回“所有环境”，点击“打开”即可开始。')))
    return
  }

  const list = h('div', { class: 'console-stack' })

  for (const s of items) {
    const modeBadge = Badge({ text: s.mode === 'windows' || health.env?.platform === 'win32' ? 'Windows' : health.env?.platform === 'darwin' ? 'macOS' : 'Linux', accent: 'gray', variant: 'soft' })
    const uiBadge = Badge({ text: s.headless ? 'Headless' : 'Headed', accent: 'gray', variant: 'soft' })
    const title = h('div', { class: 'finpri-card-head' },
      h('div', { class: 'finpri-card-titleblock' },
        h('div', { class: 'finpri-card-title text-4 font-bold text-gray-12' }, s.profileName || s.profileId || '—'),
        h('div', { class: 'finpri-card-sub text-1 text-gray-11 font-mono' }, `${s.id.slice(0, 8)} · ${formatIso(s.startedAt)}${s.url ? ` · ${s.url}` : ''}`)
      ),
      h('div', { class: 'finpri-card-tags' }, modeBadge, uiBadge)
    )

    const closeBtn = Button({
      variant: 'solid',
      accent: 'tomato',
      children: ['关闭'],
      onclick: async () => {
        try {
          await apiFetch(`/api/sessions/${encodeURIComponent(s.id)}/close`, { method: 'POST' })
        } catch (error) {
          if (!isMissingSession(error)) throw error
          toast('环境已关闭，列表已同步')
          renderSessions(root)
          return
        }
        toast('已关闭')
        renderSessions(root)
      }
    })

    const actions = h('div', { class: 'finpri-card-foot' },
      h('div', { class: 'finpri-actions' }, closeBtn),
      h('div', { class: 'finpri-actions' })
    )

    list.appendChild(Card({ class: 'finpri-card', children: [title, actions] }))
  }

  root.appendChild(list)
}
