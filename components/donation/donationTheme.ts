/**
 * donationTheme.ts — Qo'llab-quvvatlash card theming and fixed design
 * tokens. Deliberately single-palette (no dark-mode variant) — the screen
 * spec supplies one fixed light, warm-cream token set regardless of the
 * app's system theme, matching real payment-screen conventions elsewhere.
 *
 * Card theme is a pure function of a method's own region field — never
 * random, never per-render. `intl` (and any unrecognised region) is the
 * deliberate fallback.
 */
export type DonationRegion = 'uz' | 'kr' | 'intl' | string

export interface CardTheme {
  gradientColors: [string, string, string]
  gradientLocations: [number, number, number]
  shadowColor: string
  shadowOpacity: number
}

const THEMES: Record<'uz' | 'kr' | 'intl', CardTheme> = {
  uz: {
    gradientColors: ['#F79246', '#E8722D', '#CE581C'],
    gradientLocations: [0, 0.52, 1],
    shadowColor: 'rgba(206,88,28,1)',
    shadowOpacity: 0.28,
  },
  kr: {
    gradientColors: ['#3C5167', '#2B3B4D', '#1E2A38'],
    gradientLocations: [0, 0.6, 1],
    shadowColor: 'rgba(43,59,77,1)',
    shadowOpacity: 0.28,
  },
  intl: {
    gradientColors: ['#3A3733', '#26241F', '#191713'],
    gradientLocations: [0, 0.55, 1],
    shadowColor: 'rgba(25,23,19,1)',
    shadowOpacity: 0.34,
  },
}

export function cardThemeFor(region: DonationRegion): CardTheme {
  if (region === 'uz' || region === 'kr') return THEMES[region]
  return THEMES.intl
}

// 140deg -> expo-linear-gradient start/end unit-square points (RN has no
// native "degrees" gradient prop, so this is the equivalent vector).
export const GRADIENT_ANGLE = { start: { x: 0, y: 0 }, end: { x: 0.64, y: 1 } }

export const CARD_WIDTH = 296
export const CARD_HEIGHT = 187
export const CARD_GAP = 12
export const CARD_RADIUS = 26

export const donationColors = {
  screenBg:        '#FBF7F2',
  surface:         '#FFFFFF',
  surface2:        '#F3EDE5',
  accent:          '#E8722D',
  accentPressed:   '#CE581C',
  accentLabel:     '#B0663A',
  navy:            '#2B3B4D',
  textBody:        '#5A6774',
  textMuted:       '#7A8794',
  textFaint:       '#A79C8E',
  hairline:        'rgba(43,59,77,.09)',
  success:         '#4ABE7C',
  successTint:     '#EAF6EE',
  successText:     '#2F7A50',
  successOnNavy:   '#9FE3B8',
}
