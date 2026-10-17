import { create } from 'zustand'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, type ColorTokens } from '../lib/constants'

type Theme = 'dark' | 'light'
/** What the user picked in Settings: Qorongʻi / Yorugʻ / Tizim. */
export type ThemePreference = Theme | 'system'

interface ThemeState {
  /** The applied scheme (resolved from the preference). */
  theme:      Theme
  preference: ThemePreference
  c:          ColorTokens
  toggle:     () => void
  setTheme:   (t: Theme) => void
  setPreference: (p: ThemePreference) => void
  loadTheme:  () => Promise<void>
}

const THEME_KEY = 'sahifalab_theme'          // last applied scheme (pre-Phase 1 key)
const PREF_KEY  = 'sahifalab_theme_pref'     // dark | light | system

const systemScheme = (): Theme => (Appearance.getColorScheme() === 'light' ? 'light' : 'dark')

function resolve(p: ThemePreference): Theme {
  return p === 'system' ? systemScheme() : p
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // "Tizim" used to snapshot the OS scheme once; now the app follows it
  // while that preference is selected.
  Appearance.addChangeListener(() => {
    if (get().preference !== 'system') return
    const theme = systemScheme()
    if (theme !== get().theme) set({ theme, c: colors[theme] })
  })

  function apply(preference: ThemePreference) {
    const theme = resolve(preference)
    set({ preference, theme, c: colors[theme] })
    AsyncStorage.multiSet([[PREF_KEY, preference], [THEME_KEY, theme]]).catch(() => {})
  }

  return {
    theme:      'dark',
    preference: 'dark',
    c:          colors.dark,

    loadTheme: async () => {
      try {
        const [pref, legacy] = await Promise.all([
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(THEME_KEY),
        ])
        const preference = (pref ?? legacy ?? 'dark') as ThemePreference
        const theme = resolve(preference)
        set({ preference, theme, c: colors[theme] })
      } catch {}
    },

    setPreference: apply,
    setTheme: (theme) => apply(theme),
    toggle: () => apply(get().theme === 'dark' ? 'light' : 'dark'),
  }
})
