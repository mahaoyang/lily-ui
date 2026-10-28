import { requestWorkflowName } from './workflow-name-dialog.js'
import { taskNodeState as state } from '../../../../headless/workflow/graph/task-state.js'
import { uniqueTaskName } from '../../../../headless/workflow/runtime/task-name.js'
import { runtimeCommand, watchRuntimeTasks } from '../../../../adapters/browser/workflow/runtime.js'
import { globalTaskPool } from '../../../../adapters/browser/workflow/runtime.js'
import { compileOrder } from '../../../../headless/workflow/graph/execution-plan.js'
import { reviewItems } from './quality-review.js'
import { decodeTask } from '../../../../adapters/browser/workflow/task-codec.js'
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const progress = n => n.running ? Math.max(0,Math.min(100,n.progress||0)) : n.output && state(n)!=='running' ? 100 : n.graph && state(n)==='running' ? n.graph.nodes.reduce((sum,c)=>sum+progress(c),0)/Math.max(1,n.graph.nodes.length) : n.progress || 0
export function mountWorkflowTasks(actions) {
  const tasks = [], host = document.getElementById('workflow-task-list')
  const notice = document.createElement('p'); notice.className = 'input-dialog-error'; notice.hidden = true; host.before(notice)
  const deletedIds=new Set(), startingIds=new Set()
  const error = () => { notice.textContent = '任务保存失败，请检查后台服务。'; notice.hidden = false }
  const ready = fetch('/api/workflow-runtime').then(async response => {
    if(!response.ok)throw new Error('无法读取任务队列')
    const data=await response.json()
    tasks.push(...await Promise.all(data.tasks.map(decodeTask)))
    tasks.sort((a,b)=>b.createdAt-a.createdAt);render()
    watchRuntimeTasks(async update => {
      if(deletedIds.has(update.id))return
      notice.hidden=true
      let task = tasks.find(t => t.id === update.id)
      if (task) Object.assign(task, update)
      else { task = update; tasks.unshift(task) }
      actions.runtimeUpdate?.(task)
      render()
    }, e => { notice.textContent = e.message; notice.hidden = false }, ids => {
      const present=new Set(ids)
      for(let i=tasks.length-1;i>=0;i--)if(tasks[i].runtimeRevision&&!present.has(tasks[i].id)){const [task]=tasks.splice(i,1);task.deleted=true;actions.deleteTask?.(task)}
      render()
    }, tasks)
  }).catch(() => { error() })
  const stages=task=>{try{return compileOrder(task.nodes,task.edges)}catch{return task.nodes}}
  const reviewCount=task=>task.nodes.filter(node=>node.type==='quality-review').reduce((count,node)=>count+reviewItems(node,task.nodes,task.edges).length,0)
  function render() {
    document.getElementById('workflow-task-empty').hidden = tasks.length > 0
    host.innerHTML = tasks.map(task => {
      const count = reviewCount(task)
      return `<article class="workflow-task" data-task="${esc(task.id)}"><header><div><div class="task-name-row"><h2>${esc(task.name)}</h2><button class="secondary-button task-rename" data-rename-task type="button" title="重命名任务" aria-label="重命名任务"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5M4 20l4-1L21 6a2.1 2.1 0 0 0-3-3L5 16Z"/></svg></button></div><span data-task-status>${esc(task.status)}</span></div><div class="task-controls">${count ? `<button class="secondary-button task-review" data-task-review aria-label="试听与重抽 ${count} 项"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10v4m4-7v10m4-13v16m4-13v10m4-7v4"/></svg>质检 ${count} 项</button>` : ''}<button class="secondary-button" data-start ${task.running || task.queued || startingIds.has(task.id)?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 3 14 9-14 9Z"/></svg>运行</button><button class="secondary-button" data-stop ${task.running || task.queued?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>停止</button><button class="secondary-button task-delete" data-delete-task aria-label="删除任务" title="删除任务"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6"/></svg></button></div></header><button class="task-pipeline" data-task-canvas aria-label="查看任务画布"><span class="task-pipeline-track">${stages(task).map(n=>`<span class="task-stage is-${state(n)}" data-task-node="${esc(n.id)}" role="progressbar" aria-label="${esc(n.title)}" aria-valuenow="${Math.round(progress(n))}" aria-valuemin="0" aria-valuemax="100" title="${esc(n.error || n.progressMessage || n.title)}"><i style="--stage-progress:${progress(n)}%"></i><strong>${esc(n.title)}</strong><small>${state(n)==='running'?`${Math.round(progress(n))}%`:state(n)==='failed'?'失败':state(n)==='partial'?`${task.paused?'已暂停':'已完成部分'} ${Math.round(progress(n))}%`:n.output?'完成':'待运行'}</small></span>`).join('')}</span></button></article>`
    }).join('')
    for(const task of tasks) {
      const card = [...host.querySelectorAll('[data-task]')].find(c=>c.dataset.task===task.id)
      card.querySelector('[data-rename-task]').onclick = async () => {
        const name = await requestWorkflowName('重命名任务', task.name, '任务名称')
        if (!name || task.deleted || name === task.name) return
        try {
          const result = await runtimeCommand('rename', task, { name })
          task.name = result.name
          actions.runtimeUpdate?.(task)
          render()
        } catch (e) { notice.textContent = e.message; notice.hidden = false }
      }
      card.querySelector('[data-task-canvas]').onclick = () => actions.openTask(task)
      const reviewButton = card.querySelector('[data-task-review]')
      if (reviewButton) reviewButton.onclick = () => actions.openReview(task)
      card.querySelector('[data-start]').onclick = async event => {
        event.preventDefault()
        event.stopPropagation()
        if (task.queued || task.running || task.deleted || startingIds.has(task.id)) return
        startingIds.add(task.id); render()
        try { await runtimeCommand('run', task); task.runtimeManaged = true; task.queued = true; task.status = '排队中'; render() }
        catch (e) { notice.textContent = e.message; notice.hidden = false }
        finally { startingIds.delete(task.id); render() }
      }
      card.querySelector('[data-stop]').onclick = async () => {
        try { await runtimeCommand('stop', task) } catch (e) { notice.textContent=e.message; notice.hidden=false }
      }
      card.querySelector('[data-delete-task]').onclick = async event => {
        event.currentTarget.disabled=true
        try{
          await runtimeCommand('delete',task)
          globalTaskPool.cancelOwner(task.id)
          deletedIds.add(task.id);task.deleted=true
          const index=tasks.indexOf(task);if(index>=0)tasks.splice(index,1)
          actions.deleteTask?.(task);render()
        }catch(e){notice.textContent=e.message;notice.hidden=false;render()}
      }
    }
  }
  return {
    checkpoint(task) { if(!task.deleted)render() },
    async create(graph) {
      await ready
      const task = {...structuredClone(graph), name:uniqueTaskName(graph.name, tasks), templateId:graph.id, id:crypto.randomUUID(), createdAt:Date.now(), status:'等待运行', running:false}
      const reset = nodes => nodes.forEach(n=>{ n.output=null;n.results=null;n.iterationOutputs=null;n.iterationResults=null;n.error='';n.progress=0;n.running=false;if(n.graph)reset(n.graph.nodes) })
      reset(task.nodes); await runtimeCommand('save',task);task.runtimeManaged=true;tasks.unshift(task);render();actions.navigate('running')
    }
  }
}
