// Convert whatever the browser's MediaRecorder produced (webm/opus on Chrome,
// mp4/aac on Safari, …) into 16 kHz mono 16-bit WAV — a format Gemini reliably
// accepts, and small enough to send inline for several minutes of speech.

type ACtor = typeof AudioContext

function getAC(): ACtor {
  return window.AudioContext || (window as unknown as { webkitAudioContext: ACtor }).webkitAudioContext
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}

export async function toWavMono16k(blob: Blob): Promise<Blob> {
  const arr = await blob.arrayBuffer()
  const AC = getAC()
  const tmp = new AC()
  let decoded: AudioBuffer
  try {
    decoded = await tmp.decodeAudioData(arr)
  } finally {
    void tmp.close?.()
  }
  const rate = 16000
  const length = Math.max(1, Math.ceil(decoded.duration * rate))
  const off = new OfflineAudioContext(1, length, rate)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const rendered = await off.startRendering()
  return encodeWav(rendered.getChannelData(0), rate)
}

/** Best MediaRecorder mime the browser supports (we transcode afterwards anyway). */
export function pickRecordingMime(): string {
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const m of cands) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m
    } catch {
      // ignore
    }
  }
  return ''
}
