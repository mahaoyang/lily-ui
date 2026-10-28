import { createLlmBrowserCollector } from '../../../adapters/browser/diagnostics/llm-browser.js';
export const { collectLlmBrowser } = createLlmBrowserCollector();
export { browserForReport } from '../../../headless/diagnostics/browser/report.js';
// Keep the hero's leak location concise and localized; unknown locations stay absent.
export function webrtcLeakRegions(browser = {}, locale = 'en', exposedRegion = false) {
  if (!browser.webrtcMismatch && !exposedRegion) return '';
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return [...new Set((browser.webrtcCountries || []).map(code => String(code).trim().toUpperCase()))]
    .filter(code => /^[A-Z]{2}$/.test(code) && !['XX', 'ZZ', 'EU', 'UN', 'QO', 'XA', 'XB'].includes(code))
    .filter(code => names.of(code) !== code)
    .map(code => `${names.of(code)} (${code})`).join(' / ');
}
