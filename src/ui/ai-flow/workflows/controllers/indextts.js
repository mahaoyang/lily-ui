import { bindAudioDrop, byId, mountWorkflowBase } from '../../shared/workflow-ui.js'

export function mountIndexTts(actions) {
  mountWorkflowBase({ backdropId: 'indextts-backdrop', closeButtonId: 'indextts-close', onClose: actions.close })
  byId('indextts-pick-button').addEventListener('click', actions.pick)
  byId('indextts-text').addEventListener('input', actions.textInput)
  document.querySelectorAll('[data-emotion-mode]').forEach(button => button.addEventListener('click', () => actions.setEmotionMode(button)))
  byId('indextts-emotion-file').addEventListener('change', actions.emotionFile)
  byId('indextts-emotion-pick-button').addEventListener('click', actions.pickEmotion)
  bindAudioDrop(byId('indextts-emotion-drop-zone'), actions.dropEmotion)
  document.querySelectorAll('[data-emotion-preset]').forEach(button => button.addEventListener('click', () => actions.preset(button)))
  document.querySelectorAll('[data-vector-index]').forEach(slider => slider.addEventListener('input', () => actions.vectorInput(slider)))
  document.querySelectorAll('[data-emotion-vector]').forEach(button => button.addEventListener('click', () => actions.vectorPreset(button)))
  byId('indextts-emotion-strength').addEventListener('input', actions.strengthInput)
  byId('indextts-run').addEventListener('click', actions.run)
  byId('indextts-cancel').addEventListener('click', actions.cancel)
  byId('indextts-download').addEventListener('click', actions.download)
  bindAudioDrop(byId('indextts-drop-zone'), actions.dropReference)
}
