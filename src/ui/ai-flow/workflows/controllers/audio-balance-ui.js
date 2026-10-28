import { parameterKnob } from '../../shared/parameter-knob.js'
export function mountAudioBalance(panel, prefix, existing=null) {
  const host=document.createElement('div');host.className='audio-balance-control'
  host.innerHTML=`<label class="parameter-toggle"><input type="checkbox" id="${prefix}-balance-enabled" checked><span>输入响度平衡</span></label><div class="balance-knob"></div>`
  panel.append(host)
  const toggle=host.querySelector('input'), control=existing || parameterKnob(host.lastElementChild,{id:`${prefix}-balance-lufs`,label:'共享响度',value:-16,min:-36,max:-5,step:.01,unit:' LUFS'})
  if(existing)host.lastElementChild.remove()
  const sync=()=>{if(existing){const shell=existing.closest('.knob-shell');shell.classList.toggle('disabled',!toggle.checked);shell.inert=!toggle.checked;existing.disabled=!toggle.checked}else control.disabled(!toggle.checked)}
  toggle.addEventListener('change',sync)
  return {read:()=>({balanceEnabled:toggle.checked,balanceLufs:Number(existing ? existing.value : control.input.value)}),reset(){toggle.checked=true;if(!existing)control.set(-16);sync()},sync}
}
