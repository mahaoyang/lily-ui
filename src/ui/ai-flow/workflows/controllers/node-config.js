// Persist configuration attachments with the node, independently of temporary uploads.
export async function packConfigAudio(file) {
  if (!file) return null
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  return { name: file.name, type: file.type, data }
}

export function unpackConfigAudio(audio) {
  if (!audio?.data) return null
  const encoded = audio.data.slice(audio.data.indexOf(',') + 1)
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0))
  return new File([bytes], audio.name || 'emotion.wav', { type: audio.type || 'audio/wav' })
}
