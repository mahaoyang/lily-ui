import { bindAudioDrop, byId, mountWorkflowBase } from '../../shared/workflow-ui.js'

export function mountUvr5(actions) {
  mountWorkflowBase({ backdropId: 'workflow-backdrop', closeButtonId: 'workflow-close', onClose: actions.close })
  byId('pick-audio-button').addEventListener('click', actions.pick)
  byId('run-denoise-button').addEventListener('click', actions.run)
  byId('workflow-cancel').addEventListener('click', actions.cancel)
  byId('open-output-button').addEventListener('click', actions.downloadOutput)
  byId('download-input-button').addEventListener('click', actions.downloadInput)
  bindAudioDrop(byId('denoise-drop-zone'), actions.drop)
}
