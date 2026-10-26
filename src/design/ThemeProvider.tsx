/**
 * ThemeProvider + useTheme() for the redesigned UI (src/components/ui).
 *
 * The active scheme comes from stores/themeStore.ts, which follows the
 * user's setting (Qorongʻi / Yorugʻ / Tizim) and, for Tizim, system
 * changes. The active app theme (Standart, Tun, …; src/design/themes.ts)
 * comes from the same store; a non-Standart theme has its own fixed mode.
 * A provider may pin a scheme (`scheme="light"`, the dev gallery) or a
 * theme (`themeId="tun"`, theme previews and a public profile rendered in
 * its owner's theme).
 *
 * Older screens still use hooks/useTheme.ts (`c.*`); both read the same
 * store, so they always agree on light / dark.
 */
import React, { createContext, useContext, useMemo } from 'react'
import { useThemeStore } from '../../stores/themeStore'
import { badgeColors, deckColors, tintOf, type Scheme, type TintName } from './tokens'
import { themeFills, themePalette, themePlanNext, themeScheme, themeTreeTile, type ThemeId } from './themes'
import { tabular, type } from './typography'
import { accentShadow, iconSize, iconStroke, layout, radius, shadow, space } from './spacing'
import { durations, easing, press, springs, stagger } from './motion'

const SchemeContext = createContext<Scheme | null>(null)
const ThemeIdContext = createContext<ThemeId | null>(null)

export function ThemeProvider({ scheme, themeId, children }: { scheme?: Scheme; themeId?: ThemeId; children: React.ReactNode }) {
  const storeScheme = useThemeStore(s => s.theme)
  const outerScheme = useContext(SchemeContext)
  const outerId = useContext(ThemeIdContext)
  return (
    <SchemeContext.Provider value={scheme ?? outerScheme ?? storeScheme}>
      <ThemeIdContext.Provider value={themeId ?? outerId}>{children}</ThemeIdContext.Provider>
    </SchemeContext.Provider>
  )
}

export function useTheme() {
  const pinned = useContext(SchemeContext)
  const pinnedId = useContext(ThemeIdContext)
  const storeScheme = useThemeStore(s => s.theme)
  const storeId = useThemeStore(s => s.themeId)
  const themeId: ThemeId = pinnedId ?? storeId
  const userScheme: Scheme = pinned ?? storeScheme
  return useMemo(() => {
    const scheme = themeScheme(themeId, userScheme)
    const colors = themePalette(themeId, userScheme)
    const fills = themeFills(themeId)
    return {
      themeId,
      scheme,
      colors,
      badgeColors: badgeColors[scheme],
      deckColors,
      type,
      tabular,
      space,
      layout,
      radius,
      iconSize,
      iconStroke,
      // Depth: a lighter surface in dark mode, the soft card shadow in light mode.
      elevation: scheme === 'light' ? shadow : null,
      /** Under accent fills (buttons, the "next" tile): light mode only. */
      accentShadow: scheme === 'light' ? accentShadow : null,
      accentFill: fills.accentFill,
      accentFillDeep: fills.accentFillDeep,
      progressFill: fills.progressFill,
      /** The "next" Bugungi reja tile. */
      planNext: themePlanNext(themeId, userScheme),
      /** The Bugun tree tile gradient (null: none). */
      treeTile: themeTreeTile(themeId, userScheme),
      /** A hue's ink / soft background / line for icon tiles and badges. */
      tint: (name: TintName) => tintOf(colors, name, scheme),
      motion: { springs, easing, durations, press, stagger },
    }
  }, [themeId, userScheme])
}

export type Theme = ReturnType<typeof useTheme>
