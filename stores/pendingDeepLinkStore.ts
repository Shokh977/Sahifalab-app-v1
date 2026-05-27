import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'sahifalab_pending_link'

interface PendingDeepLinkState {
  pendingUrl: string | null
  setPending: (url: string) => Promise<void>
  consume:    () => Promise<string | null>
}

export const usePendingDeepLinkStore = create<PendingDeepLinkState>(() => ({
  pendingUrl: null,

  setPending: async (url) => {
    try { await AsyncStorage.setItem(KEY, url) } catch {}
    usePendingDeepLinkStore.setState({ pendingUrl: url })
  },

  consume: async () => {
    const inMemory = usePendingDeepLinkStore.getState().pendingUrl
    const url = inMemory ?? await AsyncStorage.getItem(KEY).catch(() => null)
    try { await AsyncStorage.removeItem(KEY) } catch {}
    usePendingDeepLinkStore.setState({ pendingUrl: null })
    return url
  },
}))
