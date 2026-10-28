import { t } from '../i18n.js';

import { countTextUnits } from '../../../headless/text/index.js';

export function renderTextCountCard() {
  const cardRoot = document.createElement('div');
  cardRoot.className = 'card text-count-card';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = t('textCount.title');

  const textarea = document.createElement('textarea');
  textarea.className = 'textarea text-count-input';
  textarea.placeholder = t('textCount.placeholder');
  textarea.setAttribute('aria-label', t('textCount.title'));

  const stats = document.createElement('div');
  stats.className = 'text-count-stats';

  const rows = [
    ['words', 'textCount.words'],
    ['letters', 'textCount.letters'],
    ['cjkChars', 'textCount.cjkChars'],
    ['charsNoSpace', 'textCount.charsNoSpace'],
    ['chars', 'textCount.chars'],
  ];

  const statValues = new Map();
  for (const [key, labelKey] of rows) {
    const item = document.createElement('div');
    item.className = 'text-count-stat';

    const label = document.createElement('div');
    label.className = 'text-count-label';
    label.textContent = t(labelKey);

    const value = document.createElement('div');
    value.className = 'text-count-value';
    value.textContent = '0';

    statValues.set(key, value);
    item.append(label, value);
    stats.appendChild(item);
  }

  const refresh = () => {
    const result = countTextUnits(textarea.value);
    for (const [key, valueEl] of statValues.entries()) {
      valueEl.textContent = String(result[key] ?? 0);
    }
  };

  textarea.addEventListener('input', refresh);
  refresh();

  cardRoot.append(title, textarea, stats);
  return cardRoot;
}

