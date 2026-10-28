import { h } from '../../lib/dom.js'
import { Button, IconButton, TextField, TextAreaField, SelectField, Switch, Badge } from '../../components/ui.js'
import { buildLanguageItems, buildTimezoneItems } from '../../../../headless/browser-manager/geo-options.js'
import { confirmOkCancel } from './confirm.js'

function randomSeed31() {
  try {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] & 0x7fffffff
  } catch {
    return Math.floor(Math.random() * 0x80000000)
  }
}

function buildDisclosure(options) {
  const { title, subtitle, defaultOpen = true, children = [] } = options || {}
  const icon = h('span', { class: 'finpri-disclosure-icon', 'aria-hidden': 'true' }, h('i', { 'data-lucide': 'chevron-down' }))
  const titleBlock = h('div', { class: 'finpri-disclosure-title' },
    h('div', { class: 'text-2 text-gray-12 font-bold' }, title || ''),
    subtitle ? h('div', { class: 'finpri-help' }, subtitle) : null
  )
  const trigger = h('button', { class: 'finpri-disclosure-trigger', type: 'button', 'aria-expanded': defaultOpen ? 'true' : 'false' }, titleBlock, icon)
  const panel = h('div', { class: 'finpri-disclosure-panel', 'data-open': defaultOpen ? 'true' : 'false' }, ...[].concat(children))

  function setOpen(next) {
    const v = !!next
    trigger.setAttribute('aria-expanded', v ? 'true' : 'false')
    panel.setAttribute('data-open', v ? 'true' : 'false')
    try { window?.lucide?.createIcons?.() } catch {}
  }

  trigger.addEventListener('click', () => {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true'
    setOpen(!isOpen)
  })

  return { root: h('div', { class: 'finpri-disclosure' }, trigger, panel), setOpen, trigger, panel }
}

function parseFloatOrNull(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function parseIntOrNull(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

function parseLangList(text) {
  const raw = String(text ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return raw.length > 0 ? raw : null
}

function buildLangListFromLocale(locale) {
  const s = String(locale || '').trim()
  if (!s) return []
  const base = s.split('-')[0]?.trim()
  if (base && base !== s) return [s, base]
  return [s]
}

export function buildFingerprintModalBody(initial = {}) {

  // Safe-shell presets/guardrails: keep values plausible (avoid "12903 cores" or fractional nonsense).
  const ALLOWED_CPU_CORES = [1, 2, 4, 6, 8, 12, 16, 24, 32]
  const ALLOWED_DEVICE_MEMORY = [1, 2, 4, 8, 16, 32, 64]
  const ALLOWED_DPR = [1, 1.25, 1.5, 2]

  const name = TextField({ value: initial.name || '', placeholder: '例如：Facebook-01', size: 3 })

  const initialSettings = initial.settings || {}
  let advancedRoot = null
  let advancedFields = null

  {
    const geoTimezone = SelectField({ value: initial.timezone || '', size: 3, items: buildTimezoneItems(initial.timezone) })
    const geoLocale = SelectField({ value: initial.locale || '', size: 3, items: buildLanguageItems(initial.locale) })
    const geoTimezoneMode = SelectField({
      value: initialSettings.autoGeo === false ? 'fixed' : 'auto',
      size: 3,
      items: [
        { value: 'auto', label: '跟随代理包地区' },
        { value: 'fixed', label: '静态 · 固定此配置' },
      ]
    })
    const geoLocaleMode = SelectField({
      value: initialSettings.autoGeo !== false && initialSettings.autoLocale !== false && initialSettings.syncNavigatorLocale !== false ? 'auto' : 'fixed',
      size: 3,
      items: [
        { value: 'auto', label: '跟随代理包语言' },
        { value: 'fixed', label: '静态 · 固定此语言' },
      ]
    })
    const geoModeHint = h('div', { class: 'finpri-help', style: { gridColumn: '1 / -1' } }, '')
    const latitude = TextField({ value: initial.latitude != null ? String(initial.latitude) : '', placeholder: '可选', size: 3, type: 'number', step: '0.000001', min: '-90', max: '90' })
    const longitude = TextField({ value: initial.longitude != null ? String(initial.longitude) : '', placeholder: '可选', size: 3, type: 'number', step: '0.000001', min: '-180', max: '180' })

    const platformItems = [
      { value: '', label: '自动' },
      { value: 'windows', label: 'windows' },
      { value: 'mac', label: 'mac' },
      { value: 'linux', label: 'linux' }
    ]
    const targetPlatform = SelectField({ value: initial.targetPlatform || '', size: 3, items: platformItems })

    const settings = initialSettings
    const spoofUserAgent = Switch({ checked: settings.spoofUserAgent !== false, size: 2, accent: 'gray' })
    const spoofWebGL = Switch({ checked: settings.spoofWebGL === true, size: 2, accent: 'gray' })
    const spoofDeviceMemory = Switch({ checked: settings.spoofDeviceMemory === true, size: 2, accent: 'gray' })
    const allowCanvasNoise = Switch({ checked: settings.allowCanvasNoise === true, size: 2, accent: 'gray' })
    const allowAudioNoise = Switch({ checked: settings.allowAudioNoise === true, size: 2, accent: 'gray' })
    const syncNavigatorLocale = Switch({ checked: settings.syncNavigatorLocale !== false, size: 2, accent: 'gray' })
    const useHostScreen = Switch({ checked: settings.useHostScreen === true, size: 2, accent: 'gray' })

    const fp = initial.fingerprint || {}

	    const ua = TextAreaField({ value: fp?.navigator?.userAgent || '', placeholder: 'User-Agent', rows: 3, size: 3 })
	    ua.input.style.wordBreak = 'break-all'
	    ua.input.style.overflowWrap = 'break-word'
	    let navUnlocked = false
	    const navPlatform = TextField({ value: fp?.navigator?.platform || '', placeholder: '例如：Win32 / MacIntel / Linux x86_64', size: 3 })
	    const navLang = SelectField({ value: fp?.navigator?.language || '', size: 3, items: buildLanguageItems(fp?.navigator?.language) })
	    const navLangs = TextField({ value: Array.isArray(fp?.navigator?.languages) ? fp.navigator.languages.join(', ') : '', placeholder: '例如：en-US, en', size: 3 })

    function setBadge(badgeEl, enabled, options = {}) {
      if (!badgeEl) return
      const { on = '已开启', off = '已关闭', onAccent = 'grass', offAccent = 'gray' } = options
      badgeEl.textContent = enabled ? on : off
      badgeEl.setAttribute('data-accent-color', enabled ? onAccent : offAccent)
    }

	    const uaBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
	    const uaLockBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
	    const btnUnlockNav = Button({
	      variant: 'soft',
	      size: 1,
	      children: ['解锁手动编辑'],
	      onclick: async () => {
	        const ok = await confirmOkCancel(
	          '解锁手动编辑',
	          '默认已锁定 UA/Platform，避免手填出错。确认解锁后可以手动修改这些高风险字段（可能影响稳定性/掉分）。',
	          '确认解锁',
	          'tomato'
	        )
	        if (!ok) return
	        navUnlocked = true
	        syncAdvancedToggles()
	      }
	    })
	    const btnLockNav = Button({
	      variant: 'soft',
	      size: 1,
	      children: ['重新锁定'],
	      onclick: () => {
	        navUnlocked = false
	        syncAdvancedToggles()
	      }
	    })
	    const uaToggleRow = h(
	      'div',
	      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
	      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, 'UA 覆盖'), uaBadge, uaLockBadge),
	      h('div', { class: 'flex items-center gap-2' }, btnUnlockNav, btnLockNav, spoofUserAgent.root)
	    )
    const uaHintText = h('div', { class: 'finpri-help' }, '')
    const uaHintRow = h('div', { style: { gridColumn: '1 / -1' } }, uaHintText)
    const uaRow = h('div', { style: { gridColumn: '1 / -1' } }, h('div', { class: 'finpri-help' }, 'User-Agent'), ua.root)

    function setTextFieldDisabled(field, disabled) {
      const d = !!disabled
      try { field.input.disabled = d } catch {}
      if (d) field.root.setAttribute('data-disabled', 'true')
      else field.root.removeAttribute('data-disabled')
    }

    function setSelectFieldDisabled(field, disabled) {
      const d = !!disabled
      try { field.trigger.disabled = d } catch {}
      try {
        if (d) field.trigger.setAttribute('data-disabled', 'true')
        else field.trigger.removeAttribute('data-disabled')
      } catch {}
    }

    function maybeSyncNavigatorLocale() {
      const enabled = syncNavigatorLocale.button.getAttribute('aria-checked') === 'true'
      const locale = String(geoLocale.select.value || '').trim()
      if (!enabled || !locale) return
      navLang.setValue(locale)
      navLangs.input.value = buildLangListFromLocale(locale).join(', ')
    }

    function updateGeoModeUi() {
      const timezoneAuto = geoTimezoneMode.select.value === 'auto'
      if (!timezoneAuto && geoLocaleMode.select.value === 'auto') geoLocaleMode.setValue('fixed')
      const localeAuto = timezoneAuto && geoLocaleMode.select.value === 'auto'
      setSelectFieldDisabled(geoTimezone, timezoneAuto)
      setSelectFieldDisabled(geoLocale, localeAuto)
      setSelectFieldDisabled(geoLocaleMode, !timezoneAuto)
      geoModeHint.textContent = localeAuto
        ? '启动时读取代理包保存的地区与语言。'
        : timezoneAuto
          ? '时区读取代理包，语言固定为下方 Locale。'
          : '静态模式：时区与语言固定，不会因代理出口变化而改动。'
    }

    const navLangHelp = h('div', { class: 'finpri-help' }, 'Language')
    const navLangsHelp = h('div', { class: 'finpri-help' }, 'Languages（逗号分隔）')
    const navLangRow = h('div', {}, navLangHelp, navLang.root)
    const navLangsRow = h('div', { style: { gridColumn: '1 / -1' } }, navLangsHelp, navLangs.root)
    const navSyncBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
    const navSyncRow = h(
      'div',
      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, '同步 Locale→Navigator'), navSyncBadge),
      syncNavigatorLocale.root
    )
    const navSyncHintText = h('div', { class: 'finpri-help' }, '')
    const navSyncHintRow = h('div', { style: { gridColumn: '1 / -1' } }, navSyncHintText)

    function updateNavLocaleLock() {
      const enabled = syncNavigatorLocale.button.getAttribute('aria-checked') === 'true'
      const locale = String(geoLocale.select.value || '').trim()

      // When "sync" is enabled, Navigator language/languages are derived from Locale and not meant to be edited here.
      setSelectFieldDisabled(navLang, enabled)
      setTextFieldDisabled(navLangs, enabled)
      navLangsHelp.textContent = enabled ? 'Languages（自动：由 Locale 推导）' : 'Languages（逗号分隔）'
      setBadge(navSyncBadge, enabled)
      navSyncHintText.textContent = enabled
        ? (locale ? `当前：Language/Languages 由 Locale=${locale} 推导` : '当前：Language/Languages 自动从 Locale 推导')
        : ''
      navSyncHintRow.style.display = enabled ? '' : 'none'
      navLangRow.style.display = enabled ? 'none' : ''
      navLangsRow.style.display = enabled ? 'none' : ''

      if (enabled && locale) {
        navLang.setValue(locale)
        navLangs.input.value = buildLangListFromLocale(locale).join(', ')
      }
    }

    // Populate `Languages` when a `Language` preset is chosen.
    try {
      navLang.select.addEventListener('change', () => {
        const v = String(navLang.select.value || '').trim()
        if (!v) return
        navLangs.input.value = buildLangListFromLocale(v).join(', ')
      })
    } catch {}

    // Keep Navigator.* aligned when "sync" is enabled and locale changes.
    try {
      geoLocale.select.addEventListener('change', () => {
        if (String(geoLocale.select.value || '').trim() === '') detectAndApplyGeo()
        updateNavLocaleLock()
        maybeSyncNavigatorLocale()
      })
    } catch {}
    try {
      syncNavigatorLocale.button.addEventListener('click', () => {
        updateNavLocaleLock()
        maybeSyncNavigatorLocale()
      })
    } catch {}
    try {
      geoTimezoneMode.select.addEventListener('change', () => {
        if (geoTimezoneMode.select.value !== 'auto') geoLocaleMode.setValue('fixed')
        updateGeoModeUi()
        updateNavLocaleLock()
        maybeSyncNavigatorLocale()
      })
      geoLocaleMode.select.addEventListener('change', () => {
        if (geoLocaleMode.select.value === 'auto' && syncNavigatorLocale.button.getAttribute('aria-checked') !== 'true') {
          syncNavigatorLocale.setChecked(true)
        }
        updateGeoModeUi()
        updateNavLocaleLock()
        maybeSyncNavigatorLocale()
      })
    } catch {}
    try {
      geoTimezone.select.addEventListener('change', () => {
        if (String(geoTimezone.select.value || '').trim() === '') detectAndApplyGeo()
      })
    } catch {}
    updateGeoModeUi()
    updateNavLocaleLock()
    maybeSyncNavigatorLocale()

    // If `Languages` is empty, initialize it from the selected language.
    if (!String(navLangs.input.value || '').trim()) {
      const v = String(navLang.select.value || '').trim()
      if (v) navLangs.input.value = buildLangListFromLocale(v).join(', ')
    }

    const screenPresets = [
      { value: '', label: '不改（保留当前）' },
      { value: '1366x768@1', label: '1366×768 @1' },
      { value: '1536x864@1.25', label: '1080p@125%（1536×864 @1.25）' },
      { value: '1707x960@1.5', label: '1440p@150%（1707×960 @1.5）' },
      { value: '2048x1152@1.25', label: '1440p@125%（2048×1152 @1.25）' },
      { value: '1920x1080@1', label: '1920×1080 @1' },
      { value: '2560x1440@1', label: '2560×1440 @1' },
      { value: '3840x2160@1', label: '3840×2160 @1' },
    ]
    const screenPreset = SelectField({ value: '', size: 3, items: screenPresets })

    const hwPresets = [
      { value: '', label: '不改（保留当前）' },
      { value: '2c4g0t', label: '2线程 / 4GiB / 0触控' },
      { value: '4c8g0t', label: '4线程 / 8GiB / 0触控' },
      { value: '6c16g0t', label: '6线程 / 16GiB / 0触控' },
      { value: '8c16g0t', label: '8线程 / 16GiB / 0触控' },
      { value: '8c32g0t', label: '8线程 / 32GiB / 0触控' },
      { value: '4c8g5t', label: '4线程 / 8GiB / 5触控' },
    ]
    const hwPreset = SelectField({ value: '', size: 3, items: hwPresets })

    const scrW = TextField({ value: String(fp?.screen?.width ?? ''), placeholder: 'width', size: 3, type: 'number', step: '1' })
    const scrH = TextField({ value: String(fp?.screen?.height ?? ''), placeholder: 'height', size: 3, type: 'number', step: '1' })
    const scrAw = TextField({ value: String(fp?.screen?.availWidth ?? ''), placeholder: 'availWidth', size: 3, type: 'number', step: '1' })
    const scrAh = TextField({ value: String(fp?.screen?.availHeight ?? ''), placeholder: 'availHeight', size: 3, type: 'number', step: '1' })
    const scrDpr = TextField({ value: String(fp?.screen?.devicePixelRatio ?? ''), placeholder: 'dpr', size: 3, type: 'number', step: '0.25', min: '0.5', max: '6' })
    const scrCd = TextField({ value: String(fp?.screen?.colorDepth ?? ''), placeholder: 'colorDepth', size: 3, type: 'number', step: '1', min: '1', max: '128' })
    const scrPd = TextField({ value: String(fp?.screen?.pixelDepth ?? ''), placeholder: 'pixelDepth', size: 3, type: 'number', step: '1', min: '1', max: '128' })

    const hwCores = SelectField({
      value: String(fp?.hardware?.cpuCores ?? ''),
      size: 3,
      items: [{ value: '', label: '—' }].concat(ALLOWED_CPU_CORES.map((n) => ({ value: String(n), label: String(n) })))
    })
    const hwMem = SelectField({
      value: String(fp?.hardware?.deviceMemory ?? ''),
      size: 3,
      items: [{ value: '', label: '—' }].concat(ALLOWED_DEVICE_MEMORY.map((n) => ({ value: String(n), label: String(n) })))
    })
    const hwTouch = SelectField({
      value: String(fp?.hardware?.maxTouchPoints ?? ''),
      size: 3,
      items: [
        { value: '', label: '—' },
        { value: '0', label: '0' },
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '5', label: '5' },
        { value: '10', label: '10' }
      ]
    })

    const memBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
    const memToggleRow = h(
      'div',
      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, 'deviceMemory 覆盖'), memBadge),
      spoofDeviceMemory.root
    )
    const memHintText = h('div', { class: 'finpri-help' }, '')
    const memHintRow = h('div', { style: { gridColumn: '1 / -1' } }, memHintText)
    const hwMemRow = h('div', {}, h('div', { class: 'finpri-help' }, 'deviceMemory（GiB）'), hwMem.root)

    const webglPresets = [
      { value: '', label: '不改（保留当前）' },
      { value: 'intel-uhd-620', label: 'Intel UHD 620 (D3D11)' },
      { value: 'intel-xe', label: 'Intel Iris Xe (D3D11)' },
      { value: 'nvidia-gtx-1660', label: 'NVIDIA GTX 1660 (D3D11)' },
      { value: 'amd-rx-580', label: 'AMD RX 580 (D3D11)' },
    ]
    const webglPreset = SelectField({ value: '', size: 3, items: webglPresets })

    const webglVendor = TextField({ value: fp?.webgl?.vendor || '', placeholder: 'vendor', size: 3 })
    const webglRenderer = TextField({ value: fp?.webgl?.renderer || '', placeholder: 'renderer', size: 3 })
    const webglUv = TextField({ value: fp?.webgl?.unmaskedVendor || '', placeholder: 'unmaskedVendor', size: 3 })
    const webglUr = TextField({ value: fp?.webgl?.unmaskedRenderer || '', placeholder: 'unmaskedRenderer', size: 3 })
    const webglBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
    const webglToggleRow = h(
      'div',
      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, 'WebGL 覆盖'), webglBadge),
      spoofWebGL.root
    )
    const webglHintText = h('div', { class: 'finpri-help' }, '')
    const webglHintRow = h('div', { style: { gridColumn: '1 / -1' } }, webglHintText)
    const webglPresetRow = h(
      'div',
      { style: { gridColumn: '1 / -1' } },
      h('div', { class: 'finpri-help' }, 'WebGL 预设（选择会填充下方 4 项）'),
      webglPreset.root
    )
    const webglVendorRow = h('div', {}, h('div', { class: 'finpri-help' }, 'vendor'), webglVendor.root)
    const webglRendererRow = h('div', {}, h('div', { class: 'finpri-help' }, 'renderer'), webglRenderer.root)
    const webglUvRow = h('div', {}, h('div', { class: 'finpri-help' }, 'unmaskedVendor'), webglUv.root)
    const webglUrRow = h('div', {}, h('div', { class: 'finpri-help' }, 'unmaskedRenderer'), webglUr.root)
    const webglDetailRows = [webglVendorRow, webglRendererRow, webglUvRow, webglUrRow]

    const canvasSeed = TextField({ value: String(fp?.canvas?.noiseSeed ?? ''), placeholder: 'noiseSeed', size: 3, type: 'number', step: '1', min: '0' })
    const canvasInt = TextField({ value: String(fp?.canvas?.noiseIntensity ?? ''), placeholder: 'noiseIntensity (0-1)', size: 3, type: 'number', step: '0.01', min: '0', max: '1' })
    const audioSeed = TextField({ value: String(fp?.audio?.noiseSeed ?? ''), placeholder: 'noiseSeed', size: 3, type: 'number', step: '1', min: '0' })
    const audioInt = TextField({ value: String(fp?.audio?.noiseIntensity ?? ''), placeholder: 'noiseIntensity (0-1)', size: 3, type: 'number', step: '0.0001', min: '0', max: '1' })

    function rerollSeed(field) {
      field.input.value = String(randomSeed31())
      field.input.dispatchEvent(new Event('input', { bubbles: true }))
      field.input.dispatchEvent(new Event('change', { bubbles: true }))
      field.input.focus?.()
      field.input.select?.()
    }

    ;[canvasSeed.root, audioSeed.root].forEach((el) => {
      el.style.flex = '1'
      el.style.minWidth = '0'
    })

    const canvasSeedReroll = IconButton({ icon: 'refresh-cw', size: 2, title: '随机重掷 Canvas seed', onclick: () => rerollSeed(canvasSeed) })
    const audioSeedReroll = IconButton({ icon: 'refresh-cw', size: 2, title: '随机重掷 Audio seed', onclick: () => rerollSeed(audioSeed) })
    const canvasSeedRow = h('div', {}, h('div', { class: 'finpri-help' }, 'Canvas seed'), h('div', { class: 'flex items-center gap-2' }, canvasSeed.root, canvasSeedReroll))
    const audioSeedRow = h('div', {}, h('div', { class: 'finpri-help' }, 'Audio seed'), h('div', { class: 'flex items-center gap-2' }, audioSeed.root, audioSeedReroll))

    const canvasBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
    const canvasToggleRow = h(
      'div',
      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, 'Canvas Noise'), canvasBadge),
      allowCanvasNoise.root
    )
    const audioBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
    const audioToggleRow = h(
      'div',
      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, 'Audio Noise'), audioBadge),
      allowAudioNoise.root
    )
    const canvasHintText = h('div', { class: 'finpri-help' }, '')
    const canvasHintRow = h('div', { style: { gridColumn: '1 / -1' } }, canvasHintText)
    const audioHintText = h('div', { class: 'finpri-help' }, '')
    const audioHintRow = h('div', { style: { gridColumn: '1 / -1' } }, audioHintText)
    const canvasIntRow = h('div', {}, h('div', { class: 'finpri-help' }, 'Canvas intensity'), canvasInt.root)
    const audioIntRow = h('div', {}, h('div', { class: 'finpri-help' }, 'Audio intensity'), audioInt.root)

    const secMeta = h('div', { class: 'finpri-adv-section' },
      h('div', { class: 'text-2 text-gray-12 font-bold' }, 'Geo / 平台'),
      h('div', { class: 'finpri-adv-grid' },
        h('div', {}, h('div', { class: 'finpri-help' }, 'Target Platform'), targetPlatform.root),
        h('div', {}, h('div', { class: 'finpri-help' }, '时区模式'), geoTimezoneMode.root),
        h('div', {}, h('div', { class: 'finpri-help' }, '语言模式'), geoLocaleMode.root),
        h('div', {}, h('div', { class: 'finpri-help' }, 'Timezone'), geoTimezone.root),
        h('div', {}, h('div', { class: 'finpri-help' }, 'Locale'), geoLocale.root),
        geoModeHint,
        h('div', {}, h('div', { class: 'finpri-help' }, 'Latitude'), latitude.root),
        h('div', {}, h('div', { class: 'finpri-help' }, 'Longitude'), longitude.root),
      )
    )

    const secNav = h('div', { class: 'finpri-adv-section' },
      h('div', { class: 'text-2 text-gray-12 font-bold' }, 'Navigator'),
      h('div', { class: 'finpri-adv-grid' },
        uaToggleRow,
        uaHintRow,
        uaRow,
        h('div', {}, h('div', { class: 'finpri-help' }, 'Platform'), navPlatform.root),
        navSyncRow,
        navSyncHintRow,
        navLangRow,
        navLangsRow,
      )
    )

    const screenHostBadge = Badge({ text: '—', accent: 'gray', variant: 'soft', size: 1 })
    const screenHostRow = h(
      'div',
      { style: { gridColumn: '1 / -1' }, class: 'flex items-center justify-between gap-2' },
      h('div', { class: 'flex items-center gap-2' }, h('div', { class: 'finpri-help' }, '跟随本机屏幕'), screenHostBadge),
      useHostScreen.root
    )
    const screenHostHintText = h('div', { class: 'finpri-help' }, '')
    const screenHostHintRow = h('div', { style: { gridColumn: '1 / -1' } }, screenHostHintText)
    const screenPresetRow = h('div', { style: { gridColumn: '1 / -1' } }, h('div', { class: 'finpri-help' }, '屏幕预设'), screenPreset.root)
    const scrWRow = h('div', {}, h('div', { class: 'finpri-help' }, 'width'), scrW.root)
    const scrHRow = h('div', {}, h('div', { class: 'finpri-help' }, 'height'), scrH.root)
    const scrAwRow = h('div', {}, h('div', { class: 'finpri-help' }, 'availWidth'), scrAw.root)
    const scrAhRow = h('div', {}, h('div', { class: 'finpri-help' }, 'availHeight'), scrAh.root)
    const scrDprRow = h('div', {}, h('div', { class: 'finpri-help' }, 'devicePixelRatio'), scrDpr.root)
    const scrCdRow = h('div', {}, h('div', { class: 'finpri-help' }, 'colorDepth'), scrCd.root)
    const scrPdRow = h('div', {}, h('div', { class: 'finpri-help' }, 'pixelDepth'), scrPd.root)
    const screenRows = [screenPresetRow, scrWRow, scrHRow, scrAwRow, scrAhRow, scrDprRow, scrCdRow, scrPdRow]

    const secScreen = h('div', { class: 'finpri-adv-section' },
      h('div', { class: 'text-2 text-gray-12 font-bold' }, 'Screen'),
      h('div', { class: 'finpri-adv-grid' },
        screenHostRow,
        screenHostHintRow,
        screenPresetRow,
        scrWRow,
        scrHRow,
        scrAwRow,
        scrAhRow,
        scrDprRow,
        scrCdRow,
        scrPdRow,
      )
    )

    const secHw = h('div', { class: 'finpri-adv-section' },
      h('div', { class: 'text-2 text-gray-12 font-bold' }, 'Hardware'),
      h('div', { class: 'finpri-adv-grid' },
        memToggleRow,
        memHintRow,
        h('div', { style: { gridColumn: '1 / -1' } }, h('div', { class: 'finpri-help' }, '硬件预设（会填充 cpu/deviceMemory/touch；deviceMemory 需开启覆盖才生效）'), hwPreset.root),
        h('div', {}, h('div', { class: 'finpri-help' }, 'cpuCores（线程数）'), hwCores.root),
        hwMemRow,
        h('div', {}, h('div', { class: 'finpri-help' }, 'maxTouchPoints'), hwTouch.root),
      )
    )

    const secWebgl = h('div', { class: 'finpri-adv-section' },
      h('div', { class: 'text-2 text-gray-12 font-bold' }, 'WebGL'),
      h('div', { class: 'finpri-adv-grid' },
        webglToggleRow,
        webglHintRow,
        webglPresetRow,
        webglVendorRow,
        webglRendererRow,
        webglUvRow,
        webglUrRow,
      )
    )

    const secNoise = h('div', { class: 'finpri-adv-section' },
      h('div', { class: 'text-2 text-gray-12 font-bold' }, 'Canvas / Audio'),
      h('div', { class: 'finpri-adv-grid' },
        canvasSeedRow,
        canvasToggleRow,
        canvasHintRow,
        canvasIntRow,
        audioSeedRow,
        audioToggleRow,
        audioHintRow,
        audioIntRow,
      )
    )

	    const disclosure = buildDisclosure({
	      title: '高级指纹（可编辑）',
	      subtitle: '提示：修改高风险项（UA/WebGL/RAM/Noise）可能掉分；建议只在你明确需要时开启对应开关。',
	      defaultOpen: false,
	      children: [secMeta, secNav, secScreen, secHw, secWebgl, secNoise]
	    })

    advancedRoot = disclosure.root
    advancedFields = {
      geoTimezone,
      geoLocale,
      geoTimezoneMode,
      geoLocaleMode,
      geoModeHint,
      latitude,
      longitude,
      targetPlatform,
      spoofUserAgent,
      spoofWebGL,
      spoofDeviceMemory,
      allowCanvasNoise,
      allowAudioNoise,
      syncNavigatorLocale,
      useHostScreen,
      ua,
      navPlatform,
      navLang,
      navLangs,
      screenPreset,
      scrW,
      scrH,
      scrAw,
      scrAh,
      scrDpr,
      scrCd,
      scrPd,
      hwPreset,
      hwCores,
      hwMem,
      hwTouch,
      webglPreset,
      webglVendor,
      webglRenderer,
      webglUv,
      webglUr,
      canvasSeed,
      canvasInt,
      audioSeed,
      audioInt,
    }

    function setFieldDisabled(field, disabled) {
      const d = !!disabled
      const el = field?.input || field?.trigger || field?.select
      if (!el) return
      try { el.disabled = d } catch {}
      if (d) el.setAttribute?.('disabled', 'true')
      else el.removeAttribute?.('disabled')
    }

	    function syncAdvancedToggles() {
	      const uaOn = spoofUserAgent.button.getAttribute('aria-checked') === 'true'
	      if (!uaOn) navUnlocked = false
	      setFieldDisabled(ua, !uaOn || !navUnlocked)
	      setFieldDisabled(navPlatform, !uaOn || !navUnlocked)
	      setBadge(uaBadge, uaOn)
	      setBadge(uaLockBadge, uaOn ? !navUnlocked : false, { on: '已锁定', off: '可编辑', onAccent: 'gray', offAccent: 'grass' })
	      btnUnlockNav.style.display = uaOn && !navUnlocked ? '' : 'none'
	      btnLockNav.style.display = uaOn && navUnlocked ? '' : 'none'
	      uaHintText.textContent = uaOn ? (navUnlocked ? '' : '当前：UA/Platform 已锁定（推荐）；如需手动修改请先解锁') : '当前：浏览器默认 UA'
	      uaHintRow.style.display = uaOn ? (navUnlocked ? 'none' : '') : ''
	      uaRow.style.display = uaOn ? '' : 'none'

      const webglOn = spoofWebGL.button.getAttribute('aria-checked') === 'true'
      setBadge(webglBadge, webglOn)
      setFieldDisabled(webglPreset, !webglOn)
      setFieldDisabled(webglVendor, !webglOn)
      setFieldDisabled(webglRenderer, !webglOn)
      setFieldDisabled(webglUv, !webglOn)
      setFieldDisabled(webglUr, !webglOn)
      webglHintText.textContent = webglOn ? '' : '当前：本机 WebGL（原生）'
      webglHintRow.style.display = webglOn ? 'none' : ''
      webglPresetRow.style.display = webglOn ? '' : 'none'
      webglDetailRows.forEach((row) => {
        row.style.display = webglOn ? '' : 'none'
      })

      const memOn = spoofDeviceMemory.button.getAttribute('aria-checked') === 'true'
      setFieldDisabled(hwMem, !memOn)
      setBadge(memBadge, memOn)
      memHintText.textContent = memOn ? '' : '当前：deviceMemory 使用原生值'
      memHintRow.style.display = memOn ? 'none' : ''
      hwMemRow.style.display = memOn ? '' : 'none'

      const canvasOn = allowCanvasNoise.button.getAttribute('aria-checked') === 'true'
      setFieldDisabled(canvasInt, !canvasOn)
      setBadge(canvasBadge, canvasOn)
      canvasHintText.textContent = canvasOn ? '' : '当前：Canvas Noise 关闭（intensity=0）'
      canvasHintRow.style.display = canvasOn ? 'none' : ''
      canvasIntRow.style.display = canvasOn ? '' : 'none'

      const audioOn = allowAudioNoise.button.getAttribute('aria-checked') === 'true'
      setFieldDisabled(audioInt, !audioOn)
      setBadge(audioBadge, audioOn)
      audioHintText.textContent = audioOn ? '' : '当前：Audio Noise 关闭（intensity=0）'
      audioHintRow.style.display = audioOn ? 'none' : ''
      audioIntRow.style.display = audioOn ? '' : 'none'

      const hostOn = useHostScreen.button.getAttribute('aria-checked') === 'true'
      setBadge(screenHostBadge, hostOn, { on: '本机', off: '固定伪装', onAccent: 'gray', offAccent: 'grass' })
      screenHostHintText.textContent = hostOn
        ? '当前：启动时读取本机屏幕/DPR（下方手动参数不生效；换屏/改系统缩放会改变这部分指纹）'
        : '使用配置内固定的屏幕尺寸与缩放比例，重启保持一致。'
      screenHostHintRow.style.display = ''
      screenRows.forEach((row) => { row.style.display = hostOn ? 'none' : '' })
      ;[screenPreset, scrW, scrH, scrAw, scrAh, scrDpr, scrCd, scrPd].forEach((f) => setFieldDisabled(f, hostOn))
    }

    ;[spoofUserAgent.button, spoofWebGL.button, spoofDeviceMemory.button, allowCanvasNoise.button, allowAudioNoise.button, useHostScreen.button].forEach((btn) => {
      btn.addEventListener('click', () => syncAdvancedToggles())
    })
    syncAdvancedToggles()

    screenPreset.select.addEventListener('change', () => {
      const v = String(screenPreset.select.value || '')
      if (!v) return
      const m = v.match(/^(\\d+)x(\\d+)@(\\d+(?:\\.\\d+)?)$/)
      if (!m) return
      const w = Number.parseInt(m[1], 10)
      const h = Number.parseInt(m[2], 10)
      const dpr = Number.parseFloat(m[3])
      if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(dpr)) return
      scrW.input.value = String(w)
      scrH.input.value = String(h)
      scrAw.input.value = String(w)
      scrAh.input.value = String(Math.max(240, h - 40))
      scrDpr.input.value = String(dpr)
      if (!scrCd.input.value.trim()) scrCd.input.value = '24'
      if (!scrPd.input.value.trim()) scrPd.input.value = '24'
    })

    hwPreset.select.addEventListener('change', () => {
      const v = String(hwPreset.select.value || '')
      if (!v) return
      const m = v.match(/^(\\d+)c(\\d+)g(\\d+)t$/)
      if (!m) return
      hwCores.setValue(String(Number.parseInt(m[1], 10)))
      hwMem.setValue(String(Number.parseInt(m[2], 10)))
      hwTouch.setValue(String(Number.parseInt(m[3], 10)))
    })

    webglPreset.select.addEventListener('change', () => {
      const v = String(webglPreset.select.value || '')
      if (!v) return
      if (spoofWebGL.button.getAttribute('aria-checked') !== 'true') {
        spoofWebGL.setChecked(true)
        syncAdvancedToggles()
      }
      const presets = {
        'intel-uhd-620': {
          vendor: 'Google Inc.',
          renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
          unmaskedVendor: 'Intel Inc.',
          unmaskedRenderer: 'Intel(R) UHD Graphics 620'
        },
        'intel-xe': {
          vendor: 'Google Inc.',
          renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
          unmaskedVendor: 'Intel Inc.',
          unmaskedRenderer: 'Intel(R) Iris(R) Xe Graphics'
        },
        'nvidia-gtx-1660': {
          vendor: 'Google Inc.',
          renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)',
          unmaskedVendor: 'NVIDIA Corporation',
          unmaskedRenderer: 'NVIDIA GeForce GTX 1660'
        },
        'amd-rx-580': {
          vendor: 'Google Inc.',
          renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)',
          unmaskedVendor: 'ATI Technologies Inc.',
          unmaskedRenderer: 'AMD Radeon RX 580 Series'
        }
      }
      const p = presets[v]
      if (!p) return
      webglVendor.input.value = p.vendor
      webglRenderer.input.value = p.renderer
      webglUv.input.value = p.unmaskedVendor
      webglUr.input.value = p.unmaskedRenderer
    })
  }

  const body = h(
    'div',
    { class: 'console-stack' },
    h('div', { class: 'finpri-modal-grid' },
      h('div', { style: { gridColumn: '1 / -1' } }, h('div', { class: 'finpri-help' }, '名称'), name.root)),
    advancedRoot
  )

  function getValue() {
    const out = {
      name: name.input.value.trim(),
      timezone: undefined,
      locale: undefined,
      latitude: undefined,
      longitude: undefined,
      targetPlatform: undefined,
      fingerprint: undefined,
      settings: undefined,
      errors: []
    }

    if (advancedFields) {
      out.timezone = advancedFields.geoTimezone.select.value.trim() || undefined
      out.locale = advancedFields.geoLocale.select.value.trim() || undefined
      out.latitude = parseFloatOrNull(advancedFields.latitude.input.value)
      out.longitude = parseFloatOrNull(advancedFields.longitude.input.value)
      if (out.latitude !== null && (out.latitude < -90 || out.latitude > 90)) out.errors.push('Latitude 范围无效')
      if (out.longitude !== null && (out.longitude < -180 || out.longitude > 180)) out.errors.push('Longitude 范围无效')

      const tp = advancedFields.targetPlatform.select.value.trim()
      out.targetPlatform = tp ? tp : null

      const autoGeo = advancedFields.geoTimezoneMode.select.value === 'auto'
      const autoLocale = autoGeo && advancedFields.geoLocaleMode.select.value === 'auto'

      const settings = {
        spoofUserAgent: advancedFields.spoofUserAgent.button.getAttribute('aria-checked') === 'true',
        spoofWebGL: advancedFields.spoofWebGL.button.getAttribute('aria-checked') === 'true',
        spoofDeviceMemory: advancedFields.spoofDeviceMemory.button.getAttribute('aria-checked') === 'true',
        allowCanvasNoise: advancedFields.allowCanvasNoise.button.getAttribute('aria-checked') === 'true',
        allowAudioNoise: advancedFields.allowAudioNoise.button.getAttribute('aria-checked') === 'true',
        syncNavigatorLocale: advancedFields.syncNavigatorLocale.button.getAttribute('aria-checked') === 'true',
        useHostScreen: advancedFields.useHostScreen.button.getAttribute('aria-checked') === 'true',
        autoGeo,
        autoLocale,
      }
      out.settings = settings

      const width = parseIntOrNull(advancedFields.scrW.input.value)
      const height = parseIntOrNull(advancedFields.scrH.input.value)
      const availWidth = parseIntOrNull(advancedFields.scrAw.input.value)
      const availHeight = parseIntOrNull(advancedFields.scrAh.input.value)
      const dpr = parseFloatOrNull(advancedFields.scrDpr.input.value)
      const colorDepth = parseIntOrNull(advancedFields.scrCd.input.value)
      const pixelDepth = parseIntOrNull(advancedFields.scrPd.input.value)
      const cpuCores = parseIntOrNull(advancedFields.hwCores.select.value)
      const deviceMemory = parseFloatOrNull(advancedFields.hwMem.select.value)
      const maxTouchPoints = parseIntOrNull(advancedFields.hwTouch.select.value)
      const canvasSeed = parseIntOrNull(advancedFields.canvasSeed.input.value)
      const canvasIntensity = parseFloatOrNull(advancedFields.canvasInt.input.value)
      const audioSeed = parseIntOrNull(advancedFields.audioSeed.input.value)
      const audioIntensity = parseFloatOrNull(advancedFields.audioInt.input.value)

      const uaValue = advancedFields.ua.input.value.trim()
      const navPlatformValue = advancedFields.navPlatform.input.value.trim()
      const navLangValue = advancedFields.navLang.select.value.trim()
      const languages = parseLangList(advancedFields.navLangs.input.value)

      if (settings.spoofUserAgent && !uaValue) out.errors.push('UA 覆盖已开启，但 UA 为空')
      if (!languages) out.errors.push('Navigator.languages 不能为空（逗号分隔）')

      if (!width || !height || !availWidth || !availHeight) out.errors.push('Screen 参数不完整（width/height/availWidth/availHeight）')
      if (!dpr) out.errors.push('devicePixelRatio 必须为数字')
      if (dpr && !ALLOWED_DPR.includes(dpr)) out.errors.push(`devicePixelRatio 不合理（建议：${ALLOWED_DPR.join(', ')}）`)

      if (!cpuCores) out.errors.push('cpuCores 必须为数字')
      if (cpuCores && !ALLOWED_CPU_CORES.includes(cpuCores)) out.errors.push(`cpuCores 不合理（建议：${ALLOWED_CPU_CORES.join(', ')}）`)

      if (settings.spoofDeviceMemory) {
        if (deviceMemory === null) out.errors.push('deviceMemory 覆盖已开启，但 deviceMemory 为空')
        if (deviceMemory !== null && deviceMemory !== 0 && !ALLOWED_DEVICE_MEMORY.includes(deviceMemory)) out.errors.push(`deviceMemory 不合理（建议：${ALLOWED_DEVICE_MEMORY.join(', ')}）`)
      }

      if (maxTouchPoints === null) out.errors.push('maxTouchPoints 必须为数字')
      if (canvasSeed === null || canvasIntensity === null) out.errors.push('Canvas noise 参数不完整')
      if (audioSeed === null || audioIntensity === null) out.errors.push('Audio noise 参数不完整')

      const fpOut = {
        navigator: {
          userAgent: uaValue,
          platform: navPlatformValue,
          language: navLangValue,
          languages: languages || []
        },
        screen: {
          width: width || 0,
          height: height || 0,
          availWidth: availWidth || 0,
          availHeight: availHeight || 0,
          devicePixelRatio: dpr || 1,
          colorDepth: colorDepth || 24,
          pixelDepth: pixelDepth || 24
        },
        hardware: {
          cpuCores: cpuCores || 1,
          deviceMemory: deviceMemory == null ? 0 : deviceMemory,
          maxTouchPoints: maxTouchPoints == null ? 0 : maxTouchPoints
        },
        webgl: {
          vendor: advancedFields.webglVendor.input.value.trim(),
          renderer: advancedFields.webglRenderer.input.value.trim(),
          unmaskedVendor: advancedFields.webglUv.input.value.trim(),
          unmaskedRenderer: advancedFields.webglUr.input.value.trim()
        },
        canvas: {
          noiseSeed: canvasSeed == null ? 0 : canvasSeed,
          noiseIntensity: canvasIntensity == null ? 0 : canvasIntensity
        },
        audio: {
          noiseSeed: audioSeed == null ? 0 : audioSeed,
          noiseIntensity: audioIntensity == null ? 0 : audioIntensity
        }
      }

      const shouldSync = settings.syncNavigatorLocale && out.locale
      if (shouldSync) {
        const base = String(out.locale).split('-')[0]?.trim()
        fpOut.navigator.language = out.locale
        fpOut.navigator.languages = base && base !== out.locale ? [out.locale, base] : [out.locale]
      }

      if (!settings.allowCanvasNoise) fpOut.canvas.noiseIntensity = 0
      if (!settings.allowAudioNoise) fpOut.audio.noiseIntensity = 0

      out.fingerprint = fpOut
    }
    return out
  }

  return { body, getValue }
}
