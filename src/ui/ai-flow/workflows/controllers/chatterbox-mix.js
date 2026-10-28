import { bindAudioDrop, byId, mountWorkflowBase } from '../../shared/workflow-ui.js'

export function mountChatterboxMix(actions) {
  mountWorkflowBase({ backdropId: 'chatterbox-mix-backdrop', closeButtonId: 'chatterbox-mix-close', onClose: actions.close })
  byId('chatterbox-mix-pick-a').addEventListener('click', () => actions.pick('a'))
  byId('chatterbox-mix-pick-b').addEventListener('click', () => actions.pick('b'))
  bindAudioDrop(byId('chatterbox-mix-a-drop'), actions.dropA)
  bindAudioDrop(byId('chatterbox-mix-b-drop'), actions.dropB)
  byId('chatterbox-mix-text').addEventListener('input', actions.textInput)
  byId('chatterbox-mix-run').addEventListener('click', actions.run)
  byId('chatterbox-mix-cancel').addEventListener('click', actions.cancel)
  byId('chatterbox-mix-download').addEventListener('click', actions.download)
}
