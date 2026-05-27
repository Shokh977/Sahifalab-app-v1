import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, type ColorTokens } from '../lib/constants'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme:     Theme
  c:         ColorTokens
  toggle:    () => void
  setTheme:  (t: Theme) => void
  loadTheme: () => Promise<void>
}

const THEME_KEY = 'sahifalab_theme'

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  c:     colors.dark,

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY) as Theme | null
      const theme = saved ?? 'dark'
      set({ theme, c: colors[theme] })
    } catch {}
  },

  setTheme: async (theme) => {
    await AsyncStorage.setItem(THEME_KEY, theme).catch(() => {})
    set({ theme, c: colors[theme] })
  },

  toggle: () => {
    set((s) => {
      const theme: Theme = s.theme === 'dark' ? 'light' : 'dark'
      AsyncStorage.setItem(THEME_KEY, theme).catch(() => {})
      return { theme, c: colors[theme] }
    })
  },
}))
