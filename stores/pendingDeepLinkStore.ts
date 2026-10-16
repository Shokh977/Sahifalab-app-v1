import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'sahifalab_pending_link'

interface PendingDeepLinkState {
  pendingUrl: string | null
  setPending: (url: string) => Promise<void>
  consume:    () => Promise<string | null>
}

export const usePendingDeepLinkStore = create<PendingDeepLinkState>((set, get) => ({
  pendingUrl: null,

  setPending: async (url) => {
    try { await AsyncStorage.setItem(KEY, url) } catch {}
    set({ pendingUrl: url })
  },

  consume: async () => {
    const inMemory = get().pendingUrl
    const url = inMemory ?? await AsyncStorage.getItem(KEY).catch(() => null)
    try { await AsyncStorage.removeItem(KEY) } catch {}
    set({ pendingUrl: null })
    return url
  },
}))
