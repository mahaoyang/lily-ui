import { $, api, esc, icon, toast } from './ui.js';
import { renderTranscriptMessage, enhanceTranscript } from './transcript.js';

export function initHistoryPreview() {
  const modal = $('#history-preview-modal'), box = $('#history-preview-messages'), status = $('#history-preview-status');
  let target, loading = false, before = 0;
  const close = () => { target = null; modal.classList.add('hidden'); box.replaceChildren(); };
  $('#history-preview-close').onclick = close;
  modal.querySelector('.modal-backdrop').onclick = close;
  modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  async function load(initial = false) {
    if (!target || loading || (!initial && !before)) return;
    const current = target; loading = true;
    status.textContent = '加载中…'; status.classList.add('is-loading');
    try {
      const data = await api(`/api/instances/${current.profileId}/session-preview?sessionId=${encodeURIComponent(current.sessionId)}&height=${box.clientHeight}&width=${box.clientWidth}${initial ? '' : '&before=' + before}`);
      if (target !== current) return;
      status.onclick = null; before = data.before; $('#history-preview-title').textContent = data.title || '会话预览';
      const fragment = document.createElement('div');
      fragment.innerHTML = data.messages.map((m, i) => renderTranscriptMessage(m, before + i)).join('');
      enhanceTranscript(fragment, before);
      const height = box.scrollHeight, top = box.scrollTop;
      box.prepend(...fragment.childNodes);
      if (initial) box.scrollTop = box.scrollHeight;
      else box.scrollTop = top + box.scrollHeight - height;
      status.textContent = before ? '上拉加载更早消息' : box.childElementCount ? '已到开头' : '暂无保存的对话';
    } catch (e) { if (target === current) { status.textContent = e.message + ' · 点击重试'; status.onclick = () => load(initial); } }
    finally { if (target === current) { loading = false; status.classList.remove('is-loading'); } }
  }
  box.addEventListener('scroll', () => { if (box.scrollTop < 48) void load(); }, { passive: true });
  return (profileId, sessionId) => {
    target = { profileId, sessionId }; loading = false; before = 0;
    status.onclick = null; box.replaceChildren(); $('#history-preview-title').textContent = '会话预览';
    modal.classList.remove('hidden'); $('#history-preview-close').focus(); void load(true);
  };
}

export function initSessionRename({ selected, renderSessions }) {
  const title = $('#active-session-title');
  title.ondblclick = () => {
    const item = selected(), entry = item?.conversations?.find(c => c.sessionId === item.sessionId);
    if (!entry || title.querySelector('input')) return;
    const input = document.createElement('input'); input.className = 'session-title-input';
    input.dataset.sessionId = entry.sessionId; input.value = entry.title; input.maxLength = 80; input.autocomplete = 'off'; input.setAttribute('aria-label', '会话名称');
    title.replaceChildren(input); input.focus(); input.select();
    let finished = false;
    async function finish(cancel = false) {
      if (finished) return; finished = true;
      const value = input.value.trim();
      title.textContent = entry.title;
      if (cancel || !value || value === entry.title) return;
      try {
        const data = await api(`/api/instances/${item.id}/session-title`, 'PATCH', { sessionId: entry.sessionId, title: value });
        entry.title = data.title; renderSessions();
      } catch (e) { toast(e.message); }
    }
    input.onblur = () => void finish();
    input.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); void finish(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); void finish(true); } };
  };
}
