import { $, api, toast } from './ui.js';
// Tokens remain ordinary draft text, so queue edits and session persistence preserve their positions.
export function initPromptFiles({ selected, ensureSession }) {
  const input = $('#prompt-input'), wrap = $('.composer-input');
  const menu = document.createElement('div'); menu.className = 'file-search hidden'; menu.setAttribute('role','listbox'); wrap.append(menu);
  let anchor = 0, end = 0, candidates = [], active = 0, ticket = 0, timer, searchContext;
  function insert(token, start = input.selectionStart, stop = input.selectionEnd) {
    input.setRangeText(token,start,stop,'end'); input.dispatchEvent(new Event('input',{bubbles:true})); input.focus();
  }
  async function upload(files) {
    const start = input.selectionStart, stop = input.selectionEnd, item = selected();
    if (!item || !await ensureSession(item)) return;
    const sid = item.sessionId, tokens = [];
    try {
      for (const file of files) {
        if (file.size > 10*1024*1024) throw new Error('文件须小于 10 MB');
        const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror=reject; reader.readAsDataURL(file); });
        const result = await api(`/api/instances/${item.id}/files?sessionId=${encodeURIComponent(sid)}`,'POST',{name:file.name,data}); tokens.push(result.token);
      }
      if (selected()?.id === item.id && selected()?.sessionId === sid) insert(tokens.join(' '),start,stop);
    } catch(error) { toast(error.message); }
  }
  input.addEventListener('paste',e => { const files=[...e.clipboardData.files]; if(files.length) {e.preventDefault(); void upload(files);} });
  wrap.addEventListener('dragover',e => {if(e.dataTransfer.types.includes('Files')) {e.preventDefault(); e.dataTransfer.dropEffect='copy';}});
  wrap.addEventListener('drop',e => {if(e.dataTransfer.files.length) {e.preventDefault(); e.stopPropagation(); void upload([...e.dataTransfer.files]);}});
  function close() { ++ticket; menu.classList.add('hidden'); candidates=[]; }
  async function choose(index) {
    const file = candidates[index], item=selected(); if(!file || !item) return;
    if(searchContext !== `${item.id}:${item.sessionId}`) return close();
    const start=anchor, stop=end, sid=item.sessionId; close();
    try { const r=await api(`/api/instances/${item.id}/files?sessionId=${encodeURIComponent(sid)}`,'POST',{path:file}); if(selected()?.id===item.id && selected()?.sessionId===sid) insert(r.token,start,stop); } catch(error) {toast(error.message);}
  }
  function paint() {
    menu.replaceChildren();
    candidates.forEach((file,i) => {const row=document.createElement('button'); row.type='button'; row.setAttribute('role','option'); row.setAttribute('aria-selected',String(i===active)); row.textContent=file; row.title=file; row.onpointerdown=e=>{e.preventDefault(); void choose(i);}; menu.append(row);});
    if(!candidates.length) {const empty=document.createElement('span'); empty.textContent='未找到文件'; menu.append(empty);}
    menu.classList.remove('hidden'); menu.children[active]?.scrollIntoView({block:'nearest'});
  }
  input.addEventListener('input',event => {
    clearTimeout(timer);
    if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') return close(); const m=input.value.slice(0,input.selectionStart).match(/(?:^| )@([^\n@⟦⟧]*)$/);
    if(!m) return close();
    const item=selected(); if(!item?.sessionId) return close();
    searchContext=`${item.id}:${item.sessionId}`;
    anchor=input.selectionStart-m[1].length-1; end=input.selectionStart;
    const request=++ticket, sid=item.sessionId;
    timer=setTimeout(async()=>{try { const r=await api(`/api/instances/${item.id}/files?sessionId=${encodeURIComponent(sid)}&q=${encodeURIComponent(m[1])}`); if(request!==ticket || selected()?.id!==item.id || selected()?.sessionId!==sid) return; candidates=r.files; active=0; paint(); } catch(error) {if(request===ticket) {close();toast(error.message);}}},140);
  });
  input.addEventListener('keydown',e => {
    if(menu.classList.contains('hidden') || e.isComposing) return;
    if(['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation();
      if(e.key==='Escape') close();
      else if(e.key==='Enter'||e.key==='Tab') void choose(active);
      else {active=(active+(e.key==='ArrowDown'?1:-1)+candidates.length)%Math.max(1,candidates.length);paint();}
    }
  },true);
  input.addEventListener('blur',close);
}
