/* ============================================================
   Sahifalab — shared premium-screen design tokens
   One layout per screen, one component tree — only these tokens
   swap between light and dark. Currently used by Reyting
   (leaderboard) and Kurslar (courses); a future theme (e.g.
   Ramadan) or screen is added here, never in layout components.
   ============================================================ */

export type PremiumThemeKey = 'light' | 'dark'

export interface PremiumTheme {
  bg:             string
  surface:        string
  surfaceSubtle:  string
  hairline:       string
  textPrimary:    string
  textSecondary:  string
  textTertiary:   string
  accent:         string
  accentInk:      string
  accentText:     string
  accentSoft:     string
  gold:           [string, string]   // linear gradient stops
  goldAngle:      number             // degrees
  silver:         string
  bronze:         string
  rowHover:       string
  // A recurring "dark panel" surface (Reyting's podium, Kurslar's hero
  // card) — always the same dark card regardless of theme; only its
  // depth treatment (light: shadow, dark: hairline border + glow) swaps.
  darkPanelBg:    string
  darkPanelGlow:  string             // radial accent glow color inside the panel
  segmentActiveBg:     string
  segmentActiveBorder: string
  segmentActiveLabel:  string
  selfBarBg:      string
  selfBarBorder:  string
  selfBarName:    string
  selfBarXP:      string

  // ── Kurslar (courses) additions ──────────────────────────────────────
  card:           string
  cardBorder:     string
  cardShadow:     { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number } | null
  field:          string
  eyebrow:        string
  categoryEyebrow: string
  free:           string
  thumbPlaceholder: [string, string]
  navBar:         string
}

const gold: [string, string] = ['#F9C97A', '#D97C06']

export const premiumThemes: Record<PremiumThemeKey, PremiumTheme> = {
  light: {
    bg:            '#FFFCF7',
    surface:       '#FFFFFF',
    surfaceSubtle: '#F3EDE4',
    hairline:      'rgba(28,25,23,.08)',
    textPrimary:   '#1C1917',
    textSecondary: '#8A8177',
    textTertiary:  '#B4ACA2',
    accent:        '#E8900B',
    accentInk:     '#1A1207',
    accentText:    '#C2700A',
    accentSoft:    'rgba(232,144,11,.11)',
    gold,
    goldAngle:     150,
    silver:        '#C9C2B9',
    bronze:        '#C08552',
    rowHover:      '#F8F2E8',
    // Deliberate asymmetry: in light mode the dark panel (podium / hero
    // card) stays a dark inset against the light page — a shadow gives it
    // depth.
    darkPanelBg:   '#1A1714',
    darkPanelGlow: 'rgba(232,144,11,.30)',
    segmentActiveBg:     '#1C1917',
    segmentActiveBorder: 'transparent',
    segmentActiveLabel:  '#FBBF5C',
    selfBarBg:     '#1C1917',
    selfBarBorder: 'transparent',
    selfBarName:   '#FFFFFF',
    selfBarXP:     '#FBBF5C',

    card:           '#FFFFFF',
    cardBorder:     'rgba(28,25,23,.07)',
    cardShadow:     { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
    field:          '#F5EFE6',
    eyebrow:        '#A29A90',
    categoryEyebrow: '#C2700A',
    free:           '#1F8A4C',
    thumbPlaceholder: ['#F3EDE4', '#E8DFD1'],
    navBar:         '#FFFDF9',
  },
  dark: {
    bg:            '#0E0C0A',
    surface:       '#1A1714',
    surfaceSubtle: 'rgba(255,255,255,.05)',
    hairline:      'rgba(255,255,255,.07)',
    textPrimary:   '#F7F3EC',
    textSecondary: '#8E857C',
    textTertiary:  '#5F574F',
    accent:        '#E8900B',
    accentInk:     '#1A1207',
    accentText:    '#F7BC63',
    accentSoft:    'rgba(232,144,11,.10)',
    gold,
    goldAngle:     150,
    silver:        '#C9C2B9',
    bronze:        '#C08552',
    rowHover:      'rgba(255,255,255,.05)',
    // Same panel as light mode, but since the page is already dark, a
    // hairline border + warm radial reads as depth instead of a shadow.
    darkPanelBg:   '#1A1714',
    darkPanelGlow: 'rgba(232,144,11,.26)',
    segmentActiveBg:     'rgba(232,144,11,.16)',
    segmentActiveBorder: 'rgba(232,144,11,.4)',
    segmentActiveLabel:  '#F7BC63',
    selfBarBg:     'rgba(232,144,11,.18)',
    selfBarBorder: 'rgba(232,144,11,.32)',
    selfBarName:   '#F7F3EC',
    selfBarXP:     '#F9C97A',

    card:           '#1A1714',
    cardBorder:     'rgba(255,255,255,.07)',
    cardShadow:     null,   // border only — see cardBorder
    field:          'rgba(255,255,255,.05)',
    eyebrow:        '#6E655C',
    categoryEyebrow: '#B98A3C',
    free:           '#7ED39C',
    thumbPlaceholder: ['#282219', '#191510'],
    navBar:         '#141110',
  },
}

export function getPremiumTheme(key: PremiumThemeKey): PremiumTheme {
  return premiumThemes[key]
}
