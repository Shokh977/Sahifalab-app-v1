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
    if (get().flushing || get().queue.length === 0) return { flushed: 0, failed: 0 }
    set({ flushing: true })

    let flushed = 0
    let failed = 0

    // Process one item at a time and persist the removal after each success.
    // This prevents double-submission if the app crashes mid-flush.
    while (get().queue.length > 0) {
      const item = get().queue[0]
      try {
        await focus.complete(item.minutes)
        const remaining = get().queue.slice(1)
        set({ queue: remaining })
        await persist(remaining)
        flushed++
      } catch {
        failed++
        break  // network is down — remaining items stay queued
      }
    }

    set({ flushing: false })
    return { flushed, failed }
  },
}))
