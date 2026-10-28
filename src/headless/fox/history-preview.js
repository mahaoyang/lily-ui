// Fold persisted ACP updates without touching the live conversation or connecting a CLI.
import { contentText } from './content.js';
import { updateMetadata } from './providers.js';
export function previewMessages(events = []) {
  const messages = [];
  for (const packet of events) {
    const u = packet.update || packet, kind = u.sessionUpdate;
    if (kind === 'user_message_chunk') {
      const text = contentText(u.content);
      if (text && !(messages.at(-1)?.role === 'user' && messages.at(-1).text === text)) messages.push({ role: 'user', text });
    } else if (kind === 'agent_message_chunk' || kind === 'agent_thought_chunk') {
      const role = kind === 'agent_thought_chunk' ? 'thought' : 'assistant';
      let last = u.messageId ? messages.find(m => m.messageId === u.messageId && m.role === role) : messages.at(-1);
      if (!last || last.role !== role || (!u.messageId && last.final)) { last = { role, text: '', messageId: u.messageId }; messages.push(last); }
      last.text = u.replace ? contentText(u.content) : last.text + contentText(u.content);
    } else if (kind === 'tool_call' || kind === 'tool_call_update') {
      let card = messages.find(m => m.toolCallId === u.toolCallId && m.role === 'tool');
      if (!card) { card = { role: 'tool', toolCallId: u.toolCallId, title: '工具调用', status: 'pending' }; messages.push(card); }
      if (u.title || u.kind) card.title = u.title || u.kind;
      if (u.status) card.status = u.status;
      if (u.content !== undefined || u.rawOutput !== undefined) card.output = contentText(u.content ?? u.rawOutput);
      if (u.rawInput !== undefined) card.input = contentText(u.rawInput);
    } else if (kind === 'session_info_update') {
      const meta = updateMetadata(u);
      if (meta.kind === 'message_completed') { const message = messages.find(m => m.messageId === meta.messageId); if (message) message.final = true; }
      if (meta.kind === 'turn_completion') { const message = [...messages].reverse().find(m => m.role === 'assistant'); if (message) message.final = true; }
    }
  }
  return messages;
}
