import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { focus } from '../lib/api'

const QUEUE_KEY = 'sahifalab_focus_queue'

interface QueueItem {
  minutes:  number
  queuedAt: number
}

interface OfflineQueueState {
  queue:           QueueItem[]
  flushing:        boolean
  loadFromStorage: () => Promise<void>
  enqueue:         (minutes: number) => Promise<void>
  flush:           () => Promise<{ flushed: number; failed: number }>
}

async function persist(queue: QueueItem[]) {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) } catch {}
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue:    [],
  flushing: false,

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY)
      if (raw) set({ queue: JSON.parse(raw) as QueueItem[] })
    } catch {}
  },

  enqueue: async (minutes) => {
    const item: QueueItem = { minutes, queuedAt: Date.now() }
    const next = [...get().queue, item]
    set({ queue: next })
    await persist(next)
  },

  flush: async () => {
    const { queue, flushing } = get()
    if (flushing || queue.length === 0) return { flushed: 0, failed: 0 }
    set({ flushing: true })

    let flushed = 0
    const remaining: QueueItem[] = []

    for (const item of queue) {
      try {
        await focus.complete(item.minutes)
        flushed++
      } catch {
        remaining.push(item)
      }
    }

    set({ queue: remaining, flushing: false })
    await persist(remaining)
    return { flushed, failed: remaining.length }
  },
}))
