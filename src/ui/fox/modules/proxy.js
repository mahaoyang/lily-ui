import { parseProxy, normalizeProxyInput } from '../../../headless/fox/proxy-config.js';
import { $, api, esc, toast } from './ui.js';

export function initProxy({ selected, render }) {
  const proxyExitCache = new Map();
  async function refreshProxyExit(item, force = false) {
    const key = `${item.id}:${item.proxyConfigured}:${item.proxyEnabled}`;
    let entry = proxyExitCache.get(key);
    if (!force && entry && Date.now() - entry.at < 60000) { $('#proxy-exit').textContent = entry.text; return; }
    entry = { at: Date.now(), text: '检测出口中…' }; proxyExitCache.set(key, entry);
    $('#proxy-exit').textContent = entry.text;
    try { const result = await api(`/api/instances/${item.id}/proxy-exit`); entry.text = `${result.ip} · ${result.location || '归属地未知'}`; }
    catch (e) { entry.text = `${e.message} · 点击重试`; }
    if (selected()?.id === item.id && proxyExitCache.get(key) === entry) $('#proxy-exit').textContent = entry.text;
  }
  $('#proxy-exit').onclick = () => { if (selected()) refreshProxyExit(selected(), true); };
  async function importProxyJson(content) {
    const result = await api(`/api/instances/${selected().id}/proxy-import`, 'POST', { content });
    const select = $('#proxy-nodes');
    select.innerHTML = result.nodes.map(n => `<option value="${esc(n.value)}">${esc(n.name)}</option>`).join('');
    select.classList.toggle('hidden', result.nodes.length < 2);
    $('#proxy-uri').value = select.value;
  }
  $('#proxy-nodes').onchange = () => { $('#proxy-uri').value = $('#proxy-nodes').value; };
  const proxyImportError = e => { $('#proxy-error').textContent = e.message; $('#proxy-error').classList.remove('hidden'); };
  async function readProxyFile(file) { if (!file) return; if (file.size > 900000) throw new Error('JSON 文件过大'); await importProxyJson(await file.text()); }
  $('#proxy-file-open').onclick = () => $('#proxy-file').click();
  $('#proxy-file').onchange = async e => { try { await readProxyFile(e.target.files[0]); } catch (error) { proxyImportError(error); } finally { e.target.value = ''; } };
  $('#proxy-drop').ondragover = e => { e.preventDefault(); $('#proxy-drop').classList.add('is-dragging'); };
  $('#proxy-drop').ondragleave = e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('is-dragging'); };
  $('#proxy-drop').ondrop = async e => { e.preventDefault(); e.currentTarget.classList.remove('is-dragging'); try { await readProxyFile(e.dataTransfer.files[0]); } catch (error) { proxyImportError(error); } };
  $('#proxy-uri').onpaste = e => { const content = e.clipboardData.getData('text').trim(); if (content.startsWith('{') || content.startsWith('[')) { e.preventDefault(); importProxyJson(content).catch(proxyImportError); } };

  $('#proxy-settings').onclick = () => { const item = selected(); $('#proxy-modal').classList.remove('hidden'); $('#proxy-uri').value = ''; $('#proxy-nodes').innerHTML = ''; $('#proxy-nodes').classList.add('hidden'); $('#proxy-uri').placeholder = item.proxyConfigured ? '留空保留，填写替换' : 'hy2://… 或 ss://…'; $('#proxy-enabled').checked = item.proxyEnabled !== false; $('#proxy-error').classList.add('hidden'); };
  $('#proxy-close').onclick = () => $('#proxy-modal').classList.add('hidden');
  $('#proxy-save').onclick = async () => { const item = selected(); const button = $('#proxy-save'); if (button.disabled) return; button.disabled = true; button.textContent = '校验中…'; try { const data = { proxyEnabled: $('#proxy-enabled').checked }; if ($('#proxy-uri').value.trim()) data.proxyUri = JSON.stringify(parseProxy(normalizeProxyInput($('#proxy-uri').value)));  const result = await api(`/api/instances/${item.id}`, 'PATCH', data); Object.assign(item, result.instance); proxyExitCache.clear(); $('#proxy-modal').classList.add('hidden'); render(); toast('已保存，重连生效'); } catch (e) { $('#proxy-error').textContent = e.message; $('#proxy-error').classList.remove('hidden'); } finally { button.disabled = false; button.textContent = '保存'; } };
  $('#proxy-remove').onclick = async () => { try { const item = selected(); const result = await api(`/api/instances/${item.id}`, 'PATCH', { proxyUri: '' }); Object.assign(item, result.instance); proxyExitCache.clear(); $('#proxy-modal').classList.add('hidden'); render(); toast('代理已移除'); } catch (e) { toast(e.message); } };

  return { refreshProxyExit };
}
