// Lily UI Playground Sidebar
// Injects a navigation sidebar into component pages

(function () {
  const sidebarData = {
    "Layout": [
      { name: "Box", href: "box.html" },
      { name: "Flex", href: "flex.html" },
      { name: "Grid", href: "grid.html" },
      { name: "Container", href: "container.html" },
      { name: "Section", href: "section.html" },
      { name: "Inset", href: "inset.html" }
    ],
    "Typography": [
      { name: "Text", href: "text.html" },
      { name: "Heading", href: "heading.html" },
      { name: "Blockquote", href: "blockquote.html" },
      { name: "Code", href: "code.html" },
      { name: "Kbd", href: "kbd.html" },
      { name: "Link", href: "link.html" }
    ],
    "Components": [
      { name: "Accordion", href: "accordion.html" },
      { name: "Alert Dialog", href: "alert-dialog.html" },
      { name: "Avatar", href: "avatar.html" },
      { name: "Badge", href: "badge.html" },
      { name: "Button", href: "button.html" },
      { name: "Callout", href: "callout.html" },
      { name: "Card", href: "card.html" },
      { name: "Checkbox", href: "checkbox.html" },
      { name: "Context Menu", href: "context-menu.html" },
      { name: "Data List", href: "data-list.html" },
      { name: "Dialog", href: "dialog.html" },
      { name: "Dropdown Menu", href: "dropdown-menu.html" },
      { name: "Hover Card", href: "hover-card.html" },
      { name: "Icon Button", href: "icon-button.html" },
      { name: "Popover", href: "popover.html" },
      { name: "Progress", href: "progress.html" },
      { name: "Radio Group", href: "radio-group.html" },
      { name: "Scroll Area", href: "scroll-area.html" },
      { name: "Segmented Control", href: "segmented-control.html" },
      { name: "Select", href: "select.html" },
      { name: "Separator", href: "separator.html" },
      { name: "Skeleton", href: "skeleton.html" },
      { name: "Slider", href: "slider.html" },
      { name: "Spinner", href: "spinner.html" },
      { name: "Switch", href: "switch.html" },
      { name: "Table", href: "table.html" },
      { name: "Tabs", href: "tabs.html" },
      { name: "Text Area", href: "text-area.html" },
      { name: "Text Field", href: "text-field.html" },
      { name: "Tooltip", href: "tooltip.html" }
    ]
  };

  function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  }

  function createSidebarHTML(currentPage) {
    let navContent = `
      <div class="sidebar-section">
        <a href="index.html" class="sidebar-home ${currentPage === 'index.html' ? 'active' : ''}">
          <svg width="16" height="16" viewBox="0 0 15 15" fill="currentColor"><path d="M7.07926 0.222253C7.31275 -0.007434 7.6873 -0.007434 7.92079 0.222253L14.6708 6.86227C14.907 7.09465 14.9101 7.47453 14.6778 7.71076C14.4454 7.947 14.0655 7.95012 13.8293 7.71773L13 6.90201V12.5C13 12.7761 12.7762 13 12.5 13H2.50002C2.22388 13 2.00002 12.7761 2.00002 12.5V6.90201L1.17079 7.71773C0.934558 7.95012 0.554672 7.947 0.32229 7.71076C0.0899079 7.47453 0.0930034 7.09465 0.329256 6.86227L7.07926 0.222253ZM7.50002 1.49163L12 5.91831V12H10V8.49999C10 8.22385 9.77617 7.99999 9.50002 7.99999H5.50002C5.22388 7.99999 5.00002 8.22385 5.00002 8.49999V12H3.00002V5.91831L7.50002 1.49163ZM6.00002 12H9.00002V8.99999H6.00002V12Z"></path></svg>
          Overview
        </a>
      </div>`;

    for (const [category, items] of Object.entries(sidebarData)) {
      navContent += `<div class="sidebar-section"><div class="sidebar-category">${category}</div>`;
      for (const item of items) {
        navContent += `<a href="${item.href}" class="sidebar-link ${currentPage === item.href ? 'active' : ''}">${item.name}</a>`;
      }
      navContent += `</div>`;
    }

    // Use proper rt-ScrollArea component structure
    return `
      <div class="rt-ScrollAreaRoot">
        <div class="rt-ScrollAreaViewport">
          <nav class="sidebar-nav">${navContent}</nav>
        </div>
        <div class="rt-ScrollAreaScrollbar rt-r-size-1" data-orientation="vertical">
          <div class="rt-ScrollAreaThumb"></div>
        </div>
      </div>
    `;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'playground-sidebar-styles';
    style.textContent = `
      .playground-layout {
        display: flex;
        min-height: 100vh;
      }
      .playground-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 220px;
        height: 100vh;
        flex-shrink: 0;
        background: var(--gray-1);
        z-index: 40;
      }
      .playground-sidebar .rt-ScrollAreaRoot {
        height: 100%;
      }
      .playground-main {
        flex: 1;
        min-width: 0;
        margin-left: 220px;
        max-width: calc(100% - 220px);
      }
      .sidebar-nav {
        padding: var(--space-4);
      }
      .sidebar-section {
        margin-bottom: var(--space-4);
      }
      .sidebar-category {
        font-size: var(--font-size-1);
        font-weight: var(--font-weight-medium);
        color: var(--gray-11);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--space-2);
        padding-left: var(--space-2);
      }
      .sidebar-home {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2);
        border-radius: var(--radius-2);
        font-size: var(--font-size-2);
        font-weight: var(--font-weight-medium);
        color: var(--gray-11);
        text-decoration: none;
        transition: all 150ms;
      }
      .sidebar-home:hover {
        color: var(--gray-12);
        background: var(--gray-3);
      }
      .sidebar-home.active {
        color: var(--accent-11);
        background: var(--accent-3);
      }
      .sidebar-link {
        display: block;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-2);
        font-size: var(--font-size-2);
        color: var(--gray-11);
        text-decoration: none;
        transition: all 150ms;
      }
      .sidebar-link:hover {
        color: var(--gray-12);
        background: var(--gray-3);
      }
      .sidebar-link.active {
        color: var(--accent-11);
        background: var(--accent-3);
        font-weight: var(--font-weight-medium);
      }
      @media (max-width: 768px) {
        .playground-sidebar {
          display: none;
        }
        .playground-main {
          margin-left: 0;
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ScrollArea polyfill to keep Radix-style scrollbars usable without React
  function setupScrollArea(root) {
    if (!root || root.dataset.rtScrollAreaInitialized === 'true') return;

    const viewport = root.querySelector('.rt-ScrollAreaViewport');
    const verticalBar = root.querySelector('.rt-ScrollAreaScrollbar[data-orientation=\"vertical\"]');
    const horizontalBar = root.querySelector('.rt-ScrollAreaScrollbar[data-orientation=\"horizontal\"]');
    if (!viewport) return;

    root.dataset.rtScrollAreaInitialized = 'true';
    const minThumbSize =
      parseFloat(getComputedStyle(root).getPropertyValue('--scrollarea-thumb-min-size')) || 16;

    const updateBar = (bar, scrollPos, viewSize, scrollSize, orientation) => {
      if (!bar) return;
      const thumb = bar.querySelector('.rt-ScrollAreaThumb');
      if (!thumb) return;

      const hasOverflow = scrollSize - viewSize > 0.5;
      bar.style.display = hasOverflow ? 'flex' : 'none';
      bar.dataset.state = hasOverflow ? 'visible' : 'hidden';
      if (!hasOverflow) return;

      const trackSize = orientation === 'vertical' ? bar.clientHeight : bar.clientWidth;
      const thumbSize = Math.max(minThumbSize, (viewSize / scrollSize) * trackSize);
      const maxScroll = Math.max(scrollSize - viewSize, 1);
      const maxOffset = Math.max(trackSize - thumbSize, 0);
      const scrollRatio = Math.min(Math.max(scrollPos / maxScroll, 0), 1);
      const offset = maxOffset * scrollRatio;

      if (orientation === 'vertical') {
        thumb.style.height = `${thumbSize}px`;
        thumb.style.transform = `translateY(${offset}px)`;
      } else {
        thumb.style.width = `${thumbSize}px`;
        thumb.style.transform = `translateX(${offset}px)`;
      }
    };

    const update = () => {
      updateBar(verticalBar, viewport.scrollTop, viewport.clientHeight, viewport.scrollHeight, 'vertical');
      updateBar(
        horizontalBar,
        viewport.scrollLeft,
        viewport.clientWidth,
        viewport.scrollWidth,
        'horizontal'
      );
    };

    const attachDragging = (bar, orientation) => {
      if (!bar) return;
      const thumb = bar.querySelector('.rt-ScrollAreaThumb');
      if (!thumb) return;

      const scrollProp = orientation === 'vertical' ? 'scrollTop' : 'scrollLeft';
      const pointerProp = orientation === 'vertical' ? 'clientY' : 'clientX';
      const sizeProp = orientation === 'vertical' ? 'clientHeight' : 'clientWidth';
      const scrollSizeProp = orientation === 'vertical' ? 'scrollHeight' : 'scrollWidth';

      thumb.addEventListener('pointerdown', event => {
        event.preventDefault();
        thumb.setPointerCapture(event.pointerId);

        const trackSize = bar[sizeProp];
        const thumbSize = thumb[sizeProp === 'clientHeight' ? 'offsetHeight' : 'offsetWidth'];
        const maxScroll = Math.max(viewport[scrollSizeProp] - viewport[sizeProp], 0);
        const maxOffset = Math.max(trackSize - thumbSize, 0);
        const startPointer = event[pointerProp];
        const startScroll = viewport[scrollProp];
        const startOffset = maxScroll ? (startScroll / maxScroll) * maxOffset : 0;

        const handleMove = moveEvent => {
          moveEvent.preventDefault();
          const delta = moveEvent[pointerProp] - startPointer;
          const nextOffset = Math.min(Math.max(startOffset + delta, 0), maxOffset);
          const nextScroll = maxScroll ? (nextOffset / maxOffset) * maxScroll : 0;
          viewport[scrollProp] = nextScroll;
        };

        const handleUp = () => {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp, { once: true });
      });

      // Jump on track click
      bar.addEventListener('pointerdown', event => {
        if (event.target === thumb) return;
        const rect = bar.getBoundingClientRect();
        const pointerPos =
          (orientation === 'vertical' ? event.clientY - rect.top : event.clientX - rect.left) -
          (thumb[sizeProp === 'clientHeight' ? 'offsetHeight' : 'offsetWidth'] / 2);
        const trackSize = bar[sizeProp];
        const thumbSize = thumb[sizeProp === 'clientHeight' ? 'offsetHeight' : 'offsetWidth'];
        const maxOffset = Math.max(trackSize - thumbSize, 1);
        const ratio = Math.min(Math.max(pointerPos / maxOffset, 0), 1);
        const maxScroll = Math.max(viewport[scrollSizeProp] - viewport[sizeProp], 0);
        viewport[scrollProp] = maxScroll * ratio;
      });
    };

    // Sync on resize/scroll
    viewport.addEventListener('scroll', update);
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(viewport);
      const content = viewport.firstElementChild;
      if (content) resizeObserver.observe(content);
    } else {
      window.addEventListener('resize', update);
    }

    attachDragging(verticalBar, 'vertical');
    attachDragging(horizontalBar, 'horizontal');
    update();
  }

  function setupScrollAreas(container = document) {
    container.querySelectorAll('.rt-ScrollAreaRoot').forEach(setupScrollArea);
  }

  function wrapContent() {
    const body = document.body;
    const currentPage = getCurrentPage();

    // Create layout wrapper
    const layout = document.createElement('div');
    layout.className = 'playground-layout';

    // Create sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'playground-sidebar';
    sidebar.innerHTML = createSidebarHTML(currentPage);
    layout.appendChild(sidebar);

    // Create main wrapper
    const main = document.createElement('main');
    main.className = 'playground-main';

    // Move all existing body children to main (preserve DOM nodes)
    while (body.firstChild) {
      // Skip the script tag for sidebar.js
      if (body.firstChild.tagName === 'SCRIPT' && body.firstChild.src && body.firstChild.src.includes('sidebar.js')) {
        body.removeChild(body.firstChild);
        continue;
      }
      main.appendChild(body.firstChild);
    }

    layout.appendChild(main);
    body.appendChild(layout);

    setupScrollAreas(layout);
  }

  // Initialize when DOM is ready
  function init() {
    // Don't run on index.html
    if (getCurrentPage() === 'index.html') return;

    // Don't run if already initialized
    if (document.querySelector('.playground-sidebar')) return;

    injectStyles();
    wrapContent();
    setupScrollAreas(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
