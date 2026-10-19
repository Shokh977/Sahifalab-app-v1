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
  /** Bugun's header name (Phase 7.5 C1). */
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  /** The streak number on Bugun's hero. */
  streak:   { fontFamily: fonts.extrabold, fontSize: 48, lineHeight: 50, letterSpacing: -1.5 },
  /** Block labels ("Bugungi fokus") and links in cards. */
  label:    { fontFamily: fonts.semibold,  fontSize: 14, lineHeight: 18 },
  /** Profil: the name, and the level card's title / label / sub / numbers. */
  profileName: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  levelTitle: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  levelLabel: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' },
  levelSub: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  levelNumbers: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  /** Stat tile values (Profil, Bellashuv hero). */
  statValue: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28 },
  /** Coin amount in the header pill. */
  coin:     { fontFamily: fonts.bold,      fontSize: 15, lineHeight: 20 },
  /** White on the orange accent fill: the large-text minimum (Phase 7.5 B1). */
  onAccent: { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 22 },
  /** The level number on an avatar (Phase 7.5 C1: white on accent). */
  levelBadge: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 14 },
  /** Section titles (B4): sentence case, 20 px extra bold. */
  section:  { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** Text links beside a section title ("Hammasi"). */
  link:     { fontFamily: fonts.bold,      fontSize: 14, lineHeight: 18 },
  /** A title over a cover photo (CompetitionHero). */
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 21, lineHeight: 25, letterSpacing: -0.3 },
  /** Ranking rows: name and XP (RivalLadder, Podium). */
  rowTitle: { fontFamily: fonts.bold,      fontSize: 15, lineHeight: 20 },
  /** Small secondary lines ("#22", "Lv.9 · 33,8 soat"). */
  small:    { fontFamily: fonts.regular,   fontSize: 12, lineHeight: 16 },
  /** Tile and row titles (PlanTile, RivalLadder). */
  tileTitle: { fontFamily: fonts.bold,     fontSize: 16, lineHeight: 20 },
  /** Big tile numbers ("48 ta", "180 daq"). */
  tileValue: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 32, letterSpacing: -0.6 },
} as const satisfies Record<string, TypeToken>

export type TypeTokenName = keyof typeof type

/** Every number that changes (timer, XP, scores, ranks, counts). */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] }

/** Avatar initials: round(diameter × 0.38), extra bold (Phase 7.5 A5). */
export function initialsFont(diameter: number): TextStyle {
  const size = Math.round(diameter * 0.38)
  return { fontFamily: fonts.extrabold, fontSize: size, lineHeight: Math.round(size * 1.2) }
}
