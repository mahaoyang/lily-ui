import { normalizeMixEntries } from '../../../../headless/audio/mix-weights.js'
import { mountInputClear } from '../../shared/input-clear.js'
import { parameterKnob } from '../../shared/parameter-knob.js'
import { bindAudioDrop } from '../../shared/workflow-ui.js'
export function mountMultiVoice({apply,pick,preview,files,ids}) {
  const card=document.querySelector('#chatterbox-mix-a-drop').closest('article')
  const controls=document.createElement('div');controls.className='multi-voice-controls';card.append(controls)
  const weights={};let count=2;let locked={};let running=false;let knobs=[]
  const normalize=document.createElement('button');normalize.type='button';normalize.className='secondary-button normalize-mix-button';normalize.textContent='归一化'
  const active=key=>!!(files()[key]||locked[key==='a'?'source':key==='b'?'reference':`voice-${Number(key.slice(1))}`])
  function sync(){knobs.forEach(({key,knob,host})=>{const disabled=running||!active(key);knob.disabled(disabled);host.classList.toggle('inactive-voice-weight',disabled)});normalize.disabled=running||!knobs.some(({key})=>active(key))}
  normalize.onclick=()=>{
    const entries=normalizeMixEntries(knobs.filter(({key})=>active(key)).map(({key})=>({key,weight:weights[key]})))
    const units=entries.map(entry=>Math.floor(entry.weight*10000))
    let remainder=10000-units.reduce((sum,value)=>sum+value,0)
    const order=entries.map((entry,index)=>({index,fraction:entry.weight*10000-units[index]})).sort((a,b)=>b.fraction-a.fraction)
    for(let i=0;i<remainder;i++)units[order[i%order.length].index]++
    entries.forEach((entry,index)=>knobs.find(item=>item.key===entry.key).knob.set(units[index]/100))
  }
  card.addEventListener('audio-input-cleared',sync)
  function weight(index){return index===0?80:20}
  function renderKnobs(){
    controls.replaceChildren(normalize);knobs=[]
    for(let i=0;i<count;i++){
      const key=i===0?'a':i===1?'b':`v${i}`;const host=document.createElement('div');controls.append(host)
      const knob=parameterKnob(host,{id:`chatterbox-weight-${i}`,label:`音色 ${i+1} 权重`,value:weights[key]??weight(i),step:.01,change:v=>{weights[key]=v}})
      weights[key]=Number(knob.input.value);knobs.push({key,knob,host})
    }
    sync()
  }
  function addRow(i){
    const key=`v${i}`,row=document.createElement('div');row.className='chatterbox-reference-row';row.dataset.extraVoice=key
    row.innerHTML=`<div class="audio-drop-zone" id="chatterbox-mix-${key}-drop"><span class="drop-mark">${i+1}</span><span id="chatterbox-mix-${key}-name">拖拽音色 ${i+1} 音频，或</span><button class="secondary-button node-button">选择音频</button></div><div class="audio-preview" id="chatterbox-mix-${key}-player" hidden></div>`
    controls.before(row);const zone=row.firstElementChild
    zone.addEventListener('dragover',event=>{event.preventDefault();zone.classList.add('drag-over')});zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));bindAudioDrop(zone,event=>{event.preventDefault();event.stopPropagation();zone.classList.remove('drag-over');if(!zone.inert)apply(key,event.dataTransfer.files[0]).catch(()=>{})});zone.querySelector('button').onclick=()=>pick(key)
    mountInputClear(zone, { hasInput: () => !!files()[key], blocked: () => !!locked[`voice-${i}`], clear: () => { files()[key] = null; ids()[key] = ''; preview(`chatterbox-mix-${key}-player`, null); row.querySelector(`#chatterbox-mix-${key}-name`).textContent = '尚未选择文件'; document.getElementById('chatterbox-mix-run').disabled = true; zone.dispatchEvent(new CustomEvent('audio-input-cleared', { bubbles: true })) } })
    if(locked[`voice-${i}`]){zone.inert=true;zone.classList.add('upstream-input-zone');zone.title='来自上游节点'}
  }
  function ensure(){
    const f=files(),all=Array.from({length:count},(_,i)=>i===0?'a':i===1?'b':`v${i}`)
    if(count<32 && all.every(key=>f[key]||locked[key==='a'?'source':key==='b'?'reference':`voice-${Number(key.slice(1))}`])){addRow(count);count++;renderKnobs()}
    sync()
  }
  return { ensure,
    ready(){return Object.keys(locked).every(port=>ids()[port==='source'?'a':port==='reference'?'b':`v${port.slice(6)}`])},
    setRunning(value){running=value;sync();card.querySelectorAll('[data-extra-voice]').forEach(row=>{const port=`voice-${row.dataset.extraVoice.slice(1)}`;row.firstElementChild.inert=running||!!locked[port]})},
    reset(node=null,connections={}){card.querySelectorAll('[data-extra-voice]').forEach(row=>row.remove());count=Math.max(2,node?.params?.voiceCount||2);locked=connections;Object.keys(weights).forEach(k=>delete weights[k]);Object.assign(weights,node?.params?.voiceWeights||{});for(let i=2;i<count;i++)addRow(i);renderKnobs()},
    snapshot(){return {voiceCount:count,voiceWeights:{...weights}}},
    entries(){return normalizeMixEntries(Object.entries(ids()).filter(([,id])=>id).map(([key,audioId])=>({audioId,weight:weights[key]??20})))},
    async restore(node,inputs={},connections={}){locked=connections;for(let i=2;i<count;i++){const key=`v${i}`,file=inputs[`voice-${i}`]||node.extraFiles?.[`voice-${i}`];if(file)await apply(key,file)}ensure()},
  }
}
