import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'sahifalab_timer_settings'

interface SettingsState {
  soundEnabled:      boolean
  vibrateEnabled:    boolean
  setSoundEnabled:   (v: boolean) => void
  setVibrateEnabled: (v: boolean) => void
  loadSettings:      () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled:   true,
  vibrateEnabled: true,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        set({
          soundEnabled:   parsed.soundEnabled   ?? true,
          vibrateEnabled: parsed.vibrateEnabled ?? true,
        })
      }
    } catch {}
  },

  setSoundEnabled: (v) => {
    set({ soundEnabled: v })
    AsyncStorage.getItem(KEY)
      .then(raw => {
        const cur = raw ? JSON.parse(raw) : {}
        return AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, soundEnabled: v }))
      })
      .catch(() => {})
  },

  setVibrateEnabled: (v) => {
    set({ vibrateEnabled: v })
    AsyncStorage.getItem(KEY)
      .then(raw => {
        const cur = raw ? JSON.parse(raw) : {}
        return AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, vibrateEnabled: v }))
      })
      .catch(() => {})
  },
}))
