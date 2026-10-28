(() => {
  const root = document.documentElement;
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem('fox:ui:appearance');
    const legacy = localStorage.getItem('fox:ui:tone') ?? localStorage.getItem('fox-tone');
    preference = ['system', 'light', 'dark'].includes(saved) ? saved
      : ['light', 'dark'].includes(legacy) ? legacy : 'system';
    localStorage.setItem('fox:ui:appearance', preference);
    localStorage.removeItem('fox:ui:tone');
    localStorage.removeItem('fox-tone');
  } catch {}
  function apply() {
    const tone = preference === 'dark' || (preference === 'system' && systemDark.matches) ? 'dark' : 'light';
    root.dataset.tone = tone;
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = getComputedStyle(root).getPropertyValue('--lily-background').trim();
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const selector = document.getElementById('fox-appearance');
    if (!selector) return;
    selector.value = preference;
    selector.addEventListener('change', () => {
      preference = selector.value;
      try { localStorage.setItem('fox:ui:appearance', preference); } catch {}
      apply();
    });
  });
  systemDark.addEventListener('change', () => {
    if (preference === 'system') apply();
  });
})();
