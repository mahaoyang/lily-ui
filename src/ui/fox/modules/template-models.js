import { loadTemplateModels } from '../../../headless/fox/template-models.js';
import { api, esc } from './ui.js';

export async function templateModels(provider, saved = '', profileId) {
  const models = await loadTemplateModels(api, provider, saved, profileId);
  return '<option value="">CLI 默认</option>' + models.map(({ value, name }) => `<option value="${esc(value)}" ${value === saved ? 'selected' : ''}>${esc(name)}</option>`).join('');
}
