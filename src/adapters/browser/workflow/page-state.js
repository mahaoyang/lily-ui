// Browser storage contains only small view preferences, never graphs or files.
const values=new Map(),pending=new Map()
let database,timer
export async function loadPageState(){
  database=await new Promise((resolve,reject)=>{const r=indexedDB.open('ai-flow-page-state',1);r.onupgradeneeded=()=>r.result.createObjectStore('views');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
  await new Promise((resolve,reject)=>{const tx=database.transaction('views'),store=tx.objectStore('views'),keys=store.getAllKeys(),items=store.getAll();tx.oncomplete=()=>{keys.result.forEach((key,i)=>values.set(key,items.result[i]));resolve()};tx.onerror=()=>reject(tx.error)})
}
export function readPageState(key){return values.get(key)}
export function writePageState(key,value){
  if(JSON.stringify(values.get(key))===JSON.stringify(value))return
  values.set(key,value);pending.set(key,value);clearTimeout(timer);timer=setTimeout(flushPageState,500)
}
function flushPageState(){
  if(!database||!pending.size)return
  const batch=new Map(pending);pending.clear()
  const tx=database.transaction('views','readwrite'),store=tx.objectStore('views')
  for(const [key,value]of batch)store.put(value,key)
  tx.onabort=()=>{for(const [key,value]of batch)if(!pending.has(key))pending.set(key,value)}
}
if(typeof window!=='undefined')window.addEventListener('pagehide',flushPageState)
