/**
 * Pro name colours (Claude Design "9-qadam" §1). One colour can't reach
 * 4.5:1 on white and on the dark surfaces at once, so every style has a
 * light value and a dark value, picked by the theme's mode. The server only
 * stores and sends the id (slot "name_style"); the colours live here.
 * __tests__/nameStyles.test.ts checks every value against every theme.
 */
import type { Scheme } from '../../../design/tokens'
import type { Unlock } from '../cosmetics/cosmetics'

export type NameStyleId =
  | 'oddiy' | 'oltin' | 'zumrad' | 'lazurit' | 'yoqut' | 'shafaq' | 'tun' | 'bahor' | 'yaltiroq'

export const NAME_STYLE_IDS: NameStyleId[] =
  ['oddiy', 'oltin', 'zumrad', 'lazurit', 'yoqut', 'shafaq', 'tun', 'bahor', 'yaltiroq']

export type NameInk =
  | { kind: 'theme' }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; colors: readonly [string, string] }
  /** Yaltiroq: a base colour with a sheen band crossing every 5 s. */
  | { kind: 'sheen'; base: string; sheen: string }

export interface NameStyle {
  name: string
  unlock: Unlock
  light: NameInk
  dark: NameInk
}

const pro: Unlock = { kind: 'pro' }

export const NAME_STYLES: Record<NameStyleId, NameStyle> = {
  oddiy:    { name: 'Oddiy',    unlock: { kind: 'free' }, light: { kind: 'theme' }, dark: { kind: 'theme' } },
  oltin:    { name: 'Oltin',    unlock: pro, light: { kind: 'solid', color: '#8A5A00' }, dark: { kind: 'solid', color: '#F2C14E' } },
  zumrad:   { name: 'Zumrad',   unlock: pro, light: { kind: 'solid', color: '#0A7350' }, dark: { kind: 'solid', color: '#4FD6A0' } },
  lazurit:  { name: 'Lazurit',  unlock: pro, light: { kind: 'solid', color: '#2453C2' }, dark: { kind: 'solid', color: '#8DB0FF' } },
  yoqut:    { name: 'Yoqut',    unlock: pro, light: { kind: 'solid', color: '#B0173E' }, dark: { kind: 'solid', color: '#FF8FAA' } },
  shafaq:   { name: 'Shafaq',   unlock: pro, light: { kind: 'gradient', colors: ['#8F5A00', '#B8402C'] }, dark: { kind: 'gradient', colors: ['#F4C24F', '#FF9A86'] } },
  tun:      { name: 'Tun',      unlock: pro, light: { kind: 'gradient', colors: ['#4D5870', '#4651C2'] }, dark: { kind: 'gradient', colors: ['#D5DCE8', '#AAB4FF'] } },
  bahor:    { name: 'Bahor',    unlock: pro, light: { kind: 'gradient', colors: ['#0B7258', '#B0305F'] }, dark: { kind: 'gradient', colors: ['#6EDDB8', '#FFA0C6'] } },
  yaltiroq: { name: 'Yaltiroq', unlock: pro, light: { kind: 'sheen', base: '#6E4600', sheen: '#8F5E00' }, dark: { kind: 'sheen', base: '#E8B53C', sheen: '#FFF4D2' } },
}

export function nameStyleKind(id: string | null | undefined): NameStyleId {
  return id && id in NAME_STYLES ? (id as NameStyleId) : 'oddiy'
}

export function nameInk(id: NameStyleId, scheme: Scheme): NameInk {
  return NAME_STYLES[id][scheme]
}

/** Every colour a style's text is drawn in (gradient stops, sheen base and band). */
export function inkColors(ink: NameInk): string[] {
  if (ink.kind === 'solid') return [ink.color]
  if (ink.kind === 'gradient') return [...ink.colors]
  if (ink.kind === 'sheen') return [ink.base, ink.sheen]
  return []
}

/** The colour of the dark-theme glow and of a plain-text fallback. */
export function inkLead(ink: NameInk, themeText: string): string {
  if (ink.kind === 'solid') return ink.color
  if (ink.kind === 'gradient') return ink.colors[0]
  if (ink.kind === 'sheen') return ink.base
  return themeText
}

/** Name → badge gap (§1 Truncation). */
export function badgeGap(fontSize: number) {
  return fontSize >= 22 ? 7 : 5
}

/** Badge size for a name context (§3). */
export type NameContext = 'list' | 'profile' | 'podium' | 'comment' | 'siz'
export const BADGE_SIZE: Record<NameContext, number> = { list: 16, comment: 16, siz: 16, profile: 22, podium: 14 }
