/**
 * Space, radius and depth (redesign spec section 4).
 */
import { Platform, type ViewStyle } from 'react-native'

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

/** Light mode gets one shadow level; dark mode uses a lighter surface. */
export const shadow: ViewStyle = Platform.select({
  android: { elevation: 2 },
  default: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
}) as ViewStyle

export const iconSize = { sm: 20, md: 24 } as const
export const iconStroke = 1.8

/** Control heights: Button sm 40 / md 48 / lg 54 (spec section 6). */
export const controlHeight = { sm: 40, md: 48, lg: 54 } as const

/** Avatar diameters used by the kit. */
export const avatarSize = { sm: 32, md: 40, lg: 56, xl: 80 } as const

/** Leading tile in ListRow (icon tile / thumbnail). */
export const tileSize = 40

/** ProgressBar / ProgressRing stroke. */
export const progressThickness = { thin: 4, thick: 8 } as const

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
