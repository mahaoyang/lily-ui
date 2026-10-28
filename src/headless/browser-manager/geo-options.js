// Searchable, valid choices for the two values that most often cause typo-driven
// environment mismatches.  Time zones come from the browser's IANA database;
// locales use a curated BCP-47 list and preserve an existing custom value.
const FALLBACK_TIMEZONES = [
  'UTC', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Seoul',
  'Asia/Singapore', 'Asia/Bangkok', 'Asia/Kolkata', 'Asia/Dubai',
  'Australia/Sydney', 'Pacific/Auckland', 'America/Los_Angeles',
  'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
]

const LOCALES = [
  ['zh-CN', '中文（简体）'], ['zh-TW', '中文（繁體）'], ['zh-HK', '中文（香港）'],
  ['en-US', 'English (United States)'], ['en-GB', 'English (United Kingdom)'],
  ['en-CA', 'English (Canada)'], ['en-AU', 'English (Australia)'],
  ['ja-JP', '日本語'], ['ko-KR', '한국어'], ['es-ES', 'Español (España)'],
  ['es-MX', 'Español (México)'], ['es-AR', 'Español (Argentina)'],
  ['fr-FR', 'Français (France)'], ['fr-CA', 'Français (Canada)'],
  ['de-DE', 'Deutsch'], ['it-IT', 'Italiano'], ['pt-BR', 'Português (Brasil)'],
  ['pt-PT', 'Português (Portugal)'], ['ru-RU', 'Русский'], ['uk-UA', 'Українська'],
  ['pl-PL', 'Polski'], ['tr-TR', 'Türkçe'], ['nl-NL', 'Nederlands'],
  ['sv-SE', 'Svenska'], ['da-DK', 'Dansk'], ['no-NO', 'Norsk'], ['fi-FI', 'Suomi'],
  ['cs-CZ', 'Čeština'], ['sk-SK', 'Slovenčina'], ['hu-HU', 'Magyar'],
  ['ro-RO', 'Română'], ['bg-BG', 'Български'], ['el-GR', 'Ελληνικά'],
  ['he-IL', 'עברית'], ['ar-SA', 'العربية'], ['fa-IR', 'فارسی'],
  ['hi-IN', 'हिन्दी'], ['bn-BD', 'বাংলা'], ['th-TH', 'ไทย'], ['vi-VN', 'Tiếng Việt'],
  ['id-ID', 'Bahasa Indonesia'], ['ms-MY', 'Bahasa Melayu'], ['fil-PH', 'Filipino'],
  ['ca-ES', 'Català'], ['eu-ES', 'Euskara'], ['gl-ES', 'Galego'],
  ['hr-HR', 'Hrvatski'], ['sr-RS', 'Српски'], ['sl-SI', 'Slovenščina'],
  ['et-EE', 'Eesti'], ['lv-LV', 'Latviešu'], ['lt-LT', 'Lietuvių'],
]

function preserveCurrent(items, current, label = '当前值') {
  const value = String(current || '').trim()
  if (!value || items.some(item => String(item.value) === value)) return items
  return [...items, { value, label: `${value}（${label}）` }]
}

export function buildTimezoneItems(current) {
  let values = FALLBACK_TIMEZONES
  try {
    const supported = Intl.supportedValuesOf?.('timeZone')
    if (Array.isArray(supported) && supported.length) values = ['UTC', ...supported]
  } catch {}
  const items = [...new Set(values)].map(value => ({ value, label: value }))
  return preserveCurrent([{ value: '', label: '请选择时区' }, ...items], current)
}

export function buildLanguageItems(current) {
  const items = [{ value: '', label: '请选择语言地区' }, ...LOCALES.map(([value, label]) => ({ value, label }))]
  return preserveCurrent(items, current)
}
