export const probeOnce = async (url, timeoutMs) => {
    const ms = Math.max(300, Number(timeoutMs) || 3500);
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
    const start = performance.now();
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller?.signal });
      return { ok: true, ms: Math.round(performance.now() - start), outcome: 'ok' };
    } catch (error) {
      const aborted = String(error?.name || '').toLowerCase().includes('abort');
      return {
        ok: false,
        ms: Math.round(performance.now() - start),
        outcome: aborted ? 'timeout' : 'error',
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

