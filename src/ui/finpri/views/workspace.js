import { h, clear } from '../lib/dom.js'
import { action, showMessage } from '../components/actions.js'
import { LabeledInput as field } from '../components/fields.js'
import { openModal } from '../components/modal.js'
import { apiFetch } from '../../../adapters/browser/browser-manager/client.js'
import { openEnvironmentSettings as openEditModal } from './environment-settings.js'
import { renderPreferences } from './preferences.js'
import { selectedRuntime, sessionRuntime } from '../../../headless/browser-manager/runtime.js'
import { NodePicker } from '../components/node-picker.js'
import { toast } from '../components/toast.js'

const isMissingSession = error => error?.status === 404 || /session not found/i.test(String(error?.message || ''))
const playgroundUrl = () => new URL('/playground.html', location.origin).href
async function launchEnvironment(profile, refresh, demo = false) {
  const progress = openModal({ title: '正在打开环境', body: h('div', { class: 'console-stack' }, h('div', { class: 'launch-spinner' }), h('p', {}, `正在为「${profile.name}」准备独立浏览器，请稍候…`)), closeOnEscape: false })
  try {
    const health = await apiFetch('/api/health')
    await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}/launch`, { method: 'POST', body: JSON.stringify({ mode: selectedRuntime(health.env), ...(demo ? { url: playgroundUrl(), restoreTabs: false } : { restoreTabs: true }) }) })
    progress.close()
    await refresh()
  } catch (e) {
    progress.close()
    showMessage('浏览器未能打开', e.message)
  }
}

export function createEnvironment(onDone, source = null) {
  const name = field('环境名称', 'text', source ? source.name + ' · 新环境' : '', '例如：工作账号')
  const picker = NodePicker(source || {})
  const required = h('input', { type: 'checkbox' }); required.checked = !!source?.settings?.requireProxy
  const enhanced = h('input', { type: 'checkbox' }); enhanced.checked = source?.settings?.privacyEngine !== 'chromium'
  const error = h('p', { class: 'privacy-error', role: 'alert' })
  const body = h('div', { class: 'console-stack' }, name.root, picker.root,
    h('label', { class: 'privacy-toggle' }, required, h('span', {}, '必须使用代理，验证失败不启动')),
    h('label', { class: 'privacy-toggle' }, enhanced, h('span', {}, '增强隐私内核')), error)
  const modal = openModal({ title: source ? '新建同配置环境' : '新建环境', body, closeOnEscape: true })
  modal.footer.append(action('取消', () => modal.close()), action('创建环境', async () => {
    const value = picker.value()
    if (!name.input.value.trim() || name.input.value.trim().length > 256) throw new Error('请填写有效的环境名称。')
    if (required.checked && !value.proxyNodeId) throw new Error('请先选择代理节点。')
    await apiFetch('/api/profiles', { method: 'POST', body: JSON.stringify({
      name: name.input.value.trim(), proxyNodeId: value.proxyNodeId,
      timezone: source?.geo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: source?.geo?.locale || navigator.language,
      settings: { fingerprintMode: 'native', privacyEngine: enhanced.checked ? 'brave' : 'chromium',
        requireProxy: required.checked, proxyProtocol: value.protocol, hardwareProtection: true, spoofUserAgent: false }
    }) })
    modal.close(); await onDone()
  }, true))
  requestAnimationFrame(() => name.input.focus())
}

async function showPrivacy(profile, refresh) {
  const { item } = await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}/privacy`)
  const body = h('div', { class: 'console-stack' }, h('p', { class: 'privacy-caption' }, '这是配置检查，不会访问第三方服务，也不是匿名性认证。'))
  for (const check of item.checks) body.append(h('section', { class: `privacy-check ${check.level}` }, h('h3', {}, check.title), h('p', {}, check.detail)))
  const required = h('input', { type: 'checkbox' }); required.checked = item.proxyRequired
  const hardware = h('input', { type: 'checkbox' }); hardware.checked = item.hardwareProtection
  const enhanced = h('input', { type: 'checkbox' }); enhanced.checked = item.privacyEngine === 'brave'
  enhanced.disabled = item.mode !== 'native'
  const syncHardware = () => { if (enhanced.checked) hardware.checked = true; hardware.disabled = item.mode !== 'native' || enhanced.checked }
  enhanced.addEventListener('change', syncHardware); syncHardware()
  body.append(h('label', { class: 'privacy-toggle' }, enhanced, h('span', {}, '使用增强隐私内核（Brave）')),
    h('p', { class: 'privacy-caption' }, '切换后使用独立数据目录，首次需重新登录；旧目录和登录数据保留。内核缺失或校验失败则拒绝启动，不回退。增强模式重启时会重新启用 Shields 与指纹保护。'))
  body.append(h('label', { class: 'privacy-toggle' }, hardware, h('span', {}, '硬件信息最小化（重启环境后生效）')),
    h('p', { class: 'privacy-caption' }, '禁用 WebGL / WebGPU（包括后台 3D），启用低内存模式。标准 Chromium 通常报告 0.5 或 2 GiB；增强内核另有原生内存处理，不能按数值认定真实 RAM 已隐藏。3D、地图和高内存应用可能受影响。旧版环境请先切换原生模式。'))
  body.append(h('label', { class: 'privacy-toggle' }, required, h('span', {}, '必须使用代理，无法验证出口时停止启动')))
  const modal = openModal({ title: `${profile.name} · 隐私检查`, body, closeOnEscape: true })
  modal.footer.append(action('关闭', () => modal.close()))
  modal.footer.append(action('保存保护设置', async () => {
    if (required.checked && !profile.proxy) throw new Error('请先在“网络”中配置代理。')
    await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}`, { method: 'PATCH', body: JSON.stringify({ settings: { privacyEngine: enhanced.checked ? 'brave' : 'chromium', requireProxy: required.checked, hardwareProtection: hardware.checked } }) })
    modal.close(); await refresh()
  }, true))
  if (item.mode === 'legacy') modal.footer.append(action('切换原生一致模式', async () => {
    await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}`, { method: 'PATCH', body: JSON.stringify({ settings: { fingerprintMode: 'native', spoofUserAgent: false } }) })
    modal.close(); await refresh()
  }))
}

export async function renderWorkspace(root, section = 'profiles') {
  root.syncSessions = null
  clear(root)
  const refresh = () => renderWorkspace(root, section)
  const health = await apiFetch('/api/health')
  const headerActions = document.querySelector('.console-header-actions')
  headerActions?.querySelectorAll('[data-workspace-control]').forEach(el => el.remove())
  if (headerActions && section !== 'settings') {
    const create = action('＋ 新建环境', () => createEnvironment(refresh), true)
    create.setAttribute('data-workspace-control', '')
    headerActions.append(create)
  }
  if (section === 'settings') { renderPreferences(root, refresh); return }
  const [profiles, sessions] = await Promise.all([apiFetch('/api/profiles'), apiFetch('/api/sessions')])
  const items = profiles.items || []
  const runtime = selectedRuntime(health.env)
  let live = (sessions.items || []).filter(s => sessionRuntime(s, health.env) === runtime)
  const search = h('input', { type: 'search', placeholder: '搜索环境名称…', 'aria-label': '搜索环境' })
  const list = h('div', { class: 'workspace-list' })
  let filter = 'all'
  const needsAttention = p => p.proxyNodeError || (p.settings?.requireProxy && !p.proxy) || (section === 'privacy' && (p.settings?.privacyEngine === 'chromium' || p.settings?.hardwareProtection === false || p.settings?.fingerprintMode === 'legacy'))
  const filters = h('div', { class: 'environment-filters', role: 'group', 'aria-label': '筛选环境' })
  const filterButtons = []
  const filterOptions = section === 'privacy' ? [['all', '全部'], ['attention', '待检查']] : [['all', '全部'], ['running', '运行中'], ['attention', '待处理']]
  for (const [value, label] of filterOptions) {
    const button = h('button', { type: 'button', 'aria-pressed': String(value === filter), onclick: () => {
      filter = value
      for (const [key, el] of filterButtons) el.setAttribute('aria-pressed', String(key === filter))
      draw()
    } }, label, h('span', { class: 'filter-count' }, String(items.filter(p => value === 'all' || (value === 'running' ? live.some(session => session.profileId === p.id) : needsAttention(p))).length)))
    filterButtons.push([value, button]); filters.append(button)
  }
  root.append(
    h('div', { class: 'workspace-toolbar' }, filters, search), list,
    h('p', { class: 'list-footnote' }, section === 'privacy' ? '这里显示保存的设置；打开检查详情查看保护范围与配置问题。' : '每个账号使用独立环境，登录数据分别保存。'))
  const draw = () => {
    for (const [value, button] of filterButtons) {
      button.querySelector('.filter-count').textContent = String(items.filter(p => value === 'all' || (value === 'running' ? live.some(session => session.profileId === p.id) : needsAttention(p))).length)
    }
    clear(list)
    const filtered = items.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()) && (filter === 'all' || (filter === 'running' ? live.some(s => s.profileId === p.id) : needsAttention(p))))
    if (!filtered.length) { list.append(h('section', { class: 'workspace-empty' }, h('h3', {}, items.length ? '没有符合条件的环境' : '创建你的第一个环境'), h('p', {}, items.length ? '试试其他名称或筛选条件。' : '填写名称和代理，即可开始。'), ...(!items.length ? [action('＋ 新建环境', () => createEnvironment(refresh), true)] : []))); return }
    for (const p of filtered) {
      const session = live.find(s => s.profileId === p.id)
      const busy = !!session
      const status = session ? '运行中' : needsAttention(p) ? (section === 'privacy' ? '待检查' : '需要配置代理') : '未启动'
      const info = h('div', { class: 'environment-info' }, h('h3', {}, p.name),
        h('div', { class: 'environment-badges' }, h('span', { class: busy ? 'status-pill live' : needsAttention(p) ? 'status-pill attention' : 'status-pill' }, status), h('span', {}, p.proxyNodeError ? '节点不可用 · 禁止启动' : p.proxy ? `${p.proxy.type.toUpperCase()} 代理` : '本机网络')))
      const facts = entries => h('dl', { class: 'environment-facts' }, ...entries.map(([label, value]) => h('div', {}, h('dt', {}, label), h('dd', {}, value))))
      if (section === 'privacy') {
        info.append(facts([
          ['隐私内核', p.settings?.privacyEngine === 'chromium' ? '标准 Chromium' : '增强 Brave'],
          ['硬件防护', p.settings?.hardwareProtection === false ? '已关闭' : '已配置'],
          ['指纹模式', p.settings?.fingerprintMode === 'legacy' ? '旧版模式 · 建议检查' : '原生一致模式'],
          ['代理约束', p.settings?.requireProxy ? (p.proxy ? '已配置强制验证' : '缺少代理') : '未要求代理']
        ]))
      } else if (session?.geo) {
        info.append(h('p', { class: 'runtime-geo' }, `${session.geoDetection?.ip || '未检测出口'} · ${session.geo.timezone} · ${session.geo.locale}`))
        const sources = session.geoDetection?.alternatives || []
        if (new Set(sources.map(s => `${s.ip}|${s.timezone}`)).size > 1) info.append(h('p', { class: 'privacy-error' }, '地区服务结果存在差异，请在“匹配详情”中核对。'))
      } else if (p.lastExitGeo?.ip) {
        info.append(h('p', { class: 'runtime-geo' }, `${p.lastExitGeo.ip} · 已确认${p.lastExitGeo.timezone ? ` · ${p.lastExitGeo.timezone}` : ''}`))
      } else info.append(h('p', { class: 'runtime-geo' }, p.proxy ? `${p.proxyNodeName || '代理节点'} · ${p.proxyNodeGeo?.timezone || '地区待设置'}` : '使用本机出口'))
      const open = action(session ? '关闭' : '打开', async () => {
        if (session) {
          try {
            await apiFetch(`/api/sessions/${encodeURIComponent(session.id)}/close`, { method: 'POST' })
          } catch (error) {
            if (!isMissingSession(error)) throw error
            toast('环境已关闭，列表已同步')
            await refresh()
            return
          }
        }
        else {
          await launchEnvironment(p, refresh, p.name.startsWith('体验环境 '))
          return
        }
        await refresh()
      }, true)
      const more = h('details', { class: 'environment-more' }, h('summary', { 'aria-label': `${p.name} · 更多操作`, title: '更多操作' }, h('i', { 'data-lucide': 'ellipsis', 'aria-hidden': 'true' })))
      more.addEventListener('toggle', () => {
        if (more.open) list.querySelectorAll('.environment-more[open]').forEach(el => { if (el !== more) el.open = false })
      })
      more.append(action('新建同配置环境', () => createEnvironment(refresh, p)))
      if (!busy) {
        more.append(action('环境设置', () => openEditModal(p, refresh)), action('删除环境', () => {
          const confirm = field('输入环境名称以确认删除', 'text')
          const error = h('p', { role: 'alert', class: 'privacy-error' })
          const modal = openModal({ title: '删除环境及浏览数据', body: h('div', { class: 'console-stack' }, h('p', {}, `将永久删除「${p.name}」及其登录数据，无法撤销。`), confirm.root, error), closeOnEscape: true })
          modal.footer.append(action('取消', () => modal.close()), action('永久删除', async () => {
            if (confirm.input.value !== p.name) { error.textContent = '名称不匹配，未删除任何数据。'; return }
            await apiFetch(`/api/profiles/${encodeURIComponent(p.id)}`, { method: 'DELETE' })
            modal.close(); await refresh()
          }))
        }))
      }
      const controls = h('div', { class: 'finpri-actions' })
      if (section === 'privacy') controls.append(action('检查与设置', () => showPrivacy(p, refresh), true))
      else more.append(action('隔离测试', () => launchEnvironment(p, refresh, true)))
      more.append(action('隐私检查', () => showPrivacy(p, refresh)))
      if (session) more.append(action('匹配详情', () => {
        const sources = session.geoDetection?.alternatives || []
        showMessage('当前运行环境 · 地区匹配', `出口：${session.geoDetection?.ip || '未检测'}\n时区：${session.geo?.timezone}\n语言：${session.geo?.locale}\n来源：${session.geoDetection?.provider || '手动设置'}\n${sources.map(s => `${s.provider}：${s.ip} / ${s.timezone}`).join('\n')}\nIP 地区是数据库估计，检测站可能使用另一套数据库。需要手动校准时，在“代理包”中维护地区。`)
      }))
      const menu = h('div', { class: 'environment-menu' })
      menu.addEventListener('click', event => {
        if (event.target.closest('button')) more.open = false
      })
      for (const button of Array.from(more.querySelectorAll(':scope > button'))) menu.append(button)
      more.append(menu)
      if (section === 'profiles') controls.append(open)
      controls.append(more)
      list.append(h('article', { class: `workspace-card environment-row section-${section}` }, h('div', { class: `environment-icon ${busy ? 'running' : ''}`, 'aria-hidden': 'true' }, section === 'profiles' ? p.name.slice(0, 1).toUpperCase() : h('i', { 'data-lucide': section === 'network' ? 'network' : 'shield-check' })), info, controls))
    }
  }
  root.syncSessions = next => {
    if (selectedRuntime(health.env) !== runtime) return
    const updated = next.filter(s => sessionRuntime(s, health.env) === runtime)
    const signature = rows => rows.map(s => `${s.id}:${s.profileId}`).sort().join('|')
    if (signature(updated) === signature(live)) return
    live = updated
    draw()
  }
  search.addEventListener('input', draw); draw()
}
