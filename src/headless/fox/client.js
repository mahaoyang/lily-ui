// Inject transports for Node, tests, or another host. No DOM or theme dependency.
export function createClient({ baseUrl = '', fetch: request = globalThis.fetch, EventSource: Events = globalThis.EventSource } = {}) {
  const urlFor = path => `${baseUrl.replace(/\/$/, '')}${path}`;
  async function api(url, method = 'GET', data) {
    const res = await request(urlFor(url), { method, headers: data ? { 'content-type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
    const value = await res.json();
    if (!res.ok) throw new Error(value.error || `HTTP ${res.status}`);
    return value;
  }
  function subscribeEvents(instanceId) {
    if (!Events) throw new Error('EventSource transport is required');
    return new Events(urlFor(`/api/events/${encodeURIComponent(instanceId)}`));
  }
  return { api, subscribeEvents };
}
