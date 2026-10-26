/**
 * App themes (Claude Design "Mavzu tizimi", 2-qadam). A theme recolours
 * the existing UI and never changes layout. Standart is today's app,
 * unchanged, and still follows the light / dark setting; every other
 * theme is fixed light or dark and overrides the 13 surface/text/accent
 * tokens on top of that mode's palette, so status, medal and content
 * colours stay the mode's own.
 *
 * Unlocks: Tun, Zumrad, Sakura with Pro; Ramazon and Navro'z free for
 * everyone in their season (the backend's cosmetics catalog, slot "theme").
 */
import {
  accentFill, accentFillDeep, palette, planNext, progressFill, treeGlow,
  type Palette, type Scheme,
} from './tokens'

export type ThemeId = 'standart' | 'tun' | 'zumrad' | 'sakura' | 'ramazon' | 'navroz'
export const THEME_IDS: ThemeId[] = ['standart', 'tun', 'zumrad', 'sakura', 'ramazon', 'navroz']

type Overrides = Pick<Palette,
  'bg' | 'surface' | 'surfaceRaised' | 'border' | 'text' | 'textMuted' | 'accent' | 'onAccent' |
  'accentText' | 'accentSoft' | 'orangeLine' | 'track' | 'tabBar'>

interface ThemeDef {
  name: string
  /** Light or dark; Standart follows the user's setting instead. */
  mode: Scheme | null
  blurb: string
  colors?: Overrides
  /** Status inks nudged darker where the theme's raised surface is tinted (AA). */
  status?: Partial<Pick<Palette, 'freeze' | 'coin'>>
  /** Accent surfaces and progress fills (light → deep). */
  fill?: readonly [string, string]
  /** The Bugun tree tile: radial centre → edge. */
  treeTile?: readonly [string, string]
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  standart: { name: 'Standart', mode: null, blurb: 'Asosiy mavzu' },
  tun: {
    name: 'Tun', mode: 'dark', blurb: 'Qorongʻi mavzu · yarim tun koʻki va yulduz nuri',
    colors: {
      bg: '#0A1024', surface: '#121A33', surfaceRaised: '#1A2442', border: '#232D4A', text: '#EEF1FA',
      textMuted: '#9BA6C4', accent: '#8FB4FF', onAccent: '#0A1024', accentText: '#A9C6FF', accentSoft: '#1A2850',
      orangeLine: '#3A5490', track: '#27314F', tabBar: '#0E1530',
    },
    fill: ['#B4CDFF', '#6F97F0'], treeTile: ['#22396E', '#131D3A'],
  },
  zumrad: {
    name: 'Zumrad', mode: 'dark', blurb: 'Qorongʻi mavzu · chuqur zumrad va oltin',
    colors: {
      bg: '#06140F', surface: '#0D211A', surfaceRaised: '#132C23', border: '#1C362C', text: '#EEF4EF',
      textMuted: '#9CB6AA', accent: '#D9B45A', onAccent: '#1A1405', accentText: '#E5C36E', accentSoft: '#262A15',
      orangeLine: '#6B5A2A', track: '#1F3B30', tabBar: '#0A1A14',
    },
    fill: ['#EBCB7C', '#C99B3B'], treeTile: ['#174A39', '#0E241C'],
  },
  sakura: {
    name: 'Sakura', mode: 'light', blurb: 'Yorugʻ mavzu · pushti va qaymoq rang',
    colors: {
      bg: '#FCF3F1', surface: '#FFFFFF', surfaceRaised: '#F9E9EA', border: '#F3E1E3', text: '#2B1E25',
      textMuted: '#6E5A64', accent: '#EC7BA2', onAccent: '#2B0F1C', accentText: '#A92F5C', accentSoft: '#FCE8EF',
      orangeLine: '#F2BCD0', track: '#F3E1E3', tabBar: '#FFFFFF',
    },
    status: { freeze: '#1F64A8', coin: '#7A580E' },
    fill: ['#F6A9C3', '#D9497D'], treeTile: ['#FBE1EA', '#FFF7F9'],
  },
  ramazon: {
    name: 'Ramazon', mode: 'dark', blurb: 'Qorongʻi mavzu · tungi indigo, hilol va fonus oltini',
    colors: {
      bg: '#0D0A24', surface: '#16123A', surfaceRaised: '#1F1A49', border: '#29245A', text: '#F3F0FF',
      textMuted: '#AAA4CE', accent: '#F2B544', onAccent: '#1A1206', accentText: '#F6C55E', accentSoft: '#2A2140',
      orangeLine: '#6E5428', track: '#2E2860', tabBar: '#120E30',
    },
    fill: ['#F8CF72', '#E39A2C'], treeTile: ['#2F2675', '#1A1544'],
  },
  navroz: {
    name: 'Navroʻz', mode: 'light', blurb: 'Yorugʻ mavzu · bahor yashili, sumalak iliqligi, lola qizili',
    colors: {
      bg: '#F5F2E4', surface: '#FFFFFF', surfaceRaised: '#EEF0DC', border: '#E5E6CF', text: '#1D2A1C',
      textMuted: '#525F4E', accent: '#4CB36C', onAccent: '#0D1F10', accentText: '#1E7440', accentSoft: '#E6F3E1',
      orangeLine: '#BADDB9', track: '#E5E6CF', tabBar: '#FFFFFF',
    },
    status: { freeze: '#1F64A8' },
    fill: ['#8FD19A', '#23854A'], treeTile: ['#DDF0CC', '#F7FBF0'],
  },
}

/** The mode a theme renders in: its own, or the user's for Standart. */
export function themeScheme(id: ThemeId, userScheme: Scheme): Scheme {
  return THEMES[id].mode ?? userScheme
}

export function themePalette(id: ThemeId, userScheme: Scheme): Palette {
  const def = THEMES[id]
  const scheme = themeScheme(id, userScheme)
  return def.colors ? { ...palette[scheme], ...def.status, ...def.colors } : palette[scheme]
}

/**
 * Accent fill (large onAccent text: 3:1), its deep variant (small onAccent
 * text: 4.5:1) and the progress fill. A theme's deep variant is its solid
 * accent: dark onAccent is AA on it, but not on every gradient stop.
 */
export function themeFills(id: ThemeId) {
  const { fill, colors } = THEMES[id]
  if (!fill || !colors) return { accentFill, accentFillDeep, progressFill }
  return { accentFill: fill, accentFillDeep: [colors.accent, colors.accent] as const, progressFill: fill }
}

/** The "next" plan tile (Bugungi reja): the theme's accent with onAccent content. */
export function themePlanNext(id: ThemeId, userScheme: Scheme): (typeof planNext)[Scheme] {
  const def = THEMES[id]
  if (!def.colors) return planNext[themeScheme(id, userScheme)]
  const { accent, onAccent } = def.colors
  return {
    bg: accent, border: accent, ink: onAccent, fill: onAccent,
    tile: onAccent + '1F', track: onAccent + '29', playBg: '#FFFFFF', playIcon: onAccent,
  }
}

/** The Bugun tree tile gradient, or null for none (Standart dark). */
export function themeTreeTile(id: ThemeId, userScheme: Scheme): readonly [string, string] | null {
  const def = THEMES[id]
  if (def.treeTile) return def.treeTile
  return themeScheme(id, userScheme) === 'light' ? treeGlow.light : null
}
