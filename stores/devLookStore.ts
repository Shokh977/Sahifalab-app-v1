import { create } from 'zustand'
import { BANNERS, RINGS, type BannerKind, type RingKind } from '../src/features/profile/cosmetics/cosmetics'

/**
 * Dev builds only (Settings → DEV): a banner / ring shown on your own
 * profile instead of the saved one, to try cosmetics before the server can
 * save them. Not persisted; null = the saved look.
 */
interface DevLookState {
  banner: BannerKind | null
  ring:   RingKind | null
  nextBanner: () => void
  nextRing:   () => void
}

const BANNER_IDS = Object.keys(BANNERS) as BannerKind[]
const RING_IDS = Object.keys(RINGS) as RingKind[]

/** The id after `cur` in `ids`, then null (back to the saved look). */
function next<T>(ids: T[], cur: T | null): T | null {
  if (cur == null) return ids[0]
  const i = ids.indexOf(cur)
  return i + 1 < ids.length ? ids[i + 1] : null
}

export const useDevLookStore = create<DevLookState>((set, get) => ({
  banner: null,
  ring:   null,
  nextBanner: () => set({ banner: next(BANNER_IDS, get().banner) }),
  nextRing:   () => set({ ring: next(RING_IDS, get().ring) }),
}))
