import { create } from 'zustand'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, type ColorTokens } from '../lib/constants'
import { THEMES, THEME_IDS, themeFills, type ThemeId } from '../src/design/themes'

type Theme = 'dark' | 'light'
/** What the user picked in Settings: Qorongʻi / Yorugʻ / Tizim. */
export type ThemePreference = Theme | 'system'

interface ThemeState {
  /** The applied scheme: the active theme's own mode, else resolved from the preference. */
  theme:      Theme
  preference: ThemePreference
  /** The app theme (Mavzu); Standart follows the preference. */
  themeId:    ThemeId
  c:          ColorTokens
  toggle:     () => void
  setTheme:   (t: Theme) => void
  setPreference: (p: ThemePreference) => void
  setThemeId: (id: ThemeId) => void
  loadTheme:  () => Promise<void>
}

const THEME_KEY = 'sahifalab_theme'          // last applied scheme (pre-Phase 1 key)
const PREF_KEY  = 'sahifalab_theme_pref'     // dark | light | system
const ID_KEY    = 'sahifalab_theme_id'       // standart | tun | zumrad | …

const systemScheme = (): Theme => (Appearance.getColorScheme() === 'light' ? 'light' : 'dark')

/** A non-Standart theme is fixed light or dark and ignores the setting. */
function resolve(p: ThemePreference, id: ThemeId): Theme {
  return THEMES[id].mode ?? (p === 'system' ? systemScheme() : p)
}

/**
 * Older screens' tokens (`c.*`, lib/constants) under a non-Standart theme:
 * surfaces, text, borders and the accent follow the theme; everything else
 * (semantic colours) stays the mode's own.
 */
function legacyColors(theme: Theme, id: ThemeId): ColorTokens {
  const t = THEMES[id].colors
  if (!t) return colors[theme]
  const [light, deep] = themeFills(id).accentFill
  return {
    ...colors[theme],
    bgPrimary: t.bg, bgSecondary: t.surface, bgTertiary: t.surfaceRaised, bgElevated: t.surfaceRaised,
    bgInput: t.surfaceRaised, bgHover: t.border,
    textPrimary: t.text, textSecondary: t.textMuted, textInverse: t.onAccent,
    accentPrimary: t.accent, accentPrimaryHover: deep, accentPrimaryMuted: t.accentSoft, accentPrimaryLight: light,
    brand: t.accent, brandDark: deep, brandSubtle: t.accentSoft,
    border: t.border, borderStrong: t.border, borderSubtle: t.surfaceRaised, borderFocus: t.accent,
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // "Tizim" used to snapshot the OS scheme once; now the app follows it
  // while that preference is selected (and Standart is the theme).
  Appearance.addChangeListener(() => {
    if (get().preference !== 'system' || get().themeId !== 'standart') return
    const theme = systemScheme()
    if (theme !== get().theme) set({ theme, c: legacyColors(theme, 'standart') })
  })

  function apply(preference: ThemePreference, themeId: ThemeId) {
    const theme = resolve(preference, themeId)
    set({ preference, themeId, theme, c: legacyColors(theme, themeId) })
    AsyncStorage.multiSet([[PREF_KEY, preference], [THEME_KEY, theme], [ID_KEY, themeId]]).catch(() => {})
  }

  return {
    theme:      'dark',
    preference: 'dark',
    themeId:    'standart',
    c:          colors.dark,

    loadTheme: async () => {
      try {
        const [pref, legacy, id] = await Promise.all([
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ID_KEY),
        ])
        const preference = (pref ?? legacy ?? 'dark') as ThemePreference
        const themeId = THEME_IDS.includes(id as ThemeId) ? (id as ThemeId) : 'standart'
        const theme = resolve(preference, themeId)
        set({ preference, themeId, theme, c: legacyColors(theme, themeId) })
      } catch {}
    },

    setPreference: p => apply(p, get().themeId),
    setTheme: (theme) => apply(theme, get().themeId),
    setThemeId: id => apply(get().preference, id),
    toggle: () => apply(get().theme === 'dark' ? 'light' : 'dark', get().themeId),
  }
})
