import { h } from '../../lib/dom.js'
import { Button } from '../../components/ui.js'
import { openModal } from '../../components/modal.js'

export async function confirmOkCancel(title, text, okText = '确认', okAccent = 'tomato') {
  return new Promise((resolve) => {
    const body = h('div', { class: 'console-stack-sm' },
      h('div', { class: 'text-2 text-gray-12' }, text),
    )
    const modal = openModal({
      title,
      body,
      footer: [],
      closeOnOverlay: false,
      closeOnEscape: true,
      onClose: () => resolve(false)
    })

    modal.footer.appendChild(Button({ variant: 'soft', children: ['取消'], onclick: () => { modal.close(); resolve(false) } }))
    modal.footer.appendChild(Button({ variant: 'solid', accent: okAccent, children: [okText], onclick: () => { resolve(true); modal.close() } }))
  })
}
