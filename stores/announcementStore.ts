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
    let dismissed: string[] = []
    let snoozed: Record<string, string> = {}
    try {
      const [dr, sr] = await Promise.all([
        AsyncStorage.getItem(DISMISSED_KEY).catch(() => null),
        AsyncStorage.getItem(SNOOZED_KEY).catch(() => null),
      ])
      dismissed = dr ? JSON.parse(dr) : []
      snoozed   = sr ? JSON.parse(sr) : {}
    } catch {}

    api.getActive()
      .then(list => {
        const today = todayStr()
        const showable = list.find(ann => {
          const key = String(ann.id)
          if (dismissed.includes(key)) return false
          if (snoozed[key] === today) return false
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
      const dismissed: string[] = raw ? JSON.parse(raw) : []
      const key = String(id)
      if (!dismissed.includes(key)) {
        dismissed.push(key)
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
      snoozed[String(id)] = todayStr()
      await AsyncStorage.setItem(SNOOZED_KEY, JSON.stringify(snoozed))
    } catch {}
    api.markSeen(id).catch(() => {})
  },
}))
