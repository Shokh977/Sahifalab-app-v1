/**
 * ThemeProvider + useTheme() for the redesigned UI (src/components/ui).
 *
 * The active scheme comes from stores/themeStore.ts, which follows the
 * user's setting (Qorongʻi / Yorugʻ / Tizim) and, for Tizim, system
 * changes. A provider may pin a scheme instead (`scheme="light"`) — the dev
 * gallery uses that to render both themes side by side.
 *
 * Older screens still use hooks/useTheme.ts (`c.*`); both read the same
 * store, so they always agree.
 */
import React, { createContext, useContext, useMemo } from 'react'
import { useThemeStore } from '../../stores/themeStore'
import { accentFill, badgeColors, deckColors, palette, progressFill, tintOf, type Scheme, type TintName } from './tokens'
import { tabular, type } from './typography'
import { accentShadow, iconSize, iconStroke, layout, radius, shadow, space } from './spacing'
import { durations, easing, press, springs, stagger } from './motion'

const SchemeContext = createContext<Scheme | null>(null)

export function ThemeProvider({ scheme, children }: { scheme?: Scheme; children: React.ReactNode }) {
  const storeScheme = useThemeStore(s => s.theme)
  return <SchemeContext.Provider value={scheme ?? storeScheme}>{children}</SchemeContext.Provider>
}

export function useTheme() {
  const pinned = useContext(SchemeContext)
  const storeScheme = useThemeStore(s => s.theme)
  const scheme: Scheme = pinned ?? storeScheme
  return useMemo(() => ({
    scheme,
    colors: palette[scheme],
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
    accentFill,
    progressFill,
    /** A hue's ink / soft background / line for icon tiles and badges. */
    tint: (name: TintName) => tintOf(palette[scheme], name, scheme),
    motion: { springs, easing, durations, press, stagger },
  }), [scheme])
}

export type Theme = ReturnType<typeof useTheme>
