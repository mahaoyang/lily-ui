import { integratedLufs, encodeWav, rmsLevel, scaledAudio, zeroPhaseBiquad, averageSpectrum, analyzeReferencePoints, applyCompressorAndLimiter, fadeEdges } from './spectrum-dsp.js'

export function computePreview(source, reference, parameters) {
  for (const key of ['enhanceRatio', 'sharedLufs', 'pointCount', 'compressionRatio']) {
    if (!Number.isFinite(parameters[key])) throw new Error('频谱增强参数无效：' + key)
  }
  if (parameters.exportAudio && [source, reference].some(audio => !audio || integratedLufs(audio, 24000) <= -69.9)) throw new Error('主体音频和参考音频都必须包含有效声音')
  const balance = (audio) => audio ? (parameters.balanceEnabled === false ? audio : scaledAudio(audio, 10 ** ((parameters.sharedLufs - integratedLufs(audio, 24000)) / 20))) : null
  const balancedSource = balance(source)
  const balancedReference = balance(reference)
  const points = source && reference ? analyzeReferencePoints(source, reference, 24000, parameters.pointCount) : []
  let result = balancedSource
  if (result) {
    if (parameters.highpassEnabled) result = zeroPhaseBiquad(result, 'highpass', 65, Math.SQRT1_2, 24000)
    if (parameters.lowpassEnabled) result = zeroPhaseBiquad(result, 'lowpass', 11200, Math.SQRT1_2, 24000)
    for (const { frequency, gain } of points) result = zeroPhaseBiquad(result, 'peaking', frequency, 1, 24000, gain * parameters.enhanceRatio)
    result = scaledAudio(result, rmsLevel(balancedSource) / Math.max(1e-9, rmsLevel(result)))
    result = applyCompressorAndLimiter(result, 24000, parameters)
    if(parameters.balanceEnabled !== false) result = scaledAudio(result, 10 ** ((parameters.sharedLufs - integratedLufs(result, 24000)) / 20))
    let peak = 0
    for (const sample of result) peak = Math.max(peak, Math.abs(sample))
    if (peak > 10 ** (-1 / 20)) result = scaledAudio(result, 10 ** (-1 / 20) / peak)
    result = fadeEdges(result, 24000)
  }
  return { points, curves: spectrumTargets([balancedSource, balancedReference, result]), blob: parameters.exportAudio && result ? encodeWav(result, 24000) : null }
}

export function spectrumTargets(audioTracks) {
  let targets = Array.from({ length: 3 }, () => new Float64Array(240).fill(-80))
  if (audioTracks) {
    const spectra = audioTracks.map((audio) => audio ? averageSpectrum(audio, 4096, 2048) : new Float64Array(2049))
    const sampled = spectra.map((spectrum) => Float64Array.from({ length: 240 }, (_, index) => {
      const frequency = 20 * (11900 / 20) ** (index / 239)
      const bin = frequency * 4096 / 24000
      const radius = Math.max(1, bin * .045)
      let energy = 0
      let count = 0
      for (let current = Math.max(1, Math.floor(bin - radius)); current <= Math.min(spectrum.length - 1, Math.ceil(bin + radius)); current += 1) {
        energy += spectrum[current] ** 2
        count += 1
      }
      return Math.sqrt(energy / Math.max(1, count))
    }))
    // A single reference level preserves differences between all three signals.
    const peak = Math.max(1e-12, ...sampled.flatMap((values) => Array.from(values)))
    targets = sampled.map((values) => Float64Array.from(values, (value) => Math.max(-80, 20 * Math.log10(Math.max(1e-12, value) / peak))))
  }
  return targets
}

