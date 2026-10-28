import { api, toast } from './ui.js';

// Application defaults are shared by browsers; saved resources remain authoritative.
const formDefaults = new Set(['simulation', 'trust-tools', 'cleanup-workspace']);
let defaults = {};
let writes = Promise.resolve();
export function loadFormDefaults(value) {
  defaults = { ...value };
  // Old browser switch defaults have no reliable owner and must not override app data.
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('fox-switch:') || key.startsWith('fox:form:')) localStorage.removeItem(key);
  } catch {}
}
export function switchPreference(name, fallback) {
  if (!formDefaults.has(name)) throw new Error(`未知表单默认值: ${name}`);
  return typeof defaults[name] === 'boolean' ? defaults[name] : fallback;
}
export function rememberSwitch(name, checked) {
  if (!formDefaults.has(name)) throw new Error(`未知表单默认值: ${name}`);
  defaults[name] = Boolean(checked);
  const patch = { [name]: Boolean(checked) };
  writes = writes.then(() => api('/api/defaults', 'PATCH', patch)).catch(error => toast(`默认选项保存失败：${error.message}`));
  return writes;
}

// Layout/navigation are intentionally local to this browser.
export function browserPreference(name, fallback = null) {
  try {
    const key = `fox:ui:${name}`;
    let value = localStorage.getItem(key);
    if (value === null) {
      value = localStorage.getItem(`fox-${name}`);
      if (value !== null) localStorage.setItem(key, value);
    }
    localStorage.removeItem(`fox-${name}`);
    return value ?? fallback;
  } catch { return fallback; }
}
export function rememberBrowserPreference(name, value) {
  try { localStorage.setItem(`fox:ui:${name}`, String(value)); } catch {}
}
