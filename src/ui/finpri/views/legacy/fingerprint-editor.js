import { h } from '../../lib/dom.js'
import { Button } from '../../components/ui.js'
import { openModal } from '../../components/modal.js'
import { apiFetch } from '../../../../adapters/browser/browser-manager/client.js'
import { toast } from '../../components/toast.js'
import { buildFingerprintModalBody } from './fingerprint-form.js'
import { confirmOkCancel } from './confirm.js'

export async function openLegacyEditModal(profile, onDone) {
  const initial = {
    id: profile.id,
    name: profile.name,
    timezone: profile.geo?.timezone,
    locale: profile.geo?.locale,
    latitude: profile.geo?.latitude ?? null,
    longitude: profile.geo?.longitude ?? null,
    targetPlatform: profile.targetPlatform || '',
    fingerprint: profile.fingerprint || null,
    settings: profile.settings || null
  }
  const form = buildFingerprintModalBody(initial)
  form.body.prepend(h('p', { class: 'privacy-caption' }, profile.settings?.fingerprintMode === 'native'
    ? '原生硬件保护模式：屏幕按屏幕模式设置生效；其他设备属性覆盖和噪声设置不生效。'
    : '旧版覆盖模式：修改或随机化指纹不保证减少关联，可能造成页面与 Worker 属性不一致。建议在隐私检查中主动切换原生一致模式。'))
  const modal = openModal({
    title: '编辑配置',
    body: form.body,
    footer: [],
    closeOnEscape: true,
    closeOnOverlay: false
  })

  const btnReset = Button({
    variant: 'soft',
    children: ['重新生成指纹'],
    onclick: async () => {
      await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}/fingerprint/regenerate`, { method: 'POST' })
      toast('已重新生成配置值；不代表提高匿名性，原生模式不应用设备属性覆盖')
      modal.close()
      onDone?.()
    }
  })
  const btnResetSafe = Button({
    variant: 'soft',
    accent: 'tomato',
    children: ['重置配置'],
    onclick: async () => {
      const ok = await confirmOkCancel(
        '重置高级配置',
        `确认重置「${profile.name || '—'}」的指纹配置值？代理、保护模式和必须使用代理要求保留。此操作不保证提高匿名性。`,
        '确认重置',
        'tomato'
      )
      if (!ok) return
      await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}/reset-safe`, { method: 'POST' })
      toast('已重置高级配置；保护模式与代理要求保留')
      modal.close()
      onDone?.()
    }
  })
  const btnCancel = Button({ variant: 'soft', children: ['取消'], onclick: () => modal.close() })
  const btnSave = Button({
    variant: 'solid',
    accent: 'grass',
    children: ['保存'],
    onclick: async () => {
      const v = form.getValue()
      if (Array.isArray(v.errors) && v.errors.length > 0) {
        toast(v.errors[0])
        return
      }
      await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: v.name || undefined,
          timezone: v.timezone || undefined,
          locale: v.locale || undefined,
          latitude: v.latitude,
          longitude: v.longitude,
          targetPlatform: v.targetPlatform,
          settings: v.settings || undefined,
          fingerprint: v.fingerprint
        })
      })
      toast('已保存')
      modal.close()
      onDone?.()
    }
  })
  // Network settings live in the node picker; this editor only changes fingerprints.
  modal.footer.appendChild(btnReset)
  modal.footer.appendChild(btnResetSafe)
  modal.footer.appendChild(btnCancel)
  modal.footer.appendChild(btnSave)
}
