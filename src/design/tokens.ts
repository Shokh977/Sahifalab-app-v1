/**
 * Colour tokens (redesign spec section 4). The only place colour values
 * live; screens and components read them through useTheme().colors.
 *
 * Four light-theme text colours are darker than the spec's values: the spec
 * values failed WCAG AA (4.5:1) on light surfaces, and the AA-fixed shades
 * keep the same hue (Phase 1 decision). The spec values are kept in
 * comments; __tests__/contrast.test.ts guards every text/background pair.
 */
export const palette = {
  dark: {
    bg: '#0D0D0F',
    surface: '#17171B',
    surfaceRaised: '#202026',
    border: '#2B2B32',
    tabBar: '#121215',
    text: '#F4F2EE',
    textMuted: '#A3A1A8',
    textFaint: '#6E6C74',      // disabled and decoration only, never body text
    accent: '#E8722D',         // brand orange: primary buttons, active tab, progress
    onAccent: '#1A0F08',       // text and icons ON accent fills (white fails contrast)
    accentText: '#F08A4B',     // orange used as text on bg
    accentSoft: 'rgba(232,114,45,0.14)',
    success: '#3DBE6B',
    successText: '#5CCB84',
    danger: '#E5484D',
    dangerText: '#F07175',
    freeze: '#4C9EEB',         // streak freeze only
    coin: '#F2C14E',           // coin icon and coin amounts only
    scrim: 'rgba(0,0,0,0.5)',
  },
  light: {
    bg: '#FAF7F1',
    surface: '#FFFFFF',
    surfaceRaised: '#F3EEE5',
    border: '#E6DFD2',
    tabBar: '#FFFFFF',
    text: '#1C2530',
    textMuted: '#5B6573',
    textFaint: '#8A919B',
    accent: '#E8722D',
    onAccent: '#1A0F08',
    accentText: '#B05119',     // spec #B4531A: 4.33 on surfaceRaised
    accentSoft: 'rgba(232,114,45,0.12)',
    success: '#1F8F4A',
    successText: '#1B7C40',    // spec #1F8F4A: 3.57 on surfaceRaised
    danger: '#C62F35',
    dangerText: '#C62F35',
    freeze: '#256FB7',         // spec #2775C2: 4.12 on surfaceRaised
    coin: '#8C6612',           // spec #C9921A: 2.39 on surfaceRaised
    scrim: 'rgba(0,0,0,0.4)',
  },
} as const

export type Scheme = keyof typeof palette
export type ColorToken = keyof typeof palette.dark
export type Palette = { readonly [K in ColorToken]: string }

/**
 * Category badges: one 8-colour set at low saturation, used only as small
 * badge backgrounds (text on them stays `text`). Replaces the saturated
 * per-screen colours (purple headers, the blue "Sotib olish", #F5A623).
 */
export const badgeColors: Record<Scheme, readonly string[]> = {
  dark: [
    'rgba(232,114,45,0.18)',  // orange
    'rgba(229,72,77,0.18)',   // red
    'rgba(214,96,154,0.18)',  // pink
    'rgba(139,108,224,0.18)', // violet
    'rgba(76,158,235,0.18)',  // blue
    'rgba(47,181,166,0.18)',  // teal
    'rgba(61,190,107,0.18)',  // green
    'rgba(224,169,59,0.18)',  // amber
  ],
  light: [
    '#FBE6D9', '#F8DEDF', '#F6E0EB', '#E9E3F8', '#DFEBF8', '#DAF1EE', '#DDF2E4', '#F7EDD8',
  ],
}

/**
 * Deck identity colours (the new-deck picker). Eight clearly different hues;
 * the old picker offered two near-identical oranges and two greens.
 */
export const deckColors = [
  '#E8722D', // orange
  '#E5484D', // red
  '#D6609A', // pink
  '#8B6CE0', // violet
  '#4C9EEB', // blue
  '#2FB5A6', // teal
  '#3DBE6B', // green
  '#E0A93B', // amber
] as const

/** Opacity for states that dim rather than recolour. */
export const stateOpacity = { disabled: 0.4, done: 0.55 } as const

/** Text tokens the contrast test checks; textFaint is decoration-only. */
export const textTokens = ['text', 'textMuted', 'accentText', 'successText', 'dangerText', 'freeze', 'coin'] as const
export const backgroundTokens = ['bg', 'surface', 'surfaceRaised', 'tabBar'] as const
