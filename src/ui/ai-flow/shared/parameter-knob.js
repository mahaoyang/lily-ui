// Reuse the project's jQuery Knob interaction and visual face.
export function parameterKnob(host, { id, label, value, min=0, max=100, step=1, unit='%', change=()=>{} }) {
  host.innerHTML = `<label class="parameter-control knob-control"><span>${label} <output></output></span><span class="knob-shell"><span class="knob-face"><i></i></span><input id="${id}" aria-label="${label}" type="text" inputmode="decimal" value="${value}"></span></label>`
  const input = host.querySelector('input'), shell = host.querySelector('.knob-shell'), face = host.querySelector('.knob-face'), output=host.querySelector('output')
  const update = (v, notify=false) => {
    v = Math.max(min, Math.min(max, Number(v))); if (!Number.isFinite(v)) return
    input.value=String(v); output.textContent=`${step < 1 ? v.toFixed(2) : Math.round(v)}${unit}`
    face.style.setProperty('--knob-angle', `${-135+(v-min)/(max-min)*270}deg`)
    if(notify) change(v)
  }
  window.jQuery(input).knob({width:78,height:78,min,max,step,angleOffset:-135,angleArc:270,displayInput:false,bgColor:'transparent',fgColor:'transparent',change(v){update(v,true)},release(v){update(v,true)}})
  const canvas=shell.querySelector('canvas'); canvas.tabIndex=0; canvas.setAttribute('role','slider'); canvas.setAttribute('aria-label',label)
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||input.disabled)return;event.preventDefault();update(Number(input.value)+(['ArrowLeft','ArrowDown'].includes(event.key)?-step:step),true);window.jQuery(input).trigger('change')})
  input.addEventListener('change',()=>update(input.value,true))
  output.addEventListener('click',()=>{if(input.disabled)return;const editor=document.createElement('input'); editor.type='number';editor.min=min;editor.max=max;editor.step=step;editor.value=input.value;output.replaceChildren(editor);editor.focus();editor.select();editor.onblur=()=>{update(editor.value,true);window.jQuery(input).trigger('change')};editor.onkeydown=e=>{if(e.key==='Enter')editor.blur()}})
  update(value)
  return {input, set(v){update(v);window.jQuery(input).trigger('change')}, disabled(disabled){input.disabled=disabled;shell.classList.toggle('disabled',disabled);shell.inert=disabled;canvas.tabIndex=disabled?-1:0}}
}
