import { columnName, forColumns, columnItems, validateFor } from '../../../../headless/workflow/graph/for-node.js'

export function configureFor(node) {
  return new Promise(resolve => {
    const draft = { params: structuredClone(node.params || {}), extraFiles: { ...node.extraFiles } }
    draft.params.columns = structuredClone(forColumns(node))
    const dialog = document.createElement('dialog'); dialog.className = 'workflow-name-dialog for-config-dialog'
    dialog.innerHTML = '<form><header><h2>For 循环</h2><button type="button" data-close class="secondary-button" aria-label="关闭">×</button></header><p>每列是一组列表；按索引配对，所有非空列长度必须一致。选择逐项循环的输入并配置列表；未开启的输入由内部配置或普通连线提供。只重复执行内部节点。</p><div data-columns></div><p class="input-dialog-error" data-error></p><footer><button type="button" class="secondary-button" data-cancel>取消</button><button type="submit" class="primary-button">完成</button></footer></form>'
    const host = dialog.querySelector('[data-columns]'), error = dialog.querySelector('[data-error]')
    const draw = () => {
      host.replaceChildren()
      draft.params.columns.forEach((c, i) => {
        const section = document.createElement('section'); section.className = 'for-column'
        section.innerHTML = '<header><input data-name maxlength="40" aria-label="端点名称"><span data-count></span><button type="button" class="secondary-button" data-clear aria-label="清空列表">×</button></header><textarea rows="3" placeholder="每行一项，或粘贴 JSON 数组"></textarea><label class="task-audio-drop">拖入多个文件，或点击选择<input type="file" multiple></label>'
        {
          const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'parameter-toggle'; toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-checked', String(c.enabled !== false)); toggle.textContent = c.enabled === false ? '普通输入' : '逐项循环'; toggle.onclick = () => { c.enabled = c.enabled === false; draw() }; section.querySelector('header').prepend(toggle)
        }
        const name = section.querySelector('[data-name]'), area = section.querySelector('textarea')
        name.value = c.name || ''; name.placeholder = node.inputs?.find(p => p.id === c.id)?.label || columnName(i); name.oninput = () => { c.name = name.value; error.textContent = '' }
        name.disabled = true
        area.disabled = !!c.connected || c.enabled === false
        section.querySelector('[data-clear]').disabled = !!c.connected
        section.querySelector('label').hidden = !!c.connected || c.enabled === false
        area.placeholder = c.connected ? '列表由上游连线提供，运行时自动读取' : area.placeholder
        area.value = c.raw ?? (c.files ? '' : (c.items || []).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('\n'))
        const update = () => { section.querySelector('[data-count]').textContent = `${columnItems(draft, c).length} 项` }
        area.oninput = () => { c.raw = area.value; delete c.files; try { c.items = area.value.trim().startsWith('[') ? JSON.parse(area.value) : area.value.split(/\r?\n/).filter(v => v.trim()); if (!Array.isArray(c.items)) throw new Error(); error.textContent = ''; update() } catch { c.items = []; error.textContent = '请输入有效的 JSON 数组' } }
        const accept = files => { if (!files.length) return; c.files = Array.from(files, file => { const key = `for-${crypto.randomUUID()}`; draft.extraFiles[key] = file; return key }); c.items = []; delete c.raw; error.textContent = ''; draw(); update() }
        const drop = section.querySelector('label'); drop.ondragover = e => e.preventDefault(); drop.ondrop = e => { e.preventDefault(); if(c.enabled !== false) accept(e.dataTransfer.files) }; drop.querySelector('input').onchange = e => accept(e.target.files)
        section.querySelector('[data-clear]').onclick = () => { c.items = []; delete c.files; delete c.raw; error.textContent = ''; draw() }
        host.append(section); section.querySelector('[data-count]').textContent = `${columnItems(draft, c).length} 项`
      })
    }
    let result = null
    dialog.querySelector('form').onsubmit = event => { event.preventDefault(); try { for (const c of draft.params.columns) if (c.raw?.trim().startsWith('[') && !Array.isArray(JSON.parse(c.raw))) throw new Error('请输入有效的 JSON 数组'); if (!draft.params.columns.some(c => c.connected)) validateFor(draft); const used = new Set(draft.params.columns.flatMap(c => c.files || [])); draft.extraFiles = Object.fromEntries(Object.entries(draft.extraFiles).filter(([key]) => used.has(key))); result = draft; dialog.close() } catch (e) { error.textContent = e.message } }
    dialog.querySelector('[data-close]').onclick = dialog.querySelector('[data-cancel]').onclick = () => dialog.close()
    dialog.onclose = () => { dialog.remove(); resolve(result) }
    document.body.append(dialog); draw(); dialog.showModal()
  })
}
