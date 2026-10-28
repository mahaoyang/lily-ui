import { bindAudioDrop, byId, mountWorkflowBase } from '../../shared/workflow-ui.js'

export function mountSpectrumEnhance(actions) {
  mountWorkflowBase({ backdropId: 'mix-backdrop', closeButtonId: 'mix-close', onClose: actions.close })
  byId('pick-mix-a-button').addEventListener('click', () => actions.pick('a'))
  byId('pick-mix-b-button').addEventListener('click', () => actions.pick('b'))
  byId('run-mix-button').addEventListener('click', actions.run)
  byId('mix-cancel').addEventListener('click', actions.cancel)
  byId('open-mix-output-button').addEventListener('click', actions.download)
  bindAudioDrop(byId('mix-a-drop-zone'), actions.dropA)
  bindAudioDrop(byId('mix-b-drop-zone'), actions.dropB)
  actions.bindParameters()
}
