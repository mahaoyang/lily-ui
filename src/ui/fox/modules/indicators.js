// Shared status presentation for navigation and the transcript.
export const statusCircle = '<svg class="status-circle" viewBox="0 0 14 14" aria-hidden="true"><circle class="status-ring" cx="7" cy="7" r="6"/><circle class="status-core" cx="7" cy="7" r="3"/></svg>';

export function statusTone(status) { return status === 'running' ? 'connected' : status === 'login' ? 'pending' : status === 'error' ? 'error' : 'idle'; }

export function aiMarker(status) {
  const labels = { waiting: '等待回复', streaming: '回复中', done: '已完成', error: '出错' };
  return `<svg class="ai-marker ${status}" viewBox="0 0 12 12" role="img" aria-label="${labels[status]}"><circle cx="6" cy="6" r="3" fill="currentColor"/></svg>`;
}
