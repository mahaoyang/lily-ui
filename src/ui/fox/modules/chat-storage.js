import { $ } from './ui.js';

// Draft and queue persistence is scoped by profile/session, with deletion cleanup.
export function createChatStorage({ selected, getQueueEditor, clearQueueEditor, resources }) {
  const drafts = new Map();
  const promptQueues = new Map();
  const snapshots = new Map();
  const snapshot = (draft, queue) => JSON.stringify({ draft: draft || '', queue: queue || [] });
  function hydrate() {
    const changed = new Set();
    for (const [key, value] of resources.records) {
      const next = snapshot(value.draft, value.queue);
      if (snapshots.get(key) === next) continue;
      if (value.draft) drafts.set(key, value.draft); else drafts.delete(key);
      promptQueues.set(key, (value.queue || []).map(entry => ({ ...entry, editing: false })));
      snapshots.set(key, next);
      changed.add(key);
    }
    return changed;
  }
  let draftKey = null;
  function currentDraftKey() { const item = selected(); return item ? `${item.id}:${item.sessionId || '@new'}` : null; }
  function persistChatWork() {
    try {
      const queues = Object.fromEntries([...promptQueues].filter(([, entries]) => entries.length).map(([key, entries]) =>
        [key, entries.map(({ editing, ...entry }) => entry)]));
      // Persist edits before blur as well as committed queue text.
      const activeQueueEditor = getQueueEditor();
      if (activeQueueEditor) {
        for (const entries of Object.values(queues)) {
          const entry = entries.find(entry => entry.id === activeQueueEditor.entry.id);
          if (entry) entry.text = activeQueueEditor.editor.value;
        }
      }
      for (const key of new Set([...resources.records.keys(), ...drafts.keys(), ...promptQueues.keys()])) {
        const draft = drafts.get(key) || '', queue = queues[key] || [];
        const next = snapshot(draft, queue);
        if (snapshots.get(key) !== next) {
          resources.set(key, { draft, queue });
          snapshots.set(key, next);
        }
      }
    } catch {}
  }
  function saveDraft() {
    if (draftKey) {
      const value = $('#prompt-input').value;
      if (value) drafts.set(draftKey, value); else drafts.delete(draftKey);
    }
    persistChatWork();
  }
  function syncDraft() {
    const changed = hydrate();
    const key = currentDraftKey();
    if (key === draftKey) {
      if (changed.has(key)) {
        const input = $('#prompt-input'); input.value = drafts.get(key) || '';
        input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
      }
      return;
    }
    saveDraft(); draftKey = key;
    const input = $('#prompt-input'); input.value = drafts.get(key) || '';
    input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }
  function clearChatWork(profileId, sessionId) {
    const matches = key => sessionId ? key === `${profileId}:${sessionId}` : key.startsWith(`${profileId}:`);
    for (const key of drafts.keys()) if (matches(key)) drafts.delete(key);
    for (const [key, entries] of promptQueues) if (matches(key)) {
      if (getQueueEditor() && entries.includes(getQueueEditor().entry)) clearQueueEditor();
      promptQueues.delete(key);
    }
    if (draftKey && matches(draftKey)) { draftKey = null; $('#prompt-input').value = ''; saveDraft(); }
    for (const key of snapshots.keys()) if (matches(key)) snapshots.delete(key);
    resources.remove(profileId, sessionId);
    persistChatWork();
  }
  window.addEventListener('pagehide', () => { saveDraft(); void resources.flush(); });

  function migrateNewDraft(item, sessionId) {
    if (draftKey === `${item.id}:@new`) {
      saveDraft();
      const value = drafts.get(draftKey);
      drafts.delete(draftKey);
      draftKey = `${item.id}:${sessionId}`;
      if (value) drafts.set(draftKey, value);
      persistChatWork();
    }
  }

  return { promptQueues, saveDraft, syncDraft, persistChatWork, clearChatWork, migrateNewDraft };
}
