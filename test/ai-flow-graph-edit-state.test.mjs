import { test } from 'node:test'
import assert from 'node:assert/strict'
import { graphEditKey } from '../src/headless/workflow/graph/graph-edit-state.js'
const graph = () => ({name:'任务',nodes:[{id:'1',type:'compound',params:{},graph:{nodes:[{id:'2',params:{text:'原文'},localFirst:new File(['abc'],'a.wav',{lastModified:123})}],edges:[]}}],edges:[]})
test('saved task remains clean after runtime updates, file cloning and drill navigation',()=>{
 const original=graph(), saved=graphEditKey(original), current=structuredClone(original)
 current.nodes[0].graph.viewport={x:10,y:20,scale:.5}
 current.nodes[0].reviewPassed=true
 current.nodes[0].progress=60
 current.nodes[0].graph.nodes[0].output=new File(['result'],'out.wav')
 assert.equal(graphEditKey(current),saved)
 current.nodes[0].graph.nodes[0].params.text='修改'
 assert.notEqual(graphEditKey(current),saved)
 current.nodes[0].graph.nodes[0].params.text='原文'
 assert.equal(graphEditKey(current),saved)
 current.nodes[0].graph.nodes[0].localFirst=new File(['abcd'],'a.wav',{lastModified:124})
 assert.notEqual(graphEditKey(current),saved)
})
