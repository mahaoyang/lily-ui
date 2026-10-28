import { t } from '../i18n.js';

export function llmReason(key) {
  const map = { automation: 'automation', timezoneRegion: 'environment', timezoneMismatch: 'environment', webrtcMismatch: 'webrtc', webrtcRegion: 'region', uncertainty: 'uncertainty', regionUnverified: 'unknown' };
  return map[key] ? t(`llm2.${map[key]}`) : t(`llm.reason.${key}`);
}
