import assert from 'node:assert/strict'
import { columnName, expandForGraph, validateFor } from '../src/headless/workflow/graph/for-node.js'
const loop = { id: 'loop', title: 'For', type: 'compound', params: { forLoop: true, columns: [{ id: 'a', name: 'A', items: ['你好', '世界'] }, { id: 'b', name: 'B', items: [1, 2] }] }, inputs: [{id:'a',node:'voice',port:'text'},{id:'b',node:'voice',port:'in'}], outputs:[{id:'out',node:'next',port:'out'}], graph:{nodes:[{id:'voice',type:'chatterbox-read',params:{}},{id:'next',type:'uvr',params:{}}],edges:[{from:'voice',to:'next',toPort:'in'}]} }
assert.equal(columnName(26), 'AA')
assert.equal(validateFor(loop).length, 2)
const graph = expandForGraph({nodes:[loop,{id:'qc',type:'quality-review'},{id:'after',type:'audio-merge'}],edges:[{from:'loop',to:'qc',toPort:'in'},{from:'qc',to:'after',toPort:'in'}]})
const iterations=graph.nodes.filter(n=>n.originId==='loop')
assert.equal(iterations.length,2)
assert.equal(await graph.nodes.find(n=>n.id==='loop__zip__1__a').localFirst.text(),'世界')
assert(graph.edges.some(e=>e.from==='loop__zip__1__b' && e.to===iterations[1].id && e.toPort==='b'))
assert.equal(iterations[0].graph.nodes.length,2)
assert.equal(graph.nodes.filter(n=>n.type==='quality-review').length,1)
assert.equal(graph.nodes.filter(n=>n.type==='audio-merge').length,1)
assert.equal(graph.edges.filter(e=>e.to==='qc').length,2)
const mismatch=structuredClone(loop);mismatch.params.columns[1].items.pop()
assert.throws(()=>expandForGraph({nodes:[mismatch],edges:[]}),/长度必须一致/)
const empty=structuredClone(loop);empty.params.columns.forEach(c=>c.items=[])
assert.throws(()=>expandForGraph({nodes:[empty],edges:[]}),/非空列表/)
const file=new File(['audio'],'input.wav',{type:'audio/wav'})
const files={...loop,params:{forLoop:true,columns:[{id:'a',files:['f']}]},extraFiles:{f:file}}
const audio=expandForGraph({nodes:[files],edges:[]})
assert.equal(audio.nodes.find(n=>n.type==='audio-input').localFirst,file)
assert.equal(audio.nodes.find(n=>n.type==='audio-input').params.autoWav,false)
console.log('For composite: aligned zip, bounded body, cumulative review boundary, empty inputs and file identity passed')

const attached={...files,graph:{...files.graph,nodes:files.graph.nodes.map(n=>({...n,localFirst:file}))}}
const snapshot=expandForGraph({nodes:[attached],edges:[]}).nodes.find(n=>n.originId===attached.id)
assert.equal(snapshot.graph.nodes[0].localFirst,file)
assert.equal(snapshot.graph.nodes[0].localFirst.name,'input.wav')
