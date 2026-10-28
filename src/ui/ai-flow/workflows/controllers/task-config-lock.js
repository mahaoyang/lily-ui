// UI guard plus a cloned draft: disabled controls can never mutate task parameters.
export async function withTaskConfigLock(open, { files = false, text = false, deferred = false } = {}) {
  const changed = new Map(), listeners = []
  const roots = () => [...document.querySelectorAll('dialog[open], .workflow-backdrop')].filter(el=>el.getClientRects().length)
  const allowed = el => !!el.closest('.audio-preview, .modal-close, [data-close], [data-cancel], [aria-label="关闭"], [data-download], [id$="-download"], [data-copy], [id$="-copy"], textarea[readonly]') ||
    !!(text && (el.matches('textarea:not([id*="emotion"]), [data-clear], button[type="submit"]'))) ||
    !!(files && el.closest('.audio-drop-zone, .task-audio-drop, .file-display, .input-file-row, [data-pick], input[type="file"]')) ||
    !!el.closest('footer button[type="submit"]')
  const apply = () => roots().forEach(root => {
    root.querySelectorAll('.parameter-control, .knob-shell, .loudness-knob').forEach(el=>{
      if(!changed.has(el))changed.set(el,{inert:el.inert})
      if(!el.inert)el.inert=true
      if(!el.classList.contains('task-frozen-control'))el.classList.add('task-frozen-control')
    })
    if(!files)root.querySelectorAll('.audio-drop-zone, .task-audio-drop').forEach(zone=>{
      if(!changed.has(zone))changed.set(zone,{inert:zone.inert})
      if(!zone.inert)zone.inert=true
    })
    if(!listeners.some(([r])=>r===root)) {
      const block = event => { const el=event.target.closest('button,input,textarea,select,[role="slider"],[role="switch"],.knob'); if(el&&!allowed(el)){event.preventDefault();event.stopImmediatePropagation()} }
      for(const type of ['click','pointerdown','keydown','drop','input','change'])root.addEventListener(type,block,true)
      listeners.push([root,block]);root.classList.add('task-config-locked')
    }
    root.querySelectorAll('button,input,textarea,select,[role="slider"],[role="switch"]').forEach(el=>{
      if(allowed(el))return
      if(!changed.has(el))changed.set(el,{disabled:el.disabled,inert:el.inert})
      if('disabled'in el&&!el.disabled)el.disabled=true
      if(!el.inert)el.inert=true
      if(!el.classList.contains('task-frozen-control'))el.classList.add('task-frozen-control')
    })
  })
  const observer=new MutationObserver(apply)
  const activate = () => {observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','inert']});apply()}
  try { const pending=open(activate);if(!deferred)activate();return await pending }
  finally {observer.disconnect();changed.forEach((s,el)=>{if('disabled'in el)el.disabled=s.disabled;el.inert=s.inert;el.classList.remove('task-frozen-control')});for(const[root,block]of listeners){root.classList.remove('task-config-locked');for(const type of ['click','pointerdown','keydown','drop','input','change'])root.removeEventListener(type,block,true)}}
}
