import assert from 'node:assert/strict'
import { snapshotOutputs, expandGraph } from '../src/headless/workflow/graph/compound-node.js'
const a = { id:'a', title:'原声', type:'audio-input' }
const b = { id:'b', title:'处理', type:'compound', inputs:[{id:'in',node:'x',port:'in'}], outputs:[{id:'out',node:'x',port:'out',label:'人声'},{id:'output-1',node:'y',port:'out',label:'伴奏'}], graph:{ nodes:[{id:'x'},{id:'y'}],edges:[] } }
const internal = {from:'a',to:'b',toPort:'in'}
let ports = snapshotOutputs([a,b],[internal])
assert.deepEqual(ports.map(p=>p.label),['处理 · 人声','处理 · 伴奏'])
assert.deepEqual(ports.map(p=>p.port),['out','output-1'])
const external = {from:'b',fromPort:'output-1',to:'outside'}
ports = snapshotOutputs([a,b],[internal,external,{...external,to:'other'}])
assert.equal(ports.length,1)
assert.equal(ports[0].label,'处理 · 伴奏')
const group = {id:'g',type:'compound',title:'组合',inputs:[],outputs:ports,graph:{nodes:[a,b],edges:[internal]}}
assert.equal(expandGraph({nodes:[group],edges:[{from:'g',fromPort:'out',to:'result'}]}).edges.find(e=>e.to==='result').from,'g__b__y')
assert.deepEqual(snapshotOutputs([a,{...a,id:'c'}],[]).map(p=>p.label),['原声 · 输出','原声 · 输出-2'])
assert.equal(snapshotOutputs([{id:'loop',title:'循环',type:'compound',params:{forLoop:true},outputs:[]}],[]).length,0)
console.log('compound snapshot outputs: passed')
