/**
 * The Pro name badge catalog (110_name_badges), from the server — so a new
 * badge needs no app update. Kept in AsyncStorage so badges draw on the
 * first frame after a restart, then refreshed once per launch (and when a
 * badge id turns up that the cached catalog doesn't know).
 *
 * The files themselves are animated WebPs played natively by expo-image
 * (see NameBadge) and cached on disk by URL; a re-upload gets a new URL.
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { cosmetics, type NameBadgeDef } from '../../../../lib/api'
import { API_URL } from '../../../../lib/constants'

const KEY = 'sahifalab_name_badges_v1'

interface BadgeCatalogState {
  byId:   Record<string, NameBadgeDef>
  order:  string[]
  loaded: boolean
  load:   (force?: boolean) => Promise<void>
}

const resolve = (u: string) => (u.startsWith('/') ? `${API_URL}${u}` : u)

function index(list: NameBadgeDef[]) {
  const byId: Record<string, NameBadgeDef> = {}
  for (const b of list) byId[b.id] = { ...b, dark: resolve(b.dark), light: resolve(b.light), static: resolve(b.static) }
  return { byId, order: list.map(b => b.id) }
}

let inflight: Promise<void> | null = null
let fetched = false

export const useBadgeCatalog = create<BadgeCatalogState>((set, get) => ({
  byId: {},
  order: [],
  loaded: false,
  load: (force = false) => {
    if (inflight) return inflight
    if (fetched && !force) return Promise.resolve()
    inflight = (async () => {
      if (!get().loaded) {
        try {
          const raw = await AsyncStorage.getItem(KEY)
          if (raw) set({ ...index(JSON.parse(raw)), loaded: true })
        } catch {}
      }
      try {
        const { badges } = await cosmetics.badges()
        set({ ...index(badges), loaded: true })
        fetched = true
        AsyncStorage.setItem(KEY, JSON.stringify(badges)).catch(() => {})
      } catch {
        // Older server (404) or offline: keep the cached catalog.
        set({ loaded: true })
      }
    })().finally(() => { inflight = null })
    return inflight
  },
}))

/** A badge by id, or null for none / unknown (an unknown id refreshes the catalog once). */
export function useBadgeDef(id: string | null | undefined): NameBadgeDef | null {
  const def = useBadgeCatalog(s => (id && id !== 'none' ? s.byId[id] ?? null : null))
  const missing = !!id && id !== 'none' && !def
  useEffect(() => {
    if (missing && !fetched) useBadgeCatalog.getState().load()
  }, [missing])
  return def
}
