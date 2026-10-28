// Durable work belongs to profiles/sessions, never to a browser preference.
export function createResourceState({ instances, report = () => {}, fetch: request = globalThis.fetch, events, debounceMs = 200 }) {
  const records = new Map();
  const pending = new Map();
  const inFlight = new Set();
  let timer;
  let writes = Promise.resolve();
  function hydrate() {
    for (const profile of instances()) {
      const entries = [[`${profile.id}:@new`, profile.workState], ...(profile.conversations || []).map(s => [`${profile.id}:${s.sessionId}`, s.workState])];
      for (const [key, value] of entries) if (!pending.has(key) && !inFlight.has(key)) records.set(key, value || {});
    }
  }
  function accept(key, value) {
    if (!inFlight.has(key)) records.set(key, { ...value, ...pending.get(key) });
  }
  function get(key) { return records.get(key) || {}; }
  function flush() {
    writes = writes.then(sendPending);
    return writes;
  }
  async function sendPending() {
    clearTimeout(timer);
    const batch = [...pending]; pending.clear();
    await Promise.all(batch.map(async ([key, value]) => {
      inFlight.add(key);
      const split = key.indexOf(':');
      try {
        const res = await request(`/api/instances/${key.slice(0, split)}/work-state`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: key.slice(split + 1), value }), keepalive: JSON.stringify(value).length < 30000 });
        if (!res.ok && res.status !== 404) throw new Error('保存会话状态失败');
      } catch (error) { if (records.has(key)) pending.set(key, { ...value, ...pending.get(key) }); report(error.message); } finally { inFlight.delete(key); }
    }));
    return pending.size === 0;
  }
  function set(key, patch) {
    if (!key) return;
    const value = { ...get(key), ...patch };
    records.set(key, value); pending.set(key, { ...pending.get(key), ...patch });
    clearTimeout(timer); timer = setTimeout(flush, debounceMs);
  }
  function remove(profileId, sessionId) {
    for (const key of records.keys()) if (sessionId ? key === `${profileId}:${sessionId}` : key.startsWith(`${profileId}:`)) { records.delete(key); pending.delete(key); }
  }
  const onFlush = () => { void flush(); };
  events?.addEventListener('online', onFlush);
  events?.addEventListener('pagehide', onFlush);
  function dispose() {
    clearTimeout(timer);
    events?.removeEventListener('online', onFlush);
    events?.removeEventListener('pagehide', onFlush);
  }
  return { hydrate, accept, get, set, remove, records, flush, dispose };
}

// Import only existing resource IDs. Server data wins; removed resources stay removed.
export async function migrateLegacyWork(resources, storage) {
  try {
    let legacy;
    try { legacy = JSON.parse(storage.getItem('fox-chat-work-v1') || '{}'); } catch { legacy = {}; }
    for (const [key, current] of resources.records) {
      const patch = {};
      if (current.draft === undefined && typeof legacy.drafts?.[key] === 'string') patch.draft = legacy.drafts[key];
      if (current.queue === undefined && Array.isArray(legacy.queues?.[key])) patch.queue = legacy.queues[key].filter(entry => entry && typeof entry.id === 'string' && typeof entry.text === 'string').map(({ editing, ...entry }) => entry);
      if (current.compactionBlocked === undefined && storage.getItem(`fox-compaction:${key}`) === 'blocked') patch.compactionBlocked = true;
      if (Object.keys(patch).length) resources.set(key, patch);
    }
    if (!await resources.flush()) return;
    // Global compression settings had no reliable owner: use the new per-session defaults.
    for (const key of Object.keys(storage)) if (key === 'fox-chat-work-v1' || key === 'fox-auto-compact' || key === 'fox-compact-threshold' || key.startsWith('fox-compaction:') || key.startsWith('fox-switch:proxy')) storage.removeItem(key);
  } catch { /* Browser storage can be unavailable; server persistence still works. */ }
}
