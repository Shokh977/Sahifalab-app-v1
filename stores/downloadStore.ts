import { create } from 'zustand'
import { Alert, AppState } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Network from 'expo-network'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Lesson } from '../lib/api'
import { lessons as lessonsApi } from '../lib/api'

// ─── Storage-private downloads (never touches the device gallery) ────────────
// Files live at documentDirectory/downloads/{courseId}/{lessonId}.mp4 — app-scoped,
// not MediaStore-scanned, auto-deleted on uninstall. expo-media-library is never
// imported anywhere in this feature.

const STORAGE_KEY   = 'offline_downloads_v2'
const SETTINGS_KEY  = 'offline_download_settings_v1'
const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`

const SAFETY_BUFFER_BYTES = 200 * 1024 * 1024        // 200 MB free-space buffer
const VERIFY_INTERVAL_MS  = 24 * 60 * 60 * 1000       // re-check enrollment at most every 24h
const GRACE_PERIOD_MS     = 30 * 24 * 60 * 60 * 1000  // 30-day offline grace period
const MIN_VALID_SIZE      = 100_000                   // below this = error page, not a video

export type DownloadQuality = '360p' | '480p' | '720p'
export type DownloadStatus  = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed'

export const QUALITY_BITRATE_MB_PER_MIN: Record<DownloadQuality, number> = {
  '360p': 4, '480p': 7, '720p': 12,
}
export function estimateSizeMb(durationMinutes: number, quality: DownloadQuality): number {
  return Math.max(1, Math.round((durationMinutes || 1) * QUALITY_BITRATE_MB_PER_MIN[quality]))
}

export interface DownloadRecord {
  lessonId:        number
  courseId:        number
  courseTitle:      string
  title:            string
  description:      string | null
  durationMinutes:  number
  orderIndex:       number
  materialUrl:      string | null
  materialName:     string | null

  quality:          DownloadQuality
  status:           DownloadStatus

  fileUri:          string | null
  totalBytes:        number | null
  downloadedBytes:  number

  pauseState:        string | null   // JSON of FileSystem.DownloadPauseState
  wifiOverride:      boolean          // user chose "download anyway" over cellular
  wifiPromptShown:  boolean

  error:             string | null
  createdAt:        string
  completedAt:      string | null
  lastVerifiedAt:    string | null
}

interface CourseInfo { id: number; title: string; thumbnail_url?: string | null }

interface DownloadState {
  entries:  Record<number, DownloadRecord>
  queue:    number[]                 // lessonIds waiting to be processed, in order
  activeLessonId: number | null
  queuePausedForStorage: boolean

  wifiOnly:       boolean
  defaultQuality: DownloadQuality
  lastGlobalVerifiedAt: string | null

  initialized: boolean
  courseThumbs: Record<number, string>   // courseId -> local thumb file:// uri

  load: () => Promise<void>
  setWifiOnly: (v: boolean) => void
  setDefaultQuality: (q: DownloadQuality) => void

  enqueueLesson: (lesson: Lesson, course: CourseInfo, quality?: DownloadQuality, opts?: { overrideWifiOnly?: boolean }) => Promise<void>
  enqueueCourse: (course: CourseInfo, lessonList: Lesson[], quality?: DownloadQuality) => Promise<void>
  pauseDownload:  (lessonId: number) => Promise<void>
  resumeDownload: (lessonId: number) => Promise<void>
  retryDownload:  (lessonId: number) => Promise<void>
  cancelDownload: (lessonId: number) => Promise<void>
  deleteDownload: (lessonId: number) => Promise<void>
  deleteCourse:   (courseId: number) => Promise<void>
  deleteAll:      () => Promise<void>

  isDownloaded:  (id: number) => boolean
  isDownloading: (id: number) => boolean
  isQueued:      (id: number) => boolean
  isPaused:      (id: number) => boolean
  isFailed:      (id: number) => boolean
  getProgress:   (id: number) => number
  getStatus:     (id: number) => DownloadStatus | null
  isPlaybackAllowed: (id: number) => boolean

  verifyAccess: () => Promise<void>
  cleanupOrphans: () => Promise<void>

  _processQueue:  () => Promise<void>
  _startDownload: (lessonId: number) => Promise<void>
}

// In-memory map of active DownloadResumable objects — cannot be persisted, only
// the derived `pauseState` (savable()) survives app restarts.
const resumables = new Map<number, FileSystem.DownloadResumable>()

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function ensureDir(dirUri: string) {
  const info = await FileSystem.getInfoAsync(dirUri)
  if (!info.exists) await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true })
}

async function persistEntries(entries: Record<number, DownloadRecord>) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch {}
}

function safeParsePauseState(raw: string | null): FileSystem.DownloadPauseState | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  entries: {},
  queue: [],
  activeLessonId: null,
  queuePausedForStorage: false,

  wifiOnly: true,
  defaultQuality: '480p',
  lastGlobalVerifiedAt: null,

  initialized: false,
  courseThumbs: {},

  load: async () => {
    if (get().initialized) return
    try {
      const [rawEntries, rawSettings] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
      ])
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings)
        set({
          wifiOnly:              parsed.wifiOnly ?? true,
          defaultQuality:        parsed.defaultQuality ?? '480p',
          lastGlobalVerifiedAt:  parsed.lastGlobalVerifiedAt ?? null,
          courseThumbs:          parsed.courseThumbs ?? {},
        })
      }
      if (rawEntries) {
        const saved: Record<number, DownloadRecord> = JSON.parse(rawEntries)
        const verified: Record<number, DownloadRecord> = {}
        const requeue: number[] = []
        await Promise.all(Object.values(saved).map(async entry => {
          if (entry.status === 'completed') {
            if (!entry.fileUri) return
            const info = await FileSystem.getInfoAsync(entry.fileUri)
            const size = (info as any).size ?? 0
            if (info.exists && size > MIN_VALID_SIZE) {
              verified[entry.lessonId] = entry
            } else {
              try { await FileSystem.deleteAsync(entry.fileUri, { idempotent: true }) } catch {}
            }
          } else if (entry.status === 'downloading') {
            // App was killed mid-download — requeue (resumes from pauseState if we have it)
            verified[entry.lessonId] = { ...entry, status: 'queued' }
            requeue.push(entry.lessonId)
          } else if (entry.status === 'queued') {
            verified[entry.lessonId] = entry
            requeue.push(entry.lessonId)
          } else {
            // paused / failed — kept, but require an explicit user tap to resume
            verified[entry.lessonId] = entry
          }
        }))
        set({ entries: verified, queue: requeue })
      }
    } catch {}

    set({ initialized: true })
    await get().cleanupOrphans()
    _registerListenersOnce(get, set)
    get()._processQueue()
    get().verifyAccess()
  },

  setWifiOnly: (v) => {
    set({ wifiOnly: v })
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      wifiOnly: v, defaultQuality: get().defaultQuality,
      lastGlobalVerifiedAt: get().lastGlobalVerifiedAt, courseThumbs: get().courseThumbs,
    })).catch(() => {})
    if (v === false) get()._processQueue()   // cellular now allowed — unblock any waiting items
  },

  setDefaultQuality: (q) => {
    set({ defaultQuality: q })
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      wifiOnly: get().wifiOnly, defaultQuality: q,
      lastGlobalVerifiedAt: get().lastGlobalVerifiedAt, courseThumbs: get().courseThumbs,
    })).catch(() => {})
  },

  enqueueLesson: async (lesson, course, quality, opts) => {
    const state = get()
    const q = quality ?? state.defaultQuality
    const existing = state.entries[lesson.id]
    if (existing?.status === 'completed' && existing.quality === q) return
    if (state.activeLessonId === lesson.id || state.queue.includes(lesson.id)) return

    const free = await FileSystem.getFreeDiskStorageAsync().catch(() => Number.POSITIVE_INFINITY)
    if (free < SAFETY_BUFFER_BYTES) {
      Alert.alert('Xotira yetarli emas', `Kamida ${Math.round(SAFETY_BUFFER_BYTES / 1024 / 1024)} MB bo'sh joy kerak.`)
      return
    }

    const record: DownloadRecord = {
      lessonId: lesson.id, courseId: course.id, courseTitle: course.title,
      title: lesson.title, description: lesson.description ?? null,
      durationMinutes: lesson.duration_minutes ?? 0, orderIndex: lesson.order_index ?? 0,
      materialUrl: lesson.material_url ?? null, materialName: lesson.material_name ?? null,
      quality: q, status: 'queued',
      fileUri: null, totalBytes: null, downloadedBytes: 0,
      pauseState: null, wifiOverride: !!opts?.overrideWifiOnly, wifiPromptShown: false,
      error: null, createdAt: new Date().toISOString(), completedAt: null, lastVerifiedAt: null,
    }
    set(s => ({
      entries: { ...s.entries, [lesson.id]: record },
      queue: [...s.queue, lesson.id],
      queuePausedForStorage: false,
    }))
    await persistEntries(get().entries)
    _cacheCourseThumb(course, get, set)
    get()._processQueue()
  },

  enqueueCourse: async (course, lessonList, quality) => {
    const downloadable = lessonList
      .filter(l => l.lesson_type !== 'material' && l.lesson_type !== 'quiz')
      .sort((a, b) => a.order_index - b.order_index)
    for (const lesson of downloadable) {
      const existing = get().entries[lesson.id]
      if (existing?.status === 'completed' && (!quality || existing.quality === quality)) continue
      await get().enqueueLesson(lesson, course, quality)
    }
  },

  pauseDownload: async (lessonId) => {
    const resumable = resumables.get(lessonId)
    if (resumable) {
      try {
        await resumable.pauseAsync()
        const saved = resumable.savable()
        set(s => ({
          entries: s.entries[lessonId]
            ? { ...s.entries, [lessonId]: { ...s.entries[lessonId], status: 'paused', pauseState: JSON.stringify(saved) } }
            : s.entries,
        }))
      } catch {}
      resumables.delete(lessonId)
    } else {
      // Queued but not yet started — just mark paused so it drops out of the active queue
      set(s => ({
        entries: s.entries[lessonId] ? { ...s.entries, [lessonId]: { ...s.entries[lessonId], status: 'paused' } } : s.entries,
      }))
    }
    set(s => ({
      activeLessonId: s.activeLessonId === lessonId ? null : s.activeLessonId,
      queue: s.queue.filter(id => id !== lessonId),
    }))
    await persistEntries(get().entries)
    get()._processQueue()
  },

  resumeDownload: async (lessonId) => {
    const rec = get().entries[lessonId]
    if (!rec || (rec.status !== 'paused' && rec.status !== 'failed')) return
    set(s => ({
      entries: { ...s.entries, [lessonId]: { ...s.entries[lessonId], status: 'queued', error: null } },
      queue: s.queue.includes(lessonId) ? s.queue : [lessonId, ...s.queue],
      queuePausedForStorage: false,
    }))
    await persistEntries(get().entries)
    get()._processQueue()
  },

  retryDownload: async (lessonId) => {
    await get().resumeDownload(lessonId)
  },

  cancelDownload: async (lessonId) => {
    const resumable = resumables.get(lessonId)
    if (resumable) { try { await resumable.pauseAsync() } catch {} }
    resumables.delete(lessonId)
    const rec = get().entries[lessonId]
    if (rec) {
      const tempUri = `${DOWNLOADS_DIR}${rec.courseId}/${lessonId}.mp4.part`
      try { await FileSystem.deleteAsync(tempUri, { idempotent: true }) } catch {}
    }
    set(s => {
      const entries = { ...s.entries }; delete entries[lessonId]
      return {
        entries,
        queue: s.queue.filter(id => id !== lessonId),
        activeLessonId: s.activeLessonId === lessonId ? null : s.activeLessonId,
      }
    })
    await persistEntries(get().entries)
    get()._processQueue()
  },

  deleteDownload: async (lessonId) => {
    const rec = get().entries[lessonId]
    if (!rec) return
    if (get().activeLessonId === lessonId || resumables.has(lessonId)) {
      await get().cancelDownload(lessonId)
    }
    if (rec.fileUri) { try { await FileSystem.deleteAsync(rec.fileUri, { idempotent: true }) } catch {} }
    set(s => {
      const entries = { ...s.entries }; delete entries[lessonId]
      return { entries, queue: s.queue.filter(id => id !== lessonId) }
    })
    await persistEntries(get().entries)
  },

  deleteCourse: async (courseId) => {
    const ids = Object.values(get().entries).filter(e => e.courseId === courseId).map(e => e.lessonId)
    for (const id of ids) await get().deleteDownload(id)
    try { await FileSystem.deleteAsync(`${DOWNLOADS_DIR}${courseId}/`, { idempotent: true }) } catch {}
    set(s => {
      const courseThumbs = { ...s.courseThumbs }; delete courseThumbs[courseId]
      return { courseThumbs }
    })
  },

  deleteAll: async () => {
    const ids = Object.keys(get().entries).map(Number)
    for (const id of ids) await get().deleteDownload(id)
    try { await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true }) } catch {}
    set({ courseThumbs: {} })
  },

  isDownloaded:  (id) => get().entries[id]?.status === 'completed',
  isDownloading: (id) => get().entries[id]?.status === 'downloading',
  isQueued:      (id) => get().entries[id]?.status === 'queued',
  isPaused:      (id) => get().entries[id]?.status === 'paused',
  isFailed:      (id) => get().entries[id]?.status === 'failed',
  getStatus:     (id) => get().entries[id]?.status ?? null,
  getProgress:   (id) => {
    const e = get().entries[id]
    if (!e || !e.totalBytes) return 0
    return Math.min(1, e.downloadedBytes / e.totalBytes)
  },

  isPlaybackAllowed: (id) => {
    const rec = get().entries[id]
    if (!rec || rec.status !== 'completed') return false
    if (!rec.lastVerifiedAt) return true
    return Date.now() - new Date(rec.lastVerifiedAt).getTime() < GRACE_PERIOD_MS
  },

  verifyAccess: async () => {
    const state = get()
    const net = await Network.getNetworkStateAsync().catch(() => null)
    const online = !!net?.isConnected
    if (!online) return

    const lastGlobal = state.lastGlobalVerifiedAt ? new Date(state.lastGlobalVerifiedAt).getTime() : 0
    if (Date.now() - lastGlobal < VERIFY_INTERVAL_MS) return

    const ids = Object.values(state.entries).filter(e => e.status === 'completed').map(e => e.lessonId)
    const nowIso = new Date().toISOString()
    if (ids.length === 0) {
      set({ lastGlobalVerifiedAt: nowIso })
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
        wifiOnly: get().wifiOnly, defaultQuality: get().defaultQuality,
        lastGlobalVerifiedAt: nowIso, courseThumbs: get().courseThumbs,
      })).catch(() => {})
      return
    }

    try {
      const { allowed, revoked } = await lessonsApi.verifyDownloads(ids)
      if (revoked.length > 0) {
        for (const id of revoked) await get().deleteDownload(id)
        Alert.alert(
          'Yuklamalar oʻchirildi',
          "Kursga kirish tugagani sababli yuklab olingan darslar oʻchirildi.",
        )
      }
      set(s => ({
        entries: Object.fromEntries(
          Object.entries(s.entries).map(([id, e]) =>
            allowed.includes(Number(id)) ? [id, { ...e, lastVerifiedAt: nowIso }] : [id, e],
          ),
        ),
        lastGlobalVerifiedAt: nowIso,
      }))
      await persistEntries(get().entries)
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
        wifiOnly: get().wifiOnly, defaultQuality: get().defaultQuality,
        lastGlobalVerifiedAt: nowIso, courseThumbs: get().courseThumbs,
      })).catch(() => {})
    } catch {}
  },

  cleanupOrphans: async () => {
    try {
      const rootInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR)
      if (!rootInfo.exists) return
      const courseDirs = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR)
      const validFiles = new Set(
        Object.values(get().entries).filter(e => e.fileUri).map(e => e.fileUri as string),
      )
      for (const dirName of courseDirs) {
        const courseDirUri = `${DOWNLOADS_DIR}${dirName}/`
        const dirInfo = await FileSystem.getInfoAsync(courseDirUri)
        if (!dirInfo.exists || !(dirInfo as any).isDirectory) continue
        const files = await FileSystem.readDirectoryAsync(courseDirUri)
        let anyLeft = false
        for (const file of files) {
          const fileUri = `${courseDirUri}${file}`
          if (file === 'thumb.jpg') { anyLeft = true; continue }
          if (file.endsWith('.part') || !validFiles.has(fileUri)) {
            try { await FileSystem.deleteAsync(fileUri, { idempotent: true }) } catch {}
          } else {
            anyLeft = true
          }
        }
        if (!anyLeft) { try { await FileSystem.deleteAsync(courseDirUri, { idempotent: true }) } catch {} }
      }
    } catch {}
  },

  _processQueue: async () => {
    if (get().activeLessonId != null) return
    if (get().queuePausedForStorage) return

    const nextId = get().queue.find(id => get().entries[id]?.status === 'queued')
    if (nextId == null) return

    const record = get().entries[nextId]
    if (!record) return

    const net = await Network.getNetworkStateAsync().catch(() => null)
    const online = !!net?.isConnected
    if (!online) return   // will retry once the network listener fires

    const onWifi = net?.type === Network.NetworkStateType.WIFI
    if (get().wifiOnly && !onWifi && !record.wifiOverride) {
      if (!record.wifiPromptShown) {
        set(s => ({
          entries: { ...s.entries, [nextId]: { ...s.entries[nextId], wifiPromptShown: true } },
        }))
        Alert.alert(
          'Faqat Wi-Fi orqali yuklab olish',
          `"${record.title}" darsi Wi-Fi ulanishini kutmoqda.`,
          [
            { text: 'Wi-Fi kutish', style: 'cancel' },
            {
              text: 'Baribir yuklash',
              onPress: () => {
                useDownloadStore.setState(s => ({
                  entries: s.entries[nextId]
                    ? { ...s.entries, [nextId]: { ...s.entries[nextId], wifiOverride: true } }
                    : s.entries,
                }))
                useDownloadStore.getState()._processQueue()
              },
            },
          ],
        )
      }
      return
    }

    await get()._startDownload(nextId)
  },

  _startDownload: async (lessonId) => {
    const rec0 = get().entries[lessonId]
    if (!rec0) return
    set(s => ({
      activeLessonId: lessonId,
      entries: { ...s.entries, [lessonId]: { ...s.entries[lessonId], status: 'downloading', error: null } },
    }))
    await persistEntries(get().entries)

    const dirUri   = `${DOWNLOADS_DIR}${rec0.courseId}/`
    await ensureDir(dirUri)
    const finalUri = `${dirUri}${lessonId}.mp4`
    const tempUri  = `${finalUri}.part`

    const savedPauseState = safeParsePauseState(rec0.pauseState)
    let lastErrorMsg = ''

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const urlRes = await lessonsApi.getDownloadUrl(lessonId, rec0.quality)

        const useResume = attempt === 1 && !!savedPauseState
        const resumable = useResume
          ? FileSystem.createDownloadResumable(
              urlRes.url, tempUri, savedPauseState!.options,
              makeProgressCallback(lessonId), savedPauseState!.resumeData,
            )
          : FileSystem.createDownloadResumable(
              urlRes.url, tempUri,
              { headers: { Referer: 'https://sahifalab.uz' } },
              makeProgressCallback(lessonId),
            )
        resumables.set(lessonId, resumable)

        const result = useResume ? await resumable.resumeAsync() : await resumable.downloadAsync()
        resumables.delete(lessonId)

        // Externally paused or deleted while awaiting — stop cleanly, no failure state
        const liveStatus = get().entries[lessonId]?.status
        if (liveStatus === undefined || liveStatus === 'paused') return

        if (!result) throw new Error('no_result')
        if (result.status !== 200) throw new Error(`http_${result.status}`)

        const info = await FileSystem.getInfoAsync(result.uri)
        const size = (info as any).size ?? 0
        if (!info.exists || size < MIN_VALID_SIZE) {
          try { await FileSystem.deleteAsync(result.uri, { idempotent: true }) } catch {}
          throw new Error('too_small')
        }

        // Atomic completion: only the final rename makes the file "real"
        try { await FileSystem.deleteAsync(finalUri, { idempotent: true }) } catch {}
        await FileSystem.moveAsync({ from: result.uri, to: finalUri })

        const nowIso = new Date().toISOString()
        set(s => ({
          entries: {
            ...s.entries,
            [lessonId]: {
              ...s.entries[lessonId],
              status: 'completed', fileUri: finalUri,
              totalBytes: size, downloadedBytes: size,
              pauseState: null, error: null,
              completedAt: nowIso, lastVerifiedAt: nowIso,
            },
          },
          activeLessonId: null,
          queue: s.queue.filter(id => id !== lessonId),
        }))
        await persistEntries(get().entries)
        get()._processQueue()
        return
      } catch (e: any) {
        resumables.delete(lessonId)
        const liveStatus = get().entries[lessonId]?.status
        if (liveStatus === undefined || liveStatus === 'paused') return  // don't clobber a pause/cancel

        lastErrorMsg = String(e?.message ?? e)
        if (/403|401|422|Bu kursga|Bu dars/.test(lastErrorMsg)) break   // not retryable
        if (attempt < 3) await sleep(1000 * 2 ** (attempt - 1))
      }
    }

    try { await FileSystem.deleteAsync(tempUri, { idempotent: true }) } catch {}
    const isStorageError = /ENOSPC|disk|space/i.test(lastErrorMsg)
    set(s => ({
      entries: {
        ...s.entries,
        [lessonId]: { ...s.entries[lessonId], status: 'failed', error: lastErrorMsg || 'unknown', pauseState: null },
      },
      activeLessonId: null,
      queuePausedForStorage: isStorageError,
    }))
    await persistEntries(get().entries)
    if (isStorageError) {
      Alert.alert('Xotira yetarli emas', "Qurilmangizda bo'sh joy qoldirmadi. Joy bo'shatib, qaytadan urinib ko'ring.")
    }
    if (!isStorageError) get()._processQueue()
  },
}))

// ── Throttled progress writer (≤ 1 store update / 500ms / 1% per lesson) ──────

const _lastProgressFlush = new Map<number, { time: number; pct: number }>()

function makeProgressCallback(lessonId: number) {
  return ({ totalBytesWritten, totalBytesExpectedToWrite }: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
    if (totalBytesExpectedToWrite <= 0) return
    const pct  = totalBytesWritten / totalBytesExpectedToWrite
    const now  = Date.now()
    const last = _lastProgressFlush.get(lessonId)
    if (last && now - last.time < 500 && Math.abs(pct - last.pct) < 0.01 && pct < 1) return
    _lastProgressFlush.set(lessonId, { time: now, pct })
    useDownloadStore.setState(s => ({
      entries: s.entries[lessonId]
        ? { ...s.entries, [lessonId]: { ...s.entries[lessonId], downloadedBytes: totalBytesWritten, totalBytes: totalBytesExpectedToWrite } }
        : s.entries,
    }))
  }
}

// ── Course thumbnail caching (so the Downloads screen renders fully offline) ──

async function _cacheCourseThumb(course: CourseInfo, get: () => DownloadState, set: (partial: Partial<DownloadState>) => void) {
  if (!course.thumbnail_url) return
  if (get().courseThumbs[course.id]) return
  try {
    const dirUri = `${DOWNLOADS_DIR}${course.id}/`
    await ensureDir(dirUri)
    const thumbUri = `${dirUri}thumb.jpg`
    const info = await FileSystem.getInfoAsync(thumbUri)
    if (!info.exists) await FileSystem.downloadAsync(course.thumbnail_url, thumbUri)
    const next = { ...get().courseThumbs, [course.id]: thumbUri }
    set({ courseThumbs: next })
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      wifiOnly: get().wifiOnly, defaultQuality: get().defaultQuality,
      lastGlobalVerifiedAt: get().lastGlobalVerifiedAt, courseThumbs: next,
    })).catch(() => {})
  } catch {}
}

// ── App-foreground resume + network-change listeners (registered once) ───────

let _listenersRegistered = false

function _registerListenersOnce(get: () => DownloadState, set: (partial: Partial<DownloadState>) => void) {
  if (_listenersRegistered) return
  _listenersRegistered = true

  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      get()._processQueue()
      get().verifyAccess()
    } else if (nextState === 'background') {
      // Keep a clean, resumable pause state instead of losing progress when the
      // OS suspends the app (true background downloads are not supported).
      const activeId = get().activeLessonId
      if (activeId != null) get().pauseDownload(activeId)
    }
  })

  Network.addNetworkStateListener((event) => {
    if (event.isConnected) {
      get()._processQueue()
      get().verifyAccess()
    }
  })
}
