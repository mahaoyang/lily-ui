import { catalogModels } from './config-options.js';

export async function loadTemplateModels(api, provider, saved = '', profileId) {
  const [{ instances }, settings] = await Promise.all([api('/api/state'), api('/api/settings')]);
  const profiles = instances.filter(i => i.provider === provider && !i.simulation && (!profileId || i.id === profileId));
  const results = await Promise.allSettled(profiles.map(i => api(`/api/instances/${i.id}/model-options`)));
  const models = new Map((settings.settings.modelCatalogs?.[provider] || []).filter(m => m.value !== 'simulation').map(m => [m.value, m.name]));
  const addModels = configOptions => {
    for (const model of catalogModels(configOptions)) models.set(model.value, model.name);
  };
  for (const profile of profiles) {
    for (const entry of profile.conversations || []) addModels(entry.session?.configOptions);
  }
  for (const result of results) {
    if (result.status === 'fulfilled') addModels(result.value.configOptions);
  }
  if (saved && saved !== 'simulation' && !models.has(saved)) models.set(saved, saved + (models.size ? '（不可用时使用 CLI 默认）' : '（连接后校验）'));
  return [...models].map(([value, name]) => ({ value, name }));
}
