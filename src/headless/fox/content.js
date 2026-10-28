// ACP v2 content blocks: preserve text, resources and tool diffs without exposing raw HTML.
export function contentText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(contentText).filter(Boolean).join('\n\n');
  if (content.type === 'content') return contentText(content.content);
  if (content.type === 'diff') return `${content.path || '文件变更'}\n--- 原内容\n${content.oldText || ''}\n+++ 新内容\n${content.newText || ''}`;
  if (typeof content.text === 'string') return content.text;
  if (content.type === 'resource') return contentText(content.resource) || content.resource?.uri || '[资源]';
  if (content.type === 'resource_link') return [content.name, content.uri].filter(Boolean).join(' · ');
  if (content.type === 'image') return `[图片${content.mimeType ? ` · ${content.mimeType}` : ''}]`;
  if (content.type === 'audio') return '[音频]';
  if (content.type === 'terminal') return `[终端 ${content.terminalId || ''}]`;
  return JSON.stringify(content, null, 2);
}
