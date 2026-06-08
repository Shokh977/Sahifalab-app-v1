import { create } from 'zustand'
import { Alert } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Lesson } from '../lib/api'

const STORAGE_KEY  = 'offline_downloads_v1'
const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`

export interface DownloadEntry {
  lessonId:    number
  courseId:    number
  courseTitle: string
  title:       string
  fileUri:     string
  sizeMb:      number
  downloadedAt: string
}

interface DownloadState {
  entries:  Record<number, DownloadEntry>
  progress: Record<number, number>
  active:   Record<number, boolean>

  load:           () => Promise<void>
  startDownload:  (lesson: Lesson, courseId: number, courseTitle: string) => Promise<void>
  deleteDownload: (lessonId: number) => Promise<void>
  isDownloaded:   (lessonId: number) => boolean
  isDownloading:  (lessonId: number) => boolean
  getProgress:    (lessonId: number) => number
}

// In-memory map of active DownloadResumable objects (for cancel support)
const resumables = new Map<number, FileSystem.DownloadResumable>()

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url)
}

/** Derive a direct MP4 URL from lesson fields (fallback only — prefer /download-url API) */
export function getDownloadUrl(lesson: Lesson): string | null {
  if (lesson.video_url && !isYouTubeUrl(lesson.video_url)) {
    // Match .mp4/.mov anywhere in the URL (before optional query string)
    if (/\.(mp4|mov)(\?|$)/i.test(lesson.video_url)) return lesson.video_url
  }
  if (lesson.hls_url && !isYouTubeUrl(lesson.hls_url)) {
    // Keep the token query params — Bunny CDN signs by video_id, not by path,
    // so the same token that covers playlist.m3u8 also covers play_720p.mp4.
    return lesson.hls_url.replace('playlist.m3u8', 'play_720p.mp4')
  }
  if (lesson.video_url && !isYouTubeUrl(lesson.video_url)) {
    return lesson.video_url
  }
  return null
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR)
  if (!info.exists) await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true })
}

async function persist(entries: Record<number, DownloadEntry>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  entries:  {},
  progress: {},
  active:   {},

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved: Record<number, DownloadEntry> = JSON.parse(raw)
      // Verify files still exist
      const verified: Record<number, DownloadEntry> = {}
      await Promise.all(
        Object.values(saved).map(async entry => {
          const info = await FileSystem.getInfoAsync(entry.fileUri)
          const size  = (info as any).size ?? 0
          if (info.exists && size > 100_000) {
            verified[entry.lessonId] = entry
          } else {
            // File missing or too small (corrupted/error response) — clean up
            try { await FileSystem.deleteAsync(entry.fileUri, { idempotent: true }) } catch {}
          }
        })
      )
      set({ entries: verified })
      if (Object.keys(verified).length !== Object.keys(saved).length) {
        await persist(verified)
      }
    } catch {}
  },

  startDownload: async (lesson, courseId, courseTitle) => {
    const { active, entries } = get()
    if (active[lesson.id] || entries[lesson.id]) return

    const url = getDownloadUrl(lesson)
    if (!url) return

    await ensureDir()
    const fileUri = `${DOWNLOADS_DIR}lesson_${lesson.id}.mp4`

    set(s => ({
      active:   { ...s.active,   [lesson.id]: true },
      progress: { ...s.progress, [lesson.id]: 0    },
    }))

    const resumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      { headers: { Referer: 'https://sahifalab.uz' } },
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          set(s => ({
            progress: { ...s.progress, [lesson.id]: totalBytesWritten / totalBytesExpectedToWrite },
          }))
        }
      },
    )
    resumables.set(lesson.id, resumable)

    try {
      const result = await resumable.downloadAsync()
      if (result) {
        const httpStatus = result.status ?? 0
        const info    = await FileSystem.getInfoAsync(result.uri)
        const fileSize = (info as any).size ?? 0
        if (httpStatus !== 200 || fileSize < 100_000) {
          // CDN returned an error or a small error-page body
          try { await FileSystem.deleteAsync(result.uri, { idempotent: true }) } catch {}
          Alert.alert(
            'Yuklab bo\'lmadi',
            'Bu dars uchun oflayn yuklab olish hozircha mavjud emas.',
          )
        } else {
          const sizeMb = fileSize / (1024 * 1024)
          const entry: DownloadEntry = {
            lessonId:    lesson.id,
            courseId,
            courseTitle,
            title:       lesson.title,
            fileUri:     result.uri,
            sizeMb:      Math.round(sizeMb * 10) / 10,
            downloadedAt: new Date().toISOString(),
          }
          const next = { ...get().entries, [lesson.id]: entry }
          set({ entries: next })
          await persist(next)
        }
      }
    } catch {
      // Download cancelled or failed — remove partial file
      try { await FileSystem.deleteAsync(fileUri, { idempotent: true }) } catch {}
    } finally {
      resumables.delete(lesson.id)
      set(s => {
        const active   = { ...s.active }
        const progress = { ...s.progress }
        delete active[lesson.id]
        delete progress[lesson.id]
        return { active, progress }
      })
    }
  },

  deleteDownload: async (lessonId) => {
    const { entries } = get()
    const entry = entries[lessonId]
    if (!entry) return
    try { await FileSystem.deleteAsync(entry.fileUri, { idempotent: true }) } catch {}
    const next = { ...entries }
    delete next[lessonId]
    set({ entries: next })
    await persist(next)
  },

  isDownloaded:  (id) => !!get().entries[id],
  isDownloading: (id) => !!get().active[id],
  getProgress:   (id) => get().progress[id] ?? 0,
}))
