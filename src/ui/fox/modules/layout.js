import { browserPreference, rememberBrowserPreference } from './preferences.js';
import { $ } from './ui.js';

export function initLayout() {
  initComposerFooter();

  // Management menus dismiss without taking space from the conversation.
  const managementMenus = [...document.querySelectorAll('.directory-menu, #resource-settings')];
  document.addEventListener('click', event => {
    for (const menu of managementMenus) if (!menu.contains(event.target) || (menu.matches('.directory-menu') && event.target.closest('button'))) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') for (const menu of managementMenus) menu.open = false;
  });

  function toggleSidebar(kind) {
    const profiles = kind === 'profiles';
    const container = profiles ? $('.app-shell') : $('.session-layout');
    const collapsed = container.classList.toggle(profiles ? 'profiles-collapsed' : 'sessions-collapsed');
    const button = $(profiles ? '#collapse-profiles' : '#toggle-sessions');
    button.setAttribute('aria-expanded', String(!collapsed));
    button.title = `${collapsed ? '展开' : '收起'}${profiles ? '配置' : '会话'}栏`;
    button.setAttribute('aria-label', button.title);
    try { rememberBrowserPreference(`${kind}-collapsed`, String(collapsed)); } catch {}
  }
  $('#collapse-profiles').onclick = () => toggleSidebar('profiles');
  $('#toggle-sessions').onclick = () => toggleSidebar('sessions');
  for (const kind of ['profiles', 'sessions']) {
    try { if (browserPreference(`${kind}-collapsed`) === 'true') toggleSidebar(kind); } catch {}
  }

  function setChatFullscreen(enabled) {
    $('.chat-panel').classList.toggle('chat-fullscreen', enabled);
    const button = $('#chat-fullscreen');
    button.setAttribute('aria-pressed', String(enabled));
    button.title = enabled ? '退出全屏 (Esc)' : '全屏对话';
    button.setAttribute('aria-label', button.title);
    button.querySelector('use').setAttribute('href', enabled ? '/icons.svg#x' : '/icons.svg#maximize');
  }
  $('#chat-fullscreen').onclick = () => setChatFullscreen(!$('.chat-panel').classList.contains('chat-fullscreen'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('.chat-panel').classList.contains('chat-fullscreen')) {
      setChatFullscreen(false);
      $('#chat-fullscreen').focus();
    }
  });

  const alignRail = $('#chat-align');
  const transcript = $('.chat-body');
  function setChatIndent(value) {
    const max = Math.max(20, transcript.clientWidth - 100);
    const indent = Math.max(20, Math.min(max, value));
    transcript.style.setProperty('--chat-indent', `${indent}px`);
    transcript.classList.toggle('queue-right', indent < 220);
    alignRail.setAttribute('aria-valuenow', String(indent));
    alignRail.setAttribute('aria-valuemax', String(max));
    return indent;
  }
  let savedChatIndent = 28;
  try { savedChatIndent = Number(browserPreference('chat-indent')) || 28; } catch {}
  function saveChatIndent(value) {
    savedChatIndent = setChatIndent(value);
    try { rememberBrowserPreference('chat-indent', String(savedChatIndent)); } catch {}
  }
  alignRail.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); alignRail.setPointerCapture(event.pointerId);
    alignRail.classList.add('dragging');
  });
  alignRail.addEventListener('pointermove', event => {
    if (alignRail.hasPointerCapture(event.pointerId)) saveChatIndent(event.clientX - transcript.getBoundingClientRect().left);
  });
  for (const type of ['pointerup', 'pointercancel']) alignRail.addEventListener(type, event => {
    if (alignRail.hasPointerCapture(event.pointerId)) alignRail.releasePointerCapture(event.pointerId);
    alignRail.classList.remove('dragging');
  });
  alignRail.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    saveChatIndent(event.key === 'Home' ? 28 : Number(alignRail.getAttribute('aria-valuenow')) + (event.key === 'ArrowLeft' ? -4 : 4));
  });
  new ResizeObserver(() => setChatIndent(savedChatIndent)).observe(transcript);
  new ResizeObserver(entries => {
    transcript.style.setProperty('--composer-height', `${entries[0].target.getBoundingClientRect().height}px`);
  }).observe($('.composer-wrap'));

}

// Hints never reserve width or force the functional controls to wrap.
function initComposerFooter() {
  const footer = $('.composer-bottom');
  const status = footer.querySelector('.usage-status');
  const hint = footer.querySelector('.composer-hint');
  const update = () => {
    const hintRect = hint.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const items = [...status.children].map(item => item.getBoundingClientRect()).filter(rect => rect.width > 0);
    const singleRow = items.every(rect => Math.abs(rect.top - items[0].top) < 12);
    const fits = hintRect.width <= footerRect.width && items.every(rect => rect.right + 8 <= hintRect.left);
    hint.classList.toggle('is-visible', singleRow && fits);
  };
  const observer = new ResizeObserver(update);
  for (const element of [footer, status, hint, ...status.children]) observer.observe(element);
  document.fonts?.ready.then(update);
  update();
}
