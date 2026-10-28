function prefersReducedMotion() {
  try {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch {
    return false;
  }
}

let fullLoaded = false;

export async function initParticleBackground(containerId = 'bg-canvas') {
  const host = document.getElementById(containerId);
  if (!host) return null;

  const tsParticles = globalThis.tsParticles;
  if (!tsParticles?.load) return null;

  // Some builds expose a "core" engine as `tsParticles` and require `loadFull(tsParticles)`
  // (or similar) to register shapes/interactions like links. If we don't do this, `load()`
  // can throw and the background silently disappears.
  try {
    if (!fullLoaded && typeof globalThis.loadFull === 'function') {
      await globalThis.loadFull(tsParticles);
      fullLoaded = true;
    }
  } catch {
    // ignore: optional enhancement
  }

  const reduceMotion = prefersReducedMotion();

  const options = {
    fullScreen: { enable: false },
    fpsLimit: 60,
    detectRetina: true,
    background: { color: { value: 'transparent' } },
    particles: {
      number: { value: reduceMotion ? 40 : 90, density: { enable: true, area: 980 } },
      color: { value: ['#ffffff', '#ffd2bf', '#ff4d00'] },
      shape: { type: 'circle' },
      opacity: { value: { min: 0.12, max: 0.55 }, animation: { enable: !reduceMotion, speed: 0.6, minimumValue: 0.08, sync: false } },
      size: { value: { min: 0.7, max: 2.4 } },
      links: {
        enable: true,
        distance: 160,
        opacity: 0.16,
        width: 1,
        color: '#ff4d00',
      },
      move: {
        enable: !reduceMotion,
        speed: 0.22,
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'out' },
      },
    },
    twinkle: {
      particles: { enable: !reduceMotion, frequency: 0.05, opacity: 1 },
    },
    interactivity: {
      detectsOn: 'canvas',
      events: {
        onHover: { enable: false, mode: [] },
        onClick: { enable: false, mode: [] },
        resize: true,
      },
    },
  };

  try {
    // tsParticles exposes different `load` signatures across builds (v2/v3, bundle variants).
    // Try the common forms to avoid a "background missing" regression when updating the bundle.
    try {
      return await tsParticles.load(containerId, options);
    } catch {
      try {
        return await tsParticles.load(host, options);
      } catch {
        return await tsParticles.load({ id: containerId, options });
      }
    }
  } catch {
    return null;
  }
}
