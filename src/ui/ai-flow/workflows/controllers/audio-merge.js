// Audio list concatenation, with bounded random gaps and shared canvas/basic UI.
export const mergePorts = node => ['in', ...Array.from({ length: Math.max(1, (node.params?.inputCount || 2) - 1) }, (_, i) => `voice-${i + 1}`)]
export const mergeInputFiles = (node, inputs) => mergePorts(node).flatMap(port => inputs[port] || []).flat(Infinity).filter(Boolean)
export function mergeSettings(params = {}) {
  const min = Number(params.pauseMin ?? .2), max = Number(params.pauseMax ?? .8)
  const mean = Number(params.pauseMean ?? (min + max) / 2), sigma = Number(params.pauseSigma ?? (max - min) / 6)
  const distribution = params.distribution || 'uniform'
  if (![min, max, mean, sigma].every(Number.isFinite) || min < 0 || max < min || max > 600 || (distribution === 'normal' && (mean < min || mean > max || sigma < 0)) || (min !== max && distribution === 'normal' && sigma === 0)) throw new Error('停顿范围须为 0～600 秒，均值须在范围内，标准差须大于 0')
  if (!['uniform', 'normal'].includes(distribution)) throw new Error('不支持的随机分布')
  return { min, max, mean, sigma, distribution }
}
export function randomGap(p, random = Math.random) {
  if (p.min === p.max) return p.min
  if (p.distribution === 'uniform') return p.min + random() * (p.max - p.min)
  // Inverse-CDF sampling of a truncated normal avoids clipping spikes at endpoints.
  const erf = x => { const sign = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + .3275911 * x); return sign * (1 - (((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x)) }
  const cdf = x => (1 + erf((x - p.mean) / (p.sigma * Math.SQRT2))) / 2
  const target = cdf(p.min) + random() * (cdf(p.max) - cdf(p.min))
  let lo = p.min, hi = p.max
  for (let i = 0; i < 45; i++) { const mid = (lo + hi) / 2; if (cdf(mid) < target) lo = mid; else hi = mid }
  return (lo + hi) / 2
}
export async function runAudioMerge(node, inputs, progress) {
  const settings = mergeSettings(node.params), files = mergeInputFiles(node, inputs)
  if (!files.length) throw new Error('请添加音频，或连接音频 / For 结果列表')
  if (files.some(file => typeof file.arrayBuffer !== 'function')) throw new Error('音频列表中包含无效文件')
  const context = new AudioContext({ sampleRate: 48000 }), decoded = []
  const check = () => progress?.signal?.throwIfAborted()
  progress?.(0, `准备解码 ${files.length} 段音频`)
  try {
    for (let i = 0; i < files.length; i++) { check(); decoded.push(await context.decodeAudioData(await files[i].arrayBuffer())); progress?.(Math.round((i + 1) / files.length * 60), `正在解码音频 ${i + 1}/${files.length}`) }
  } finally { await context.close() }
  const rate = 48000, channels = Math.max(...decoded.map(b => b.numberOfChannels))
  const gaps = decoded.slice(1).map(() => Math.round(randomGap(settings) * rate))
  const frames = decoded.reduce((s,b) => s+b.length,0)+gaps.reduce((a,b)=>a+b,0), bytes = frames*channels*2
  if (bytes > 512*1024*1024) throw new Error('合并结果超过 512 MB，请减少输入或停顿长度')
  const result = new ArrayBuffer(44+bytes), view = new DataView(result)
  const ascii = (at, text) => [...text].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)))
  ascii(0,'RIFF');view.setUint32(4,36+bytes,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,rate,true);view.setUint32(28,rate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,bytes,true)
  let offset=44, processed=0, reportedAt=0
  const totalSamples=decoded.reduce((sum,b)=>sum+b.length,0)
  for (let i=0;i<decoded.length;i++) {
    const b=decoded[i], data=Array.from({length:channels},(_,c)=>b.getChannelData(Math.min(c,b.numberOfChannels-1)))
    for(let start=0;start<b.length;start+=16384) {
      check()
      for(let f=start;f<Math.min(start+16384,b.length);f++)for(let c=0;c<channels;c++){const v=Math.max(-1,Math.min(1,data[c][f]));view.setInt16(offset,Math.round(v*(v<0?32768:32767)),true);offset+=2}
      processed+=Math.min(16384,b.length-start)
      const now=Date.now()
      if(now-reportedAt>=100){progress?.(60+39*processed/totalSamples,`正在合并 ${i+1}/${decoded.length}`);reportedAt=now}
      await new Promise(resolve=>setTimeout(resolve,0))
    }
    offset+=(gaps[i]||0)*channels*2
    progress?.(60+39*processed/totalSamples,`正在合并 ${i+1}/${decoded.length}`)
  }
  check()
  const file=new File([result],'merged-audio.wav',{type:'audio/wav'})
  progress?.(100,'合并完成')
  return file
}

export function openAudioMerge(node = { type:'audio-merge', params:{} }, inputs = {}, connections = {}, actions = {}) {
  const dialog=document.createElement('div');dialog.className='workflow-backdrop'
  dialog.innerHTML=`<section class="workflow-panel audio-input-panel audio-merge-panel" role="dialog" aria-modal="true"><button class="modal-close" data-close aria-label="关闭">×</button><div class="workflow-header"><div><p class="eyebrow blue">AUDIO · MERGE</p><h2>音频列表合并</h2><p>接入单段音频或 For 结果列表，按顺序合并并插入随机静音。</p></div></div><div class="audio-input-canvas"><article class="workflow-node-card"><h3>音频 / 结果列表</h3><p class="file-display">每路可接单段音频或 For 结果列表；列表按循环顺序展开，多路按输入顺序合并。</p><div class="audio-drop-zone" data-drop><span>拖入多个音频，或</span><button class="secondary-button" data-pick>选择音频</button><input type="file" accept="audio/*" multiple hidden></div><div data-list></div></article><article class="workflow-node-card"><h3>片段间停顿</h3><div class="merge-parameters"><label>最短停顿（秒）<input data-min type="number" min="0" max="600" step="any"></label><label>最长停顿（秒）<input data-max type="number" min="0" max="600" step="any"></label></div><div class="merge-distributions"><button class="secondary-button" data-dist="uniform">均匀</button><button class="secondary-button" data-dist="normal">正态</button></div><div data-normal><div class="merge-parameters"><label>均值（秒）<input data-mean type="number" step="any"></label><label>标准差（秒）<input data-sigma type="number" min="0" step="any"></label></div><button class="text-button" data-reset>重置正态参数</button><p class="file-display">默认：区间中点为均值，区间宽度 ÷ 6 为标准差。正态采样限制在指定范围内。</p></div></article><article class="workflow-node-card audio-input-output"><h3>合并结果</h3><div class="audio-preview" id="audio-merge-result-preview" hidden></div><button class="text-button" data-download>下载 WAV ↗</button></article></div><div class="workflow-footer"><div class="progress-area"><div class="progress-copy"><span data-status>准备就绪</span><b data-percent>0%</b></div><div class="progress-track"><i data-bar></i></div></div><div class="workflow-actions"><button class="secondary-button" data-stop disabled>停止</button><button class="primary-button" data-run>合并音频</button></div></div></section>`
  document.body.append(dialog)
  const el=s=>dialog.querySelector(s), draft={...node,params:structuredClone(node.params||{}),extraFiles:{...node.extraFiles}}
  let output=node.running?null:node.output||null, running=false, controller, distribution=draft.params.distribution||'uniform'
  const ports=()=>mergePorts(draft), local=p=>p==='in'?draft.localFirst:draft.extraFiles[p], get=p=>connections[p]?inputs[p]:local(p)
  const set=(p,f)=>{if(p==='in')draft.localFirst=f;else draft.extraFiles[p]=f}
  const invalidate=()=>{output=null;actions.preview?.('audio-merge-result-preview',null);el('[data-download]').disabled=true}
  const parameterPrecision = value => Number(Number(value).toPrecision(6))
  const settings=mergeSettings(draft.params)
  for(const [key,value] of Object.entries({min:settings.min,max:settings.max,mean:settings.mean,sigma:settings.sigma}))el(`[data-${key}]`).value=parameterPrecision(value)
  const updateDist=()=>{el('[data-normal]').hidden=distribution!=='normal';dialog.querySelectorAll('[data-dist]').forEach(b=>{b.classList.toggle('active',b.dataset.dist===distribution);b.setAttribute('aria-pressed',String(b.dataset.dist===distribution))})}
  dialog.querySelectorAll('[data-dist]').forEach(b=>b.onclick=()=>{distribution=b.dataset.dist;invalidate();updateDist()});updateDist()
  el('[data-reset]').onclick=()=>{const a=Number(el('[data-min]').value),b=Number(el('[data-max]').value);el('[data-mean]').value=parameterPrecision((a+b)/2);el('[data-sigma]').value=parameterPrecision((b-a)/6);invalidate()}
  let customNormal = node.params?.pauseMean != null || node.params?.pauseSigma != null
  for (const key of ['mean','sigma']) {
    const input=el(`[data-${key}]`)
    input.oninput=()=>{customNormal=true;invalidate()}
    input.onchange=()=>{if(input.value!==''&&Number.isFinite(input.valueAsNumber))input.value=parameterPrecision(input.valueAsNumber)}
  }
  for (const key of ['min','max']) el(`[data-${key}]`).oninput=()=>{if(!customNormal){const a=Number(el('[data-min]').value),b=Number(el('[data-max]').value);el('[data-mean]').value=parameterPrecision((a+b)/2);el('[data-sigma]').value=parameterPrecision((b-a)/6)}invalidate()}
  for (const key of ['min','max']) {
    const input=el(`[data-${key}]`)
    input.onchange=()=>{if(input.value!==''&&Number.isFinite(input.valueAsNumber)){input.value=parameterPrecision(input.valueAsNumber);input.oninput()}}
  }
  const resetNormal=el('[data-reset]').onclick
  el('[data-reset]').onclick=()=>{customNormal=false;resetNormal()}

  const draw=()=>{
    const host=el('[data-list]');host.replaceChildren()
    ports().forEach((p,i)=>{const row=document.createElement('div');row.className='merge-file-row';const name=document.createElement('span');const value=get(p);name.textContent=`${i+1}. ${Array.isArray(value)?`音频列表 · ${value.length} 段`:value?.name|| (connections[p]?'等待上游输出':'未添加')}`;row.append(name)
      if(connections[p]){row.classList.add('upstream-input-zone');name.title=`来自上游 · ${connections[p]}`}
      else {const clear=document.createElement('button');clear.className='input-clear-button file-clear-button';clear.innerHTML='<svg viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"/></svg>';clear.title='清除文件';clear.disabled=!local(p);clear.onclick=()=>{set(p,null);invalidate();draw()};row.append(clear)
      if(i>0&&!connections[ports()[i-1]]){const up=document.createElement('button');up.className='text-button';up.textContent='↑';up.title='上移';up.onclick=()=>{const prev=ports()[i-1],f=local(prev);set(prev,local(p));set(p,f);invalidate();draw()};row.append(up)}}
      host.append(row)
    })
  }
  const accept=files=>{if(running)return;for(const f of files){if(!f.type.startsWith('audio/')&&!/\.(wav|mp3|m4a|flac|ogg|aac|opus|webm)$/i.test(f.name))continue;let p=ports().find(p=>!connections[p]&&!local(p));if(!p){draft.params.inputCount=ports().length+1;p=ports().at(-1)}set(p,f)}if(ports().every(p=>get(p)||connections[p]))draft.params.inputCount=ports().length+1;invalidate();draw()}
  el('[data-pick]').onclick=()=>el('input[type="file"]').click();el('input[type="file"]').onchange=e=>{accept(e.target.files);e.target.value=''}
  el('[data-drop]').ondragover=e=>e.preventDefault();el('[data-drop]').ondrop=e=>{e.preventDefault();accept(e.dataTransfer.files)}
  const read=()=>({...draft.params,pauseMin:parameterPrecision(el('[data-min]').value),pauseMax:parameterPrecision(el('[data-max]').value),pauseMean:parameterPrecision(el('[data-mean]').value),pauseSigma:parameterPrecision(el('[data-sigma]').value),distribution})
  el('[data-run]').onclick=async()=>{if(running)return;try{draft.params=read();mergeSettings(draft.params);running=true;controller=new AbortController();dialog.querySelectorAll('input, [data-dist], [data-pick], [data-reset], [data-list] button').forEach(b=>b.disabled=true);el('[data-run]').disabled=true;el('[data-stop]').disabled=false;invalidate();const progress=(n,m)=>{el('[data-status]').textContent=m;el('[data-percent]').textContent=`${Math.floor(n)}%`;el('[data-bar]').style.width=`${Math.floor(n)}%`};progress.signal=controller.signal;output=await runAudioMerge(draft,Object.fromEntries(ports().map(p=>[p,get(p)])),progress);actions.preview?.('audio-merge-result-preview',output);el('[data-download]').disabled=false}catch(e){el('[data-status]').textContent=controller?.signal.aborted?'已停止':e.message}finally{running=false;dialog.querySelectorAll('input, [data-dist], [data-pick], [data-reset]').forEach(b=>b.disabled=false);el('[data-run]').disabled=false;el('[data-stop]').disabled=true;draw()}}
  el('[data-stop]').onclick=()=>controller?.abort();el('[data-download]').onclick=()=>output&&actions.download?.(output,output.name);el('[data-download]').disabled=!output;actions.preview?.('audio-merge-result-preview',output);draw()
  return new Promise(resolve=>{const close=()=>{if(running){controller?.abort();return}try{draft.params=read();mergeSettings(draft.params)}catch(e){el('[data-status]').textContent=e.message;return}node.localFirst=draft.localFirst;node.extraFiles=draft.extraFiles;actions.preview?.('audio-merge-result-preview',null);document.removeEventListener('keydown',key);dialog.remove();resolve({params:draft.params,output,model:node.model})};const key=e=>{if(e.key==='Escape'){e.preventDefault();close()}};document.addEventListener('keydown',key);el('[data-close]').onclick=close})
}
