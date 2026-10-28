import { t } from '../i18n.js';

// Shared identity markers keep loading and pending values consistent across views.
export const FETCHING = Symbol('fetching');
export const PENDING = Symbol('pending');

export function pill(text, statusClass) {
  const span = document.createElement('span');
  span.className = `pill${statusClass ? ` ${statusClass}` : ''}`;
  span.textContent = String(text);
  return span;
}

function kvVisualLevelFromElement(el) {
  if (!el || typeof el !== 'object') return null;
  const direct = el?.dataset?.kvLevel;
  if (direct) return String(direct);

  const classList = el?.classList;
  if (!classList) return null;
  if (classList.contains('status-bad')) return 'bad';
  if (classList.contains('status-warn')) return 'warn';
  if (classList.contains('status-good')) return 'good';

  // If the wrapper isn't the pill, try to infer from a nested pill.
  const innerPill = typeof el.querySelector === 'function' ? el.querySelector('.pill') : null;
  if (!innerPill) return null;
  if (innerPill.classList.contains('status-bad')) return 'bad';
  if (innerPill.classList.contains('status-warn')) return 'warn';
  if (innerPill.classList.contains('status-good')) return 'good';
  return null;
}

function applyKvLevel(row, level) {
  const l = String(level || '').toLowerCase();
  if (l !== 'good' && l !== 'warn' && l !== 'bad') return;
  row.classList.add(`kv--${l}`);
}

export function kv(key, value) {
  const row = document.createElement('div');
  row.className = 'kv';
  row.setAttribute('role', 'listitem');
  const left = document.createElement('span');
  left.className = 'k';
  if (key && typeof key === 'object' && 'nodeType' in key) left.appendChild(key);
  else left.textContent = String(key);
  const right = document.createElement('span');
  right.className = 'v';

  const keyText = (() => {
    if (key && typeof key === 'object' && 'nodeType' in key) return String(key.textContent || '').trim();
    return String(key ?? '').trim();
  })();
  const valueText = (() => {
    if (value === FETCHING) return t('pill.fetching');
    if (value === PENDING) return t('pill.pending');
    if (value && typeof value === 'object' && 'nodeType' in value) return String(value.textContent || '').trim();
    if (value === null || value === undefined || value === '') return t('pill.na');
    if (typeof value === 'boolean') return value ? t('pill.yes') : t('pill.no');
    return String(value);
  })();
  if (keyText) row.setAttribute('aria-label', `${keyText}: ${valueText}`);

  if (value === FETCHING) {
    const fetchingWrap = document.createElement('span');
    fetchingWrap.className = 'fetching-wrap';
    fetchingWrap.setAttribute('aria-label', t('pill.fetching'));
    fetchingWrap.setAttribute('title', t('pill.fetching'));

    const light = document.createElement('span');
    light.className = 'fetching-light';
    light.setAttribute('aria-hidden', 'true');

    fetchingWrap.append(light);
    right.appendChild(fetchingWrap);
  } else if (value === PENDING) {
    right.appendChild(pill(t('pill.pending'), 'status-pending'));
  } else if (value && typeof value === 'object' && 'nodeType' in value) {
    right.appendChild(value);
    applyKvLevel(row, kvVisualLevelFromElement(value));
  } else if (value === null || value === undefined || value === '') {
    right.appendChild(pill(t('pill.na'), 'status-disabled'));
  } else if (typeof value === 'boolean') {
    right.appendChild(
      pill(value ? t('pill.yes') : t('pill.no'), value ? 'status-success' : 'status-error'),
    );
  } else if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    const a = document.createElement('a');
    a.href = value;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = value;
    right.appendChild(a);
  } else if (typeof value === 'object') {
    right.textContent = JSON.stringify(value);
  } else {
    right.textContent = String(value);
  }

  row.append(left, right);
  return row;
}

export function detailsTable(rows) {
  const wrap = document.createElement('div');
  wrap.className = 'details';
  wrap.setAttribute('role', 'list');
  for (const [k, v] of rows) wrap.appendChild(kv(k, v));
  return wrap;
}

export function card(title, bodyNode) {
  const wrap = document.createElement('div');
  wrap.className = 'card';
  const t = document.createElement('div');
  t.className = 'card-title';
  t.textContent = title;
  wrap.appendChild(t);
  wrap.appendChild(bodyNode);
  return wrap;
}

export function sectionFold(title, bodyNodes, { open = false } = {}) {
  const root = document.createElement('details');
  root.className = 'section-fold';
  root.open = !!open;
  const summary = document.createElement('summary');
  summary.className = 'section-summary';
  summary.textContent = title;
  const body = document.createElement('div');
  body.className = 'section-body';
  for (const node of bodyNodes) body.appendChild(node);
  root.append(summary, body);
  return root;
}

export function field(labelText, control) {
  const root = document.createElement('label');
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelText;
  root.append(label, control);
  return root;
}
