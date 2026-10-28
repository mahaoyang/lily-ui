import { h } from '../lib/dom.js'
import { Button } from './buttons.js'
import { openModal } from './modal.js'

const actionIcons = { '打开': 'arrow-up-right', '关闭': 'square', '＋ 新建环境': 'plus', '创建环境': 'plus', '检测连接': 'activity', '环境设置': 'sliders-horizontal', '删除环境': 'trash-2', '隐私检查': 'shield-check', '隔离测试': 'scan-line', '新建同配置环境': 'copy', '导出备份': 'upload', '导入备份': 'download' }
export const action = (label, fn, primary = false) => Button({ children: [...(actionIcons[label] ? [h('i', { 'data-lucide': actionIcons[label], 'aria-hidden': 'true' })] : []), label.replace(/^＋ /, '')], variant: primary ? 'solid' : 'soft', onclick: async e => {
  const button = e.currentTarget
  button.disabled = true
  try { await fn() } catch (error) { showMessage('未能完成操作', error.message || '请稍后重试。') }
  finally { button.disabled = false }
} })
export function showMessage(title, text) {
  const modal = openModal({ title, body: h('p', {}, text), closeOnEscape: true })
  modal.footer.append(action('知道了', () => modal.close(), true))
}
