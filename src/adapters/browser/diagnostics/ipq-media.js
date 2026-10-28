async function probeFetch(url, timeoutMs) {
  const ms = Math.max(300, Number(timeoutMs) || 2500);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  const start = performance.now();
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller?.signal });
    const elapsed = Math.round(performance.now() - start);
    return { status: 'Yes', region: null, type: null, ms: elapsed, url };
  } catch (error) {
    const elapsed = Math.round(performance.now() - start);
    const name = String(error?.name ?? '').toLowerCase();
    const msg = String(error?.message ?? error ?? '');
    const timedOut = name.includes('abort') || msg.toLowerCase().includes('abort');
    return {
      // Cross-site probe errors are often browser/network-policy artifacts; avoid false negatives.
      status: 'Unknown',
      region: null,
      type: null,
      ms: elapsed,
      url,
      error: msg,
      note: timedOut ? 'timeout' : 'network_error',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probeImage(url, timeoutMs) {
  const ms = Math.max(300, Number(timeoutMs) || 2500);
  const start = performance.now();
  return await new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      resolve({ ...result, ms: Math.round(performance.now() - start), url });
    };

    const timer = setTimeout(() => finish({ status: 'Unknown', region: null, type: null, note: 'timeout' }), ms);
    img.onload = () => {
      clearTimeout(timer);
      finish({ status: 'Yes', region: null, type: null });
    };
    img.onerror = () => {
      clearTimeout(timer);
      // Avoid false negatives: adblockers / captive portals can cause onerror even when the site is usable.
      finish({ status: 'Unknown', region: null, type: null, note: 'image_error' });
    };

    try {
      img.referrerPolicy = 'no-referrer';
    } catch {
      // ignore
    }

    const cacheBust = `t=${Date.now()}${Math.random().toString(16).slice(2)}`;
    img.src = url.includes('?') ? `${url}&${cacheBust}` : `${url}?${cacheBust}`;
  });
}

function isLikelyImageUrl(url) {
  const s = String(url || '');
  return /\.(ico|png|jpg|jpeg|webp|gif|svg)(?:\?|$)/i.test(s);
}

async function probe(url, timeoutMs) {
  if (!isLikelyImageUrl(url)) return await probeFetch(url, timeoutMs);

  // Some networks/extensions block cross-origin fetch but still allow passive resource loads.
  // Treat success if either fetch(no-cors) or <img> load indicates reachability.
  const [a, b] = await Promise.all([probeFetch(url, timeoutMs), probeImage(url, timeoutMs)]);
  const yes = [a, b].find((r) => String(r?.status ?? '').toLowerCase() === 'yes') || null;
  const unknown = [a, b].find((r) => String(r?.status ?? '').toLowerCase() === 'unknown') || null;
  return yes || unknown || a;
}

export async function checkMedia(timeoutMs) {
  const targets = {
    TikTok: 'https://www.tiktok.com/',
    Netflix: 'https://www.netflix.com/title/80018499',
    DisneyPlus: 'https://www.disneyplus.com/',
    YouTubePremium: 'https://www.youtube.com/premium',
    Instagram: 'https://www.instagram.com/',
    X: 'https://x.com/',
    AmazonPrimeVideo: 'https://www.primevideo.com/',
    Spotify: 'https://www.spotify.com/',
    // Some networks allow one but not the other; treat success if either endpoint is reachable.
    ChatGPT: ['https://chatgpt.com/favicon.ico', 'https://chat.openai.com/favicon.ico'],
  };

  const entries = await Promise.all(Object.entries(targets).map(async ([name, urlOrUrls]) => {
    const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
    const perTargetMs = name === 'ChatGPT' ? Math.max(Number(timeoutMs) || 2500, 6500) : timeoutMs;
    const results = await Promise.all(urls.map((u) => probe(u, perTargetMs)));
    const ok = results.find((r) => String(r?.status ?? '').toLowerCase() === 'yes') || null;
    const unknown = results.find((r) => String(r?.status ?? '').toLowerCase() === 'unknown') || null;
    return [name, ok || unknown || results[0] || { status: 'Unknown', url: urls[0] }];
  }));
  return Object.fromEntries(entries);
}
