export const icon = name => `<svg class="lucide" aria-hidden="true"><use href="/icons.svg#${name}"></use></svg>`;
export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export { api } from '../../../adapters/browser/fox/client.js';
export function toast(text, action) {
  const el = $('#toast'); el.textContent = text;
  if (action) {
    const button = document.createElement('button'); button.className = 'text-button'; button.textContent = action.label;
    button.onclick = async () => { button.disabled = true; try { await action.run(); } catch (error) { toast(error.message); } };
    el.append(button);
  }
  el.classList.remove('hidden'); clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), action ? 7000 : 2400);
}

// Serialize confirmations so simultaneous ACP requests never overwrite each other.
let confirmationChain = Promise.resolve();
export function confirmAction({ title, body, confirmLabel = '确定', cancelLabel = '取消', danger = false, collect }) {
  const show = () => new Promise(resolve => {
    const previous = document.activeElement;
    const modal = document.createElement('div');
    modal.className = 'modal app-confirm';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'app-confirm-title');
    modal.innerHTML = `<div class="modal-backdrop"></div><div class="modal-card"><div class="modal-head"><h2 id="app-confirm-title">${esc(title)}</h2></div><div class="modal-content">${body}</div><div class="modal-footer"><button class="secondary-button" data-cancel>${esc(cancelLabel)}</button><button class="${danger ? 'danger-button' : 'primary-button'}" data-confirm>${esc(confirmLabel)}</button></div></div>`;
    let done = false;
    const finish = value => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey, true);
      modal.remove();
      if (previous?.isConnected) previous.focus();
      resolve(value);
    };
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(false); }
      if (event.key === 'Tab') {
        const buttons = [...modal.querySelectorAll('button,input,textarea,select')];
        const next = event.shiftKey ? -1 : 1;
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault(); buttons[(index + next + buttons.length) % buttons.length].focus();
      }
    };
    modal.querySelector('[data-cancel]').onclick = () => finish(false);
    modal.querySelector('[data-confirm]').onclick = () => finish(collect ? collect(modal) : true);
    modal.querySelector('.modal-backdrop').onclick = () => finish(false);
    document.body.append(modal);
    document.addEventListener('keydown', onKey, true);
    modal.querySelector('[data-cancel]').focus();
  });
  const result = confirmationChain.then(show);
  confirmationChain = result.catch(() => false);
  return result;
}
