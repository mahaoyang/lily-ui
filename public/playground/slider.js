(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const parseInitialValues = (root, thumbs, min, max) => {
    const fromDataset = root.dataset.values
      ? root.dataset.values
          .split(',')
          .map(v => parseFloat(v.trim()))
          .filter(v => !Number.isNaN(v))
      : [];

    if (fromDataset.length) {
      return fromDataset.map(v => clamp(v, min, max));
    }

    // Fallback: try to read percentage from inline styles
    const percentFromStyle = thumb => {
      const style = thumb.getAttribute('style') || '';
      const match = style.match(/(?:left|bottom):\\s*([\\d.]+)%/);
      return match ? clamp(parseFloat(match[1]), 0, 100) : null;
    };

    const percents = thumbs
      .map(percentFromStyle)
      .filter(v => v !== null)
      .map(p => min + (p / 100) * (max - min));

    return percents.length ? percents : [min];
  };

  const toPercents = (values, min, max) =>
    values.map(v => ((clamp(v, min, max) - min) / (max - min || 1)) * 100);

  const setStyles = (root, range, thumbs, percents, orientation) => {
    if (!range || !thumbs.length) return;
    const [first, second = null] = percents;

    if (orientation === 'horizontal') {
      range.style.left = `${second === null ? 0 : Math.min(first, second)}%`;
      range.style.width =
        second === null ? `${first}%` : `${Math.abs(second - first)}%`;
      thumbs.forEach((thumb, idx) => {
        thumb.style.left = `${percents[idx]}%`;
        thumb.style.top = '50%';
        thumb.style.transform = 'translate(-50%, -50%)';
      });
    } else {
      const start = second === null ? 0 : Math.min(first, second);
      const end = second === null ? first : Math.max(first, second);
      range.style.bottom = `${start}%`;
      range.style.height = `${end - start}%`;
      thumbs.forEach((thumb, idx) => {
        thumb.style.bottom = `${percents[idx]}%`;
        thumb.style.left = '50%';
        thumb.style.transform = 'translate(-50%, 50%)';
      });
    }
  };

  const dispatchChange = (root, values, percents) => {
    root.dataset.values = values.join(',');
    const detail = { values: [...values], percents: [...percents] };
    root.dispatchEvent(
      new CustomEvent('lily-slider-change', { bubbles: true, detail })
    );
  };

  const setupSlider = root => {
    if (root.dataset.sliderReady === 'true') return;
    const orientation = root.dataset.orientation || 'horizontal';
    const track = root.querySelector('.rt-SliderTrack');
    const range = root.querySelector('.rt-SliderRange');
    const thumbs = Array.from(root.querySelectorAll('.rt-SliderThumb'));
    if (!track || !range || !thumbs.length) return;

    const min = parseFloat(root.dataset.min ?? '0');
    const max = parseFloat(root.dataset.max ?? '100');
    const step = parseFloat(root.dataset.step ?? '1');
    let values = parseInitialValues(root, thumbs, min, max);

    const update = (nextValues = values, emit = true) => {
      values = nextValues;
      const percents = toPercents(values, min, max);
      setStyles(root, range, thumbs, percents, orientation);
      if (emit) dispatchChange(root, values, percents);
    };

    const valueFromPointer = (event, rect) => {
      if (orientation === 'horizontal') {
        const ratio = (event.clientX - rect.left) / rect.width;
        return min + clamp(ratio, 0, 1) * (max - min);
      }
      const ratio = (rect.bottom - event.clientY) / rect.height;
      return min + clamp(ratio, 0, 1) * (max - min);
    };

    const snap = val => Math.round(val / step) * step;

    const startDrag = (event, thumbIndex) => {
      if (root.hasAttribute('data-disabled')) return;
      event.preventDefault();
      const rect = track.getBoundingClientRect();
      const handleMove = moveEvent => {
        const raw = valueFromPointer(moveEvent, rect);
        const next = snap(raw);
        const nextValues = [...values];
        nextValues[thumbIndex] = clamp(next, min, max);
        if (nextValues.length > 1) {
          // keep order
          nextValues.sort((a, b) => a - b);
        }
        update(nextValues);
      };
      const endMove = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', endMove);
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', endMove, { once: true });
    };

    thumbs.forEach((thumb, index) => {
      thumb.addEventListener('pointerdown', e => startDrag(e, index));
    });

    track.addEventListener('pointerdown', event => {
      if (root.hasAttribute('data-disabled')) return;
      const rect = track.getBoundingClientRect();
      const targetValue = snap(valueFromPointer(event, rect));
      const perc = toPercents(values, min, max);
      const targetPercent = ((targetValue - min) / (max - min || 1)) * 100;
      // pick nearest thumb
      const nearest = perc.reduce(
        (acc, p, idx) => {
          const diff = Math.abs(p - targetPercent);
          return diff < acc.diff ? { diff, idx } : acc;
        },
        { diff: Infinity, idx: 0 }
      ).idx;
      const nextValues = [...values];
      nextValues[nearest] = targetValue;
      if (nextValues.length > 1) {
        nextValues.sort((a, b) => a - b);
      }
      update(nextValues);
    });

    update(values, false);
    root.dataset.sliderReady = 'true';
  };

  const init = () => {
    document.querySelectorAll('.rt-SliderRoot').forEach(setupSlider);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
