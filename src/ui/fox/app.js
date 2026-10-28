import { chooseTransferTarget } from './modules/session-transfer.js';
import { modelChoices as configModelChoices } from '../../headless/fox/config-options.js';
import { templateModels } from './modules/template-models.js';
import { effortNames, effortChoices, effortOption } from '../../headless/fox/reasoning.js';
import { initPromptFiles } from './modules/prompt-files.js';
import { initHistoryPreview, initSessionRename } from './modules/session-ui.js';
import { codexModelRate, codexModelPrice, formatDollarPrice } from '../../headless/fox/model-pricing.js';
import { loadingRegion } from './modules/loading.js';
import { createResourceState, migrateLegacyWork } from '../../headless/fox/resource-state.js';
import { providerFor, extensions, updateMetadata } from '../../headless/fox/providers.js';
import { previousAfterDeletion } from '../../headless/fox/selection.js';
import { resetCountdown, billingResetCountdown } from '../../headless/fox/usage.js';
import { createTranscriptWindow } from '../../headless/fox/transcript-window.js';
import { bindDirectoryDrop } from './modules/directories.js';
import { initSelects } from './modules/select.js';
import { uniqueProfileName } from '../../headless/fox/names.js';
import { statusCircle, statusTone, aiMarker } from './modules/indicators.js';
import { createChatStorage } from './modules/chat-storage.js';
import { $, icon, esc, api, toast, confirmAction } from './modules/ui.js';
import { initLayout } from './modules/layout.js';
import { initSettings } from './modules/settings.js';
import { initProxy } from './modules/proxy.js';
import { switchPreference, rememberSwitch, loadFormDefaults, browserPreference, rememberBrowserPreference } from './modules/preferences.js';
import { contentText } from './output.js';
import { renderTranscriptMessage, enhanceTranscript } from './modules/transcript.js';
import { createAppState } from '../../headless/fox/state.js';
import { subscribeEvents } from '../../adapters/browser/fox/client.js';
const state = createAppState();
const resources = createResourceState({ instances: () => state.instances, report: toast, events: window });
const ACTIVE_TAB_KEY = 'active-tab';
function rememberActiveTab() {
  try {
    rememberBrowserPreference(ACTIVE_TAB_KEY, JSON.stringify({ instanceId: state.selected, sessionId: selected()?.sessionId || null }));
  } catch {}
}
function restoreActiveTab() {
  try {
    const saved = JSON.parse(browserPreference(ACTIVE_TAB_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch {}
  return null;
}
function focusPromptInput() {
  requestAnimationFrame(() => {
    const input = $('#prompt-input');
    if (!input || input.disabled || input.closest('.hidden')) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });
}
function supports(feature) { const methods = extensions(state.initialized); return methods.includes(feature === 'compact' ? 'session/compact' : 'session/context') || methods.includes(feature === 'compact' ? '_kiro/session/compact' : '_kiro/session/context'); }
function selected() { return state.instances.find(x => x.id === state.selected); }
function renderCancelReply() { const button = $('#cancel-reply'); button.classList.toggle('hidden', !state.replyPending || selected()?.status !== 'running'); button.disabled = state.cancelRequested; button.title = state.cancelRequested ? '正在停止…' : '停止回复'; }
async function cancelReply() {
  const item = selected();
  if (!state.replyPending || state.cancelRequested || !item?.sessionId) return;
  state.cancelRequested = true; queueMayContinue = false;
  for (const message of state.messages) if (message.role === 'tool' && !['completed', 'failed', 'cancelled'].includes(message.status)) message.status = 'cancelled';
  renderMessages(true); renderCancelReply();
  try { await api(`/api/instances/${item.id}/cancel`, 'POST', {}); }
  catch (error) { state.cancelRequested = false; renderCancelReply(); toast(`停止失败：${error.message}`); }
}
function updateSessionDot() { const item = selected(); const dot = $('.live-dot'); const active = item?.status === 'running' && !!item.sessionId; dot.dataset.state = active ? 'connected' : 'idle'; dot.title = active ? '会话已连接' : '无活动会话'; }
const connecting = new Map();
function updateConnectionGate() {
  const item = selected();
  const failed = item?.status === 'error';
  if (failed && $('.chat-panel').classList.contains('chat-fullscreen')) $('#chat-fullscreen').click();
  $('.session-layout').inert = !!failed;
  $('.session-surface').classList.toggle('is-disconnected', !!failed);
  $('.session-connect-overlay').classList.toggle('hidden', !failed);
  $('#start-button').textContent = '重试连接';
}
async function ensureConnected(item) {
  if (!item) return false;
  if (connecting.has(item.id)) return connecting.get(item.id);
  if (item.status === 'running') return true;
  const task = (async () => {
    try {
      item.status = 'connecting';
      if (state.selected === item.id) { $('#connection-error').classList.add('hidden'); render(); }
      const data = await api(`/api/instances/${item.id}/start`, 'POST', { sessionId: item.sessionId || undefined });
      item.status = 'running';
      if (state.selected === item.id) { if (data.init) acceptInit(data.init); if (data.session && !hasSessionLoad(item.id)) acceptSession(data.session); else void refreshProfileModels(item); }
      return true;
    } catch (error) {
      item.status = 'error';
      if (state.selected === item.id) {
        $('#connection-error').textContent = /not logged in/i.test(error.message) ? '未登录，请获取登录链接或导入配置。' : error.message;
        $('#connection-error').classList.remove('hidden');
      }
      return false;
    } finally { if (state.selected === item.id) render(); }
  })();
  connecting.set(item.id, task);
  try { return await task; } finally { connecting.delete(item.id); }
}
function setStatus(status) { updateConnectionGate(); $('#cancel-login').classList.toggle('hidden', !(selected()?.loginPending || status === 'login')); $('#login-button').classList.toggle('hidden', !!(selected()?.loginPending || status === 'login')); const chip = $('#status-chip'); chip.dataset.state = statusTone(status); updateSessionDot(); chip.classList.toggle('running', status === 'running'); chip.innerHTML = `<i></i>${status === 'running' ? '已连接' : status === 'connecting' ? '连接中…' : status === 'error' ? '连接失败' : status === 'login' ? '等待授权' : '未连接'}`; const connectButton = $('#connect-button'); connectButton.classList.toggle('hidden', status === 'running' || status === 'login'); connectButton.disabled = status === 'connecting'; connectButton.textContent = status === 'connecting' ? '连接中…' : status === 'error' ? '重试' : '连接'; $('#stop-button').classList.toggle('hidden', status !== 'running'); }
function renderList() {
  $('#instance-list').innerHTML = state.instances.map(i => `<button class="instance-item ${i.id === state.selected ? 'active' : ''}" data-id="${i.id}" title="${esc(i.name)}"><span class="instance-icon"><img class="provider-icon ${providerFor(i).id}-icon" src="${providerFor(i).icon}" alt=""></span><span class="instance-item-copy"><b>${esc(i.name)}</b><small>${i.status === 'running' ? '已连接' : i.status === 'login' ? '等待授权' : i.status === 'error' ? '连接异常' : '未连接'} <span class="meta-separator">·</span> ${i.simulation ? '模拟测试' : i.proxyConfigured ? esc(i.proxyType) : '直连'}</small></span><i data-state="${statusTone(i.status)}" title="${i.status === 'running' ? '已连接' : i.status === 'login' ? '等待授权' : i.status === 'error' ? '连接异常' : '未连接'}" class="mini-status">${statusCircle}</i></button>`).join('');
  document.querySelectorAll('.instance-item').forEach(b => b.onclick = () => selectInstance(b.dataset.id));
}
function render() {
  if ($('#credit-usage').dataset.profile !== (state.selected || '')) renderCreditPlaceholder();
  renderList(); const item = selected();
  $('#welcome').classList.toggle('hidden', !!item); $('#workspace').classList.toggle('hidden', !item);
  if (!item) { $('#top-instance').textContent = '选择配置'; return; }
  $('#top-instance').textContent = item.name; $('#instance-title').textContent = item.name;
  $('#cwd-label').textContent = item.conversations?.find(c => c.sessionId === item.sessionId)?.cwd || item.cwd; setStatus(item.status);
  $('#proxy-summary').textContent = item.proxyConfigured ? `${item.proxyType} · ${item.proxyEnabled ? '自动连接' : '已暂停'}` : '直连';
  $('#login-button').classList.toggle('hidden', !!item.simulation || !!item.loginPending);
  refreshProxyExit(item);
  renderSessions(); renderMessages(); renderUsage(); renderCancelReply();
}
function renderSessions() {
  syncDraft();
  syncCompressionSettings();
  updateSessionDot();
  const item = selected();
  const entries = item?.conversations || [];
  if (item) $('#cwd-label').textContent = entries.find(c => c.sessionId === item.sessionId)?.cwd || item.cwd;
  if ($('#active-session-title input')?.dataset.sessionId !== item?.sessionId || !$('#active-session-title input')) $('#active-session-title').textContent = entries.find(c => c.sessionId === item?.sessionId)?.title || '未选择会话';
  $('#session-list').innerHTML = entries.length ? entries.map(c => `<button class="session-item ${c.sessionId === item.sessionId ? 'active' : ''}" data-session="${esc(c.sessionId)}" title="${esc(c.title)}"><span class="session-icon">${icon('message-square')}</span><span class="session-copy"><b>${esc(c.title)}</b><small>${new Date(c.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></span><span class="session-status" data-state="${c.sessionId === item.sessionId && item.status === 'running' ? 'connected' : 'idle'}" title="${c.sessionId === item.sessionId && item.status === 'running' ? '当前会话 · 已连接' : '未激活会话'}">${statusCircle}</span></button>`).join('') : '<div class="no-sessions">暂无会话</div>';
  document.querySelectorAll('[data-session]').forEach(button => button.onclick = () => loadSession(button.dataset.session).catch(e => toast(e.message)));
  $('#new-chat').disabled = !item;

  renderUsage();
  $('#open-session-directory').disabled = !item?.sessionId;
  $('#session-directory-shortcut').disabled = !item?.sessionId;
  $('#clear-chat').disabled = !item?.sessionId; $('#transfer-chat').disabled = !item?.sessionId; $('#delete-chat').disabled = !item?.sessionId; $('#history-open').disabled = !item;
  updateConnectionGate(item?.status);
  $('#prompt-input').disabled = !item || item.status === 'error';
  $('#prompt-placeholder').textContent = item?.sessionId ? '输入消息，/ 查看命令' : '输入消息将自动连接并新建会话';
  renderCancelReply();
}
const sessionLoads = new Map();
function hasSessionLoad(profileId) { return [...sessionLoads.keys()].some(key => key.startsWith(`${profileId}:`)); }
function loadSession(sessionId) {
  const key = `${state.selected}:${sessionId}`;
  if (sessionLoads.has(key)) return sessionLoads.get(key);
  const task = restoreSession(sessionId).finally(() => sessionLoads.delete(key));
  sessionLoads.set(key, task);
  return task;
}
async function restoreSession(sessionId) {
  if (state.busy) throw new Error('请等待当前回复完成后切换会话');
  queueMayContinue = false;
  if (!sessionId) { state.messages = []; renderMessages(); return; }
  const item = selected(), profileId = item.id;
  const saved = item.conversations?.find(c => c.sessionId === sessionId);
  item.sessionId = sessionId;
  state.messages = [];
  state.configOptions = saved?.session?.configOptions || [];
  state.contextUsage = null;
  renderSessions(); renderMessages(); rememberActiveTab();
  historyLoading.classList.remove('hidden');
  try {
  const entry = await api(`/api/instances/${profileId}/select-session`, 'POST', { sessionId, connect: false });
  if (state.selected !== profileId || item.sessionId !== sessionId) return;
  resources.accept(`${profileId}:${sessionId}`, entry.workState || {});
  selected().sessionId = sessionId; rememberActiveTab(); state.messages = []; if (entry.init) acceptInit(entry.init); acceptSession(entry.session);
  replayHistory(entry.events);
  renderSessions(); renderMessages();
  if (!await ensureConnected(item) || state.selected !== profileId || item.sessionId !== sessionId) return;
  const connected = await api(`/api/instances/${profileId}/select-session`, 'POST', { sessionId, connect: true });
  if (state.selected !== profileId || item.sessionId !== sessionId) return;
  if (connected.init) acceptInit(connected.init);
  state.messages = []; acceptSession(connected.session); replayHistory(connected.events); renderMessages();
  await applyPendingModelOptions();
  } finally { if (!loadingEarlier) historyLoading.classList.add('hidden'); }
}
function selectInstance(id) {
  $('#connection-error').classList.add('hidden');
  if (state.busy) return toast('请等待当前回复完成后切换配置');
  queueMayContinue = false;
  const previousId = state.selected;
  if (state.source) state.source.close();
  if (previousId && previousId !== id) void api('/api/release', 'POST', { id: previousId }).catch(() => {});
  state.selected = id; state.messages = []; state.commands = []; state.initialized = null; state.configOptions = []; state.contextUsage = null;
  renderCreditPlaceholder(); renderUsage();
  rememberActiveTab(); resetLogin(); const item = selected(); if (item) { connectEvents(item); refreshCredits(); loadSession(item.sessionId).catch(e => toast(e.message)); } render();
}
async function refreshProfileModels(item) {
  if (item?.simulation || item.status !== 'running' || item.sessionId) return;
  try { const data = await api(`/api/instances/${item.id}/model-options`); if (state.selected === item.id && !item.sessionId) { state.configOptions = data.configOptions || []; rebuildCommands(); } } catch {}
}
function connectEvents(item) {
  const src = subscribeEvents(item.id); state.source = src;
  src.addEventListener('ready', e => { const data = JSON.parse(e.data); if (state.selected !== item.id) return; item.status = data.status; setStatus(data.status); if (data.status === 'running') void refreshProfileModels(item);  });
  src.addEventListener('status', e => {
    if (state.selected !== item.id) return;
    const data = JSON.parse(e.data); item.status = data.status; if ('loginPending' in data) item.loginPending = data.loginPending; if ('sessionId' in data && !hasSessionLoad(item.id)) item.sessionId = data.sessionId; if (data.status === 'stopped') { renderCreditPlaceholder(); state.contextUsage = null; state.replyPending = false; state.busy = false; renderCancelReply(); } if (state.selected === item.id) rememberActiveTab(); renderSessions();
    if (data.init) acceptInit(data.init); if (data.session && !hasSessionLoad(item.id)) acceptSession(data.session); setStatus(data.status); renderList();
  });
  src.addEventListener('conversations', e => {
    const data = JSON.parse(e.data);
    // Hydrate work before publishing selection: rendering an empty queue/draft can
    // otherwise enqueue an empty save that overwrites the restored session.
    for (const entry of data.conversations || []) resources.accept(`${item.id}:${entry.sessionId}`, entry.workState || {});
    if (hasSessionLoad(item.id)) delete data.sessionId;
    Object.assign(item, data);
    if (state.selected === item.id) renderSessions();
  });
  src.addEventListener('initialized', e => acceptInit(JSON.parse(e.data)));
  src.addEventListener('login', e => showLogin(JSON.parse(e.data)));
  src.addEventListener('login-exit', e => { const d = JSON.parse(e.data); item.loginPending = false; resetLogin(d.cancelled ? '已取消' : d.code === 0 ? '登录完成' : (d.text || '登录已结束，保留旧登录')); if (d.code === 0 && !d.cancelled) toast('登录完成'); });
  src.addEventListener('model-options', e => { if (state.selected === item.id && !item.sessionId) { state.configOptions = JSON.parse(e.data).configOptions || []; rebuildCommands(); if (!$('#model-modal').classList.contains('hidden')) openModels(); } });
  src.addEventListener('acp-update', e => handleUpdate(JSON.parse(e.data)));
  src.addEventListener('permission', e => showPermission(JSON.parse(e.data), item.id));
  src.addEventListener('external-url', e => showExternalUrl(JSON.parse(e.data)));
  src.addEventListener('log', e => { const d = JSON.parse(e.data); const text = d.text.split('\n').filter(line => !/ExperimentalWarning: SQLite is an experimental feature/i.test(line) && !/Use .?node --trace-warnings/i.test(line)).join('\n').trim(); const sandboxNotice = /\b(?:bwrap|bubblewrap)\b/i.test(text) && /sandbox|prerequisite|package manager|bundled|not found/i.test(text); if (d.notify !== false && !sandboxNotice && /error|failed|not found/i.test(text)) toast(text.slice(-180)); });
}
function rebuildCommands() {
  const commands = [{ name: '/help', description: '查看命令' }, { name: '/clear', description: '归档当前对话并新建会话' }, { name: '/model', description: '切换模型' }];
  if (supports('compact')) commands.push({ name: '/compact', description: '压缩上下文' });
  commands.push(...state.modes.map(m => ({ name: `/mode ${m.id}`, description: m.name || '' })), ...state.advertisedCommands.filter(c => !['help','clear','model','compact'].includes(c.name)).map(c => ({ name: `/${c.name}`, description: c.description || '' })));
  state.commands = commands; renderCommands(); renderUsage();
}
function acceptInit(init) {
  state.initialized = init; refreshCredits();
  $('#chat-caption').textContent = init.agentInfo?.name || 'CLI Agent'; rebuildCommands();
}
function acceptSession(session) {
  state.contextUsage = null; renderUsage();
  state.configOptions = session?.configOptions || [];
  const entry = selected()?.conversations?.find(c => c.sessionId === selected()?.sessionId);
  if (entry && session) entry.session = session;
  state.advertisedCommands = [];
  state.modes = session?.modes?.availableModes || []; rebuildCommands();
  $('#model-modal').classList.add('hidden'); refreshContext();
}
function modelChoices() { return configModelChoices(state.configOptions); }
function renderCreditPlaceholder() {
  const codex = selected()?.provider === 'codex';
  const cached = creditRefreshes.get(state.selected);
  const button = $('#credit-usage');
  button.dataset.profile = state.selected || '';
  button.dataset.provider = codex ? 'codex' : 'kiro';
  if (cached?.html) button.innerHTML = cached.html;
  else if (codex) renderCodexCredit(button);
  else button.textContent = cached?.text || (selected() ? '积分 —' : '—');
  $('#credit-usage').title = codex ? '刷新额度' : selected() ? '刷新积分' : '选择配置后显示用量';
}
function modelRate(model, compact = true) {
  if (selected()?.provider === 'codex') return codexModelRate(model, modelChoices(), compact);
  const rate = model?._meta?.kiro?.rateMultiplier;
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? `${rate}×` : '倍率未知';
}
let applyingModelOptions = false;
function pendingModelOptions() { const key = queueKey(); return key ? resources.get(key).pendingModelOptions || null : null; }
async function applyPendingModelOptions() {
  const item = selected(), key = queueKey(), pending = pendingModelOptions();
  if (!pending || !item || item.status !== 'running') return !pending;
  if (state.busy || applyingModelOptions) return false;
  applyingModelOptions = true; state.busy = true; renderUsage();
  try {
    // Save the requested choice before attempting it, so refresh or disconnect can retry.
    if (!await resources.flush()) throw new Error('无法保存待切换的设置');
    for (const [configId, value] of [['model', pending.model], [pending.effortId, pending.effort]]) {
      if (!configId || !value) continue;
      const option = state.configOptions.find(o => o.id === configId);
      if (option?.currentValue === value) continue;
      const data = await api(`/api/instances/${item.id}/model`, 'POST', { value, configId });
      state.configOptions = data.session.configOptions || [];
      const entry = item.conversations?.find(c => c.sessionId === item.sessionId);
      if (entry) entry.session = data.session;
    }
    resources.set(key, { pendingModelOptions: null });
    if (!await resources.flush()) { resources.set(key, { pendingModelOptions: pending }); throw new Error('无法保存切换结果'); }
    rebuildCommands();
    return true;
  } catch (error) {
    queueMayContinue = false;
    toast(`切换失败：${error.message}，请重新选择`);
    return false;
  } finally { applyingModelOptions = false; state.busy = false; renderUsage(); }
}
function openModels() {
  if (state.busy && !state.replyPending && !compacting) return toast('请等待当前操作完成');
  const option = state.configOptions.find(o => o.id === 'model');
  const pending = pendingModelOptions();
  const codex = selected()?.provider === 'codex';
  $('#model-price-note').classList.toggle('hidden', !codex);
  $('#model-options').classList.add('model-grid');
  $('#model-options').classList.toggle('model-price-grid', codex);
  const header = codex ? '<div class="model-grid-row model-grid-head"><span>模型</span><span>倍率</span><span>输入</span><span>输出</span><span>缓存输入</span></div>' : '<div class="model-grid-row model-grid-head"><span>模型</span><span>倍率</span></div>';
  const rows = modelChoices().map(o => {
    const current = o.value === (pending?.model || option?.currentValue);
    const name = `${current ? '<svg class="model-current-dot" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3"/></svg>' : ''}${esc(o.name || o.value)}`;
    const cells = codex ? `<span class="model-name">${name}</span><span>${esc(modelRate(o, false))}</span>${[0, 1, 2].map(i => `<span>${formatDollarPrice(codexModelPrice(o)?.[i])}</span>`).join('')}` : `<span class="model-name">${name}</span><span>${esc(modelRate(o, false))}</span>`;
    return `<button class="command-option model-grid-row" data-model="${esc(o.value)}" aria-pressed="${current}">${cells}</button>`;
  }).join('');
  $('#model-options').innerHTML = rows ? `${codex ? '<div class="model-price-unit" title="标准速度、短上下文 API 单价；不代表套餐额度消耗，不含长上下文及加速加价。">$/M token · 标准档</div>' : ''}${header}${rows}` : '<p>当前 CLI 未提供模型列表</p>';
  const depthOptions = pending?.model && pending.model !== option?.currentValue ? [] : state.configOptions.filter(o => o.id !== 'model' && o.type === 'select' && (o.category === 'thought_level' || /effort|thinking|reasoning|思考|深度/i.test(o.id + ' ' + o.name)));
  $('#model-options').insertAdjacentHTML('beforeend', depthOptions.map(o => `<div class="effort-options"><span>${esc(o.name || '思考深度')}</span><div>${effortChoices(o).map(v => `<button class="secondary-button" data-effort-config="${esc(o.id)}" data-effort="${esc(v.value)}" aria-pressed="${v.value === o.currentValue}" title="${esc(v.description || '')}">${esc(effortNames[v.value] || v.name || v.value)}</button>`).join('')}</div></div>`).join(''));
  document.querySelectorAll('[data-effort]').forEach(b => b.onclick = () => changeModel(b.dataset.effort, b.dataset.effortConfig));
  $('#model-error').classList.add('hidden'); $('#model-modal').classList.remove('hidden');
  document.querySelectorAll('[data-model]').forEach(b => b.onclick = () => changeModel(b.dataset.model));
}
async function changeModel(value, configId = 'model') {
  if (state.busy && (state.replyPending || compacting) && !applyingModelOptions) {
    const key = queueKey(); if (!key) return;
    const pending = { ...pendingModelOptions() };
    if (configId === 'model') { pending.model = value; delete pending.effort; delete pending.effortId; }
    else { pending.effortId = configId; pending.effort = value; }
    resources.set(key, { pendingModelOptions: pending });
    $('#model-modal').classList.add('hidden'); renderUsage();
    return;
  }
  if (state.busy) return;
  if (pendingModelOptions()) {
    const pending = { ...pendingModelOptions() };
    if (configId === 'model') { pending.model = value; delete pending.effort; delete pending.effortId; }
    else { pending.effortId = configId; pending.effort = value; }
    resources.set(queueKey(), { pendingModelOptions: pending });
    $('#model-modal').classList.add('hidden');
    await applyPendingModelOptions();
    return;
  }
  if (!await ensureSession(selected())) return;
  state.busy = true; renderUsage();
  try { const data = await api(`/api/instances/${selected().id}/model`, 'POST', { value, configId }); state.configOptions = data.session.configOptions || []; const entry = selected()?.conversations?.find(c => c.sessionId === selected()?.sessionId); if (entry) entry.session = data.session; rebuildCommands(); $('#model-modal').classList.add('hidden'); }
  catch (e) { if ($('#model-modal').classList.contains('hidden')) toast(e.message); $('#model-error').textContent = e.message; $('#model-error').classList.remove('hidden'); }
  finally { state.busy = false; renderUsage(); }
}
$('#current-model').onclick = openModels;
$('#current-effort').onclick = () => {
  if (state.busy && !state.replyPending && !compacting) return;
  const option = effortOption(state.configOptions);
  $('#effort-menu').innerHTML = effortChoices(option).map(o => `<button type="button" class="command-option" data-depth="${esc(o.value)}" aria-pressed="${o.value === option.currentValue}" title="${esc(o.description || '')}">${esc(effortNames[o.value] || o.name || o.value)}</button>`).join('');
  $('#effort-menu').classList.toggle('hidden');
  $('#effort-menu').querySelectorAll('[data-depth]').forEach(b => b.onclick = () => { $('#effort-menu').classList.add('hidden'); void changeModel(b.dataset.depth, option.id); });
};
document.addEventListener('click', event => { if (!event.target.closest('.model-controls')) $('#effort-menu').classList.add('hidden'); });
$('#model-close').onclick = () => $('#model-modal').classList.add('hidden');
function handleUpdate(packet) {
  if (packet.sessionId && packet.sessionId !== selected()?.sessionId) return;
  const u = packet.update || packet; const kind = u.sessionUpdate;
  if (kind === 'session_info_update' && updateMetadata(u).kind === 'context_usage') {
    const percentage = updateMetadata(u).usagePercentage;
    if (typeof percentage === 'number' && Number.isFinite(percentage)) { state.contextUsage = percentage; if (!replayingHistory) observeCompressionUsage(percentage); renderUsage(); if (!replayingHistory) queueMicrotask(() => { void maybeAutoCompact(); }); }
  }
  if (kind === 'available_commands_update') { state.advertisedCommands = u.availableCommands || []; rebuildCommands(); }
  if (kind === 'config_option_update' && !replayingHistory) { state.configOptions = u.configOptions || []; const entry = selected()?.conversations?.find(c => c.sessionId === selected()?.sessionId); if (entry) entry.session = { ...entry.session, configOptions: state.configOptions }; rebuildCommands(); if (!$('#model-modal').classList.contains('hidden') && !state.busy) openModels(); }
  if (kind === 'agent_message_chunk' || kind === 'agent_thought_chunk') {
    const role = kind === 'agent_thought_chunk' ? 'thought' : 'assistant', text = contentText(u.content);
    let last = u.messageId ? state.messages.find(m => m.role === role && m.messageId === u.messageId) : state.messages.at(-1);
    if (!last || last.role !== role || (!u.messageId && last.final)) { last = { role, text: '', ...(u.messageId ? { messageId: u.messageId } : {}) }; state.messages.push(last); }
    last.text = u.replace ? text : last.text + text; renderMessages(true);
  }
  if (kind === 'session_info_update' && updateMetadata(u).kind === 'message_completed') {
    const message = state.messages.find(m => m.messageId === updateMetadata(u).messageId); if (message) message.final = true;
  }
  if (kind === 'user_message_chunk') { const text = contentText(u.content); if (text && !(state.messages.at(-1)?.role === 'user' && state.messages.at(-1)?.text === text)) { state.messages.push({ role: 'user', text }); renderMessages(true); } }
  if (kind === 'tool_call' || kind === 'tool_call_update') {
    let card = state.messages.find(m => m.role === 'tool' && m.toolCallId === u.toolCallId);
    if (!card) { card = { role: 'tool', title: '工具调用', status: 'pending', toolCallId: u.toolCallId }; state.messages.push(card); }
    if (u.title || u.kind) card.title = u.title || u.kind;
    if (u.status) card.status = u.status;
    if (u.content !== undefined) card.output = contentText(u.content);
    else if (u.rawOutput !== undefined) card.output = contentText(u.rawOutput);
    if (u.rawInput !== undefined) card.input = contentText(u.rawInput);
    renderMessages(true);
  }
  if (kind === 'session_info_update' && updateMetadata(u).kind === 'turn_completion') { const last = [...state.messages].reverse().find(m => m.role === 'assistant'); if (last) last.final = true; renderMessages(true); }
}
function renderUsage() {
  const hasSession = !!selected()?.sessionId;
  const option = state.configOptions.find(o => o.id === 'model');
  const pending = pendingModelOptions();
  const value = pending?.model || option?.currentValue;
  const model = modelChoices().find(o => o.value === value);
  const modelName = model?.name || value || '—';
  const modelLabel = selected()?.provider === 'codex' ? modelName.replace(/^gpt-/i, '') : modelName;
  $('#current-model').textContent = `${modelLabel}${value ? ` · ${modelRate(model)}` : ''}`;
  $('#current-model').title = value ? `${value}${selected()?.provider === 'codex' ? ` · 价格估算 ${modelRate(model)}` : ` · 积分倍率 ${modelRate(model)}`} · ${pending?.model ? '待当前任务结束后生效' : '点击切换模型'}` : '切换模型';
  const depth = effortOption(state.configOptions);
  $('#current-effort').classList.toggle('hidden', !effortChoices(depth).length || !!(pending?.model && pending.model !== option?.currentValue));
  $('#current-model').classList.toggle('setting-pending', !!pending?.model && pending.model !== option?.currentValue);
  $('#current-effort').classList.toggle('setting-pending', !!pending?.effort && pending.effort !== depth?.currentValue);
  const depthValue = pending?.effort || depth?.currentValue;
  $('#current-effort').textContent = `· ${effortNames[depthValue] || (depthValue === 'default' ? '默认' : depthValue) || '默认'}`;
  $('#current-effort').title = pending?.effort ? '待当前任务结束后生效' : '选择思维深度';
  $('#current-effort').disabled = (state.busy && !state.replyPending && !compacting) || (!hasSession && selected()?.status !== 'running');
  $('#current-model').disabled = !hasSession && !(selected()?.status === 'running' && modelChoices().length);
  $('#compact-button').disabled = compacting || !hasSession || selected()?.status !== 'running' || !supports('compact');
  const percentage = hasSession ? state.contextUsage : null;
  $('#context-usage').innerHTML = percentage == null ? '上下文 —' : `上下文 <strong class="context-percentage">${percentage.toFixed(1)}%</strong>`;
  $('#context-usage').title = percentage == null ? '等待 CLI 上报' : 'CLI 上报的上下文占用';
  $('#context-usage').classList.toggle('usage-high', percentage >= 80);
}
async function refreshContext() {
  const item = selected();
  if (!item?.sessionId || !supports('context')) return;
  try { await api(`/api/instances/${item.id}/context`, 'POST', { sessionId: item.sessionId }); }
  catch (e) { if (state.selected === item.id) $('#context-usage').title = e.message; }
}
const creditRefreshes = new Map();
const creditRefreshInterval = 5 * 60 * 1000;
function renderCodexCredit(button, windows = []) {
  const slots = windows.length ? windows : [{ windowDurationMins: 300 }, { windowDurationMins: 10080 }];
  const parts = slots.map(w => {
    const group = document.createElement('span');
    group.className = 'credit-window';
    const label = w.windowDurationMins === 300 ? '5H' : w.windowDurationMins === 10080 ? '周' : w.windowDurationMins >= 1440 ? Math.floor(w.windowDurationMins / 1440) + '天' : (w.windowDurationMins || '') + '分钟';
    for (const [kind, value] of [['label', label], ['percent', Number.isFinite(w.usedPercent) ? `${Math.max(0, 100 - w.usedPercent).toFixed(0)}%` : '—%'], ['countdown', resetCountdown(w.resetsAt) || '—']]) {
      const span = document.createElement('span'); span.className = `credit-${kind}`; span.textContent = value; group.append(span);
    }
    return group;
  });
  button.replaceChildren();
  parts.forEach((part, index) => { if (index) button.append(' · '); button.append(part); });
}
async function refreshCredits(force = false) {
  const item = selected(); if (!item || item.status !== 'running') return;
  const id = item.id;
  const button = $('#credit-usage');
  const cached = creditRefreshes.get(id);
  if (cached?.html) { button.innerHTML = cached.html; button.title = cached.title; }
  if (cached?.pending || (!force && cached && Date.now() - cached.checkedAt < creditRefreshInterval)) return;
  const refresh = { ...cached, pending: true, checkedAt: Date.now() };
  creditRefreshes.set(id, refresh);
  const done = loadingRegion(button);
  try {
    const { usage } = await api(`/api/instances/${id}/usage`, 'POST', {});
    if (state.selected !== id) return;
    if (usage.provider === 'codex') {
      const limits = usage.rateLimits || Object.values(usage.rateLimitsByLimitId || {})[0];
      const windows = [limits?.primary, limits?.secondary].filter(w => w && Number.isFinite(w.usedPercent));
      renderCodexCredit(button, windows);
      button.title = [limits?.planType, ...windows.map(w => w.resetsAt ? '重置 ' + new Date(w.resetsAt * 1000).toLocaleString('zh-CN') : ''), '点击刷新'].filter(Boolean).join('\n'); return;
    }
    const credit = usage.usageBreakdowns?.find(x => x.resourceType === 'CREDIT');
    const valid = credit && Number.isFinite(credit.limit) && Number.isFinite(credit.used);
    button.textContent = !credit ? '积分 —' : credit.hasLimit === false ? '积分 ∞' : valid ? `${usage.bonusCredits?.length || usage.addOnCredits?.length ? '套餐余量' : '剩余积分'} ${Math.max(0, credit.limit - credit.used).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '积分 —';
    const countdown = billingResetCountdown(usage.billingCycleReset);
    if (countdown) button.append(` · ${countdown}`);
    button.title = [usage.planName, valid ? `已用 ${credit.used} / ${credit.limit}` : '', usage.billingCycleReset ? `重置 ${usage.billingCycleReset}` : '', ...(usage.bonusCredits || []).map(x => `奖励积分：${JSON.stringify(x)}`), ...(usage.addOnCredits || []).map(x => `加购积分：${JSON.stringify(x)}`), '点击刷新'].filter(Boolean).join('\n');
  } catch (e) { if (state.selected === id) button.title = e.message + ' · 点击重试'; }
  finally {
    done();
    refresh.pending = false;
    if (state.selected === id) { refresh.text = button.textContent; refresh.html = button.innerHTML; refresh.title = button.title; }
  }
}
$('#credit-usage').onclick = () => refreshCredits(true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCredits(); });
setInterval(() => { if (!document.hidden) refreshCredits(); }, creditRefreshInterval);
const transcriptWindow = createTranscriptWindow();
let replayingHistory = false, replayScrollToBottom = false;
function replayHistory(events) {
  replayingHistory = true;
  try { for (const event of events || []) handleUpdate(event); }
  finally { replayingHistory = false; }
  replayScrollToBottom = true; renderMessages(true); replayScrollToBottom = false;
}
let loadingEarlier = false;
const historyLoading = document.createElement('div');
historyLoading.className = 'history-loading hidden';
historyLoading.setAttribute('role', 'status');
historyLoading.innerHTML = `${aiMarker('waiting')}<span>加载更早消息…</span>`;
$('.chat-transcript').append(historyLoading);
$('#messages').addEventListener('scroll', () => {
  const box = $('#messages');
  if (loadingEarlier || box.scrollTop > 48 || !Number(box.dataset.historyStart)) return;
  loadingEarlier = true;
  const messages = state.messages;
  historyLoading.classList.remove('hidden');
  box.setAttribute('aria-busy', 'true');
  // Let the loading indicator paint before parsing older Markdown.
  requestAnimationFrame(() => setTimeout(() => {
    try {
      if (state.messages !== messages) return;
      const height = box.scrollHeight, top = box.scrollTop;
      transcriptWindow.more(messages, box.clientHeight, box.clientWidth);
      renderMessages();
      box.scrollTop = top + box.scrollHeight - height;
    } finally {
      setTimeout(() => { loadingEarlier = false; historyLoading.classList.add('hidden'); box.removeAttribute('aria-busy'); }, 220);
    }
  }, 0));
}, { passive: true });
function renderMessages(scroll = false) {
  if (replayingHistory) return;
  renderQueue();
  const box = $('#messages');
  if (!state.messages.length) { box.innerHTML = `<div class="empty-chat"><div class="empty-spark">${icon('sparkles')}</div><b>${selected()?.status === 'running' ? '输入消息开始对话' : '输入消息开始对话'}</b></div>`; return; }
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
  const historyStart = transcriptWindow.range(state.messages, box.clientHeight, box.clientWidth);
  box.dataset.historyStart = historyStart;
  const last = state.messages.at(-1);
  const pending = state.busy && (last?.role !== 'assistant' || last.final);
  const openDetails = new Set([...box.querySelectorAll('details[data-detail][open]')].map(el => el.dataset.detail));
  box.innerHTML = state.messages.slice(historyStart).map((m, visibleIndex) => renderTranscriptMessage(m, historyStart + visibleIndex, { openDetails, streaming: state.busy && m === last })).join('') + (pending ? `<div class="message assistant">${aiMarker('waiting')}<div class="message-bubble thinking-label">${compacting ? `<span class="compact-progress">Compacting <span id="compact-elapsed">${compactElapsed()}</span></span>` : '思考中'}</div></div>` : '');
  enhanceTranscript(box, historyStart, openDetails);
  if (scroll && (atBottom || replayScrollToBottom)) box.scrollTop = box.scrollHeight;
}
function renderCommands() { $('#command-options').innerHTML = state.commands.map(c => `<button class="command-option" data-command="${esc(c.name)}"><b class="command-name">${esc(c.name)}</b><span class="command-description" title="${esc(c.description || '')}">${esc(c.description || '')}</span></button>`).join(''); document.querySelectorAll('.command-option').forEach(b => b.onclick = () => { if (b.dataset.command === '/model') { $('#command-menu').classList.add('hidden'); openModels(); return; } $('#prompt-input').value = b.dataset.command + ' '; $('#prompt-input').focus(); $('#command-menu').classList.add('hidden'); }); }
function resetLogin(message = '') {
  for (const id of ['login-link-wrap', 'login-code-wrap', 'login-interaction', 'cancel-login']) $('#' + id).classList.add('hidden');
  $('#login-link').removeAttribute('href'); $('#login-link').textContent = ''; $('#login-code').textContent = ''; $('#login-response').value = '';
  $('#login-instructions').textContent = message; $('#login-button').classList.remove('hidden');
}
$('#cancel-login').onclick = async () => {
  const item = selected(); if (!item) return;
  $('#cancel-login').disabled = true;
  try { await api(`/api/instances/${item.id}/login-cancel`, 'POST', {}); if (state.selected === item.id) resetLogin('已取消'); }
  catch (e) { toast(e.message); }
  finally { $('#cancel-login').disabled = false; }
};
function showLogin(data) {
  $('#resource-settings').open = true;
  $('#cancel-login').classList.remove('hidden'); $('#login-button').classList.add('hidden');
  const urls = data.urls || [];
  if (urls.length) {
    const link = urls.find(url => /user_code=|verification|device|authorize/i.test(url)) || urls[0];
    $('#login-link-wrap').classList.remove('hidden'); $('#login-link').href = link; $('#login-link').textContent = link;
    $('#login-instructions').textContent = '在浏览器中打开链接';
    if (data.code && !link.includes(data.code)) { $('#login-code-wrap').classList.remove('hidden'); $('#login-code').textContent = data.code; }
  } else $('#login-instructions').textContent = /无法启动|错误|error:/i.test(data.text || '') ? data.text.slice(-250) : '获取中…';
}
async function showPermission(d, instanceId) {
  const params = d.params || {};
  if (params.questions) {
    const answers = await confirmAction({ title: 'Codex 需要补充信息', confirmLabel: '提交', body: params.questions.map((q,i) => `<label>${esc(q.question)}${q.options?.length ? `<small>${q.options.map(o => esc(o.label + '：' + o.description)).join('<br>')}</small>` : ''}<input autocomplete="off" type="${q.isSecret ? 'password' : 'text'}" data-answer="${i}" /></label>`).join(''), collect: modal => Object.fromEntries(params.questions.map((q,i) => [q.id, { answers: [modal.querySelector(`[data-answer="${i}"]`).value] }])) });
    return api(`/api/instances/${instanceId}/permission`, 'POST', { requestId: d.id, answers: answers || {} }).catch(e => toast(e.message));
  }
  const options = params.options || []; if (!options.length) return;
  const label = params.toolCall?.title || 'CLI 请求执行操作'; const chosen = await confirmAction({ title: '操作审核', body: `<p>${esc(label)}</p>`, confirmLabel: options.find(o => o.kind?.startsWith('allow'))?.name || '允许', cancelLabel: '拒绝' });
  const option = options.find(o => chosen ? o.kind?.startsWith('allow') : o.kind?.startsWith('reject')) ;
  if (!option) return toast('代理未提供对应的权限选项，未提交授权');
  api(`/api/instances/${instanceId}/permission`, 'POST', { requestId: d.id, optionId: option.optionId }).catch(e => toast(e.message));
}
async function showExternalUrl(d) { const link = d.url || d.externalUrl; if (!link || !/^https?:\/\//i.test(link)) return; if (await confirmAction({ title: '打开链接', body: `<p>Kiro 请求在新标签页打开：</p><p class="confirm-path">${esc(link)}</p>`, confirmLabel: '打开' })) window.open(link, '_blank', 'noopener'); }
async function refresh() {
  const data = await api('/api/state'); state.defaultImportPath = data.defaultImportPath; state.instances = data.instances;
  loadFormDefaults(data.formDefaults || {});
  resources.hydrate();
  await migrateLegacyWork(resources, globalThis.localStorage);
  const saved = restoreActiveTab();
  if (!state.selected) {
    const preferred = saved?.instanceId && state.instances.some(x => x.id === saved.instanceId) ? state.instances.find(x => x.id === saved.instanceId) : null;
    state.selected = preferred?.id || state.instances[0]?.id || null;
    if (preferred && saved?.sessionId && preferred.conversations?.some(c => c.sessionId === saved.sessionId)) preferred.sessionId = saved.sessionId;
  }
  if (state.selected && !state.instances.some(x => x.id === state.selected)) state.selected = state.instances[0]?.id || null;
  rememberActiveTab(); render();
  if (state.selected && !state.source) { connectEvents(selected()); await loadSession(selected().sessionId); }
}
function openCreate(item, importOnly = false) {
  $('#field-provider').value = providerFor(item).id; $('#field-provider').disabled = !!item; $('#provider-label').classList.toggle('hidden', importOnly);
  $('#field-simulation').checked = item ? !!item.simulation : switchPreference('simulation', false);
  $('#field-simulation').disabled = !!item;
  $('#simulation-label').classList.toggle('hidden', importOnly);
  $('#simulation-label').classList.toggle('is-disabled', !!item);
  $('#simulation-label').title = item ? '测试模式在创建后不可更改' : '';
  $('#field-name').parentElement.classList.toggle('hidden', importOnly);
  $('#profile-template').classList.toggle('hidden', importOnly);
  void loadProfileTemplate(item);
  $('#config-account-methods').classList.toggle('hidden', !item || importOnly);
  $('#modal').classList.remove('hidden'); $('#modal-error').classList.add('hidden'); $('#modal-title').textContent = item ? '编辑配置' : '添加配置';
  if (importOnly) $('#modal-title').textContent = '导入账号';
  $('#field-import').value = ''; $('#import-path-label').classList.remove('hidden'); $('#import-help').classList.remove('hidden'); $('#field-import').placeholder = item?.provider === 'codex' ? '用户目录或 .codex' : state.defaultImportPath || '用户目录、.kiro 或 kiro-cli 登录数据目录';
  updateImportHelp(item?.provider || $('#field-provider').value);
  if (item && !importOnly) { $('#import-path-label').classList.add('hidden'); $('#import-help').classList.add('hidden'); }
  if (!item && $('#field-simulation').checked) { $('#import-path-label').classList.add('hidden'); $('#import-help').classList.add('hidden'); }
  $('#field-name').value = item?.name || uniqueProfileName(providerFor(item).name + ' 配置', state.instances); $('#modal-save').innerHTML = item ? `保存 ${icon('save')}` : `添加 ${icon('arrow-up-right')}`; $('#modal-save').dataset.id = item?.id || '';
}
function updateImportHelp(provider) {
  $('#import-help').textContent = provider === 'codex'
    ? 'Codex 登录信息位于用户目录的 .codex/auth.json；可选用户目录或 .codex。'
    : 'Kiro CLI 登录库在 Windows %LOCALAPPDATA%\\kiro-cli 或 Linux ~/.local/share/kiro-cli；选择 .kiro 只导入 IDE 设置。代理需单独配置，账号限制出口 IP 时登录和使用保持同一代理。';
}
let templateRequest = 0;
async function loadProfileTemplate(item) {
  const request = ++templateRequest;
  $('#modal-save').disabled = true;
  try {
    const value = item?.settings || (await api('/api/settings')).settings.tools[$('#field-provider').value];
    if (request !== templateRequest) return;
    const catalog = await templateModels($('#field-provider').value, value.model ?? item?.defaultModel ?? '', item?.id);
    if (request !== templateRequest) return;
    $('#profile-model').innerHTML = catalog;
    $('#profile-trust').checked = value.trustAllTools;
    $('#profile-auto').checked = value.autoCompact;
    $('#profile-threshold').value = value.threshold;
    $('#profile-effort').value = value.reasoningEffort || '';
    $('#profile-effort').dispatchEvent(new Event('change'));
  } catch (error) { toast(error.message); return; }
  if (request === templateRequest) $('#modal-save').disabled = false;
}
$('#field-provider').onchange = () => { void loadProfileTemplate(); $('#field-name').value = uniqueProfileName(providerFor({ provider: $('#field-provider').value }).name + ' 配置', state.instances); $('#field-import').placeholder = $('#field-provider').value === 'codex' ? '用户目录或 .codex' : state.defaultImportPath || '用户目录、.kiro 或 kiro-cli 登录数据目录'; updateImportHelp($('#field-provider').value); };
$('#field-simulation').onchange = () => { const simulated = $('#field-simulation').checked; rememberSwitch('simulation', simulated); $('#import-path-label').classList.toggle('hidden', simulated); $('#import-help').classList.toggle('hidden', simulated); if (simulated) $('#field-import').value = ''; };
// Session creation options belong to the new session, not global form preferences.
$('#cleanup-workspace').onchange = () => { rememberSwitch('cleanup-workspace', $('#cleanup-workspace').checked); renderDeleteSessionScope(); };
function closeCreate() { $('#modal').classList.add('hidden'); }
async function saveInstance() {
  if ($('#modal-save').disabled) return;
  $('#modal-save').disabled = true;
  const id = $('#modal-save').dataset.id; const data = { provider: $('#field-provider').value, simulation: $('#field-simulation').checked, importPath: $('#field-import').value.trim().replace(/^["']|["']$/g, '').trim().replaceAll('\\', '/'), name: $('#field-name').value.trim() || ($('#field-simulation').checked ? '模拟测试' : providerFor({ provider: $('#field-provider').value }).name + ' 配置') };
  data.settings = { model: $('#profile-model').value, trustAllTools: $('#profile-trust').checked, autoCompact: $('#profile-auto').checked, threshold: Number($('#profile-threshold').value), reasoningEffort: $('#profile-effort').value };
  const button = $('#modal-save'), label = button.innerHTML;
  button.textContent = id ? '保存中…' : '创建中…'; $('#modal-error').classList.add('hidden');
  try {
    const result = id ? await api(`/api/instances/${id}`, 'PATCH', data) : await api('/api/instances', 'POST', data);
    const index = state.instances.findIndex(item => item.id === result.instance.id);
    if (index < 0) state.instances.push(result.instance); else state.instances[index] = result.instance;
    if (!id) {
      state.source?.close(); state.source = null;
      state.selected = result.instance.id; state.messages = []; state.commands = []; state.initialized = null; state.configOptions = []; state.contextUsage = null;
      resetLogin(); connectEvents(result.instance);
      rememberActiveTab();
    }
    closeCreate(); render();
    if (data.importPath && result.loginImported === false && providerFor(result.instance).id === 'kiro') toast('设置已导入，但未找到 Kiro CLI 登录凭据；请用此配置的代理登录');
    else toast(result.instance.name !== data.name ? `重名，已命名为「${result.instance.name}」` : (id ? '配置已保存' : '配置已创建'));
  } catch (e) { $('#modal-error').textContent = e.message; $('#modal-error').classList.remove('hidden'); }
  finally { button.disabled = false; button.innerHTML = label; }

}
$('#modal-delete').onclick = async () => {
  const id = selected()?.id;
  if (!id || $('#modal-delete').disabled || $('#modal-save').disabled) return;
  const item = state.instances.find(item => item.id === id);
  if (!await confirmAction({ title: '删除配置', danger: true, confirmLabel: '永久删除', body: `<p class="confirm-name">${esc(item?.name || 'Kiro')}</p><section class="delete-scope"><b>将删除</b><ul><li>此配置的登录信息与设置</li><li>全部会话、聊天记录、输入草稿和任务队列</li><li>此配置专属管理目录及其中全部文件</li></ul></section><section class="delete-scope keep"><b>保留</b><ul><li>用户指定的外部目录及文件</li><li>其他配置与会话</li></ul></section><p class="delete-warning">永久删除，无法恢复。</p>` })) return;
  $('#modal-delete').disabled = true; $('#modal-save').disabled = true;
  try {
    const nextId = previousAfterDeletion(state.instances, id);
    await api(`/api/instances/${id}`, 'DELETE');
    clearChatWork(id);
    if (state.selected === id) {
      state.source?.close(); state.source = null; state.selected = nextId;
      state.messages = []; state.commands = []; state.initialized = null; state.busy = false;
      $('#connection-error').classList.add('hidden');
    }
    closeCreate(); await refresh(); toast('配置已删除');
  } catch (e) { toast(e.message); }
  finally { $('#modal-delete').disabled = false; $('#modal-save').disabled = false; }
};
$('#add-instance').onclick = () => openCreate(); $('#hero-create').onclick = () => openCreate(); $('#modal-close').onclick = closeCreate; $('#modal-cancel').onclick = closeCreate; $('#modal-save').onclick = saveInstance; $('#edit-instance').onclick = () => openCreate(selected());
$('#login-provider').onchange = () => $('#login-org-fields').classList.toggle('hidden', $('#login-provider').value !== 'organization');
$('#login-button').onclick = async () => { try { const item = selected(); $('#login-card').classList.remove('hidden'); $('#login-instructions').textContent = '获取中…'; $('#login-link-wrap').classList.add('hidden'); $('#login-code-wrap').classList.add('hidden'); $('#login-fields').classList.add('hidden'); const data = { provider: $('#login-provider').value, identityProvider: $('#login-start-url').value.trim(), region: $('#login-region').value.trim() }; await api(`/api/instances/${item.id}/login`, 'POST', data); } catch (e) { $('#login-instructions').textContent = e.message; } };
$('#login-send-response').onclick = async () => { try { const text = $('#login-response').value; await api(`/api/instances/${selected().id}/login-input`, 'POST', { text }); $('#login-response').value = ''; toast('已发送到 Kiro CLI'); } catch (e) { toast(e.message); } };
async function connectSelected() { const item = selected(); if (await ensureConnected(item) && state.selected === item.id) { await refreshCredits(); if (item.sessionId) await loadSession(item.sessionId).catch(e => toast(e.message)); } }
$('#start-button').onclick = connectSelected;
$('#connect-button').onclick = connectSelected;
$('#stop-button').onclick = async () => { try { await api(`/api/instances/${selected().id}/stop`, 'POST', {}); selected().status = 'stopped'; render(); } catch (e) { toast(e.message); } };
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const input = document.createElement('textarea'); input.value = text; document.body.append(input); input.select();
      const copied = document.execCommand('copy'); input.remove(); if (!copied) throw new Error('copy failed');
    }
    toast('已复制');
  } catch { toast('浏览器未允许复制，请选中内容手动复制'); }
}
$('#copy-login').onclick = () => copyText($('#login-link').href);
$('#copy-code').onclick = () => copyText($('#login-code').textContent);
$('#transfer-chat').onclick = async () => {
  if (state.busy || queueDraining) return toast('请先停止当前任务');
  const item = selected(), sessionId = item?.sessionId;
  if (!sessionId) return;
  const targets = state.instances.filter(profile => profile.id !== item.id && !profile.archived);
  if (!targets.length) return toast('请先添加另一份配置');
  const targetId = await chooseTransferTarget(targets);
  if (!targetId || selected() !== item || item.sessionId !== sessionId) return;
  const button = $('#transfer-chat'); button.disabled = true; state.busy = true;
  queueMayContinue = false;
  try {
    if (!await resources.flush()) throw new Error('草稿或队列尚未保存，请重试');
    button.textContent = '迁移中…';
    const result = await api(`/api/instances/${item.id}/transfer`, 'POST', { sessionId, targetId });
    resources.remove(item.id, sessionId);
    const snapshot = await api('/api/state'); state.instances = snapshot.instances; resources.hydrate();
    state.busy = false; selectInstance(result.targetId); toast('会话已迁移'); focusPromptInput();
  } catch (error) { toast(`迁移失败：${error.message}`); }
  finally { state.busy = false; button.textContent = '迁移'; renderSessions(); }
};
$('#clear-chat').onclick = async () => {
  if (state.busy || queueDraining) return toast('请等待当前任务完成');
  const item = selected();
  if (!item?.sessionId || !await ensureConnected(item) || selected() !== item) return;
  await executePrompt('/clear', true);
};
$('#command-toggle').onclick = () => $('#command-menu').classList.toggle('hidden'); document.addEventListener('click', e => { if (!e.target.closest('#command-menu') && !e.target.closest('#command-toggle')) $('#command-menu').classList.add('hidden'); });
let compacting = false;
let compactStartedAt = 0;
function compactElapsed() {
  const seconds = Math.floor((performance.now() - compactStartedAt) / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
let autoCompactEnabled = false;
let compactThreshold = 80;
$('#auto-compact').checked = autoCompactEnabled;
$('#compact-threshold').value = compactThreshold;
$('#compact-threshold-display').textContent = `${compactThreshold}%`;
function compressionKey() { return selected()?.sessionId ? `${state.selected}:${selected().sessionId}` : null; }
function syncCompressionSettings() {
  const key = compressionKey(), value = resources.get(key);
  autoCompactEnabled = value.autoCompact === true;
  compactThreshold = value.threshold || 80;
  $('#auto-compact').checked = autoCompactEnabled;
  $('#auto-compact').disabled = !key;
  $('#compact-threshold').value = compactThreshold;
  $('#compact-threshold-display').textContent = `${compactThreshold}%`;
}
function compressionLocked(key) { return resources.get(key).compactionBlocked === true; }
function lockCompression(key) { resources.set(key, { compactionBlocked: true }); }
function observeCompressionUsage(percentage) {
  const key = compressionKey();
  if (key && !compacting && percentage < compactThreshold) { resources.set(key, { compactionBlocked: false }); }
}
async function maybeAutoCompact() {
  const key = compressionKey();
  if (!autoCompactEnabled || !key || compacting || selected()?.status !== 'running' || state.contextUsage == null || state.contextUsage < compactThreshold || compressionLocked(key)) return;
  if (!supports('compact')) return;
  await requestCompression(true);
}
$('#auto-compact').onchange = () => { autoCompactEnabled = $('#auto-compact').checked; resources.set(compressionKey(), { autoCompact: autoCompactEnabled }); void maybeAutoCompact(); };
const thresholdInput = $('#compact-threshold');
const thresholdDisplay = $('#compact-threshold-display');
thresholdDisplay.onclick = () => {
  thresholdDisplay.classList.add('hidden'); thresholdInput.classList.remove('hidden');
  thresholdInput.value = compactThreshold; thresholdInput.focus(); thresholdInput.select();
};
thresholdInput.onblur = () => {
  compactThreshold = Math.min(100, Math.max(1, Number(thresholdInput.value) || compactThreshold));
  thresholdInput.value = compactThreshold; thresholdDisplay.textContent = `${compactThreshold}%`;
  thresholdInput.classList.add('hidden'); thresholdDisplay.classList.remove('hidden');
  resources.set(compressionKey(), { threshold: compactThreshold }); void maybeAutoCompact();
};
thresholdInput.onkeydown = event => {
  if (event.key !== 'Enter' && event.key !== 'Escape') return;
  event.preventDefault(); event.stopPropagation();
  if (event.key === 'Escape') thresholdInput.value = compactThreshold;
  thresholdInput.blur(); thresholdDisplay.focus();
};
async function compactSession(clearInput = false, automatic = false) {
  if (state.busy) return toast('请等待当前回复完成');
  const item = selected();
  if (!item?.sessionId || item.status !== 'running') return;
  if (clearInput) $('#prompt-input').value = ''; saveDraft();
  state.busy = true; compacting = true; lockCompression(compressionKey());
  const originalSession = item.sessionId;
  const compactButton = $('#compact-button');
  compactButton.disabled = true;
  compactStartedAt = performance.now();
  state.messages.push({ role: 'user', text: automatic ? '/compact（自动）' : '/compact' }); renderMessages(true);
  const compactTimer = setInterval(() => {
    const elapsed = $('#compact-elapsed');
    if (elapsed) elapsed.textContent = compactElapsed();
  }, 1000);
  try {
    const data = await api(`/api/instances/${item.id}/compact`, 'POST', {});
    if (selected()?.id !== item.id || selected()?.sessionId !== originalSession) return;
    const text = data.status === 'completed' ? '上下文已压缩' : data.status === 'failed' ? `压缩失败${data.error ? `：${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}` : ''}` : data.status === 'cancelled' ? '压缩已取消' : '压缩结果未确认，未收到完成通知';
    state.messages.push({ role: 'assistant', text, final: true });
    queueMayContinue = data.status === 'completed';
  } catch (e) { state.messages.push({ role: 'assistant', text: e.message, final: true }); }
  finally {
    clearInterval(compactTimer);
    state.busy = false; compacting = false;
    await applyPendingModelOptions();
    refreshContext();
    $('#compact-button').textContent = '压缩'; renderUsage(); renderMessages(true);
  }
}
async function requestCompression(automatic = false) {
  const key = queueKey();
  if (!key || compacting) return;
  if (!state.busy && !await applyPendingModelOptions()) return;
  const entries = activeQueue();
  if (entries.some(entry => entry.kind === 'compact')) return;
  if (state.busy || queueDraining || entries.length) {
    if (!promptQueues.has(key)) promptQueues.set(key, entries);
    entries.unshift({ id: crypto.randomUUID(), kind: 'compact', automatic, text: automatic ? '自动压缩' : '压缩' });
    renderQueue();
    if (!state.busy && !queueDraining) { queueMayContinue = true; await drainQueue(); }
    return;
  }
  await compactSession(false, automatic);
}
$('#compact-button').onclick = async () => { await requestCompression(); await drainQueue(); };
async function promptRequest(item, text, queued) {
  state.replyPending = true; state.cancelRequested = false; renderCancelReply();
  try { return await api(`/api/instances/${item.id}/prompt`, 'POST', { text, queued }); }
  finally { state.replyPending = false; renderCancelReply(); }
}
async function executePrompt(text, queued = false) {
  if (!text || state.busy) return; const item = selected(); if (!item || item.status !== 'running') return toast('请先连接');
  if (!item.sessionId) return toast('请先新建会话');
  if (!await applyPendingModelOptions()) return;
  await maybeAutoCompact();
  if (state.busy) return;
  if (text === '/compact') { if (!queued) $('#prompt-input').value = ''; saveDraft(); await requestCompression(); return; }
  if (text === '/model') { if (!queued) $('#prompt-input').value = ''; saveDraft(); openModels(); return; }
  if (text.startsWith('/model ')) { openModels(); await changeModel(text.slice(7).trim()); if (!queued) $('#prompt-input').value = ''; saveDraft(); return; }
  if (text === '/clear') {
    if (!queued) $('#prompt-input').value = '';
    saveDraft(); persistChatWork();
    if (!await resources.flush()) return toast('会话状态尚未保存，请重试');
    state.busy = true; queueMayContinue = false;
    const previousId = item.sessionId;
    try {
      const data = await api(`/api/instances/${item.id}/clear`, 'POST', { trustAllTools: item.conversations?.find(entry => entry.sessionId === previousId)?.trustAllTools !== false });
      item.conversations = (item.conversations || []).filter(entry => entry.sessionId !== previousId);
      applyCreatedSession(item, data);
    } catch (e) { toast(e.message); }
    finally { state.busy = false; renderCancelReply(); renderQueue(); focusPromptInput(); }
    return;
  }
  if (!queued) $('#prompt-input').value = ''; saveDraft(); state.messages.push({ role: 'user', text }); state.busy = true; renderMessages(true);
  if (text === '/help') { queueMayContinue = true; state.messages.push({ role: 'assistant', text: `快捷命令\n${state.commands.map(c => `${c.name}  ${c.description}`).join('\n')}\n\n其他 / 命令作为文本发送，具体支持由当前 CLI 决定。` }); state.busy = false; renderMessages(true); renderQueue(); return 'completed'; }

  const mode = text.match(/^\/mode\s+(\S+)(?:\s+([\s\S]+))?$/);
  if (mode) { try { await api(`/api/instances/${item.id}/mode`, 'POST', { modeId: mode[1] }); if (mode[2]) { const response = await promptRequest(item, mode[2], queued); if (response.result?.stopReason === 'cancelled') state.cancelRequested = true; queueMayContinue = !state.cancelRequested && response.result?.stopReason === 'end_turn'; } else { queueMayContinue = true; state.messages.push({ role: 'assistant', text: `已切换模式：${mode[1]}` }); } } catch (e) { if (!state.cancelRequested) toast(e.message); } const cancelled = state.cancelRequested; state.busy = false; state.cancelRequested = false; await applyPendingModelOptions(); renderCancelReply(); renderMessages(true); renderQueue(); return cancelled ? 'cancelled' : 'completed'; }
  try { const response = await promptRequest(item, text, queued); if (response.result?.stopReason === 'cancelled') state.cancelRequested = true; queueMayContinue = !state.cancelRequested && response.result?.stopReason === 'end_turn'; } catch (e) { if (!state.cancelRequested) { state.messages.push({ role: 'assistant', text: `请求失败：${e.message}`, error: true }); renderMessages(true); } }
  const last = [...state.messages].reverse().find(m => m.role === 'assistant'); if (last) last.final = true;
  const cancelled = state.cancelRequested;
  state.busy = false; state.cancelRequested = false; const switched = await applyPendingModelOptions(); renderCancelReply(); renderMessages(true); renderQueue(); refreshCredits(); if (switched) await maybeAutoCompact();
  return cancelled ? 'cancelled' : 'completed';
}
const { promptQueues, saveDraft, syncDraft, persistChatWork, clearChatWork, migrateNewDraft } = createChatStorage({
  selected, resources,
  getQueueEditor: () => activeQueueEditor,
  clearQueueEditor: () => { activeQueueEditor = null; },
});
let queueMayContinue = false;
let queueDraining = false;
let queueCollapsed = false;
try { queueCollapsed = browserPreference('queue-collapsed') === 'true'; } catch {}
function queueKey() { const item = selected(); return item?.sessionId ? `${item.id}:${item.sessionId}` : null; }
function activeQueue() { return promptQueues.get(queueKey()) || []; }
let activeQueueEditor = null;
function bindQueueEditButton(button, entry, row, panel) {
  button.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (entry.editing || entry.kind === 'compact') return;
    if (activeQueueEditor) activeQueueEditor.finish(true, false);
    if (!button.isConnected) return;
    const editor = document.createElement('textarea'); editor.autocomplete = 'off'; editor.value = entry.text; editor.rows = 1;
    editor.setAttribute('aria-label', '编辑队列，Tab、Enter 或 Esc 保存');
    entry.editing = true;
    button.replaceWith(editor);
    const fitEditor = () => {
      editor.style.height = 'auto';
      const maxHeight = Math.max(72, Math.min(window.innerHeight * .65, $('.chat-body').clientHeight * .7));
      const height = Math.min(editor.scrollHeight, maxHeight);
      editor.style.height = `${height}px`;
      editor.style.overflowY = editor.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };
    fitEditor();
    let finished = false;
    const finish = (save, drain = true) => {
      if (finished) return;
      finished = true;
      if (save && editor.value.trim()) entry.text = editor.value.trim();
      entry.editing = false;
      if (activeQueueEditor?.editor === editor) activeQueueEditor = null;
      renderQueue();
      if (drain) drainQueue();
    };
    activeQueueEditor = { entry, editor, finish };
    editor.onkeydown = e => {
      if (e.isComposing) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(true); }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); finish(true); }
    };
    editor.oninput = () => { fitEditor(); persistChatWork(); };
    // Allow a click on another queue item or its cancel button to run first.
    editor.onblur = () => setTimeout(() => {
      if (editor.isConnected && document.activeElement !== editor) finish(true);
    }, 0);
    requestAnimationFrame(() => {
      if (!editor.isConnected || finished) return;
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(editor.value.length, editor.value.length);
      fitEditor();
      const rowRect = row.getBoundingClientRect(), panelRect = panel.getBoundingClientRect();
      if (rowRect.bottom > panelRect.bottom) panel.scrollTop += rowRect.bottom - panelRect.bottom;
      else if (rowRect.top < panelRect.top) panel.scrollTop -= panelRect.top - rowRect.top;
    });
  };
}
function renderQueue() {
  saveDraft();
  const panel = $('#prompt-queue');
  const entries = activeQueue();
  panel.classList.toggle('hidden', !entries.length);
  panel.classList.toggle('is-collapsed', queueCollapsed);
  const collapse = $('#queue-collapse');
  collapse.setAttribute('aria-expanded', String(!queueCollapsed));
  collapse.title = queueCollapsed ? '展开队列' : '折叠队列';
  collapse.querySelector('use').setAttribute('href', queueCollapsed ? '/icons.svg#chevron-right' : '/icons.svg#chevron-down');
  const resume = $('#queue-resume');
  resume.classList.toggle('hidden', !entries.length || state.busy || queueDraining || queueMayContinue || selected()?.status !== 'running');
  const existing = new Map([...panel.querySelectorAll('.queue-row')].map(row => [row.dataset.queueId, row]));
  const kept = new Set();
  let added = false;
  let nextRow = panel.querySelector('.queue-heading').nextElementSibling;
  // Bottom-left keeps FIFO display order; top-right reverses it so new items stay at the anchored edge.
  const displayEntries = $('.chat-body').classList.contains('queue-right') ? [...entries].reverse() : entries;
  displayEntries.forEach(entry => {
    let row = existing.get(entry.id);
    if (!row) {
      added = true;
      row = document.createElement('div'); row.className = 'queue-row'; row.dataset.queueId = entry.id;
      const edit = document.createElement('button'); edit.className = 'queue-edit';
      const cancel = document.createElement('button'); cancel.className = 'queue-cancel'; cancel.setAttribute('aria-label', '取消此条队列'); cancel.innerHTML = icon('x');
      row.append(edit, cancel);
      cancel.onclick = () => {
        if (activeQueueEditor?.entry === entry) activeQueueEditor.finish(false, false);
        const i = entries.indexOf(entry); if (i !== -1) entries.splice(i, 1); renderQueue();
      };
      bindQueueEditButton(edit, entry, row, panel);
    }
    kept.add(entry.id);
    if (!entry.editing && row.querySelector('textarea')) {
      const button = document.createElement('button'); button.className = 'queue-edit';
      bindQueueEditButton(button, entry, row, panel);
      row.querySelector('textarea').replaceWith(button);
    }
    if (!row.querySelector('textarea')) {
      const button = row.querySelector('.queue-edit');
      if (button.textContent !== entry.text) button.textContent = entry.text;
      button.title = entry.text;
      button.disabled = entry.kind === 'compact';
    }
    if (nextRow !== row) panel.insertBefore(row, nextRow || null);
    nextRow = row.nextElementSibling;
  });
  for (const row of panel.querySelectorAll('.queue-row')) if (!kept.has(row.dataset.queueId)) row.remove();
  if (added && !entries.some(entry => entry.editing)) {
    panel.scrollTop = $('.chat-body').classList.contains('queue-right') ? 0 : panel.scrollHeight;
  }
}
$('#queue-collapse').onclick = () => {
  queueCollapsed = !queueCollapsed;
  try { rememberBrowserPreference('queue-collapsed', String(queueCollapsed)); } catch {}
  renderQueue();
};
$('#queue-resume').onclick = async () => {
  if (state.busy || queueDraining || !activeQueue().length) return;
  if (!await ensureSession(selected())) return;
  queueMayContinue = true;
  drainQueue();
};
function addPromptToQueue(text) {
  const input = $('#prompt-input'), key = queueKey();
  if (!text || !key) return;
  if (text === '/compact') { input.value = ''; saveDraft(); void requestCompression(); return; }
  if (!promptQueues.has(key)) promptQueues.set(key, []);
  promptQueues.get(key).push({ id: crypto.randomUUID(), text });
  input.value = ''; saveDraft(); input.style.height = 'auto'; renderQueue();
  // An idle Tab starts the queue; an active turn releases it only on end_turn.
  if (!state.busy && !queueDraining) queueMayContinue = true;
  drainQueue();
}
async function ensureSession(item) {
  const restoring = sessionLoads.get(`${item?.id}:${item?.sessionId}`);
  if (restoring) {
    try { await restoring; } catch (error) { toast(error.message); return false; }
  }
  const needsReplay = item?.conversations?.find(entry => entry.sessionId === item.sessionId)?.disconnected;
  if (!item || !await ensureConnected(item) || state.selected !== item.id) return false;
  if (item.sessionId) {
    if (state.busy && item.status === 'running') return true;
    const sessionId = item.sessionId;
    try {
      const entry = await api(`/api/instances/${item.id}/select-session`, 'POST', { sessionId, connect: true });
      if (state.selected !== item.id || item.sessionId !== sessionId) return false;
      if (entry.init) acceptInit(entry.init);
      acceptSession(entry.session);
      if (needsReplay) { state.messages = []; replayHistory(entry.events); }
      return true;
    } catch (error) { toast(error.message); return false; }
  }
  if (state.busy) return false;
  const input = $('#prompt-input');
  state.busy = true; input.disabled = true;
  try {
    const data = await api(`/api/instances/${item.id}/sessions`, 'POST', { cwd: '', trustAllTools: item.settings.trustAllTools });
    applyCreatedSession(item, data);
    return true;
  } catch (e) { toast(`自动创建会话失败：${e.message}`); return false; }
  finally { state.busy = false; renderSessions(); focusPromptInput(); }
}
async function enqueuePrompt() {
  const text = $('#prompt-input').value.trim();
  if (!text) return;
  if (!await ensureSession(selected())) return;
  addPromptToQueue(text);
}
async function drainQueue() {
  if (queueDraining || state.busy || !queueMayContinue) return;
  const key = queueKey();
  queueDraining = true;
  try {
    while (queueMayContinue && !state.busy && queueKey() === key && selected()?.status === 'running') {
      if (!await applyPendingModelOptions()) break;
      await maybeAutoCompact();
      const entries = activeQueue(), entry = entries[0];
      if (!entry || entry.editing) break;
      entries.shift(); renderQueue();
      queueMayContinue = false;
      const outcome = entry.kind === 'compact' ? await compactSession(false, entry.automatic) : await executePrompt(entry.text, true);
      if (outcome === 'cancelled') {
        // Already sent: preserve the partial reply, never replay a cancelled task automatically.
        queueMayContinue = false;
        renderQueue();
        break;
      }
    }
  } finally { queueDraining = false; renderQueue(); }
}
async function steerPrompt() {
  const input = $('#prompt-input'), text = input.value.trim(), item = selected();
  if (!text || !state.replyPending || state.cancelRequested) return;
  if (!extensions(state.initialized).includes('_session/steer')) return toast('当前 CLI 不支持中途插话，可用 Tab 排队');
  try {
    await api(`/api/instances/${item.id}/steer`, 'POST', { text });
    if (input.value.trim() === text) { input.value = ''; saveDraft(); input.style.height = 'auto'; }
    toast('插话已提交');
  } catch (error) { toast(error.message); }
}
async function sendPrompt() {
  const input = $('#prompt-input'), text = input.value.trim();
  if (!text) return;
  const item = selected();
  if (!await ensureSession(item)) return;
  if (text === '/compact') { input.value = ''; saveDraft(); await requestCompression(); return; }
  // Preserve queued work when sending while another operation is busy.
  if (state.busy || queueDraining || activeQueue().length) {
    addPromptToQueue(text);
    return;
  }
  queueMayContinue = false;
  await executePrompt(text);
  await drainQueue();
}
$('#prompt-input').addEventListener('keydown', e => {
  if (e.isComposing) return;
  if (e.key === 'Escape' && state.replyPending) { e.preventDefault(); e.stopPropagation(); cancelReply(); return; }
  if (e.key === 'Tab' && !e.shiftKey && e.currentTarget.value.trim()) { e.preventDefault(); enqueuePrompt(); return; }
  if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (e.currentTarget.value.trim() === '/compact') sendPrompt(); else if (state.replyPending) steerPrompt(); else sendPrompt();
  }
  if (e.key === '/' && !e.currentTarget.value) $('#command-menu').classList.remove('hidden');
});
$('#cancel-reply').onclick = cancelReply;
$('#prompt-input').addEventListener('input', e => { saveDraft(); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; });
$('#new-chat').onclick = () => {
  if (state.busy) return toast('请等待当前回复完成');
  $('#session-cwd').value = ''; $('#session-trust-tools').checked = selected().settings.trustAllTools; $('#session-error').classList.add('hidden');
  $('#session-modal').classList.remove('hidden'); $('#session-cwd').focus();
};
$('#session-close').onclick = $('#session-cancel').onclick = () => $('#session-modal').classList.add('hidden');
function applyCreatedSession(item, data) {
  const entry = data.entry || { sessionId: data.sessionId, title: `会话 ${(item.conversations || []).length + 1}`, cwd: data.session.cwd, createdAt: new Date().toISOString(), session: data.session };
  item.conversations ||= [];
  if (!item.conversations.some(c => c.sessionId === entry.sessionId)) item.conversations.push(entry);
  if (state.selected === item.id) migrateNewDraft(item, data.sessionId);
  item.sessionId = data.sessionId;
  if (state.selected === item.id) rememberActiveTab();
  if (state.selected !== item.id) return;
  state.messages = []; acceptSession(data.session); renderSessions(); renderMessages();
}
$('#session-create').onclick = async () => {
  const button = $('#session-create');
  if (state.busy || button.disabled) return;
  const item = selected(), label = button.textContent;
  state.busy = true; button.disabled = true; button.textContent = '创建中…'; $('#session-error').classList.add('hidden');
  try {
    if (!await ensureConnected(item)) return;
    const data = await api(`/api/instances/${item.id}/sessions`, 'POST', { cwd: $('#session-cwd').value.trim(), trustAllTools: $('#session-trust-tools').checked });
    applyCreatedSession(item, data);
    $('#session-modal').classList.add('hidden');
    focusPromptInput();
  } catch (e) { $('#session-error').textContent = e.message; $('#session-error').classList.remove('hidden'); }
  finally { state.busy = false; button.disabled = false; button.textContent = label; }
};
$('#session-cwd').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (!$('#session-create').disabled) $('#session-create').click(); } };
for (const [button, target] of [['#open-workspace', 'workspace'], ['#workspace-directory-shortcut', 'workspace'], ['#open-session-directory', 'session'], ['#session-directory-shortcut', 'session']]) {
  $(button).onclick = async () => {
    const item = selected(); if (!item || (target === 'session' && !item.sessionId)) return;
    try { await api(`/api/instances/${item.id}/open-directory`, 'POST', { target, sessionId: item.sessionId }); }
    catch (e) { toast(e.message); }
  };
}
$('#copy-cli').onclick = async () => {
  const item = selected();
  const home = item.home;
  const cwd = item.conversations?.find(c => c.sessionId === item.sessionId)?.cwd || item.cwd;
  const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  const env = { HOME: home, USERPROFILE: home, KIRO_HOME: home + '/.kiro', CODEX_HOME: home + '/.codex', XDG_CONFIG_HOME: home + '/.config', XDG_DATA_HOME: home + '/.local/share' };
  try {
  const { binary } = await api('/api/cli-command', 'POST', { id: item.id });
  if (item.platform === 'win32') {
    const ps = value => "'" + value.replaceAll("'", "''") + "'";
    const windowsEnv = { ...env, APPDATA: home + '/AppData/Roaming', LOCALAPPDATA: home + '/AppData/Local' };
    copyText(`Set-Location -LiteralPath ${ps(cwd)}; ${Object.entries(windowsEnv).map(([k,v]) => `$env:${k}=${ps(v)}`).join('; ')}; $env:PATH=${ps(binary.slice(0, Math.max(binary.lastIndexOf('\\'), binary.lastIndexOf('/'))))}+[IO.Path]::PathSeparator+$env:PATH; & ${ps(binary)}`);
    return;
  }
  copyText(`cd -- ${quote(cwd)} && env ${Object.entries(env).map(([k, v]) => `${k}=${quote(v)}`).join(' ')} PATH=${quote(binary.includes('/') ? binary.slice(0, binary.lastIndexOf('/')) : '.')}:"$PATH" ${quote(binary)}`);
  } catch (e) { toast(e.message); }
};
async function archiveCurrentSession() {
  if (state.busy) return toast('请先停止当前任务');
  const item = selected(), sessionId = item?.sessionId;
  if (!sessionId) return;
  saveDraft(); persistChatWork();
  if (!await resources.flush()) return toast('会话状态尚未保存，请重试');
  try {
    queueMayContinue = false;
    const result = await api(`/api/instances/${item.id}/archive-session`, 'POST', { sessionId });
    item.conversations = item.conversations.filter(e => e.sessionId !== sessionId);
    item.sessionId = result.sessionId;
    state.messages = []; state.configOptions = []; state.contextUsage = null;
    rememberActiveTab(); renderSessions(); renderMessages();
    if (result.sessionId) await loadSession(result.sessionId);
    toast('已归档', { label: '撤销', run: async () => { await restoreArchivedSession(item.id, sessionId); toast('已恢复'); } });
  } catch (e) { toast(e.message); }
}
async function restoreArchivedSession(profileId, sessionId) {
  if (state.busy) throw new Error('请先停止当前任务');
  queueMayContinue = false;
  const entry = await api(`/api/instances/${profileId}/resume-session`, 'POST', { sessionId });
  if (state.selected !== profileId) return;
  const snapshot = await api('/api/state'); Object.assign(selected(), snapshot.instances.find(i => i.id === profileId));
  resources.accept(`${profileId}:${entry.sessionId}`, entry.workState || {});
  selected().sessionId = entry.sessionId; rememberActiveTab(); state.messages = []; acceptSession(entry.session);
  replayHistory(entry.events);
  renderSessions(); renderMessages(); focusPromptInput();
}
const openHistoryPreview = initHistoryPreview();
initSessionRename({ selected, renderSessions });
let historyProfile, deleteTarget;
async function openHistory() {
  if (state.busy) return toast('请等待当前任务完成');
  historyProfile = state.selected; const profileId = historyProfile;
  $('#history-modal').classList.remove('hidden'); $('#history-list').textContent = '加载中…'; $('#history-error').classList.add('hidden');
  try {
    const data = await api(`/api/instances/${profileId}/history`);
    if (profileId !== state.selected || historyProfile !== profileId) return;
    $('#history-list').innerHTML = data.sessions.map(s => `<div class="history-row"><div class="history-info"><b>${esc(s.title || s.sessionId)}</b><small class="history-path" title="${esc(s.cwd || '')}">${esc(s.cwd || '')}</small><small>${esc(new Date(s.archivedAt).toLocaleString())} · 已归档</small></div><div class="history-actions"><label class="checkbox-label" title="不自动过期"><input type="checkbox" role="switch" data-keep="${esc(s.sessionId)}" ${s.keep ? 'checked' : ''}>保留</label><button class="text-button" data-preview="${esc(s.sessionId)}">预览</button><button class="text-button" data-resume="${esc(s.sessionId)}">恢复</button><button class="text-button danger" data-delete="${esc(s.sessionId)}">删除</button></div></div>`).join('') || '<div class="history-empty">暂无归档会话</div>';
    document.querySelectorAll('[data-preview]').forEach(b => b.onclick = () => openHistoryPreview(profileId, b.dataset.preview));
    document.querySelectorAll('[data-resume]').forEach(b => b.onclick = async () => {
      if (state.busy) return; b.disabled = true;
      try {
        await restoreArchivedSession(profileId, b.dataset.resume);
        $('#history-modal').classList.add('hidden');
      } catch (e) { $('#history-error').textContent = e.message; $('#history-error').classList.remove('hidden'); }
      finally { b.disabled = false; }
    });
    document.querySelectorAll('[data-keep]').forEach(input => input.onchange = async () => {
      input.disabled = true;
      try { await api(`/api/instances/${profileId}/history`, 'PATCH', { sessionId: input.dataset.keep, keep: input.checked }); }
      catch (e) { input.checked = !input.checked; toast(e.message); }
      finally { input.disabled = false; }
    });
    document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => showDeleteSession(profileId, data.sessions.find(s => s.sessionId === b.dataset.delete)));
  } catch (e) { $('#history-list').textContent = ''; $('#history-error').textContent = e.message; $('#history-error').classList.remove('hidden'); }
}
$('#history-sync').onclick = async () => {
  const button = $('#history-sync'); button.disabled = true;
  try {
    const data = await api(`/api/instances/${state.selected}/history-sync`, 'POST', {});
    toast(`已导入 ${data.imported} 条 CLI 历史`); await openHistory();
  } catch (e) { toast(e.message); } finally { button.disabled = false; }
};
function renderDeleteSessionScope() {
  const input = $('#cleanup-workspace');
  const cleanFiles = !input.disabled && input.checked;
  $('#delete-session-files').classList.toggle('hidden', !cleanFiles);
  $('#delete-session-preserve').textContent = input.disabled
    ? '外部工作目录及全部文件、所属配置、登录信息及其他会话。'
    : cleanFiles
      ? '所属配置、登录信息及其他会话。'
      : '此会话的目录及全部文件、所属配置、登录信息及其他会话。';
}
function showDeleteSession(profileId, entry) {
  deleteTarget = { profileId, sessionId: entry.sessionId };
  $('#delete-session-name').textContent = entry.title || '当前会话';
  $('#delete-session-native').classList.toggle('hidden', !entry.ownsNative);
  $('#cleanup-label').classList.remove('hidden');
  $('#cleanup-label').classList.toggle('is-disabled', !entry.canCleanWorkspace);
  $('#cleanup-label').title = entry.canCleanWorkspace ? '' : '外部目录禁止随会话删除';
  $('#cleanup-workspace').disabled = !entry.canCleanWorkspace;
  $('#cleanup-workspace').checked = Boolean(entry.canCleanWorkspace) && switchPreference('cleanup-workspace', true);
  renderDeleteSessionScope();
  $('#delete-session-error').classList.add('hidden'); $('#delete-session-modal').classList.remove('hidden');
}
$('#history-open').onclick = openHistory;
$('#history-close').onclick = () => $('#history-modal').classList.add('hidden');
$('#delete-chat').onclick = archiveCurrentSession;
$('#delete-session-cancel').onclick = () => $('#delete-session-modal').classList.add('hidden');
$('#delete-session-confirm').onclick = async () => {
  if (state.busy) return; const target = { ...deleteTarget }; state.busy = true; $('#delete-session-confirm').disabled = true;
  const profile = state.instances.find(item => item.id === target.profileId);
  const previousSessionId = previousAfterDeletion(profile?.conversations || [], target.sessionId, 'sessionId');
  const wasActive = profile?.sessionId === target.sessionId;
  let selectNext = false;
  try {
    const result = await api(`/api/instances/${target.profileId}/delete-session`, 'POST', { sessionId: target.sessionId, cleanWorkspace: !$('#cleanup-workspace').disabled && $('#cleanup-workspace').checked });
    clearChatWork(target.profileId, target.sessionId);
    if (state.selected === target.profileId) {
      selected().conversations = (selected().conversations || []).filter(s => s.sessionId !== target.sessionId);
      if (wasActive || selected().sessionId === target.sessionId || !selected().sessionId) { selected().sessionId = previousSessionId; state.messages = []; state.contextUsage = null; selectNext = !!previousSessionId; }
      rememberActiveTab();
      renderSessions(); renderMessages();
    }
    $('#delete-session-modal').classList.add('hidden'); toast(result.warning || (result.workspaceCleaned ? '会话和目录已删除' : '会话已删除'));
    state.busy = false;
    if (selectNext) await loadSession(previousSessionId).catch(e => toast(e.message));
    if (!$('#history-modal').classList.contains('hidden')) await openHistory();
  } catch (e) { $('#delete-session-error').textContent = e.message; $('#delete-session-error').classList.remove('hidden'); }
  finally { state.busy = false; $('#delete-session-confirm').disabled = false; }
};


bindDirectoryDrop('#import-path-label', '#field-import', '#modal-error');
bindDirectoryDrop('#session-path-label', '#session-cwd', '#session-error');

$('#import-account').onclick = () => openCreate(selected(), true);

$('#config-import').onclick = () => { $('#import-path-label').classList.remove('hidden'); $('#import-help').classList.remove('hidden'); $('#field-import').focus(); };
$('#config-login').onclick = () => { closeCreate(); $('#resource-settings').open = true; $('#login-button').click(); };


// Initialize listeners before loading state; async rendering uses the same controllers.
const { refreshProxyExit } = initProxy({ selected, render });
initSettings();
initLayout();
refresh().catch(e => toast(e.message));

window.addEventListener('pagehide', () => { state.source?.close(); state.source = null; });
window.addEventListener('pageshow', event => { if (event.persisted) { void refresh().catch(e => toast(e.message)); } });

initSelects();

initPromptFiles({ selected, ensureSession });
