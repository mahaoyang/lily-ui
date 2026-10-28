import assert from 'node:assert/strict'
import { connectedInput, expansionAncestors } from '../src/headless/workflow/graph/list-input.js'
import { mergeInputFiles, runAudioMerge } from '../src/ui/ai-flow/workflows/controllers/audio-merge.js'
const a = new File([new Uint8Array([1])], 'a.wav'), b = new File([new Uint8Array([2])], 'b.wav'), c = new File([new Uint8Array([3])], 'c.wav')
const loop = { id:'loop', type:'compound', params:{forLoop:true}, outputs:[{id:'voice'}], output:b, results:{voice:b}, iterationOutputs:[a,b], iterationResults:[{voice:a},{voice:b}] }
const merge = {id:'merge',type:'audio-merge',params:{pauseMin:0,pauseMax:0}}
const nodes = new Map([loop, merge, {id:'review',type:'quality-review'}, {id:'after',type:'uvr'}].map(n=>[n.id,n]))
const edges = [{from:'loop',fromPort:'voice',to:'review',toPort:'in'}, {from:'review',to:'merge',toPort:'in'}, {from:'merge',to:'after',toPort:'in'}]
assert.deepEqual(connectedInput('merge','in',nodes,edges),[a,b])
assert.equal(connectedInput('review','in',nodes,edges),b)
assert.deepEqual([...expansionAncestors('after',nodes,edges)].sort(),['after','merge'])
assert.deepEqual(mergeInputFiles(merge,{in:[a,b],'voice-1':c}),[a,b,c])
const decoded = []
globalThis.AudioContext = class {
 async decodeAudioData(buffer) { const value = new Uint8Array(buffer)[0]; decoded.push(value); return {numberOfChannels:1,length:1,getChannelData:()=>new Float32Array([value/10])} }
 async close() {}
}
const result = await runAudioMerge(merge,{in:connectedInput('merge','in',nodes,edges),'voice-1':c})
assert.deepEqual(decoded,[1,2,3])
const wav = new DataView(await result.arrayBuffer())
assert.equal(wav.getUint32(40,true),6)
assert.deepEqual([44,46,48].map(offset=>wav.getInt16(offset,true)),[3277,6553,9830])
console.log('PASS For/review list gathering, merge boundary, ordered WAV samples')
