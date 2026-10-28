import { h } from '../lib/dom.js'
import { openModal } from '../components/modal.js'
import { apiFetch } from '../../../adapters/browser/browser-manager/client.js'
import { toast } from '../components/toast.js'
import { NodePicker } from '../components/node-picker.js'
import { SelectField } from '../components/ui.js'
import { buildLanguageItems, buildTimezoneItems } from '../../../headless/browser-manager/geo-options.js'

let editorId = 0
export function openEnvironmentSettings(profile, onDone) {
  const prefix = `environment-settings-${++editorId}`
  const settings = profile.settings || {}
  const native = settings.fingerprintMode === 'native'
  const field = (label, value = '', type = 'text') => {
    const input = h('input', { type, value: String(value), autocomplete: 'off' })
    return { input, root: h('label', { class: 'settings-field' }, h('span', {}, label), input) }
  }
  const toggle = (label, detail, checked) => {
    const input = h('input', { type: 'checkbox' }); input.checked = checked
    return { input, root: h('label', { class: 'settings-toggle' }, h('span', {}, h('strong', {}, label), h('small', {}, detail)), input) }
  }
  const group = (title, ...children) => h('section', { class: 'settings-group' }, h('h3', {}, title), ...children)
  const name = field('环境名称', profile.name)
  const timezoneMode = h('select', { 'aria-label': '时区模式' },
    h('option', { value: 'auto' }, '跟随代理包地区'),
    h('option', { value: 'fixed' }, '静态 · 固定此配置'))
  timezoneMode.value = settings.autoGeo === false ? 'fixed' : 'auto'
  const localeMode = h('select', { 'aria-label': '语言模式' },
    h('option', { value: 'auto' }, '跟随代理包语言'),
    h('option', { value: 'fixed' }, '静态 · 固定此语言'))
  localeMode.value = settings.autoGeo !== false && settings.autoLocale !== false ? 'auto' : 'fixed'
  const timezone = SelectField({ value: profile.geo?.timezone || 'UTC', items: buildTimezoneItems(profile.geo?.timezone), placeholder: '输入城市或时区关键字筛选…' })
  const locale = SelectField({ value: profile.geo?.locale || 'en-US', items: buildLanguageItems(profile.geo?.locale), placeholder: '输入语言或地区关键字筛选…' })
  const geoHint = h('p', { class: 'settings-note' })
  const syncGeo = () => {
    const timezoneAuto = timezoneMode.value === 'auto'
    if (!timezoneAuto) localeMode.value = 'fixed'
    const localeAuto = timezoneAuto && localeMode.value === 'auto'
    timezone.select.disabled = timezoneAuto
    locale.select.disabled = localeAuto
    timezone.root.toggleAttribute('data-disabled', timezoneAuto)
    locale.root.toggleAttribute('data-disabled', localeAuto)
    localeMode.disabled = !timezoneAuto
    geoHint.textContent = localeAuto
      ? '启动时读取代理包保存的地区和语言；地区重检测只在代理包中进行。'
      : timezoneAuto
        ? '时区读取代理包，语言使用下方固定设置。'
        : '静态模式：时区和语言固定，不随代理出口变化。'
  }
  timezoneMode.addEventListener('change', syncGeo)
  localeMode.addEventListener('change', syncGeo)
  syncGeo()
  const general = h('div', {}, group('基本信息', name.root, h('p', { class: 'settings-note' }, '重新打开环境后生效。')),
    group('地区与语言',
      h('div', { class: 'settings-grid' },
        h('label', { class: 'settings-field' }, h('span', {}, '时区模式'), timezoneMode),
        h('label', { class: 'settings-field' }, h('span', {}, '语言模式'), localeMode),
        h('label', { class: 'settings-field' }, h('span', {}, '固定时区'), timezone.root),
        h('label', { class: 'settings-field' }, h('span', {}, '固定语言'), locale.root)),
      geoHint))

  const picker = NodePicker(profile)
  const required = toggle('必须使用代理', '验证失败时禁止启动。', !!settings.requireProxy)
  const network = h('div', {}, group('代理选择', picker.root, required.root))


  const enhanced = toggle('增强隐私内核', '使用原生指纹防护。', settings.privacyEngine === 'brave')
  const hardware = toggle('硬件信息最小化', '限制显卡和内存报告。', native && settings.hardwareProtection !== false)
  enhanced.input.disabled = !native
  const syncHardware = () => { if (enhanced.input.checked) hardware.input.checked = true; hardware.input.disabled = !native || enhanced.input.checked }
  enhanced.input.addEventListener('change', syncHardware); syncHardware()
  const privacy = h('div', {}, group('浏览器保护', enhanced.root, hardware.root),
    group('字体保护', h('p', { class: 'settings-note' }, '增强模式限制本地字体枚举。中文和表情可能缺字。')),
    h('p', { class: 'settings-note' }, '保护不能隐藏账号资料或行为关联。'))
  if (!native) privacy.append(h('div', { class: 'settings-legacy' }, h('p', {}, '此环境使用旧版覆盖模式。设备参数单独管理，避免与原生保护混用。'),
    h('button', { type: 'button', class: 'console-btn is-soft', onclick: async () => { const { openLegacyEditModal } = await import('./legacy/fingerprint-editor.js'); modal.close(); openLegacyEditModal(profile, onDone) } }, '打开旧版指纹参数')))

  const error = h('p', { class: 'settings-error', role: 'alert' })
  const panels = [general, network, privacy]
  const tablist = h('div', { class: 'settings-tabs', role: 'tablist', 'aria-label': '环境设置分类' })
  const tabs = ['通用', '网络', '隐私'].map((label, index) => {
    const tab = h('button', { type: 'button', role: 'tab', id: `${prefix}-tab-${index}`, 'aria-controls': `${prefix}-panel-${index}`, onclick: () => select(index) }, label)
    panels[index].id = `${prefix}-panel-${index}`; panels[index].setAttribute('role', 'tabpanel'); panels[index].setAttribute('aria-labelledby', tab.id)
    tab.addEventListener('keydown', event => {
      let next
      if (event.key === 'ArrowRight') next = (index + 1) % 3
      if (event.key === 'ArrowLeft') next = (index + 2) % 3
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = 2
      if (next !== undefined) { event.preventDefault(); select(next); tabs[next].focus() }
    })
    tablist.append(tab); return tab
  })
  function select(index) {
    error.textContent = ''
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index })
  }
  select(0)
  const body = h('div', { class: 'environment-settings' }, h('p', { class: 'settings-subtitle' }, `${profile.name} · ${native ? '原生一致模式' : '旧版覆盖模式'}`), tablist, ...panels, error)
  const modal = openModal({ title: '环境设置', body, closeOnEscape: true })
  const cancel = h('button', { type: 'button', class: 'console-btn is-soft', onclick: () => modal.close() }, '取消')
  const save = h('button', { type: 'button', class: 'console-btn is-solid', onclick: async () => {
    error.textContent = ''
    try {
      if (!name.input.value.trim()) { select(0); name.input.focus(); throw new Error('请填写环境名称。') }
      const value = picker.value()
      if (required.input.checked && !value.proxyNodeId) { select(1); throw new Error('请先选择代理节点。') }
      const timezoneAuto = timezoneMode.value === 'auto'
      const localeAuto = timezoneAuto && localeMode.value === 'auto'
      const payload = { name: name.input.value.trim(), proxyNodeId: value.proxyNodeId, settings: {
        autoGeo: timezoneAuto, autoLocale: localeAuto, requireProxy: required.input.checked,
        requireIpTimezone: timezoneAuto, proxyProtocol: value.protocol
      } }
      if (native) Object.assign(payload.settings, { privacyEngine: enhanced.input.checked ? 'brave' : 'chromium', hardwareProtection: hardware.input.checked })
      if (!timezoneAuto || !localeAuto) {
        const tz = timezone.select.value.trim(), lang = locale.select.value.trim()
        if (!timezoneAuto && !tz) { select(0); throw new Error('静态时区模式下请填写时区。') }
        if (!localeAuto && !lang) { select(0); throw new Error('静态语言模式下请填写语言地区。') }
        try { if (!timezoneAuto) new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(); if (!localeAuto) new Intl.DateTimeFormat(lang).format() }
        catch { select(0); throw new Error('请填写有效的时区和语言，例如 Asia/Shanghai、zh-CN。') }
        Object.assign(payload, { ...(timezoneAuto ? {} : { timezone: tz }), ...(localeAuto ? {} : { locale: lang }) })
      }
      save.disabled = true; save.textContent = '正在保存…'
      await apiFetch(`/api/profiles/${encodeURIComponent(profile.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
      toast('已保存，重新打开环境后生效'); modal.close(); await onDone?.()
    } catch (e) { error.textContent = e.message }
    finally { save.disabled = false; save.textContent = '保存更改' }
  } }, '保存更改')
  modal.footer.append(cancel, save)
  modal.body.closest('.console-modal-card').classList.add('environment-settings-card')
  return modal
}
