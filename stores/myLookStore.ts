import { create } from 'zustand'

/**
 * Your own effective look (106_profile_looks) — banner, avatar ring, tree
 * look, name colour and badge — for everywhere the app draws *your* avatar, tree or name (Bugun, the
 * streak screens, Reyting's "Siz" bar). Filled on sign-in by useThemeSync
 * (GET /api/profile/me/look) and updated when Profilni bezash saves.
 * Before that, or on an older server, everything is the free default.
 */
interface MyLookState {
  banner: string
  ring:   string
  tree:   string
  /** Sahifalab Pro is active (the PRO tag on Bugun). */
  isPro:  boolean
  /** Name colour and badge (110); "none" = no badge. */
  nameStyle: string
  badge:  string
  set:    (look: Partial<{ banner: string; ring: string; tree: string; isPro: boolean; nameStyle: string; badge: string }>) => void
}

export const useMyLookStore = create<MyLookState>(set => ({
  banner: 'plain',
  ring:   'oddiy',
  tree:   'tabiiy',
  isPro:  false,
  nameStyle: 'oddiy',
  badge:  'none',
  set:    look => set(look),
}))
