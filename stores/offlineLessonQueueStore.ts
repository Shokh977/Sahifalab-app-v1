import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lessons as lessonsApi } from '../lib/api'
import { useCourseStore } from './courseStore'

// Queues lesson-completion / watch-position writes made while offline (e.g. a
// downloaded lesson watched on the metro) so XP, streak and progress are never
// silently lost — they sync the moment the app is back online.

const QUEUE_KEY = 'sahifalab_lesson_sync_queue'

type QueueItem =
  | { type: 'complete'; courseId: number; lessonId: number; queuedAt: number }
  | { type: 'position'; courseId: number; lessonId: number; positionSeconds: number; queuedAt: number }

interface OfflineLessonQueueState {
  queue:    QueueItem[]
  flushing: boolean
  loadFromStorage: () => Promise<void>
  enqueueComplete: (courseId: number, lessonId: number) => Promise<void>
  enqueuePosition: (courseId: number, lessonId: number, positionSeconds: number) => Promise<void>
  flush: () => Promise<{ flushed: number; failed: number }>
}

async function persist(queue: QueueItem[]) {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) } catch {}
}

export const useOfflineLessonQueueStore = create<OfflineLessonQueueState>((set, get) => ({
  queue:    [],
  flushing: false,

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY)
      if (raw) set({ queue: JSON.parse(raw) as QueueItem[] })
    } catch {}
  },

  enqueueComplete: async (courseId, lessonId) => {
    // A completion supersedes any queued position update for the same lesson
    const next = [
      ...get().queue.filter(i => !(i.lessonId === lessonId && i.type === 'position')),
      { type: 'complete', courseId, lessonId, queuedAt: Date.now() } as QueueItem,
    ]
    set({ queue: next })
    await persist(next)
  },

  enqueuePosition: async (courseId, lessonId, positionSeconds) => {
    const withoutOld = get().queue.filter(i => !(i.lessonId === lessonId && i.type === 'position'))
    const next = [...withoutOld, { type: 'position', courseId, lessonId, positionSeconds, queuedAt: Date.now() } as QueueItem]
    set({ queue: next })
    await persist(next)
  },

  flush: async () => {
    if (get().flushing || get().queue.length === 0) return { flushed: 0, failed: 0 }
    set({ flushing: true })

    let flushed = 0
    let failed  = 0

    while (get().queue.length > 0) {
      const item = get().queue[0]
      try {
        if (item.type === 'complete') {
          const res = await lessonsApi.complete(item.lessonId)
          const { progressCache } = useCourseStore.getState()
          const existing = progressCache[item.courseId] ?? new Set<number>()
          const updated  = new Set(existing); updated.add(item.lessonId)
          useCourseStore.setState({ progressCache: { ...progressCache, [item.courseId]: updated } })
          void res
        } else {
          await lessonsApi.saveVideoPosition(item.lessonId, item.positionSeconds)
        }
        const remaining = get().queue.slice(1)
        set({ queue: remaining })
        await persist(remaining)
        flushed++
      } catch {
        failed++
        break  // network is down again — remaining items stay queued
      }
    }

    set({ flushing: false })
    return { flushed, failed }
  },
}))
