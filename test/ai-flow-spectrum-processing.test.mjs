import assert from 'node:assert/strict'
import { computePreview } from '../src/headless/audio/spectrum-processing.js'
const tone = frequency => Float32Array.from({length: 48000}, (_, i) => .2 * Math.sin(2 * Math.PI * frequency * i / 24000))
const source = tone(220), reference = tone(330)
const parameters = { enhanceRatio: .5, sharedLufs: -16, pointCount: 12, compressionRatio: 2.2, highpassEnabled: true, lowpassEnabled: true, exportAudio: true }
const result = computePreview(source, reference, parameters)
assert.equal(result.points.length, 12)
assert.equal(result.curves.length, 3)
assert(result.curves.every(curve => curve.length === 240 && curve.every(Number.isFinite)))
const bytes = new DataView(await result.blob.arrayBuffer())
assert.equal(bytes.getUint32(40, true), source.length * 2)
let peak = 0
for (let offset = 44; offset < bytes.byteLength; offset += 2) peak = Math.max(peak, Math.abs(bytes.getInt16(offset, true)))
assert(peak > 100 && peak <= 32767)
assert.equal(computePreview(source, null, {...parameters, exportAudio:false}).curves.length,3)
assert.throws(() => computePreview(new Float32Array(48000), reference, parameters), /有效声音/)
console.log('Spectrum processing: finite preview curves, real audible WAV, single input preview, silence rejection passed')
