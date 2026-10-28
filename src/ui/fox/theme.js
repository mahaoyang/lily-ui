(() => {
  const root = document.documentElement;
  let tone = 'light';
  try {
    const saved = localStorage.getItem('fox:ui:tone') ?? localStorage.getItem('fox-tone');
    localStorage.setItem('fox:ui:tone', saved || 'light');
    localStorage.removeItem('fox-tone');
    if (saved === 'dark') tone = 'dark';
  } catch {}
  function apply() {
    root.dataset.tone = tone;
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = getComputedStyle(root).getPropertyValue('--lily-background').trim();
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const appearance = document.getElementById('fox-appearance');
    if (!appearance) return;
    appearance.value = tone;
    appearance.addEventListener('change', () => {
      tone = appearance.value === 'dark' ? 'dark' : 'light';
      try { localStorage.setItem('fox:ui:tone', tone); } catch {}
      apply();
    });
  });
})();
