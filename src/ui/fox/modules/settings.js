import { templateModels } from './template-models.js';
import { providerFor } from '../../../headless/fox/providers.js';
import { loadingRegion, reconcileRows } from './loading.js';
import { $, api, esc, toast, confirmAction } from './ui.js';

function versionAction(current, target) {
  const order = target.localeCompare(current || '', undefined, { numeric: true });
  return order === 0 ? '重装' : order < 0 ? '回退' : '升级';
}

function runtimeOptions(runtime, selected) {
  const validated = runtime.validated || [], user = runtime.user || [];
  // Retention uses update order; presentation always uses version order.
  return [...runtime.versions]
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
    .map(({ version }) => {
      const labels = [validated.includes(version) ? '已校验' : '非程序校验版'];
      if (user.includes(version)) labels.push(version === user[0] ? '用户更新' : '用户更新历史');
      if (version === runtime.current) labels.push('当前');
      return `<option value="${esc(version)}" ${selected === version ? 'selected' : ''}>${esc(version)} · ${labels.join(' · ')}</option>`;
    }).join('');
}

export function initSettings() {
  async function desktopRuntime() {
    if (window.foxDesktop?.platform !== 'win32' || !window.foxDesktop?.runtime) return;
    try {
      const info = await window.foxDesktop.runtime();
      if (!info.supported) return;
      $('#desktop-runtime').classList.remove('hidden');
      $('#desktop-mode').value = info.mode;
      $('#desktop-mode option[value=wsl]').disabled = !info.distros.length;
      $('#desktop-distro').innerHTML = info.distros.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
      $('#desktop-distro').value = info.distro || '';
      const update = () => { $('#desktop-distro').classList.toggle('hidden', $('#desktop-mode').value !== 'wsl'); };
      $('#desktop-mode').onchange = update; update();
      $('#desktop-runtime-current').textContent = info.mode === 'wsl' ? `WSL · ${info.distro}` : 'Windows';
      $('#desktop-runtime-note').textContent = (info.notice ? info.notice + ' ' : '') + '首次优先 WSL；不可用时使用 Windows。切换不迁移数据。';
      $('#desktop-runtime-save').onclick = async () => { try { await window.foxDesktop.setRuntime({ mode: $('#desktop-mode').value, distro: $('#desktop-distro').value }); } catch(e) { toast(e.message); } };
    } catch(e) { toast(e.message); }
  }
  // Resolve packaged platform before opening settings, avoiding a late section insertion.
  void desktopRuntime();
  let runtimeTimer;
  async function refreshRuntimes() {
    clearTimeout(runtimeTimer);
    if ($('#runtime-modal').classList.contains('hidden')) return;
    const done = loadingRegion($('#runtime-list'), ['Kiro CLI', 'Codex CLI', 'sing-box'].map(name => `<div class="runtime-row loading-placeholder"><b>${name}</b><small>版本 —</small></div>`).join(''));
    try {
      const { runtimes } = await api('/api/runtimes');
      const list = $('#runtime-list');
      // Keep the focused control or open menu intact during status polling.
      if ((list.contains(document.activeElement) && document.activeElement.matches('select, .theme-select')) || list.querySelector('.theme-select[aria-expanded=true]')) {
        if (!$('#runtime-modal').classList.contains('hidden')) runtimeTimer = setTimeout(refreshRuntimes, 1200);
        return;
      }
      // Preserve a user's version selection while download progress is polled.
      const choices = Object.fromEntries([...list.querySelectorAll('select')].map(s => [s.dataset.name, s.value]));
      reconcileRows(list, runtimes.map(r => `<div class="runtime-row" data-key="${esc(r.name)}"><div class="runtime-heading"><b>${r.name === 'kiro-cli' ? 'Kiro CLI' : r.name === 'sing-box' ? 'sing-box' : r.name === 'codex' ? 'Codex CLI' : esc(r.name)}</b><span>${r.current ? '当前 ' + esc(r.current) + (r.currentValidated ? ' · 已校验' : ' · 非程序校验版') : '未安装'}</span><button class="secondary-button small" data-install="${r.name}" ${r.busy ? 'disabled' : ''}>${r.busy ? '处理中…' : r.latest?.version ? (r.current ? versionAction(r.current, r.latest.version) : '安装') + ' ' + esc(r.latest.version) : r.current ? '拉取最新版' : '安装'}</button>${r.current ? `<button class="text-button" data-uninstall="${r.name}" ${r.busy ? 'disabled' : ''}>卸载</button>` : ''}</div><small>${esc(r.error || r.latest?.error || r.phase || '首次使用按需下载')}${r.busy && r.downloaded ? ` · ${(r.downloaded / 1048576).toFixed(1)} MB${r.total ? ' / ' + (r.total / 1048576).toFixed(1) + ' MB' : ''}` : ''}</small>${r.versions.length ? `<div class="runtime-versions"><select data-name="${r.name}" aria-label="${r.name} 目标版本" ${r.busy ? 'disabled' : ''}>${runtimeOptions(r, choices[r.name] || r.current)}</select><button class="text-button" data-rollback="${r.name}" ${r.busy ? 'disabled' : ''}>${versionAction(r.current, choices[r.name] || r.current || r.versions[0].version)}</button></div>` : ''}</div>`).join(''));
      list.querySelectorAll('[data-install]').forEach(b => b.onclick = async () => { b.disabled = true; try { await api(`/api/runtimes/${b.dataset.install}/install`, 'POST', {}); await refreshRuntimes(); } catch (e) { toast(e.message); b.disabled = false; } });
      list.querySelectorAll('[data-uninstall]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await api(`/api/runtimes/${b.dataset.uninstall}/uninstall`, 'POST', {}); await refreshRuntimes(); toast('已卸载，配置保留；下次使用时按需安装'); }
        catch (e) { toast(e.message); b.disabled = false; }
      });
      list.querySelectorAll('select[data-name]').forEach(select => {
        select.onchange = () => {
          const runtime = runtimes.find(r => r.name === select.dataset.name);
          list.querySelector(`[data-rollback="${select.dataset.name}"]`).textContent = versionAction(runtime.current, select.value);
        };
        select.onchange();
      });
      list.querySelectorAll('[data-rollback]').forEach(b => b.onclick = async () => {
        const action = b.textContent;
        b.disabled = true;
        try { await api(`/api/runtimes/${b.dataset.rollback}/rollback`, 'POST', { version: list.querySelector(`select[data-name="${b.dataset.rollback}"]`).value }); await refreshRuntimes(); toast(`已${action}，下次启动生效`); }
        catch (e) { toast(e.message); b.disabled = false; }
      });
      $('#runtime-error').classList.add('hidden');
    } catch (e) { $('#runtime-error').textContent = e.message; $('#runtime-error').classList.remove('hidden'); }
    finally { done(); }
    if (!$('#runtime-modal').classList.contains('hidden')) runtimeTimer = setTimeout(refreshRuntimes, 1200);
  }
  $('#runtime-check').onclick = async () => {
    const button = $('#runtime-check'); button.disabled = true; button.textContent = '检查中…';
    try { const { updates } = await api('/api/runtimes/check', 'POST', {}); await refreshRuntimes(); toast(updates.some(u => u.error) ? '部分组件检查失败，请查看详情' : '检查完成，可按需拉取最新版'); }
    catch (e) { toast(e.message); }
    finally { button.disabled = false; button.textContent = '检查更新'; }
  };
  $('#runtime-open').onclick = () => { $('#runtime-modal').classList.remove('hidden'); desktopRuntime(); refreshRuntimes(); void renderTemplates(); };
  function closeRuntimes() { $('#runtime-modal').classList.add('hidden'); clearTimeout(runtimeTimer); }
  $('#runtime-close').onclick = closeRuntimes;
  $('#runtime-modal .modal-backdrop').onclick = closeRuntimes;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRuntimes(); });

  async function renderTemplates() {
    try {
      const { settings } = await api('/api/settings');
      const catalogs = Object.fromEntries(await Promise.all(['kiro', 'codex'].map(async provider => [provider, await templateModels(provider, settings.tools[provider].model)])));
      $('#cli-templates').innerHTML = ['kiro', 'codex'].map(provider => {
        const value = settings.tools[provider];
        return `<div class="creation-template" data-provider="${provider}"><b class="template-provider"><img class="provider-icon ${provider}-icon" src="${providerFor({provider}).icon}" alt="">${providerFor({provider}).name}</b><label>默认模型<select data-setting="model">${catalogs[provider]}</select></label><label>默认思维深度<select data-setting="reasoningEffort">${[['','CLI 默认'],['none','关闭'],['minimal','极低'],['low','低'],['medium','中'],['high','高'],['xhigh','极高'],['max','最高'],['ultra','超高']].map(([key,label]) => `<option value="${key}" ${key === (value.reasoningEffort || '') ? 'selected' : ''}>${label}</option>`).join('')}</select></label><div class="template-options"><label class="checkbox-label"><input data-setting="trustAllTools" type="checkbox" role="switch" ${value.trustAllTools ? 'checked' : ''}>跳过审核</label><label class="checkbox-label"><input data-setting="autoCompact" type="checkbox" role="switch" ${value.autoCompact ? 'checked' : ''}>自动压缩</label><label class="retention-field"><span>阈值</span><input data-setting="threshold" class="retention-days" type="number" min="1" max="100" value="${value.threshold}"><span>%</span></label></div></div>`;
      }).join('');
      $('#cli-templates').querySelectorAll('input, select').forEach(input => input.onchange = async () => {
        const provider = input.closest('[data-provider]').dataset.provider;
        const key = input.dataset.setting, value = key === 'threshold' ? Number(input.value) : ['reasoningEffort', 'model'].includes(key) ? input.value : input.checked;
        input.disabled = true;
        try { await api('/api/settings', 'PATCH', { tools: { [provider]: { [key]: value } } }); settings.tools[provider][key] = value; }
        catch (error) { toast(error.message); if (key === 'threshold' || ['reasoningEffort', 'model'].includes(key)) input.value = settings.tools[provider][key]; else input.checked = settings.tools[provider][key]; }
        finally { input.disabled = false; }
      });
    } catch (error) { toast(error.message); }
  }
  void renderTemplates();
  let retention = { enabled: false, days: 30 };
  const retentionReady = api('/api/settings').then(({ settings }) => {
    retention = { ...retention, ...settings.historyRetention };
    renderRetention();
  }).catch(error => toast(error.message));
  function renderRetention() {
    $('#history-retention-enabled').checked = retention.enabled;
    $('#history-retention-days').value = retention.days;
    $('#history-cleanup-run').disabled = !retention.enabled;
  }
  async function saveRetention() {
    await retentionReady;
    const days = Number($('#history-retention-days').value), enabled = $('#history-retention-enabled').checked;
    if (!Number.isInteger(days) || days < 1 || days > 36500) { toast('保留天数须为 1–36500 的整数'); renderRetention(); return; }
    const controls = ['#history-retention-enabled', '#history-retention-days'];
    controls.forEach(id => $(id).disabled = true);
    try {
      if (enabled && (!retention.enabled || days < retention.days)) {
        const preview = await api(`/api/history-cleanup?days=${days}`);
        const accepted = await confirmAction({ title: '历史自动清理', danger: true, confirmLabel: '开启清理', body: `<p>归档超过 ${days} 天的会话将被永久删除，无法恢复。</p><p>当前符合条件：${preview.expired} 条。保留项目文件及标记保留的会话。</p>` });
        if (!accepted) return;
      }
      const { settings } = await api('/api/settings', 'PATCH', { historyRetention: { enabled, days } });
      retention = settings.historyRetention;
    } catch (error) { toast(error.message); }
    finally { controls.forEach(id => $(id).disabled = false); renderRetention(); }
  }
  $('#history-retention-enabled').onchange = saveRetention;
  $('#history-retention-days').onchange = saveRetention;
  $('#history-cleanup-run').onclick = async () => {
    const button = $('#history-cleanup-run'); button.disabled = true;
    try {
      const preview = await api('/api/history-cleanup');
      if (!preview.expired) return toast('没有已过期历史');
      if (!await confirmAction({ title: '清理已过期历史', danger: true, confirmLabel: '永久删除', body: `<p>永久删除 ${preview.expired} 条过期归档会话，保留项目文件。</p><p>未连接或正在运行的配置跳过，不会自动连接。</p>` })) return;
      const result = await api('/api/history-cleanup', 'POST', {});
      toast(`已删除 ${result.deleted} · 跳过 ${result.skipped} · 失败 ${result.failed}`);
    } catch (error) { toast(error.message); } finally { renderRetention(); }
  };

  const cleanupItems = [
    { kind: 'attachments', name: '未使用附件', detail: '清理超过 24 小时且未被对话、草稿、队列引用的上传副本；保留本地源文件', enabled: true },
    { kind: 'packages', name: '安装包缓存', detail: '删除下载、解压残留', enabled: true },
    { kind: 'orphans', name: '配置与会话残留', detail: '删除已移除配置、已永久删除会话的遗留目录；保留归档、共享及外部目录', enabled: true },
    { kind: 'versions', name: '非当前版本', detail: '删除历史及已校验版本，仅保留当前版本；运行中的组件跳过', enabled: false },
  ];
  function renderCleanup() {
    const selected = cleanupItems.filter(item => item.enabled);
    $('#cleanup-summary').textContent = selected.length ? '删除：' + selected.map(item => item.name).join('、') : '请设置清理内容';
    $('#cleanup-run').disabled = !selected.length;
  }
  let cleanupWrites = Promise.resolve();
  const cleanupReady = api('/api/settings').then(({ settings }) => {
    for (const item of cleanupItems) {
      if (typeof settings.cleanup?.[item.kind] === 'boolean') item.enabled = settings.cleanup[item.kind];
    }
    renderCleanup();
  }).catch(error => { toast(`清理设置读取失败：${error.message}`); throw error; });
  // A failed load must not enable cleanup with potentially incorrect defaults.
  cleanupReady.catch(() => {});
  $('#cleanup-run').disabled = true;
  document.addEventListener('change', event => {
    const input = event.target.closest('[data-cleanup-kind]');
    if (!input) return;
    const item = cleanupItems.find(item => item.kind === input.dataset.cleanupKind);
    if (!item) return;
    item.enabled = input.checked;
    renderCleanup();
    const patch = { cleanup: { [item.kind]: item.enabled } };
    cleanupWrites = cleanupWrites.then(() => api('/api/settings', 'PATCH', patch))
      .catch(error => toast(`清理设置保存失败：${error.message}`));
  });
  $('#cleanup-settings').onclick = async () => {
    try { await cleanupReady; } catch { return; }
    await confirmAction({
      title: '清理内容', confirmLabel: '完成', cancelLabel: '关闭',
      body: cleanupItems.map(item => `<div><label class="checkbox-label"><input type="checkbox" role="switch" data-cleanup-kind="${item.kind}" ${item.enabled ? 'checked' : ''}>${item.name}</label><p class="settings-note">${item.detail}</p></div>`).join('') + '<p class="settings-note">开关即时保存。保留现有配置、会话及外部目录。</p>',
    });
  };
  $('#cleanup-run').onclick = async () => {
    const button = $('#cleanup-run');
    const selected = cleanupItems.filter(item => item.enabled);
    button.disabled = true; button.textContent = '清理中…';
    $('#cleanup-settings').disabled = true;
    let cleaned = 0, skipped = 0;
    const errors = [];
    try {
      for (const item of selected) {
        try {
          const result = item.kind === 'orphans'
            ? await api('/api/cleanup', 'POST', {})
            : item.kind === 'attachments' ? await api('/api/attachments/cleanup', 'POST', {})
            : await api('/api/runtimes/cleanup', 'POST', { kind: item.kind });
          cleaned += result.cleaned || 0;
          skipped += result.skipped || 0;
          errors.push(...(result.errors || []));
        } catch (error) { errors.push(`${item.name}：${error.message}`); }
      }
      toast(`已清理 ${cleaned} 项${skipped ? `，跳过 ${skipped} 项暂不可清理的残留或使用中的组件` : ''}${errors.length ? '；' + errors.join('；') : ''}`);
      await refreshRuntimes();
    } finally {
      button.textContent = '清理'; $('#cleanup-settings').disabled = false; renderCleanup();
    }
  };
}
