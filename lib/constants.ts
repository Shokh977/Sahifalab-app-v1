export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? ''
export const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? ''
export const BOT_USERNAME = process.env.EXPO_PUBLIC_BOT_USERNAME ?? 'Sahifalab_hub_bot'
export const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID ?? ''
export const WEB_URL = 'https://sahifalab.uz'

// ── Design tokens ─────────────────────────────────────────────────────────────

export const colors = {
  dark: {
    // Backgrounds
    bgPrimary:    '#0D0D0F',
    bgSecondary:  '#16161A',
    bgTertiary:   '#1E1E24',
    bgElevated:   '#1E1E24',
    bgInput:      '#23232B',
    bgHover:      '#2A2A34',

    // Text
    textPrimary:   '#F0EEEB',
    textSecondary: '#9B9BA4',
    textDisabled:  '#636369',
    textInverse:   '#0D0D0F',

    // Legacy aliases (used by existing components)
    textTertiary: '#636369',
    textMuted:    '#636369',

    // Brand accent — orange
    accentPrimary:      '#F5A623',
    accentPrimaryHover: '#E6951A',
    accentPrimaryMuted: 'rgba(245,166,35,0.12)',
    accentPrimaryGlow:  'rgba(245,166,35,0.25)',
    brand:              '#F5A623',
    brandDark:          '#E6951A',
    brandSubtle:        'rgba(245,166,35,0.12)',

    // Blue — secondary accent
    accentSecondary:      '#4DA6FF',
    accentSecondaryHover: '#3D96EF',

    // Semantic
    success:      '#34C759',
    successMuted: 'rgba(52,199,89,0.12)',
    warning:      '#FFB830',
    warningMuted: 'rgba(255,184,48,0.12)',
    error:        '#FF453A',
    errorMuted:   'rgba(255,69,58,0.12)',

    // Borders
    border:       '#2A2A34',
    borderStrong: '#2A2A34',
    borderSubtle: '#1E1E24',
    borderFocus:  '#F5A623',

    overlay: 'rgba(0,0,0,0.7)',
  },
  light: {
    // Backgrounds
    bgPrimary:   '#FAFAF8',
    bgSecondary: '#FFFFFF',
    bgTertiary:  '#F2F2EE',
    bgElevated:  '#F2F2EE',
    bgInput:     '#EEEEE9',
    bgHover:     '#E8E8E3',

    // Text
    textPrimary:   '#1A1A1D',
    textSecondary: '#6B6B73',
    textDisabled:  '#9B9BA0',
    textInverse:   '#FFFFFF',

    textTertiary: '#9B9BA0',
    textMuted:    '#9B9BA0',

    // Brand accent — deeper orange for light bg contrast
    accentPrimary:      '#E8950F',
    accentPrimaryHover: '#D4870A',
    accentPrimaryMuted: 'rgba(232,149,15,0.12)',
    accentPrimaryGlow:  'rgba(232,149,15,0.20)',
    brand:              '#E8950F',
    brandDark:          '#D4870A',
    brandSubtle:        'rgba(232,149,15,0.10)',

    // Blue
    accentSecondary:      '#2B7FD4',
    accentSecondaryHover: '#1F6FBF',

    // Semantic
    success:      '#28A745',
    successMuted: 'rgba(40,167,69,0.12)',
    warning:      '#E6A517',
    warningMuted: 'rgba(230,165,23,0.12)',
    error:        '#DC3545',
    errorMuted:   'rgba(220,53,69,0.12)',

    // Borders
    border:       '#E0E0DB',
    borderStrong: '#CACAC4',
    borderSubtle: '#EAEAE5',
    borderFocus:  '#E8950F',

    overlay: 'rgba(0,0,0,0.4)',
  },
}

export type ColorTokens = typeof colors.dark

export const shadows = {
  dark: {
    card:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    elevated: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 10 },
    glow:     { shadowColor: '#F5A623', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 0 },
  },
  light: {
    card:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    elevated: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
    glow:     { shadowColor: '#E8950F', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 0 },
  },
} as const

export const typography = {
  fontFamily: {
    regular:   'PlusJakartaSans-Regular',
    medium:    'PlusJakartaSans-Medium',
    semibold:  'PlusJakartaSans-SemiBold',
    bold:      'PlusJakartaSans-Bold',
    extrabold: 'PlusJakartaSans-ExtraBold',
    mono:      'PlusJakartaSans-Regular', // fallback until JetBrains Mono is added
  },
  size: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   15,   // alias
    lg:   17,
    xl:   20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 48,
  },
  lineHeight: {
    xs:   14,
    sm:   18,
    base: 22,
    lg:   24,
    xl:   26,
    '2xl': 30,
    '3xl': 38,
    '4xl': 52,
  },
} as const

export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,

  // Named aliases
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,

  screenMargin: 20,
  cardPadding:  16,
  cardGap:      12,
} as const

export const radius = {
  sm:   8,
  md:   8,
  lg:   10,
  xl:   12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  full: 9999,

  // Semantic
  card:   12,
  cardSm: 8,
  cardLg: 16,
  cardXl: 20,
  chip:   8,
  button: 10,
  input:  10,
  modal:  16,
} as const

// Level tier border + bg colors — maps to the 29-level system
// Levels  1-6  : Bronze  (Navkar → Mirzo)
// Levels  7-12 : Silver  (Mahram → Darug'a)
// Levels 13-18 : Gold    (Parvonachi → Bek)
// Levels 19-23 : Platinum (Biy → Amir)
// Levels 24-26 : Diamond  (Sulton → Xoqon)
// Levels 27-29 : Legend   (Sohibqiron → Zulqarnayn)
export function getLevelTier(level: number) {
  if (level <= 6)  return { border: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  label: 'Bronze'   }
  if (level <= 12) return { border: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', label: 'Silver'   }
  if (level <= 18) return { border: '#FFD700', bg: 'rgba(255,215,0,0.12)',   label: 'Gold'     }
  if (level <= 23) return { border: '#E5E4E2', bg: 'rgba(229,228,226,0.12)', label: 'Platinum' }
  if (level <= 26) return { border: '#B9F2FF', bg: 'rgba(185,242,255,0.12)', label: 'Diamond'  }
  return { border: '#A18CD1', bg: 'rgba(161,140,209,0.12)', label: 'Legend' }
}

// Streak flame gradient stops by streak days
export function getStreakGradient(days: number): [string, string] {
  if (days < 7)   return ['#FF8A00', '#FF5E00']
  if (days < 30)  return ['#FF5E00', '#FF2D00']
  if (days < 100) return ['#FF2D00', '#FF0066']
  if (days < 365) return ['#FF0066', '#AA00FF']
  return ['#AA00FF', '#00C2FF']
}
