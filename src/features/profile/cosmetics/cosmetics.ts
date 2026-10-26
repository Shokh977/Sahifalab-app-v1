/**
 * Profile cosmetics catalog (Claude Design "6-qadam"): banner scenes and
 * avatar rings, their names and rarity. Rarity reads from light, never
 * from extra UI: Oddiy static → Noyob breathing glow → Epik moving light
 * → Afsonaviy material + sheen + a few particles.
 */
import type { Scheme } from '../../../design/tokens'

export type Rarity = 'oddiy' | 'noyob' | 'epik' | 'afsonaviy'
export type BannerKind = 'plain' | 'tong' | 'tun' | 'oltin' | 'bahor' | 'hilol'
export type RingKind = 'oddiy' | 'shabnam' | 'olov' | 'kometa' | 'lola' | 'oltin'

export const RARITY_LABEL: Record<Rarity, string> = {
  oddiy: 'Oddiy', noyob: 'Noyob', epik: 'Epik', afsonaviy: 'Afsonaviy',
}

/** Text and dot colour per rarity (AA on the surfaces of each scheme). */
export const RARITY_COLOR: Record<Scheme, Record<Rarity, string>> = {
  light: { oddiy: '#5B6573', noyob: '#2F7DD3', epik: '#7A55D6', afsonaviy: '#9A6A06' },
  dark: { oddiy: '#A3A9B5', noyob: '#6FB2F0', epik: '#B49CF2', afsonaviy: '#F2C14E' },
}

export const BANNERS: Record<BannerKind, { name: string; rarity: Rarity }> = {
  plain: { name: 'Oddiy', rarity: 'oddiy' },
  tong: { name: 'Tong', rarity: 'noyob' },
  tun: { name: 'Tun', rarity: 'epik' },
  oltin: { name: 'Oltin soat', rarity: 'afsonaviy' },
  bahor: { name: 'Bahor', rarity: 'epik' },
  hilol: { name: 'Hilol', rarity: 'epik' },
}

export const RINGS: Record<RingKind, { name: string; rarity: Rarity }> = {
  oddiy: { name: 'Oddiy', rarity: 'oddiy' },
  shabnam: { name: 'Shabnam', rarity: 'noyob' },
  olov: { name: 'Olov', rarity: 'noyob' },
  kometa: { name: 'Kometa', rarity: 'epik' },
  lola: { name: 'Lola', rarity: 'epik' },
  oltin: { name: 'Oltin halqa', rarity: 'afsonaviy' },
}

/** Whether the nav over a banner needs the dark-glass (white icon) style. */
export function bannerIsDark(kind: BannerKind, scheme: Scheme) {
  return kind === 'tun' || kind === 'oltin' || kind === 'hilol' || (kind === 'plain' && scheme === 'dark')
}
