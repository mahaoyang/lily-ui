export function createWorkflowStorage({ fetch, walkNodes, encodeTask, decodeTask }) {
let saved=[], pendingInputs=new Map()
async function loadWorkflows(){
  const response=await fetch('/api/workflow-runtime/workflows')
  const data=await response.json();if(!response.ok)throw new Error(data.error||'无法读取工作流')
  saved=data.workflows
}
function readWorkflows(){return structuredClone(saved).map(({inputs,...graph})=>graph)}
async function writeWorkflows(graphs){
  const next=graphs.map(graph=>({...graph,inputs:pendingInputs.get(graph.id)??saved.find(item=>item.id===graph.id)?.inputs??[]}))
  const response=await fetch('/api/workflow-runtime/workflows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workflows:next})})
  const data=await response.json();if(!response.ok)throw new Error(data.error||'工作流保存失败')
  saved=next
}
async function saveWorkflowInputs(id,nodes,commit){
  const inputs=[]
  walkNodes(nodes,(node,key)=>inputs.push({id:key,extraFiles:node.extraFiles||{},localFirst:node.localFirst||null,localSecond:node.localSecond||null}))
  pendingInputs.set(id,await encodeTask(inputs))
  try{await commit()}finally{pendingInputs.delete(id)}
}
async function restoreWorkflowInputs(graph){
  const inputs=await decodeTask(saved.find(item=>item.id===graph.id)?.inputs||[])
  const restored=structuredClone(graph),byId=new Map(inputs.map(input=>[input.id,input]))
  walkNodes(restored.nodes,(node,key)=>{const input=byId.get(key);if(input){const {id,...files}=input;Object.assign(node,files)}})
  return restored
}
async function deleteWorkflowInputs(id,commit){await commit();await cleanupWorkflowInputs()}
async function cleanupWorkflowInputs(){
  const response=await fetch('/api/workflow-runtime/cleanup',{method:'POST'})
  const data=await response.json();if(!response.ok)throw new Error(data.error||'附件清理失败')
  return data
}

async function duplicateWorkflow(id){
  const source=saved.find(item=>item.id===id)
  if(!source)throw new Error('工作流不存在')
  const copy=structuredClone(source),names=new Set(saved.map(item=>item.name))
  const base=`${source.name} - 副本`
  let name=base,index=2
  while(names.has(name))name=`${base}-${index++}`
  copy.id=crypto.randomUUID();copy.name=name;copy.updatedAt=Date.now()
  // Attachments are immutable content-addressed files; each copy owns its references.
  pendingInputs.set(copy.id,copy.inputs||[])
  try{await writeWorkflows([...readWorkflows(),copy])}finally{pendingInputs.delete(copy.id)}
  return copy
}
return { loadWorkflows, readWorkflows, writeWorkflows, saveWorkflowInputs, restoreWorkflowInputs, deleteWorkflowInputs, cleanupWorkflowInputs, duplicateWorkflow };
}
