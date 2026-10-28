import { icon } from './ui.js';
import { providers } from '../../../headless/fox/providers.js';

function optionContent(select, option) {
  const content = document.createElement('span');
  content.className = 'theme-select-label';
  const provider = select.id === 'field-provider' && providers[option?.value];
  if (provider) {
    const image = document.createElement('img');
    image.className = `provider-icon ${provider.id}-icon`;
    image.src = provider.icon; image.alt = '';
    content.append(image);
  }
  const text = document.createElement('span');
  text.textContent = option?.textContent || '请选择';
  content.append(text);
  return content;
}

// Keep native values/change events as the data API; render every menu ourselves.
export function initSelects() {
  const controls = new Map();
  let active = null;
  const menu = document.createElement('div');
  menu.className = 'theme-select-menu hidden';
  menu.id = 'theme-select-menu';
  menu.setAttribute('role', 'listbox');
  document.body.append(menu);

  function close(restore = false) {
    if (!active) return;
    const button = controls.get(active);
    button?.setAttribute('aria-expanded', 'false');
    active = null;
    menu.classList.add('hidden');
    if (restore) button?.focus();
  }
  function position() {
    if (!active?.isConnected || active.closest('.hidden')) return close();
    const rect = controls.get(active).getBoundingClientRect();
    const height = Math.min(menu.scrollHeight, 260, innerHeight - 20);
    const below = innerHeight - rect.bottom - 8;
    menu.style.width = `${Math.min(Math.max(rect.width, 180), innerWidth - 20)}px`;
    menu.style.left = `${Math.max(10, Math.min(rect.left, innerWidth - menu.offsetWidth - 10))}px`;
    menu.style.maxHeight = `${Math.max(60, Math.min(260, below >= height ? below : rect.top - 8))}px`;
    menu.style.top = `${below >= height ? rect.bottom + 4 : Math.max(8, rect.top - Math.min(height, rect.top - 8) - 4)}px`;
  }
  function open(select) {
    close(); active = select;
    controls.get(select).setAttribute('aria-expanded', 'true');
    menu.replaceChildren();
    [...select.options].forEach((option, index) => {
      if (option.hidden) return;
      const row = document.createElement('button');
      row.type = 'button'; row.className = 'theme-select-option';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(index === select.selectedIndex));
      row.disabled = option.disabled || !!option.closest('optgroup')?.disabled;
      row.append(optionContent(select, option)); row.insertAdjacentHTML('beforeend', icon('check'));
      row.onclick = () => {
        select.selectedIndex = index;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        sync(select); close(true);
      };
      menu.append(row);
    });
    menu.classList.remove('hidden'); position();
    (menu.querySelector('[aria-selected=true]:not(:disabled)') || menu.querySelector('button:not(:disabled)'))?.focus();
  }
  function sync(select) {
    let button = controls.get(select);
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.className = 'theme-select';
      button.setAttribute('aria-haspopup', 'listbox'); button.setAttribute('aria-controls', menu.id); button.setAttribute('aria-expanded', 'false');
      button.innerHTML = `<span></span>${icon('chevron-down')}`;
      select.after(button); select.classList.add('theme-native-select'); select.tabIndex = -1;
      controls.set(select, button);
      button.onclick = () => active === select ? close() : open(select);
      button.onkeydown = event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); open(select); }
      };
      select.addEventListener('change', () => sync(select));
    }
    button.classList.toggle('hidden', select.hidden || select.classList.contains('hidden'));
    button.disabled = select.disabled;
    button.setAttribute('aria-label', select.getAttribute('aria-label') || select.options[select.selectedIndex]?.textContent || '选择');
    const option = select.options[select.selectedIndex];
    const label = button.querySelector(':scope > span');
    const providerId = select.id === 'field-provider' ? option?.value : '';
    if (label.dataset.value !== providerId || label.textContent !== (option?.textContent || '请选择')) {
      const replacement = optionContent(select, option);
      replacement.dataset.value = providerId || '';
      label.replaceWith(replacement);
    }
  }
  const observer = new MutationObserver(records => {
    for (const [select, button] of controls) {
      if (!select.isConnected) { if (active === select) close(); button.remove(); controls.delete(select); }
    }
    document.querySelectorAll('select:not(.theme-native-select)').forEach(sync);
    for (const record of records) {
      const select = record.target.closest?.('select');
      if (select) sync(select);
    }
    if (active && (active.disabled || active.classList.contains('hidden') || active.closest('.modal.hidden'))) close();
  });
  document.querySelectorAll('select').forEach(sync);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'class', 'selected'] });
  document.addEventListener('pointerdown', event => {
    if (active && !menu.contains(event.target) && !controls.get(active)?.contains(event.target)) close();
  }, true);
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(true); }
    else if (event.key === 'Tab') close();
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const rows = [...menu.querySelectorAll('button:not(:disabled)')];
      const index = rows.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      rows[next]?.focus();
    }
  }, true);
  addEventListener('resize', position);
  document.addEventListener('scroll', event => { if (active && !menu.contains(event.target)) position(); }, true);
}
