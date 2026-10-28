export function requestWorkflowName(title, initialValue = '', label = '工作流名称') {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'workflow-name-dialog'
    dialog.innerHTML = `<form><h2></h2><label>工作流名称<input name="workflowName" type="text" maxlength="100" placeholder="输入工作流名称" required autocomplete="off"></label><footer><button class="secondary-button" type="button">取消</button><button class="primary-button" type="submit">保存</button></footer></form>`
    dialog.querySelector('h2').textContent = title
    dialog.querySelector('label').firstChild.textContent = label
    dialog.querySelector('input').placeholder = `输入${label}`
    const input = dialog.querySelector('input')
    input.value = initialValue
    let result = null
    dialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault()
      if (!input.value.trim()) { input.setCustomValidity('请输入工作流名称'); input.reportValidity(); return }
      result = input.value.trim()
      dialog.close()
    })
    input.addEventListener('input', () => input.setCustomValidity(''))
    dialog.querySelector('button[type="button"]').addEventListener('click', () => dialog.close())
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect()
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close()
    })
    dialog.addEventListener('close', () => { dialog.remove(); resolve(result) }, { once: true })
    document.body.append(dialog)
    dialog.showModal()
    input.focus()
    input.select()
  })
}

export function confirmWorkflowDelete(name) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'workflow-name-dialog workflow-delete-dialog'
    dialog.innerHTML = '<form><h2>删除工作流</h2><p></p><footer><button class="secondary-button" type="button">取消</button><button class="primary-button" type="submit">确认删除</button></footer></form>'
    dialog.querySelector('p').textContent = `确定删除“${name}”吗？删除后无法恢复。`
    let confirmed = false
    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault()
      confirmed = true
      dialog.close()
    })
    const cancel = dialog.querySelector('button[type="button"]')
    cancel.addEventListener('click', () => dialog.close())
    dialog.addEventListener('close', () => { dialog.remove(); resolve(confirmed) }, { once: true })
    document.body.append(dialog)
    dialog.showModal()
    cancel.focus()
  })
}

export function confirmWorkflowOverwrite(name) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog')
    dialog.className = 'workflow-name-dialog'
    dialog.innerHTML = '<form><h2>覆盖同名工作流</h2><p></p><footer><button class="secondary-button" type="button">取消</button><button class="primary-button" type="submit">确认覆盖</button></footer></form>'
    dialog.querySelector('p').textContent = `已存在“${name}”，是否覆盖其节点配置和输入文件？`
    let confirmed = false
    dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); confirmed = true; dialog.close() })
    const cancel = dialog.querySelector('button[type="button"]')
    cancel.addEventListener('click', () => dialog.close())
    dialog.addEventListener('close', () => { dialog.remove(); resolve(confirmed) }, { once: true })
    document.body.append(dialog); dialog.showModal(); cancel.focus()
  })
}
