import { bindAudioDrop, byId, mountWorkflowBase } from '../../shared/workflow-ui.js'

export function mountChatterboxRead(actions) {
  mountWorkflowBase({ backdropId: 'chatterbox-backdrop', closeButtonId: 'chatterbox-close', onClose: actions.close })
  byId('chatterbox-pick-a').addEventListener('click', actions.pick)
  bindAudioDrop(byId('chatterbox-a-drop'), actions.drop)
  byId('chatterbox-text').addEventListener('input', actions.textInput)
  byId('chatterbox-run').addEventListener('click', actions.run)
  byId('chatterbox-cancel').addEventListener('click', actions.cancel)
  byId('chatterbox-download').addEventListener('click', actions.download)
}
