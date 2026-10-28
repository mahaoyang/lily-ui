export async function runDnsLeak({ fetch, fetchJsonWithTimeout, postJsonWithTimeout, trigger, delay, signal, now = Date.now, onUpdate = () => {}, onResult = () => {} }) {
  const state = {};
    try {
      const status = await fetchJsonWithTimeout('/api/dnsleak/status', { timeoutMs: 2000 }).catch(() => null);
      state.dnsLeakStatus = status?.ok ? status : { ok: false };
      onUpdate({ ...state });

      if (!status?.enabled || !status?.domain) {
        state.dnsLeak = null;
        onUpdate({ ...state });
        return;
      }

      const isInteractRelay = String(status?.provider || '').toLowerCase() === 'interactsh' && String(status?.mode || '').toLowerCase() === 'relay';

      const serverCandidates = (() => {
        const list = Array.isArray(status?.servers) ? status.servers : [];
        const normalized = list.map((x) => String(x || '').trim()).filter(Boolean);
        if (normalized.length) return normalized;
        const d = String(status?.domain || '').trim();
        return d ? [`https://${d}`] : [];
      })();

      const tries = isInteractRelay ? serverCandidates.slice(0, 4) : [''];
      const registerFailures = [];
      for (const serverUrl of tries) {
        signal?.throwIfAborted();
        const startUrl = isInteractRelay && serverUrl
          ? `/api/dnsleak/start?serverUrl=${encodeURIComponent(serverUrl)}`
          : '/api/dnsleak/start';

        const started = await fetchJsonWithTimeout(startUrl, { timeoutMs: 2500 }).catch(() => null);
        if (!started?.ok || !started?.hostname || !started?.token) continue;

        const interact = started?.interactsh || null;
        if (isInteractRelay && interact?.serverUrl && interact?.correlationId && interact?.secretKey && interact?.publicKey) {
          try {
            const base = String(interact.serverUrl).replace(/\/+$/g, '');
            const regBody = JSON.stringify({
              'public-key': String(interact.publicKey),
              'secret-key': String(interact.secretKey),
              'correlation-id': String(interact.correlationId),
            });
            const reg = await fetch(`${base}/register`, {
              method: 'POST',
              cache: 'no-store',
              headers: { 'content-type': 'application/json' },
              body: regBody,
            }).catch(() => null);
            const regText = reg ? await reg.text().catch(() => '') : '';
            const ok = reg && reg.ok && String(regText).toLowerCase().includes('registration successful');
            if (!ok) {
              registerFailures.push({ serverUrl: base, status: reg?.status ?? null });
              continue;
            }
          } catch {
            registerFailures.push({ serverUrl: String(interact.serverUrl || ''), status: null });
            continue;
          }
        }

        await trigger(started);

        const token = started.token;
        const deadline = now() + 6500;
        while (!signal?.aborted && now() < deadline) {
          if (isInteractRelay && interact?.serverUrl && interact?.correlationId && interact?.secretKey) {
            const base = String(interact.serverUrl).replace(/\/+$/g, '');
            const pollUrl = `${base}/poll?id=${encodeURIComponent(String(interact.correlationId))}&secret=${encodeURIComponent(String(interact.secretKey))}`;
            const polled = await fetchJsonWithTimeout(pollUrl, { timeoutMs: 2500 }).catch(() => null);
            const hasEncrypted = !!polled?.aes_key && Array.isArray(polled?.data) && polled.data.length > 0;
            if (hasEncrypted) {
              const submitted = await postJsonWithTimeout(
                '/api/dnsleak/submit',
                { token, poll: polled },
                { timeoutMs: 2500 },
              ).catch(() => null);
              if (submitted?.ok) {
                state.dnsLeak = submitted;
                onUpdate({ ...state });
                onResult(state.dnsLeak);
                break;
              }
            }
          }

          const r = await fetchJsonWithTimeout(`/api/dnsleak/result?token=${encodeURIComponent(token)}`, { timeoutMs: 2500 }).catch(() => null);
          if (r?.ok) {
            state.dnsLeak = r;
            onUpdate({ ...state });
            onResult(state.dnsLeak);
            break;
          }
          await delay(700, signal);
        }

        if (state.dnsLeak && state.dnsLeak !== undefined) break;
      }

      if (state.dnsLeak === undefined) {
        if (isInteractRelay && registerFailures.length) {
          state.dnsLeak = { ok: false, error: 'oast_blocked', providersTried: registerFailures };
        } else {
          state.dnsLeak = null;
        }
        onUpdate({ ...state });
      }
    } catch {
      state.dnsLeak = null;
      onUpdate({ ...state });
    }
  signal?.throwIfAborted();
  return state;
}
