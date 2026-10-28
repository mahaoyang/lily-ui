import { normalizeLocale, getStoredLocale, detectLocale, setLocale } from '../i18n.js';

const url = new URL(location.href);
const explicitLocale = normalizeLocale(url.searchParams.get('lang'));
const locale = explicitLocale ?? getStoredLocale() ?? detectLocale();
// A direct article visit follows the same saved/browser preference as the tools.
if (!explicitLocale && locale !== document.documentElement.lang) {
  url.searchParams.set('lang', locale);
  location.replace(url.pathname + url.search + url.hash);
} else {
  setLocale(locale, { persist: false });
  const picker = document.getElementById('article-language');
  picker?.addEventListener('change', () => {
    const nextLocale = normalizeLocale(picker.value);
    setLocale(nextLocale);
    url.searchParams.set('lang', nextLocale);
    location.assign(url.pathname + url.search + url.hash);
  });
}
