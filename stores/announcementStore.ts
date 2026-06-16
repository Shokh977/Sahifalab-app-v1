import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { announcements as api, type Announcement } from '../lib/api'

const DISMISSED_KEY  = 'sahifalab_ann_dismissed_v1'   // Set<id> — never show again
const SNOOZED_KEY    = 'sahifalab_ann_snoozed_v1'     // { [id]: 'YYYY-MM-DD' }

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface AnnouncementState {
  current:   Announcement | null  // the one to show right now
  loading:   boolean
  fetch:     () => Promise<void>
  dismiss:   (id: number) => Promise<void>  // never show again
  snooze:    (id: number) => Promise<void>  // hide for today only
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  current: null,
  loading: false,

  fetch: async () => {
    // Read local filters first (fast, no network) — if everything is already
    // dismissed/snoozed we can skip the network call entirely.
    let dismissed: number[] = []
    let snoozed: Record<string, string> = {}
    try {
      const [dr, sr] = await Promise.all([
        AsyncStorage.getItem(DISMISSED_KEY).catch(() => null),
        AsyncStorage.getItem(SNOOZED_KEY).catch(() => null),
      ])
      dismissed = dr ? JSON.parse(dr) : []
      snoozed   = sr ? JSON.parse(sr) : {}
    } catch {}

    // Network call — fire and forget, UI updates when it resolves
    api.getActive()
      .then(list => {
        const today = todayStr()
        const showable = list.find(ann => {
          if (dismissed.includes(ann.id)) return false
          if (snoozed[ann.id] === today) return false
          return true
        })
        set({ current: showable ?? null })
      })
      .catch(() => {})
  },

  dismiss: async (id: number) => {
    set({ current: null })
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY).catch(() => null)
      const dismissed: number[] = raw ? JSON.parse(raw) : []
      if (!dismissed.includes(id)) {
        dismissed.push(id)
        await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
      }
    } catch {}
    api.markSeen(id).catch(() => {})
  },

  snooze: async (id: number) => {
    set({ current: null })
    try {
      const raw = await AsyncStorage.getItem(SNOOZED_KEY).catch(() => null)
      const snoozed: Record<string, string> = raw ? JSON.parse(raw) : {}
      snoozed[id] = todayStr()
      await AsyncStorage.setItem(SNOOZED_KEY, JSON.stringify(snoozed))
    } catch {}
    api.markSeen(id).catch(() => {})
  },
}))
