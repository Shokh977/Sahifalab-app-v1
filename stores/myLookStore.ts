import { create } from 'zustand'

/**
 * Your own effective look (106_profile_looks) — banner, avatar ring, tree
 * look — for everywhere the app draws *your* avatar or tree (Bugun, the
 * streak screens, Reyting's "Siz" bar). Filled on sign-in by useThemeSync
 * (GET /api/profile/me/look) and updated when Profilni bezash saves.
 * Before that, or on an older server, everything is the free default.
 */
interface MyLookState {
  banner: string
  ring:   string
  tree:   string
  set:    (look: Partial<{ banner: string; ring: string; tree: string }>) => void
}

export const useMyLookStore = create<MyLookState>(set => ({
  banner: 'plain',
  ring:   'oddiy',
  tree:   'tabiiy',
  set:    look => set(look),
}))
