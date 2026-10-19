/**
 * Colour tokens (redesign spec section 4). The only place colour values
 * live; screens and components read them through useTheme().colors.
 *
 * Four light-theme text colours are darker than the spec's values: the spec
 * values failed WCAG AA (4.5:1) on light surfaces, and the AA-fixed shades
 * keep the same hue (Phase 1 decision). The spec values are kept in
 * comments; __tests__/contrast.test.ts guards every text/background pair.
 *
 * Phase 7.5 B (v2 mockups, docs/design/v2 renderVals): the light surfaces,
 * the brighter accent with WHITE text on a gradient fill (accentFill) — white
 * is only ever 18 px extra bold or a 24 px+ number there (the large-text
 * bar) — the soft tints (green/blue/violet/gold/teal/pink: ink for icons
 * and chips, soft for tile backgrounds) and the track colour.
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
    track: '#2B2B32',          // progress tracks
    accent: '#EE5A12',         // solid brand orange: rings, dots, icons; fills use accentFill
    onAccent: '#FFFFFF',       // on accent fills: 18 px extra bold or bigger only
    accentText: '#FF8A4C',     // orange used as text on bg
    accentSoft: 'rgba(238,90,18,0.16)',
    orangeLine: 'rgba(238,90,18,0.45)', // border of accentSoft highlights ("Siz")
    green: '#3DC47A',
    greenSoft: 'rgba(61,196,122,0.14)',
    blue: '#6FB2F0',
    blueSoft: 'rgba(76,158,235,0.16)',
    violet: '#B49CF2',
    violetSoft: 'rgba(150,120,235,0.18)',
    gold: '#F2C14E',
    goldSoft: 'rgba(242,193,78,0.16)',
    goldChip: 'rgba(242,193,78,0.18)',  // top-3 result chip (Bellashuv) …
    goldChipText: '#F2C14E',            // … and its text
    teal: '#4FD1C5',
    pink: '#F28AB0',
    success: '#3DBE6B',
    successText: '#5CCB84',
    danger: '#E5484D',
    dangerText: '#F07175',
    freeze: '#4C9EEB',         // streak freeze only
    coin: '#F2C14E',           // coin icon and coin amounts only
    medalGold: '#E9B949',      // ranks 1–3 in rankings only
    medalSilver: '#B9BEC7',
    medalBronze: '#D99260',
    scrim: 'rgba(0,0,0,0.5)',
  },
  light: {
    bg: '#F7F3EC',
    surface: '#FFFFFF',
    surfaceRaised: '#F4EFE6',
    border: '#ECE5D8',
    tabBar: '#FFFFFF',
    text: '#1C2530',
    textMuted: '#5B6573',
    textFaint: '#9AA1AA',
    track: '#EEE7DB',
    accent: '#EE5A12',
    onAccent: '#FFFFFF',
    accentText: '#B53B0A',     // 4.63 on accentSoft over surfaceRaised (Phase 8; was #C2410C)
    accentSoft: 'rgba(238,90,18,0.09)',
    orangeLine: 'rgba(238,90,18,0.35)',
    green: '#1F9D55',          // ink for icons; text uses successText (AA)
    greenSoft: 'rgba(31,157,85,0.10)',
    blue: '#2F7DD3',           // ink for icons; text uses freeze/text (AA)
    blueSoft: 'rgba(47,125,211,0.10)',
    violet: '#7A55D6',
    violetSoft: 'rgba(122,85,214,0.10)',
    gold: '#B7800A',           // ink for icons; text uses goldChipText (AA)
    goldSoft: '#FFF3D1',
    goldChip: '#FFF3D1',
    goldChipText: '#8A5A00',
    teal: '#138A80',
    pink: '#C23B6E',
    success: '#1F8F4A',
    successText: '#18733B',    // 4.66 on greenSoft over surfaceRaised (Phase 8; spec #1F8F4A: 3.57)
    danger: '#C62F35',
    dangerText: '#C62F35',
    freeze: '#256FB7',         // spec #2775C2: 4.12 on surfaceRaised
    coin: '#8C6612',           // spec #C9921A: 2.39 on surfaceRaised
    medalGold: '#866210',
    medalSilver: '#5C6470',
    medalBronze: '#995222',
    scrim: 'rgba(0,0,0,0.4)',
  },
} as const

/** Accent surfaces (buttons, the "next" tile): a top → bottom gradient. */
export const accentFill = ['#F7782C', '#E2560E'] as const
/** A deeper accent surface for small white text (the KEYINGI plan tile):
 *  white is at least 4.5:1 over both stops (Phase 8). */
export const accentFillDeep = ['#D04A0A', '#B53B0A'] as const
/** Progress fills: left → right. */
export const progressFill = ['#FFB45E', '#EE5A12'] as const

export type TintName = 'green' | 'blue' | 'violet' | 'gold' | 'orange' | 'teal' | 'pink'

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

/**
 * Initials avatars (Phase 7.5 A5): white initials on one of these, picked by
 * a hash of the user id (avatarColor). Same in both themes; each is at least
 * 4.5:1 against white (contrast.test.ts).
 */
export const avatarColors = [
  '#C2410C', // orange
  '#B91C1C', // red
  '#BE185D', // pink
  '#7E22CE', // violet
  '#4338CA', // indigo
  '#1D4ED8', // blue
  '#0F766E', // teal
  '#15803D', // green
] as const
export const onAvatar = '#FFFFFF'

/**
 * Text and icons laid over photos (cover headers) sit on imageScrim — a
 * bottom-up dark gradient — so white stays readable on any image.
 * Same in both themes: the photo, not the theme, sets the background.
 */
export const onImage = '#FFFFFF'
export const imageScrim = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)'] as const
/** Small chip behind controls over a photo (back button). */
export const imageChip = 'rgba(0,0,0,0.38)'

/** Behind a screen that shrinks under an iOS-style sheet (both themes). */
export const behindSheet = '#000000'

/** Opacity for states that dim rather than recolour. */
export const stateOpacity = { disabled: 0.4, done: 0.55 } as const

/** Text tokens the contrast test checks; textFaint is decoration-only. */
export const textTokens = [
  'text', 'textMuted', 'accentText', 'successText', 'dangerText', 'freeze', 'coin',
  'medalGold', 'medalSilver', 'medalBronze', 'goldChipText',
] as const

/** Medal colours for the podium (Phase 7.5): rings, rank coins and blocks. */
export const medal = {
  ring: { 1: '#F2C14E', 2: '#C9CDD3', 3: '#D08A54' },
  coinText: { 1: '#5A3B00', 2: '#3A3F47', 3: '#FFFFFF' },
  block: {
    dark: {
      1: ['rgba(242,193,78,0.35)', 'rgba(242,193,78,0.08)'],
      2: ['rgba(201,205,211,0.28)', 'rgba(201,205,211,0.06)'],
      3: ['rgba(208,138,84,0.32)', 'rgba(208,138,84,0.06)'],
    },
    light: {
      1: ['#FCE7B0', '#FFF6DE'],
      2: ['#E6E9EE', '#F6F7F9'],
      3: ['#F2D3BC', '#FBF0E7'],
    },
  },
} as const

/**
 * WeekDayIcon (Phase 7.5 B5): the v3 3D streak tiles, colours copied from
 * docs/design/v2/week-icons.dc.html. Same in both themes except the
 * missed tile, which takes the surface's greys.
 */
export const weekIcon = {
  flame: {
    face: ['#FFB547', '#F7711E', '#E2500C'],   // stops 0, .55, 1
    depth: ['#C7440A', '#9E3306'],
    flame: ['#FFFFFF', '#FFE7C7'],
    core: ['#FFD54A', '#FF9A1F'],
    gloss: '#FFFFFF',
  },
  ice: {
    top: ['#F4FBFF', '#C6E9FF'],
    left: ['#8FD2FF', '#3A8EE6'],
    right: ['#B8E3FF', '#5DAEF2'],
    edge: '#FFFFFF',
    snow: '#5AA9EE',
    shard1: '#8FD2FF',
    shard2: '#A9DBFF',
  },
  missed: {
    light: { face: ['#EFEBE4', '#DAD4CA'], depth: ['#C9C2B6', '#B5AD9F'], ash: '#B9B1A4', ash2: '#A39B8D', smoke: '#9E978B' },
    dark: { face: ['#34343C', '#26262C'], depth: ['#18181C', '#101013'], ash: '#4A4A52', ash2: '#5A5A63', smoke: '#7A7882' },
  },
  today: '#EE5A12',
} as const

/** The gold coin (header pill): gradient face, ring and mark — v2 board. */
export const coinIcon = { face: ['#FFD66B', '#E9A21A'], ring: '#B9770E', mark: '#8A5A08' } as const

/** Bugun hero: the streak flame (gradient, gold core) and the tree tile's glow. */
export const streakFlame = { body: ['#FFB45E', '#EE5A12'], core: '#FFD66B' } as const
export const treeGlow = {
  light: ['#E3F5EA', '#F4FBF6'],
  dark: ['rgba(77,191,126,0.22)', 'rgba(77,191,126,0.04)'],
} as const

/**
 * Profil level card (Phase 7.5 D2): a diagonal orange gradient, light in
 * the top-right (under the decorative rings) and dark bottom-left (under
 * the text) — white text on it is 3.1:1 or better. The hexagon emblem's
 * number is `emblemText` on white.
 */
export const levelCard = {
  fill: ['#FF9A4A', '#F26A1F', '#C9430A'],
  track: 'rgba(255,255,255,0.28)',
  ringOpacity: 0.18,
  emblemFill: 'rgba(255,255,255,0.18)',
  emblemText: '#D2530E',
} as const

/** Trophy (RivalLadder footer): gradient cup and handles. */
export const trophy = { cup: ['#FFD66B', '#E9A21A'], handle: '#E9A21A' } as const

/** The live dot on a running competition (CompetitionHero). */
export const liveDot = '#4ADE80'
/** Competition cover band: dark scrim over the blurred cover, 15 % → 72 %. */
export const coverScrim = ['rgba(10,8,6,0.15)', 'rgba(10,8,6,0.72)'] as const
export const coverBandFallback = '#1B1410'
/** White chip and border over a photo. */
export const onImageChip = 'rgba(255,255,255,0.18)'
export const onImageBorder = 'rgba(255,255,255,0.85)'
/** Icon tile on an accent fill (the "next" plan tile). */
export const onAccentTile = 'rgba(255,255,255,0.2)'

/**
 * Badge tile tints (Profil): soft background and line from the hue's ink,
 * the mockup's rule — ink + hex alpha (dark 0x22 / 0x40, light 0x14 / 0x30).
 */
export function tintOf(p: { [K in TintName]?: string } & { accentText: string; accentSoft: string }, name: TintName, scheme: Scheme) {
  const ink = name === 'orange' ? p.accentText : (p as Record<string, string>)[name]
  return {
    ink,
    soft: ink + (scheme === 'dark' ? '22' : '14'),
    line: ink + (scheme === 'dark' ? '40' : '30'),
  }
}
export const backgroundTokens = ['bg', 'surface', 'surfaceRaised', 'tabBar'] as const
