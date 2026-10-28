import { MIX_CONDITIONS } from '../../../headless/audio/mix-options.js';
export { MIX_CONDITIONS, mixConditions } from '../../../headless/audio/mix-options.js';
export function readMixConditions() {
  return Object.fromEntries(Object.keys(MIX_CONDITIONS).map(key=>[key,document.getElementById(`chatterbox-mix-${key.replaceAll('_','-')}`).checked]))
}
