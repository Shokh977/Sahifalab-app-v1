import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { profile as profileApi } from '../lib/api'
import type { ProfileData, ConnectionStatus } from '../lib/types'

const OWN_PROFILE_CACHE_KEY   = 'sahifalab_own_profile_v1'
const PUB_PROFILE_KEY_PREFIX  = 'sahifalab_pub_profile_v1_'
const PUB_PROFILE_CACHE_TTL   = 30 * 60 * 1000  // 30 min across sessions

// Backend returns null for empty arrays; normalise so every component gets [].
function normalizeProfile(data: any): ProfileData {
  return {
    ...data,
    skills:          data.skills          ?? [],
    certificates:    data.certificates    ?? [],
    recent_activity: data.recent_activity ?? [],
    active_courses:  data.active_courses  ?? [],
    experiences:     data.experiences     ?? [],
    education:       data.education       ?? [],
  }
}

interface ProfileCache {
  data:      ProfileData
  fetchedAt: number
}

interface ProfileState {
  ownProfile:  ProfileData | null
  ownLoading:  boolean
  cache:       Record<number, ProfileCache>   // keyed by telegram_id

  loadOwnProfile:    () => Promise<void>
  loadPublicProfile: (id: number | string) => Promise<ProfileData>
  patchOwnProfile:   (patch: Partial<ProfileData>) => void

  // Optimistic connection/follow mutations on cached profiles
  patchCachedStatus: (
    targetId: number,
    patch: Partial<Pick<ProfileData,
      'connection_status' | 'connection_id' |
      'is_following' | 'connections_count' | 'followers_count'
    >>
  ) => void
}

const CACHE_TTL = 300_000 // 5 min

const _inflight = new Map<number, Promise<ProfileData>>()

export const useProfileStore = create<ProfileState>((set, get) => ({
  ownProfile: null,
  ownLoading: false,
  cache:      {},

  loadOwnProfile: async () => {
    // Warm the profile from cache so the screen renders instantly without a spinner
    if (!get().ownProfile) {
      try {
        const raw = await AsyncStorage.getItem(OWN_PROFILE_CACHE_KEY)
        if (raw) set({ ownProfile: JSON.parse(raw) })
      } catch {}
    }
    set({ ownLoading: true })
    try {
      const data = normalizeProfile(await profileApi.getMe())
      set({ ownProfile: data })
      AsyncStorage.setItem(OWN_PROFILE_CACHE_KEY, JSON.stringify(data)).catch(() => {})
    } catch {}
    finally { set({ ownLoading: false }) }
  },

  loadPublicProfile: (id) => {
    const key = Number(id)
    const mem = get().cache[key]
    if (mem && Date.now() - mem.fetchedAt < CACHE_TTL) return Promise.resolve(mem.data)

    if (_inflight.has(key)) return _inflight.get(key)!

    const p = (async (): Promise<ProfileData> => {
      // Check AsyncStorage so revisited profiles load instantly after a restart
      if (!mem) {
        try {
          const raw = await AsyncStorage.getItem(PUB_PROFILE_KEY_PREFIX + key)
          if (raw) {
            const entry: ProfileCache = JSON.parse(raw)
            if (Date.now() - entry.fetchedAt < PUB_PROFILE_CACHE_TTL) {
              set(s => ({ cache: { ...s.cache, [key]: entry } }))
              return entry.data
            }
          }
        } catch {}
      }
      const data = normalizeProfile(await profileApi.getPublic(id))
      const entry: ProfileCache = { data, fetchedAt: Date.now() }
      set(s => ({ cache: { ...s.cache, [key]: entry } }))
      AsyncStorage.setItem(PUB_PROFILE_KEY_PREFIX + key, JSON.stringify(entry)).catch(() => {})
      return data
    })().finally(() => _inflight.delete(key))

    _inflight.set(key, p)
    return p
  },

  patchOwnProfile: (patch) =>
    set(s => s.ownProfile ? { ownProfile: { ...s.ownProfile, ...patch } } : {}),

  patchCachedStatus: (targetId, patch) =>
    set(s => {
      const entry = s.cache[targetId]
      if (!entry) return {}
      return {
        cache: {
          ...s.cache,
          [targetId]: { ...entry, data: { ...entry.data, ...patch } },
        },
      }
    }),
}))
