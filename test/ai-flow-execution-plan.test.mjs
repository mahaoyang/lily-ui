import assert from 'node:assert/strict'
import { compileOrder, modelKey } from '../src/headless/workflow/graph/execution-plan.js'
const nodes = [
 {id:'a1', type:'indextts'}, {id:'b1',type:'chatterbox-read',model:'english'},
 {id:'a2',type:'indextts'}, {id:'b2',type:'chatterbox-read',model:'english'},
 {id:'input',type:'text-input'},
]
const edges = [{from:'input',to:'a1'},{from:'input',to:'b1'},{from:'a1',to:'a2'},{from:'b1',to:'b2'}]
assert.deepEqual(compileOrder(nodes,edges).map(n=>n.id),['input','a1','a2','b1','b2'])
assert.notEqual(modelKey({type:'chatterbox-read',model:'english'}),modelKey({type:'chatterbox-mix',model:'multilingual'}))
assert.equal(modelKey({type:'chatterbox-read',model:'english'}),modelKey({type:'chatterbox-mix',model:'english'}))
assert.equal(modelKey({type:'chatterbox-read',model:'english',params:{ui:{'chatterbox-model':'multilingual'}}}),'chatterbox:multilingual')
assert.throws(()=>compileOrder(nodes,[{from:'a1',to:'a2'},{from:'a2',to:'a1'}]),/循环/)
assert.deepEqual(compileOrder([{id:'t1',type:'indextts'},{id:'u1',type:'uvr'},{id:'t2',type:'indextts'},{id:'u2',type:'uvr'}],[{from:'t1',to:'u1'},{from:'t2',to:'u2'}]).map(n=>n.id),['t1','t2','u1','u2'])
console.log('Execution compiler: dependencies, model affinity, variants and cycles passed')
