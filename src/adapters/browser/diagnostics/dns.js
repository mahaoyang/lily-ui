export function triggerDnsQuery(started) {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch'; link.href = `//${started.hostname}`;
  document.head.appendChild(link);
  const pixelUrl = `${location.protocol}//${started.hostname}${started.pixelPath || '/__dnsleak/pixel'}&r=${Math.random().toString(16).slice(2)}`;
  const img = new Image(); img.referrerPolicy = 'no-referrer'; img.src = pixelUrl;
  fetch(pixelUrl, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(6000) }).catch(() => {});
  setTimeout(() => link.remove(), 7000);
}
export function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(); };
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(signal.reason); };
    const timer = setTimeout(done, ms);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
}
