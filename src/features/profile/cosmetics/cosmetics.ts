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
export type LookSlot = 'banner' | 'ring'

/** How an item unlocks — mirrors the backend's cosmetics_service.CATALOG. */
export type Unlock =
  | { kind: 'free' }
  | { kind: 'achievement'; streakDays: number }
  | { kind: 'pro' }
  | { kind: 'seasonal'; season: 'navroz' | 'ramazon' }

export interface CosmeticItem { name: string; rarity: Rarity; unlock: Unlock }

export const RARITY_LABEL: Record<Rarity, string> = {
  oddiy: 'Oddiy', noyob: 'Noyob', epik: 'Epik', afsonaviy: 'Afsonaviy',
}

/** Text and dot colour per rarity (AA on the surfaces of each scheme). */
export const RARITY_COLOR: Record<Scheme, Record<Rarity, string>> = {
  light: { oddiy: '#5B6573', noyob: '#2F7DD3', epik: '#7A55D6', afsonaviy: '#9A6A06' },
  dark: { oddiy: '#A3A9B5', noyob: '#6FB2F0', epik: '#B49CF2', afsonaviy: '#F2C14E' },
}

export const BANNERS: Record<BannerKind, CosmeticItem> = {
  plain: { name: 'Oddiy', rarity: 'oddiy', unlock: { kind: 'free' } },
  tong: { name: 'Tong', rarity: 'noyob', unlock: { kind: 'achievement', streakDays: 30 } },
  tun: { name: 'Tun', rarity: 'epik', unlock: { kind: 'pro' } },
  oltin: { name: 'Oltin soat', rarity: 'afsonaviy', unlock: { kind: 'pro' } },
  bahor: { name: 'Bahor', rarity: 'epik', unlock: { kind: 'seasonal', season: 'navroz' } },
  hilol: { name: 'Hilol', rarity: 'epik', unlock: { kind: 'seasonal', season: 'ramazon' } },
}

export const RINGS: Record<RingKind, CosmeticItem> = {
  oddiy: { name: 'Oddiy', rarity: 'oddiy', unlock: { kind: 'free' } },
  olov: { name: 'Olov', rarity: 'noyob', unlock: { kind: 'achievement', streakDays: 50 } },
  shabnam: { name: 'Shabnam', rarity: 'noyob', unlock: { kind: 'pro' } },
  kometa: { name: 'Kometa', rarity: 'epik', unlock: { kind: 'pro' } },
  oltin: { name: 'Oltin halqa', rarity: 'afsonaviy', unlock: { kind: 'pro' } },
  lola: { name: 'Lola', rarity: 'epik', unlock: { kind: 'seasonal', season: 'navroz' } },
}

export const SEASON_LABEL = { navroz: 'Mart', ramazon: 'Ramazon' } as const

/** A banner / ring id from the server, or the free fallback when unknown. */
export function bannerKind(id: string | undefined): BannerKind {
  return id && id in BANNERS ? (id as BannerKind) : 'plain'
}
export function ringKind(id: string | undefined): RingKind {
  return id && id in RINGS ? (id as RingKind) : 'oddiy'
}

/** One line on how a locked item opens. */
export function unlockHint(item: CosmeticItem, bestStreak = 0): string {
  const u = item.unlock
  if (u.kind === 'achievement') {
    const left = u.streakDays - bestStreak
    return left > 0 ? `${u.streakDays} kunlik seriyada ochiladi · ${left} kun qoldi` : `${u.streakDays} kunlik seriyada ochiladi`
  }
  if (u.kind === 'pro') return 'Pro bilan ochiladi'
  if (u.kind === 'seasonal') {
    return u.season === 'navroz' ? 'Mart oyida hamma uchun ochiq' : 'Ramazon oyida hamma uchun ochiq'
  }
  return ''
}

/** Whether the nav over a banner needs the dark-glass (white icon) style. */
export function bannerIsDark(kind: BannerKind, scheme: Scheme) {
  return kind === 'tun' || kind === 'oltin' || kind === 'hilol' || (kind === 'plain' && scheme === 'dark')
}
