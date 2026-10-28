import { $, icon } from './ui.js';

// Drops resolve path metadata only; never upload or enumerate directory contents.
export function bindDirectoryDrop(zone, input, error) {
  const container = $(zone), field = $(input);
  const fail = message => { $(error).textContent = message; $(error).classList.remove('hidden'); };
  if (window.foxDesktop) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'directory-choose'; button.innerHTML = icon('folder');
    button.title = '选择目录'; button.setAttribute('aria-label', '选择目录');
    button.onclick = async () => { try { const value = await window.foxDesktop.chooseDirectory(); if (value) { field.value = value; field.dispatchEvent(new Event('input', { bubbles: true })); } } catch (e) { fail(e.message); } };
    const control = document.createElement('div');
    control.className = 'directory-control';
    field.before(control);
    control.append(field, button);
  }
  container.addEventListener('dragover', event => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy'; container.classList.add('drag-active'); });
  container.addEventListener('dragleave', () => container.classList.remove('drag-active'));
  container.addEventListener('drop', event => {
    event.preventDefault(); event.stopPropagation(); container.classList.remove('drag-active');
    const transfer = event.dataTransfer;
    const items = [...transfer.items].filter(item => item.kind === 'file');
    if (items.length > 1 || transfer.files.length > 1) return fail('请一次拖入一个目录');
    const entry = items[0]?.webkitGetAsEntry?.();
    if (entry && !entry.isDirectory) return fail('请拖入目录');
    let nativePath = '';
    try { if (transfer.files[0]) nativePath = window.foxDesktop?.pathForFile(transfer.files[0]) || ''; } catch {}
    const uri = transfer.getData('text/uri-list').split(/\r?\n/).find(line => line && !line.startsWith('#'));
    let value = (nativePath || uri || transfer.getData('text/plain') || '').trim().replace(/^["']|["']$/g, '');
    if (/^file:/i.test(value)) {
      try { const url = new URL(value); value = decodeURIComponent(url.pathname); if (url.hostname && url.hostname !== 'localhost') value = '\\\\' + url.hostname + value.replaceAll('/', '\\'); if (/^\/[a-z]:\//i.test(value)) value = value.slice(1); }
      catch { return fail('目录路径无效'); }
    }
    if (!value || /[\r\n\0]/.test(value) || !/^(?:\/|[a-z]:[\\/]|\\\\|~(?:\/|$))/i.test(value)) return fail('浏览器隐藏了目录路径，请在资源管理器中“复制为路径”后粘贴');
    field.value = value; field.dispatchEvent(new Event('input', { bubbles: true })); $(error).classList.add('hidden');
  });
}
