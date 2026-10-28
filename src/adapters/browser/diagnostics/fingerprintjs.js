let agentPromise = null;
let agentError = null;

function toMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return String(error?.message || error);
}

async function loadFingerprintJs() {
  const existing = globalThis.FingerprintJS;
  if (existing?.load) return existing;

  // Preferred: locally served vendor bundle (from npm package) to avoid CDN instability/adblock.
  try {
    await import('/vendor/fingerprintjs.umd.min.js');
    const local = globalThis.FingerprintJS;
    if (local?.load) return local;
  } catch {
    // ignore
  }

  // Fallback: CDN (may be blocked by ad blockers / privacy hardening).
  const mod = await import('https://openfpcdn.io/fingerprintjs/v5');
  return mod?.default || mod?.FingerprintJS || mod;
}

export function initFingerprintJsAgent() {
  if (agentPromise) return agentPromise;
  agentPromise = (async () => {
    try {
      const FingerprintJS = await loadFingerprintJs();
      if (!FingerprintJS?.load) throw new Error('FingerprintJS.load() not found');
      return await FingerprintJS.load();
    } catch (err) {
      agentError = err;
      return null;
    }
  })();
  return agentPromise;
}

export function getFingerprintJsAgentError() {
  return agentError ? toMessage(agentError) : '';
}

export async function getFingerprintJsResult() {
  const agent = await initFingerprintJsAgent();
  if (!agent?.get) return { ok: false, error: getFingerprintJsAgentError() || 'FingerprintJS unavailable' };
  try {
    const result = await agent.get();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: toMessage(err) || 'FingerprintJS.get() failed' };
  }
}
