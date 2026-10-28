const CHECK_SVG = `
<svg width="100%" height="100%" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true" focusable="false">
  <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" />
</svg>
`.trim();

const MINUS_SVG = `
<svg width="100%" height="100%" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true" focusable="false">
  <path d="M2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" />
</svg>
`.trim();

function isElement(node) {
  return node && typeof node === 'object' && node.nodeType === 1;
}

function stateForInput(input) {
  if (input.indeterminate) return 'indeterminate';
  return input.checked ? 'checked' : 'unchecked';
}

function ariaCheckedForState(state) {
  if (state === 'indeterminate') return 'mixed';
  return state === 'checked' ? 'true' : 'false';
}

function ensureIndicatorSvg(indicator, state) {
  if (!indicator) return;
  if (state === 'checked') {
    indicator.innerHTML = CHECK_SVG;
    return;
  }
  if (state === 'indeterminate') {
    indicator.innerHTML = MINUS_SVG;
    return;
  }
  indicator.innerHTML = '';
}

function updateButtonFromInput(input, button) {
  const state = stateForInput(input);
  button.dataset.state = state;
  button.setAttribute('aria-checked', ariaCheckedForState(state));
  button.disabled = !!input.disabled;
  const indicator = button.querySelector('.rt-BaseCheckboxIndicator');
  ensureIndicatorSvg(indicator, state);
}

function findOrCreateButton(input) {
  const existingId = input.getAttribute('data-lily-checkbox-id') || '';
  if (existingId) {
    const prev = input.parentElement?.querySelector(`[data-lily-checkbox-button="${existingId}"]`);
    if (prev) return prev;
  }

  const id = Math.random().toString(36).slice(2);
  input.setAttribute('data-lily-checkbox-id', id);

  const variant = (input.getAttribute('data-lily-variant') || 'surface').trim() || 'surface';
  const size = (input.getAttribute('data-lily-size') || '2').trim() || '2';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `rt-reset rt-BaseCheckboxRoot rt-CheckboxRoot rt-variant-${variant} rt-r-size-${size}`;
  button.setAttribute('role', 'checkbox');
  button.setAttribute('data-lily-checkbox-button', id);

  const indicator = document.createElement('span');
  indicator.className = 'rt-BaseCheckboxIndicator';
  indicator.setAttribute('aria-hidden', 'true');
  button.appendChild(indicator);

  input.insertAdjacentElement('beforebegin', button);
  return button;
}

function toggleInput(input) {
  input.indeterminate = false;
  input.checked = !input.checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function upgradeInput(input) {
  if (!isElement(input) || input.tagName !== 'INPUT') return;
  if (input.type !== 'checkbox') return;
  if (!input.hasAttribute('data-lily-checkbox')) return;
  if (input.dataset.lilyCheckboxUpgraded === '1') return;
  input.dataset.lilyCheckboxUpgraded = '1';

  input.classList.add('lily-checkbox-input');
  input.tabIndex = -1;

  const button = findOrCreateButton(input);
  updateButtonFromInput(input, button);

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (input.disabled) return;
    toggleInput(input);
    updateButtonFromInput(input, button);
  });

  button.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    if (input.disabled) return;
    toggleInput(input);
    updateButtonFromInput(input, button);
  });

  input.addEventListener('change', () => updateButtonFromInput(input, button));

  const form = input.form;
  if (form && isElement(form) && form.tagName === 'FORM') {
    if (form.dataset.lilyCheckboxResetHooked !== '1') {
      form.dataset.lilyCheckboxResetHooked = '1';
      form.addEventListener('reset', () => {
        setTimeout(() => refreshLilyCheckboxes(form), 0);
      });
    }
  }
}

export function setupLilyCheckboxes(root = document) {
  const scope = root || document;
  const inputs = scope.querySelectorAll?.('input[type="checkbox"][data-lily-checkbox]') || [];
  inputs.forEach((input) => upgradeInput(input));
}

export function refreshLilyCheckboxes(root = document) {
  const scope = root || document;
  const inputs = scope.querySelectorAll?.('input[type="checkbox"][data-lily-checkbox]') || [];
  inputs.forEach((input) => {
    const id = input.getAttribute('data-lily-checkbox-id') || '';
    if (!id) return;
    const btn = input.parentElement?.querySelector(`[data-lily-checkbox-button="${id}"]`);
    if (!btn) return;
    updateButtonFromInput(input, btn);
  });
}

