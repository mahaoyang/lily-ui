import { h } from '../lib/dom.js'
import { action } from '../components/actions.js'
import { exportBackup, importBackup } from './backup.js'

export function renderPreferences(root, refresh) {
  const theme = h('select', { 'aria-label': '外观' }, ...[['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']].map(([value, label]) => h('option', { value }, label)))
  theme.value = document.documentElement.dataset.appearance || 'system'
  theme.addEventListener('change', () => {
    document.documentElement.dataset.appearance = theme.value
    try { localStorage.setItem('finpri.appearance', theme.value) } catch {}
  })
  root.append(h('section', { class: 'workspace-card console-stack' }, h('h2', {}, '外观'), theme),
    h('section', { class: 'workspace-card console-stack' }, h('h2', {}, '环境备份与恢复'),
      h('p', { class: 'privacy-caption' }, '只备份和恢复当前系统的环境。备份包含 Cookie、历史和登录数据，请当作账号凭据保存。导入默认合并；同名 ID 会替换。'),
      h('div', { class: 'finpri-actions' }, action('导出备份', () => exportBackup()), action('导入备份', () => importBackup(refresh)))),
    h('p', { class: 'privacy-caption settings-boundary-note' }, '保护边界：独立环境不能隐藏你主动提交的手机号、支付资料、身份信息或行为。系统级网络隔离尚未启用。'))
}
