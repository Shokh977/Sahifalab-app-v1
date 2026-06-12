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

export const useSettingsStore = create<SettingsState>((set, get) => ({
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
    AsyncStorage.setItem(KEY, JSON.stringify({ soundEnabled: v, vibrateEnabled: get().vibrateEnabled })).catch(() => {})
  },

  setVibrateEnabled: (v) => {
    set({ vibrateEnabled: v })
    AsyncStorage.setItem(KEY, JSON.stringify({ soundEnabled: get().soundEnabled, vibrateEnabled: v })).catch(() => {})
  },
}))
