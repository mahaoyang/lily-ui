import { h } from '../lib/dom.js'
import { Button, Switch } from '../components/ui.js'
import { openModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { spaceHeaders } from '../../../adapters/browser/browser-manager/client.js'

export async function exportBackup() {
  try {
    toast('开始导出备份…')
    // The backend resolves the installed system space; the UI never exposes a
    // cross-space selector or query parameter.
    window.location.href = '/api/backup/export'
  } catch (e) {
    toast(e?.message || '导出失败')
  }
}

export async function importBackup(onDone) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip,application/zip'
  input.style.display = 'none'
  document.body.appendChild(input)

  const cleanup = () => {
    try { document.body.removeChild(input) } catch {}
  }

  input.addEventListener('change', async () => {
    try {
      const file = input.files && input.files[0]
      if (!file) return

      const replaceSwitch = Switch({ checked: false, size: 2, accent: 'tomato' })
      const body = h('div', { class: 'console-stack-sm' },
        h('div', { class: 'text-2 text-gray-12' }, '导入将包含：配置、Cookies、历史记录等浏览器数据。'),
        h('div', { class: 'finpri-help' }, '建议先关闭所有已启动的浏览器窗口，再导入。'),
        h('div', { class: 'flex items-center gap-2' },
          h('span', { class: 'text-2 text-gray-12 font-bold' }, '覆盖当前所有配置'),
          replaceSwitch.root
        )
      )

      const modal = openModal({
        title: '导入备份',
        body,
        footer: [],
        closeOnOverlay: false,
        closeOnEscape: true
      })

      modal.footer.appendChild(Button({ variant: 'soft', children: ['取消'], onclick: () => modal.close() }))
      modal.footer.appendChild(Button({
        variant: 'solid',
        accent: 'grass',
        children: ['开始导入'],
        onclick: async () => {
          try {
            const mode = replaceSwitch.button?.getAttribute('aria-checked') === 'true' ? 'replace' : 'merge'
            toast('正在导入…')
            const res = await fetch(`/api/backup/import?mode=${encodeURIComponent(mode)}`, {
              method: 'POST',
              headers: { 'content-type': file.type || 'application/zip', ...await spaceHeaders() },
              body: file
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error || '导入失败')
            toast(`导入完成：${json?.importedProfiles || 0} 个配置`)
            modal.close()
            onDone?.()
          } catch (e) {
            toast(e?.message || '导入失败')
          }
        }
      }))
    } finally {
      cleanup()
    }
  })

  input.click()
}
