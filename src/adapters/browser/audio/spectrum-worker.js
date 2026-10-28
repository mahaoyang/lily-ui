import { resampleMono, scaledAudio, rmsLevel } from '../../../headless/audio/spectrum-dsp.js'
import { computePreview } from '../../../headless/audio/spectrum-processing.js'

self.onmessage = ({ data }) => {
  try {
    if (data.prepare) {
      const buffer = {
        numberOfChannels: data.channels.length, length: data.channels[0].length,
        sampleRate: data.sampleRate, getChannelData: index => data.channels[index],
      }
      const audio = resampleMono(buffer, 24000)
      const normalized = scaledAudio(audio, 1 / Math.max(1e-9, rmsLevel(audio)))
      self.postMessage({ audio: normalized }, [normalized.buffer])
    } else self.postMessage(computePreview(data.source, data.reference, data.parameters))
  } catch (error) { self.postMessage({ error: error.message }) }
}
