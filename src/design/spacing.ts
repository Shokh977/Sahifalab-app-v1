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
