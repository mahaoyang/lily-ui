import { h } from '../lib/dom.js'
import { Button, SelectField } from './ui.js'
import { openModal } from './modal.js'
import { apiFetch } from '../../../adapters/browser/browser-manager/client.js'
import { buildLanguageItems, buildTimezoneItems } from '../../../headless/browser-manager/geo-options.js'
import { countryItems, cityItems } from '../../../headless/browser-manager/region-options.js'

export function editGeo(node, refresh) {
  const timezone = SelectField({ value: node.geo?.timezone || '', items: buildTimezoneItems(node.geo?.timezone), placeholder: '筛选时区…' })
  const locale = SelectField({ value: node.geo?.locale || '', items: [{ value: '', label: '按时区匹配语言' }, ...buildLanguageItems(node.geo?.locale)], placeholder: '按时区匹配语言' })
  const country = SelectField({ value: node.geo?.countryCode || '', items: countryItems(node.geo?.countryCode), placeholder: '搜索国家、名称或代码…' })
  country.select.setAttribute('aria-label', '国家或地区')
  let city
  const cityHolder = h('div', {})
  const syncCity = (current = '') => {
    city = SelectField({ value: current, items: cityItems(country.select.value, current), disabled: !country.select.value, placeholder: '选择主要城市…' })
    city.select.setAttribute('aria-label', '主要城市')
    cityHolder.replaceChildren(city.root)
    city.select.addEventListener('change', () => {
      const item = cityItems(country.select.value).find(item => item.value === city.select.value)
      if (item?.timezone) {
        if (!Array.from(timezone.select.options).some(option => option.value === item.timezone)) timezone.select.append(h('option', { value: item.timezone }, item.timezone))
        if (timezone.select.tomselect && !timezone.select.tomselect.options[item.timezone]) timezone.select.tomselect.addOption({ value: item.timezone, text: item.timezone })
        timezone.setValue(item.timezone)
      }
    })
  }
  syncCity(node.geo?.city || '')
  country.select.addEventListener('change', () => { syncCity(); timezone.setValue('') })
  const status = h('p', { class: 'privacy-caption', role: 'status' })
  const modal = openModal({ title: `${node.name} · 预置地区`, closeOnEscape: true, body: h('div', { class: 'console-stack' },
    h('p', { class: 'privacy-caption' }, '保存后环境直接使用；以后重检测成功会覆盖，失败保留原值。'),
    h('div', { class: 'settings-grid' },
      h('label', { class: 'settings-field' }, h('span', {}, '国家或地区'), country.root),
      h('label', { class: 'settings-field' }, h('span', {}, '主要城市'), cityHolder),
      h('label', { class: 'settings-field' }, h('span', {}, '时区'), timezone.root),
      h('label', { class: 'settings-field' }, h('span', {}, '语言'), locale.root)), status) })
  const save = Button({ children: ['保存地区'], variant: 'solid', onclick: async () => {
    save.disabled = true
    try {
      await apiFetch('/api/nodes/geo', { method: 'POST', body: JSON.stringify({ nodeId: node.id, geo: { timezone: timezone.select.value, locale: locale.select.value, countryCode: country.select.value, city: city.select.value } }) })
      modal.close(); await refresh()
    } catch (error) { status.textContent = error.message }
    finally { save.disabled = false }
  } })
  modal.footer.append(Button({ children: ['取消'], variant: 'soft', onclick: () => modal.close() }), save)
}
