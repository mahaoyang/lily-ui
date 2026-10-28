const initializedKey = 'rtScrollAreaInitialized';

function ensureElement(parent, selector, create) {
  const existing = parent.querySelector(selector);
  if (existing) return existing;
  const el = create();
  parent.appendChild(el);
  return el;
}

export function ensureScrollAreaStructure(root, { horizontal = false } = {}) {
  if (!root) return { root: null, viewport: null, content: null };

  root.classList.add('rt-ScrollAreaRoot');

  const hadViewport = !!root.querySelector(':scope > .rt-ScrollAreaViewport');
  const viewport = ensureElement(root, ':scope > .rt-ScrollAreaViewport', () => {
    const v = document.createElement('div');
    v.className = 'rt-ScrollAreaViewport';
    return v;
  });

  const content = ensureElement(viewport, ':scope > .rt-ScrollAreaContent', () => {
    const c = document.createElement('div');
    c.className = 'rt-ScrollAreaContent';
    return c;
  });

  if (!hadViewport && content.childNodes.length === 0) {
    // First-time wrap: when converting a normal container into a scrollarea,
    // move any existing children of root into the scroll content.
    const nodes = [];
    for (const node of Array.from(root.childNodes)) {
      if (node === viewport) continue;
      nodes.push(node);
    }
    for (const node of nodes) content.appendChild(node);
  }

  ensureElement(root, ':scope > .rt-ScrollAreaScrollbar[data-orientation="vertical"]', () => {
    const bar = document.createElement('div');
    bar.className = 'rt-ScrollAreaScrollbar';
    bar.dataset.orientation = 'vertical';
    const thumb = document.createElement('div');
    thumb.className = 'rt-ScrollAreaThumb';
    bar.appendChild(thumb);
    return bar;
  });

  if (horizontal) {
    ensureElement(root, ':scope > .rt-ScrollAreaScrollbar[data-orientation="horizontal"]', () => {
      const bar = document.createElement('div');
      bar.className = 'rt-ScrollAreaScrollbar';
      bar.dataset.orientation = 'horizontal';
      const thumb = document.createElement('div');
      thumb.className = 'rt-ScrollAreaThumb';
      bar.appendChild(thumb);
      return bar;
    });
    ensureElement(root, ':scope > .rt-ScrollAreaCorner', () => {
      const corner = document.createElement('div');
      corner.className = 'rt-ScrollAreaCorner';
      return corner;
    });
  }

  return { root, viewport, content };
}

export function setupScrollArea(root) {
  if (!root) return;
  if (root.dataset[initializedKey] === 'true') {
    if (typeof root.__rtScrollAreaUpdate === 'function') root.__rtScrollAreaUpdate();
    return;
  }

  const viewport = root.querySelector(':scope > .rt-ScrollAreaViewport');
  const verticalBar = root.querySelector(':scope > .rt-ScrollAreaScrollbar[data-orientation="vertical"]');
  const horizontalBar = root.querySelector(':scope > .rt-ScrollAreaScrollbar[data-orientation="horizontal"]');
  if (!viewport) return;

  root.dataset[initializedKey] = 'true';
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
    updateBar(horizontalBar, viewport.scrollLeft, viewport.clientWidth, viewport.scrollWidth, 'horizontal');
  };

  const attachDragging = (bar, orientation) => {
    if (!bar) return;
    const thumb = bar.querySelector('.rt-ScrollAreaThumb');
    if (!thumb) return;

    const scrollProp = orientation === 'vertical' ? 'scrollTop' : 'scrollLeft';
    const pointerProp = orientation === 'vertical' ? 'clientY' : 'clientX';
    const sizeProp = orientation === 'vertical' ? 'clientHeight' : 'clientWidth';
    const scrollSizeProp = orientation === 'vertical' ? 'scrollHeight' : 'scrollWidth';

    thumb.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);

      const trackSize = bar[sizeProp];
      const thumbSize = thumb[sizeProp === 'clientHeight' ? 'offsetHeight' : 'offsetWidth'];
      const maxScroll = Math.max(viewport[scrollSizeProp] - viewport[sizeProp], 0);
      const maxOffset = Math.max(trackSize - thumbSize, 0);
      const startPointer = event[pointerProp];
      const startScroll = viewport[scrollProp];
      const startOffset = maxScroll && maxOffset ? (startScroll / maxScroll) * maxOffset : 0;

      const handleMove = (moveEvent) => {
        moveEvent.preventDefault();
        if (!maxScroll || !maxOffset) return;
        const delta = moveEvent[pointerProp] - startPointer;
        const nextOffset = Math.min(Math.max(startOffset + delta, 0), maxOffset);
        const nextScroll = (nextOffset / maxOffset) * maxScroll;
        viewport[scrollProp] = nextScroll;
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp, { once: true });
    });

    bar.addEventListener('pointerdown', (event) => {
      if (event.target === thumb) return;
      const rect = bar.getBoundingClientRect();
      const thumbExtent = thumb[sizeProp === 'clientHeight' ? 'offsetHeight' : 'offsetWidth'];
      const pointerPos =
        (orientation === 'vertical' ? event.clientY - rect.top : event.clientX - rect.left) - thumbExtent / 2;
      const trackSize = bar[sizeProp];
      const maxOffset = Math.max(trackSize - thumbExtent, 1);
      const ratio = Math.min(Math.max(pointerPos / maxOffset, 0), 1);
      const maxScroll = Math.max(viewport[scrollSizeProp] - viewport[sizeProp], 0);
      viewport[scrollProp] = maxScroll * ratio;
    });
  };

  viewport.addEventListener('scroll', update);
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(viewport);
    const content = viewport.querySelector(':scope > .rt-ScrollAreaContent');
    if (content) resizeObserver.observe(content);
  } else {
    window.addEventListener('resize', update);
  }

  attachDragging(verticalBar, 'vertical');
  attachDragging(horizontalBar, 'horizontal');

  // Expose for content updates after re-render.
  root.__rtScrollAreaUpdate = update;
  update();
}

export function setupScrollAreas(container = document) {
  if (container instanceof Element && container.classList.contains('rt-ScrollAreaRoot')) {
    setupScrollArea(container);
  }
  container.querySelectorAll('.rt-ScrollAreaRoot').forEach(setupScrollArea);
}

export function refreshScrollAreas(container = document) {
  if (container instanceof Element && container.classList.contains('rt-ScrollAreaRoot')) {
    if (typeof container.__rtScrollAreaUpdate === 'function') container.__rtScrollAreaUpdate();
  }
  container.querySelectorAll('.rt-ScrollAreaRoot').forEach((root) => {
    if (typeof root.__rtScrollAreaUpdate === 'function') root.__rtScrollAreaUpdate();
  });
}
