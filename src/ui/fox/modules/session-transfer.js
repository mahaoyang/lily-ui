import { confirmAction, esc } from './ui.js';
import { providerFor } from '../../../headless/fox/providers.js';
import { statusCircle, statusTone } from './indicators.js';

function targetRow(profile, checked) {
  const provider = providerFor(profile);
  return `<label class="instance-item">
    <input type="radio" name="transfer-target" value="${esc(profile.id)}" ${checked ? 'checked' : ''}>
    <span class="instance-icon"><img class="provider-icon ${provider.id}-icon" src="${provider.icon}" alt=""></span>
    <span class="instance-item-copy"><b>${esc(profile.name)}</b><small>${esc(provider.name)}</small></span>
    <i class="mini-status" data-state="${statusTone(profile.status)}">${statusCircle}</i>
  </label>`;
}

// The dialog owns presentation only; the caller owns release, transfer and selection.
export function chooseTransferTarget(profiles) {
  return confirmAction({
    title: '迁移会话',
    confirmLabel: '迁移',
    body: `<p class="muted">选择目标配置，迁移后在该配置继续对话。</p><div class="transfer-targets">${profiles.map((profile, index) => targetRow(profile, index === 0)).join('')}</div>`,
    collect: modal => modal.querySelector('[name="transfer-target"]:checked')?.value,
  });
}
