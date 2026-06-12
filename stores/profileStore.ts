import { create } from 'zustand'
import { profile as profileApi } from '../lib/api'
import type { ProfileData, ConnectionStatus } from '../lib/types'

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
    set({ ownLoading: true })
    try {
      const raw = await profileApi.getMe()
      set({ ownProfile: normalizeProfile(raw) })
    } catch {}
    finally { set({ ownLoading: false }) }
  },

  loadPublicProfile: (id) => {
    const key = Number(id)
    const cached = get().cache[key]
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return Promise.resolve(cached.data)

    if (_inflight.has(key)) return _inflight.get(key)!

    const p = profileApi.getPublic(id)
      .then(raw => {
        const data = normalizeProfile(raw)
        set(s => ({ cache: { ...s.cache, [key]: { data, fetchedAt: Date.now() } } }))
        return data
      })
      .finally(() => _inflight.delete(key))

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
