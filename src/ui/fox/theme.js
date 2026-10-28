(() => {
  const root = document.documentElement;
  let tone = 'light';
  try { const saved = localStorage.getItem('fox:ui:tone') ?? localStorage.getItem('fox-tone'); localStorage.setItem('fox:ui:tone', saved || 'light'); localStorage.removeItem('fox-tone'); if (saved === 'dark') tone = 'dark'; } catch {}
  function apply() {
    root.dataset.tone = tone;
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--lily-background').trim();
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const label = tone === 'dark' ? '切换浅色' : '切换深色';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(tone === 'dark'));
    button.querySelector('use').setAttribute('href', '/icons.svg#' + (tone === 'dark' ? 'sun' : 'moon'));
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle').onclick = () => {
      tone = tone === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('fox:ui:tone', tone); } catch {}
      apply();
    };
  });
})();
