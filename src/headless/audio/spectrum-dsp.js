// Pure audio transforms; no DOM or workflow state.
export function resampleMono(buffer, targetRate) {
  const channels = []
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) channels.push(buffer.getChannelData(channel))
  const sourceLength = buffer.length
  const mono = new Float32Array(sourceLength)
  for (let index = 0; index < sourceLength; index += 1) {
    let value = 0
    channels.forEach((channel) => { value += channel[index] || 0 })
    mono[index] = value / channels.length
  }
  if (buffer.sampleRate === targetRate) return mono
  const outputLength = Math.max(1, Math.round(sourceLength * targetRate / buffer.sampleRate))
  const output = new Float32Array(outputLength)
  const ratio = buffer.sampleRate / targetRate
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, sourceLength - 1)
    const amount = position - left
    output[index] = mono[left] * (1 - amount) + mono[right] * amount
  }
  return output
}


export function biquadCoefficients(kind, frequency, q, sampleRate, gain = 1) {
  const w0 = 2 * Math.PI * frequency / sampleRate
  const alpha = Math.sin(w0) / (2 * q)
  const cosW0 = Math.cos(w0)
  let b0
  let b1
  let b2
  let a0
  let a1
  let a2
  if (kind === 'highpass') {
    b0 = (1 + cosW0) / 2
    b1 = -(1 + cosW0)
    b2 = (1 + cosW0) / 2
    a0 = 1 + alpha
    a1 = -2 * cosW0
    a2 = 1 - alpha
  } else if (kind === 'lowpass') {
    b0 = (1 - cosW0) / 2
    b1 = 1 - cosW0
    b2 = (1 - cosW0) / 2
    a0 = 1 + alpha
    a1 = -2 * cosW0
    a2 = 1 - alpha
  } else if (kind === 'peaking') {
    const aGain = 10 ** (gain / 40)
    b0 = 1 + alpha * aGain
    b1 = -2 * cosW0
    b2 = 1 - alpha * aGain
    a0 = 1 + alpha / aGain
    a1 = -2 * cosW0
    a2 = 1 - alpha / aGain
  } else {
    const aGain = 10 ** (gain / 40)
    const beta = 2 * Math.sqrt(aGain) * alpha
    b0 = aGain * ((aGain + 1) + (aGain - 1) * cosW0 + beta)
    b1 = -2 * aGain * ((aGain - 1) + (aGain + 1) * cosW0)
    b2 = aGain * ((aGain + 1) + (aGain - 1) * cosW0 - beta)
    a0 = (aGain + 1) - (aGain - 1) * cosW0 + beta
    a1 = 2 * ((aGain - 1) - (aGain + 1) * cosW0)
    a2 = (aGain + 1) - (aGain - 1) * cosW0 - beta
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0
  return { b0, b1, b2, a1, a2 }
}

export function biquadFilter(audio, kind, frequency, q, sampleRate, gain = 1) {
  const { b0, b1, b2, a1, a2 } = biquadCoefficients(kind, frequency, q, sampleRate, gain)
  const output = new Float32Array(audio.length)
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  for (let index = 0; index < audio.length; index += 1) {
    const x0 = audio[index]
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    output[index] = y0
    x2 = x1; x1 = x0; y2 = y1; y1 = y0
  }
  return output
}

export function integratedLufs(audio, sampleRate) {
  let weighted = biquadFilter(audio, 'highshelf', 1681.974, 0.707175, sampleRate, 4)
  weighted = biquadFilter(weighted, 'highpass', 38.13547, 0.500327, sampleRate)
  const blockSize = Math.max(1, Math.round(.4 * sampleRate))
  const stepSize = Math.max(1, Math.round(.1 * sampleRate))
  if (weighted.length < blockSize) {
    const padded = new Float32Array(blockSize)
    padded.set(weighted)
    weighted = padded
  }
  const powers = []
  for (let start = 0; start + blockSize <= weighted.length; start += stepSize) {
    let power = 0
    for (let index = start; index < start + blockSize; index += 1) power += weighted[index] ** 2
    power /= blockSize
    if (power > 1e-12) powers.push(power)
  }
  if (!powers.length) return -70
  const blockLoudness = powers.map((power) => -.691 + 10 * Math.log10(power))
  const absolute = blockLoudness.map((loudness) => loudness >= -70)
  const absolutePowers = powers.filter((_power, index) => absolute[index])
  if (!absolutePowers.length) return -70
  const absolutePower = absolutePowers.reduce((sum, power) => sum + power, 0) / absolutePowers.length
  const relativeGate = -.691 + 10 * Math.log10(absolutePower) - 10
  const gated = powers.filter((_power, index) => absolute[index] && blockLoudness[index] >= relativeGate)
  const gatedPower = gated.reduce((sum, power) => sum + power, 0) / gated.length
  return -.691 + 10 * Math.log10(gatedPower)
}

export function encodeWav(audio, sampleRate) {
  const bytes = new ArrayBuffer(44 + audio.length * 2)
  const view = new DataView(bytes)
  const writeText = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)))
  writeText(0, 'RIFF'); view.setUint32(4, 36 + audio.length * 2, true); writeText(8, 'WAVE')
  writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  writeText(36, 'data'); view.setUint32(40, audio.length * 2, true)
  for (let index = 0; index < audio.length; index += 1) {
    if (!Number.isFinite(audio[index])) throw new Error('处理结果包含无效采样值，请检查参数和输入音频')
    const sample = Math.max(-1, Math.min(1, audio[index]))
    view.setInt16(44 + index * 2, sample < 0 ? sample * 32768 : sample * 32767, true)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

export function fft(real, imaginary, inverse = false) {
  const length = real.length
  for (let i = 1, j = 0; i < length; i += 1) {
    let bit = length >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[real[i], real[j]] = [real[j], real[i]]
      ;[imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]]
    }
  }
  for (let step = 2; step <= length; step <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / step
    const stepReal = Math.cos(angle)
    const stepImaginary = Math.sin(angle)
    for (let start = 0; start < length; start += step) {
      let currentReal = 1
      let currentImaginary = 0
      const half = step >> 1
      for (let offset = 0; offset < half; offset += 1) {
        const even = start + offset
        const odd = even + half
        const oddReal = real[odd] * currentReal - imaginary[odd] * currentImaginary
        const oddImaginary = real[odd] * currentImaginary + imaginary[odd] * currentReal
        real[odd] = real[even] - oddReal
        imaginary[odd] = imaginary[even] - oddImaginary
        real[even] += oddReal
        imaginary[even] += oddImaginary
        const nextReal = currentReal * stepReal - currentImaginary * stepImaginary
        currentImaginary = currentReal * stepImaginary + currentImaginary * stepReal
        currentReal = nextReal
      }
    }
  }
  if (inverse) {
    for (let index = 0; index < length; index += 1) {
      real[index] /= length
      imaginary[index] /= length
    }
  }
}

export function readFrame(audio, start, size, window) {
  const real = new Float64Array(size)
  for (let index = 0; index < size; index += 1) real[index] = (audio[start + index] || 0) * window[index]
  return real
}


export function rmsLevel(audio) {
  let power = 0
  for (let index = 0; index < audio.length; index += 1) power += audio[index] ** 2
  return Math.sqrt(power / Math.max(1, audio.length))
}

export function scaledAudio(audio, scale) {
  const output = new Float32Array(audio.length)
  for (let index = 0; index < audio.length; index += 1) output[index] = audio[index] * scale
  return output
}




export function zeroPhaseBiquad(audio, kind, frequency, q, sampleRate, gain = 0) {
  const forward = biquadFilter(audio, kind, frequency, q, sampleRate, gain)
  const reversed = Float32Array.from(forward).reverse()
  return Float32Array.from(biquadFilter(reversed, kind, frequency, q, sampleRate, gain)).reverse()
}

export function averageSpectrum(audio, frameSize, hopSize) {
  const window = Float64Array.from({ length: frameSize }, (_value, index) => .5 - .5 * Math.cos(2 * Math.PI * index / (frameSize - 1)))
  const spectrum = new Float64Array(frameSize / 2 + 1)
  const frameCount = Math.max(1, Math.floor(Math.max(0, audio.length - frameSize) / hopSize) + 1)
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const real = readFrame(audio, frameIndex * hopSize, frameSize, window)
    const imaginary = new Float64Array(frameSize)
    fft(real, imaginary)
    for (let bin = 1; bin <= frameSize / 2; bin += 1) spectrum[bin] += Math.hypot(real[bin], imaginary[bin])
  }
  for (let bin = 1; bin <= frameSize / 2; bin += 1) spectrum[bin] /= frameCount
  return spectrum
}

export function analyzeReferencePoints(source, reference, sampleRate, pointCount) {
  const frameSize = 2048
  const hopSize = 1024
  const sourceSpectrum = averageSpectrum(source, frameSize, hopSize)
  const referenceSpectrum = averageSpectrum(reference, frameSize, hopSize)
  const maxBin = Math.min(frameSize / 2 - 2, Math.floor(10800 * frameSize / sampleRate))
  const minBin = Math.max(2, Math.ceil(120 * frameSize / sampleRate))
  const sourceTotal = sourceSpectrum.slice(minBin, maxBin + 1).reduce((sum, value) => sum + value, 0)
  const referenceTotal = referenceSpectrum.slice(minBin, maxBin + 1).reduce((sum, value) => sum + value, 0)
  const differences = new Float64Array(maxBin + 1)
  for (let bin = minBin; bin <= maxBin; bin += 1) {
    let sourceValue = 0
    let referenceValue = 0
    const smoothing = 5
    for (let offset = -smoothing; offset <= smoothing; offset += 1) {
      const currentBin = Math.max(minBin, Math.min(maxBin, bin + offset))
      sourceValue += sourceSpectrum[currentBin]
      referenceValue += referenceSpectrum[currentBin]
    }
    const normalizedSource = sourceValue / (sourceTotal * (smoothing * 2 + 1))
    const normalizedReference = referenceValue / (referenceTotal * (smoothing * 2 + 1))
    differences[bin] = 20 * Math.log10(Math.max(1e-8, normalizedReference) / Math.max(1e-8, normalizedSource))
  }

  const candidates = []
  for (let bin = minBin + 1; bin < maxBin; bin += 1) {
    const value = differences[bin]
    if ((value >= differences[bin - 1] && value >= differences[bin + 1]) || (value <= differences[bin - 1] && value <= differences[bin + 1])) {
      candidates.push({ frequency: bin * sampleRate / frameSize, gain: Math.max(-3, Math.min(3, value * .5)), strength: Math.abs(value) })
    }
  }
  candidates.sort((left, right) => right.strength - left.strength)
  const selected = []
  for (const candidate of candidates) {
    const separated = selected.every((item) => Math.abs(Math.log(candidate.frequency / item.frequency)) > Math.log(1.12))
    if (separated && Math.abs(candidate.gain) >= .15) selected.push(candidate)
    if (selected.length >= pointCount) break
  }
  for (let index = selected.length; index < pointCount; index += 1) {
    const amount = (index + 1) / (pointCount + 1)
    const bin = Math.round(minBin + amount * (maxBin - minBin))
    selected.push({ frequency: bin * sampleRate / frameSize, gain: Math.max(-3, Math.min(3, differences[bin] * .5)), strength: 0 })
  }
  return selected.sort((left, right) => left.frequency - right.frequency).slice(0, pointCount)
}


export function applyCompressorAndLimiter(audio, sampleRate, parameters) {
  const compressed = new Float32Array(audio.length)
  let envelope = 0
  const attack = Math.exp(-1 / (.008 * sampleRate))
  const release = Math.exp(-1 / (.120 * sampleRate))
  const thresholdDb = -18
  const ratio = Math.max(1, parameters.compressionRatio)
  const makeup = 10 ** (2 / 20)
  for (let index = 0; index < audio.length; index += 1) {
    const sample = audio[index]
    const detector = Math.abs(sample)
    const coefficient = detector > envelope ? attack : release
    envelope = coefficient * envelope + (1 - coefficient) * detector
    const envelopeDb = 20 * Math.log10(Math.max(envelope, 1e-8))
    const gainDb = envelopeDb > thresholdDb
      ? (thresholdDb + (envelopeDb - thresholdDb) / ratio) - envelopeDb
      : 0
    compressed[index] = sample * makeup * (10 ** (gainDb / 20))
  }

  const limited = new Float32Array(compressed.length)
  envelope = 0
  const limiterAttack = Math.exp(-1 / (.005 * sampleRate))
  const limiterRelease = Math.exp(-1 / (.080 * sampleRate))
  const limiterThreshold = 10 ** (-1 / 20)
  for (let index = 0; index < compressed.length; index += 1) {
    const sample = compressed[index]
    const detector = Math.abs(sample)
    const coefficient = detector > envelope ? limiterAttack : limiterRelease
    envelope = coefficient * envelope + (1 - coefficient) * detector
    const gain = envelope > limiterThreshold ? limiterThreshold / envelope : 1
    limited[index] = sample * gain
  }
  return limited
}

export function fadeEdges(audio, sampleRate) {
  const faded = Float32Array.from(audio)
  const fadeLength = Math.min(Math.round(sampleRate * .008), Math.floor(faded.length / 2))
  for (let index = 0; index < fadeLength; index += 1) {
    const amount = index / Math.max(1, fadeLength)
    faded[index] *= amount
    faded[faded.length - 1 - index] *= amount
  }
  return faded
}

