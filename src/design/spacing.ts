/**
 * Space, radius and depth (redesign spec section 4).
 */
import type { ViewStyle } from 'react-native'

/** 4, 8, 12, 16, 20, 24, 32, 40, 56 */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const

export const layout = {
  gutter: 20,        // screen side padding
  cardGap: 12,       // between cards
  sectionGap: 24,    // between sections (24–32)
  sectionGapLarge: 32,
  minTouch: 48,      // touch targets at least 48×48
} as const

export const radius = {
  sm: 10,     // chips
  md: 14,     // buttons, inputs
  lg: 20,     // cards
  xl: 24,     // hero cards
  sheet: 28,
  full: 9999,
} as const

/**
 * Light mode: cards keep their 1 px border and add the v2 two-layer soft
 * shadow (CSS boxShadow, new architecture, iOS and Android alike). Dark
 * mode separates by surface colour and border, no shadow.
 */
export const shadow: ViewStyle = {
  boxShadow: '0px 1px 2px rgba(28,37,48,0.04), 0px 6px 18px rgba(28,37,48,0.05)',
}

/** Under the Profil level card in light mode. */
export const levelShadow: ViewStyle = { boxShadow: '0px 12px 28px rgba(226,86,14,0.30)' }

/** Under a sharp thumbnail over a photo (CompetitionHero). */
export const photoShadow: ViewStyle = { boxShadow: '0px 8px 20px rgba(0,0,0,0.35)' }

/** Under accent fills in light mode (buttons, the "next" tile). */
export const accentShadow: ViewStyle = {
  boxShadow: '0px 8px 20px rgba(226,86,14,0.28)',
}

export const iconSize = { sm: 20, md: 24 } as const
export const iconStroke = 1.8

/** Control heights: Button sm 40 / md 48 / lg 54 (spec section 6). */
export const controlHeight = { sm: 40, md: 48, lg: 54 } as const

/** Avatar diameters used by the kit. */
export const avatarSize = { sm: 32, row: 36, md: 40, header: 44, lg: 56, podium: 68, xl: 80 } as const

/** Leading tile in ListRow (icon tile / thumbnail). */
export const tileSize = 40

/** ProgressBar / ProgressRing stroke. */
export const progressThickness = { thin: 4, thick: 8, hero: 10 } as const

/** TextArea minimum height. */
export const textAreaMinHeight = 112

/** Leaderboard rank column: fits "#999" in one line with tabular figures. */
export const rankColumnWidth = 44

/** Bugun week strip day circle. */
export const weekDotSize = 28

/** 5 Savol answer button minimum height (spec Phase 3). */
export const answerMinHeight = 58

/** Bottom tab bar: bar height (without the safe area) and the active pill. */
export const tabBar = { height: 56, pillWidth: 56, pillHeight: 30 } as const
