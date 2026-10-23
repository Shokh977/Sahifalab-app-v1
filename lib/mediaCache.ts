/**
 * mediaCache — keeps remote media (ambient sounds, lesson materials) in the
 * phone's storage, so a file comes from the server once and every later use
 * is local: faster to start, works offline, and doesn't spend the CDN /
 * mobile-data budget again.
 *
 * Files live under documentDirectory/media/<bucket>/ — not cacheDirectory,
 * which the OS may empty whenever it likes (a 3 MB rain loop would quietly
 * be downloaded again). The file name is a hash of the URL, so a changed
 * URL (the backend re-uploads under a new name) is simply a new file, and
 * stale ones are trimmed by `pruneBucket`.
 *
 * Downloads go to a ".part" file and are renamed when complete, so a killed
 * app never leaves a half file that later "plays". Concurrent requests for
 * the same URL share one download.
 */
import * as FileSystem from 'expo-file-system/legacy'

export type MediaBucket = 'ambient' | 'materials'

const ROOT = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}media/` : null
const inflight = new Map<string, Promise<string | null>>()

/** FNV-1a — a stable, dependency-free file name for a URL. Pure. */
export function hashUrl(url: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** The extension of a URL's path (".mp3"), ignoring any query string. Pure. */
export function extOf(url: string, fallback = ''): string {
  const path = url.split(/[?#]/)[0]
  const m = /\.([a-z0-9]{1,5})$/i.exec(path)
  return m ? `.${m[1].toLowerCase()}` : fallback
}

function dirFor(bucket: MediaBucket): string | null {
  return ROOT ? `${ROOT}${bucket}/` : null
}

/** `ext` (".pdf") is for URLs whose path has no extension of their own —
 *  the file needs one for the phone to know how to open it. */
export function localPathFor(url: string, bucket: MediaBucket, ext?: string): string | null {
  const dir = dirFor(bucket)
  return dir ? `${dir}${hashUrl(url)}${extOf(url, ext ?? '')}` : null
}

/** The local copy if it's already on the phone, else null. Never downloads. */
export async function getCached(url: string, bucket: MediaBucket, ext?: string): Promise<string | null> {
  const path = localPathFor(url, bucket, ext)
  if (!path) return null
  try {
    const info = await FileSystem.getInfoAsync(path)
    return info.exists && (info as { size?: number }).size !== 0 ? path : null
  } catch {
    return null
  }
}

/** The local copy, downloading it first if needed. null if it can't be
 *  stored (no file system, no network) — callers fall back to the URL. */
export function ensureCached(url: string, bucket: MediaBucket, ext?: string): Promise<string | null> {
  const key = `${bucket}:${url}`
  const running = inflight.get(key)
  if (running) return running
  const job = (async () => {
    const path = localPathFor(url, bucket, ext)
    const dir = dirFor(bucket)
    if (!path || !dir) return null
    const existing = await getCached(url, bucket, ext)
    if (existing) return existing
    const part = `${path}.part`
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})
      const res = await FileSystem.downloadAsync(url, part)
      if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`)
      await FileSystem.moveAsync({ from: part, to: path })
      return path
    } catch {
      await FileSystem.deleteAsync(part, { idempotent: true }).catch(() => {})
      return null
    }
  })().finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

/** Deletes files in a bucket that no longer belong to any of `keepUrls`
 *  (e.g. a sound the admin replaced or removed). */
export async function pruneBucket(bucket: MediaBucket, keepUrls: readonly string[]): Promise<void> {
  const dir = dirFor(bucket)
  if (!dir) return
  try {
    const keep = new Set(keepUrls.map(u => `${hashUrl(u)}${extOf(u)}`))
    const names = await FileSystem.readDirectoryAsync(dir)
    await Promise.all(
      names.filter(n => !n.endsWith('.part') && !keep.has(n)).map(n => FileSystem.deleteAsync(`${dir}${n}`, { idempotent: true }).catch(() => {})),
    )
  } catch {
    // Directory not created yet — nothing to prune.
  }
}
