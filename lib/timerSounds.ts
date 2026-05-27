/**
 * Timer phase-transition sounds generated programmatically.
 * WAV files are written to expo-file-system cache on first call and reused.
 * Focus → break: low 440 Hz chime (relaxing)
 * Break → focus: high 880 Hz double-beep (energising)
 */

let FileSystem: any = null
try { FileSystem = require('expo-file-system') } catch {}

let AVModule: any = null
try { AVModule = require('expo-av') } catch {}

// Standard base64 encoder — btoa not reliably available in all Hermes builds
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    s += B64[b0 >> 2]
    s += B64[((b0 & 3) << 4) | (b1 >> 4)]
    s += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '='
    s += i + 2 < bytes.length ? B64[b2 & 63] : '='
  }
  return s
}

// 16-bit signed mono PCM WAV (44100 Hz) — widely supported on Android & iOS
function makeSineWav(hz: number, durationMs: number, amp = 20000): Uint8Array {
  const rate = 44100
  const n    = Math.floor(rate * durationMs / 1000)
  const buf  = new ArrayBuffer(44 + n * 2)
  const dv   = new DataView(buf)

  const ws = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i))
  }

  ws(0,  'RIFF'); dv.setUint32(4,  36 + n * 2, true)
  ws(8,  'WAVE')
  ws(12, 'fmt '); dv.setUint32(16, 16,          true)
  dv.setUint16(20, 1,          true)   // PCM
  dv.setUint16(22, 1,          true)   // mono
  dv.setUint32(24, rate,       true)   // sample rate
  dv.setUint32(28, rate * 2,   true)   // byte rate
  dv.setUint16(32, 2,          true)   // block align
  dv.setUint16(34, 16,         true)   // bits per sample
  ws(36, 'data'); dv.setUint32(40, n * 2, true)

  for (let i = 0; i < n; i++) {
    // 10% fade-in + 20% fade-out to avoid clicks
    const fadeIn  = i < n * 0.10 ? i / (n * 0.10) : 1.0
    const fadeOut = i > n * 0.80 ? (n - i) / (n * 0.20) : 1.0
    const env     = fadeIn * fadeOut
    const sample  = Math.round(amp * env * Math.sin(2 * Math.PI * hz * i / rate))
    dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample)), true)
  }

  return new Uint8Array(buf)
}

// Two short tones concatenated into one WAV buffer
function makeConcatWav(hz1: number, ms1: number, hz2: number, ms2: number, gapMs = 60, amp = 18000): Uint8Array {
  const rate  = 44100
  const n1    = Math.floor(rate * ms1 / 1000)
  const n2    = Math.floor(rate * ms2 / 1000)
  const ng    = Math.floor(rate * gapMs / 1000)
  const total = n1 + ng + n2
  const buf   = new ArrayBuffer(44 + total * 2)
  const dv    = new DataView(buf)

  const ws = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i))
  }

  ws(0,  'RIFF'); dv.setUint32(4,  36 + total * 2, true)
  ws(8,  'WAVE')
  ws(12, 'fmt '); dv.setUint32(16, 16,              true)
  dv.setUint16(20, 1,          true)
  dv.setUint16(22, 1,          true)
  dv.setUint32(24, rate,       true)
  dv.setUint32(28, rate * 2,   true)
  dv.setUint16(32, 2,          true)
  dv.setUint16(34, 16,         true)
  ws(36, 'data'); dv.setUint32(40, total * 2, true)

  const writeTone = (offset: number, n: number, hz: number) => {
    for (let i = 0; i < n; i++) {
      const fadeIn  = i < n * 0.10 ? i / (n * 0.10) : 1.0
      const fadeOut = i > n * 0.80 ? (n - i) / (n * 0.20) : 1.0
      const sample  = Math.round(amp * fadeIn * fadeOut * Math.sin(2 * Math.PI * hz * i / rate))
      dv.setInt16(44 + (offset + i) * 2, Math.max(-32768, Math.min(32767, sample)), true)
    }
  }

  writeTone(0, n1, hz1)
  // gap: silence (already 0 from ArrayBuffer)
  writeTone(n1 + ng, n2, hz2)

  return new Uint8Array(buf)
}

const URI_CACHE: Record<string, string | null> = {}

async function ensureWavUri(key: string, bytes: Uint8Array): Promise<string | null> {
  if (key in URI_CACHE) return URI_CACHE[key]
  if (!FileSystem?.cacheDirectory) return (URI_CACHE[key] = null)
  try {
    const path = `${FileSystem.cacheDirectory}${key}.wav`
    const info = await FileSystem.getInfoAsync(path)
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(path, toBase64(bytes), {
        encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
      })
    }
    return (URI_CACHE[key] = path)
  } catch {
    return (URI_CACHE[key] = null)
  }
}

async function playUri(uri: string): Promise<void> {
  if (!AVModule?.Audio) return
  try {
    await AVModule.Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
    const { sound } = await AVModule.Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 1.0 },
    )
    sound.setOnPlaybackStatusUpdate((s: any) => {
      if (s.didJustFinish) sound.unloadAsync().catch(() => {})
    })
  } catch {}
}

// Low-pitch single chime → "it's break time"
export async function playBreakSound(): Promise<void> {
  const bytes = makeSineWav(440, 400, 18000)
  const uri   = await ensureWavUri('break_chime', bytes)
  if (uri) await playUri(uri)
}

// High-pitch ascending double-beep → "time to focus!"
export async function playFocusSound(): Promise<void> {
  const bytes = makeConcatWav(660, 120, 880, 150, 70, 20000)
  const uri   = await ensureWavUri('focus_beep', bytes)
  if (uri) await playUri(uri)
}
