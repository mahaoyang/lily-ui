import { bindAudioDrop, byId, mountWorkflowBase } from '../../shared/workflow-ui.js'

export function mountSenseVoice(actions) {
  mountWorkflowBase({ backdropId: 'sensevoice-backdrop', closeButtonId: 'sensevoice-close', onClose: actions.close })
  byId('sensevoice-pick-button').addEventListener('click', actions.pick)
  bindAudioDrop(byId('sensevoice-drop-zone'), actions.drop)
  byId('sensevoice-run').addEventListener('click', actions.run)
  byId('sensevoice-copy').addEventListener('click', actions.copy)
  byId('sensevoice-download').addEventListener('click', actions.download)
  byId('sensevoice-cancel').addEventListener('click', actions.cancel)
}
