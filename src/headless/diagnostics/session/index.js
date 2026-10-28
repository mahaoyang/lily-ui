/** Isolated batches: tab changes read snapshots, explicit runs replace observations. */
export function createDiagnosticSession({ checks = {}, now = Date.now } = {}) {
  let batch = 0, controller, disposed = false;
  let snapshot = { batchId: 0, status: 'idle', checks: {} };
  const listeners = new Set();
  const copy = () => structuredClone(snapshot);
  const publish = () => { for (const listener of listeners) listener(copy()); };
  function cancel() {
    controller?.abort();
    if (snapshot.status !== 'running') return;
    batch++;
    snapshot = { ...snapshot, status: 'cancelled', checks: Object.fromEntries(Object.entries(snapshot.checks).map(([key, value]) => [key, value.status === 'running' ? { ...value, status: 'cancelled' } : value])) };
    publish();
  }
  return {
    getSnapshot: copy,
    subscribe(listener) { if (disposed) throw new Error('Session disposed'); listeners.add(listener); listener(copy()); return () => listeners.delete(listener); },
    async run(options = {}) {
      if (disposed) throw new Error('Session disposed');
      controller?.abort();
      const current = ++batch;
      const activeController = controller = new AbortController();
      const selected = options.checks || Object.keys(checks);
      snapshot = { batchId: current, status: 'running', startedAt: now(), checks: Object.fromEntries(selected.map(key => [key, { status: checks[key] ? 'running' : 'skipped' }])) };
      publish();
      await Promise.all(selected.map(async key => {
        if (!checks[key]) return;
        let result;
        try {
          const data = await checks[key]({ ...options, signal: activeController.signal });
          result = { status: data?.supported === false ? 'skipped' : data?.ok === false ? 'error' : 'success', data, collectedAt: now() };
        } catch (error) { result = { status: activeController.signal.aborted ? 'cancelled' : 'error', error: { name: error.name || 'Error', message: String(error.message || error) }, collectedAt: now() }; }
        if (current !== batch || disposed) return;
        snapshot = { ...snapshot, checks: { ...snapshot.checks, [key]: result } };
        publish();
      }));
      if (current !== batch || disposed) return { batchId: current, status: 'cancelled', checks: {} };
      const states = Object.values(snapshot.checks).map(check => check.status);
      snapshot = { ...snapshot, finishedAt: now(), status: states.includes('error') ? (states.includes('success') ? 'partial' : 'error') : states.every(state => state === 'skipped') ? 'skipped' : 'success' };
      publish();
      return copy();
    },
    cancel,
    dispose() { cancel(); disposed = true; listeners.clear(); },
  };
}
