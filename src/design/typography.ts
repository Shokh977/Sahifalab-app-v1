/**
 * Type scale (redesign spec section 4), set in Onest. React Native picks a
 * custom font's weight by family name, so each token names its weight file.
 */
import type { TextStyle } from 'react-native'

export const fonts = {
  regular:   'Onest-Regular',
  medium:    'Onest-Medium',
  semibold:  'Onest-SemiBold',
  bold:      'Onest-Bold',
  extrabold: 'Onest-ExtraBold',
} as const

type TypeToken = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'>

export const type = {
  display:  { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44 },
  title1:   { fontFamily: fonts.bold,      fontSize: 28, lineHeight: 34 },
  title2:   { fontFamily: fonts.bold,      fontSize: 20, lineHeight: 26 },
  headline: { fontFamily: fonts.semibold,  fontSize: 17, lineHeight: 22 },
  body:     { fontFamily: fonts.regular,   fontSize: 15, lineHeight: 22 },
  callout:  { fontFamily: fonts.medium,    fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bold,      fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  /** Tab bar labels and other tiny non-uppercase text. */
  caption:  { fontFamily: fonts.semibold,  fontSize: 11, lineHeight: 14 },
} as const satisfies Record<string, TypeToken>

export type TypeTokenName = keyof typeof type

/** Every number that changes (timer, XP, scores, ranks, counts). */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] }
