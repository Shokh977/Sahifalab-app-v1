import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth, TOKEN_KEY, type AuthResponse, type MeResponse } from '../lib/api'

const ONBOARDING_KEY = 'sahifalab_onboarding_done'
const USER_CACHE_KEY  = 'sahifalab_user_cache_v1'

// Only stable identity fields are persisted — gamification counters (streak,
// XP, level, goal) are intentionally excluded so stale values never flash.
type UserIdentityCache = Pick<AppUser,
  'telegram_id' | 'first_name' | 'username' | 'photo_url' |
  'email' | 'email_verified' | 'has_password' | 'role' | 'status'
>

function toIdentityCache(u: AppUser): UserIdentityCache {
  return {
    telegram_id:    u.telegram_id,
    first_name:     u.first_name,
    username:       u.username,
    photo_url:      u.photo_url,
    email:          u.email,
    email_verified: u.email_verified,
    has_password:   u.has_password,
    role:           u.role,
    status:         u.status,
  }
}

function fromIdentityCache(c: UserIdentityCache): AppUser {
  return {
    ...c,
    level:               1,
    total_xp:            0,
    streak_days:         0,
    daily_goal_minutes:  20,
  }
}

export interface AppUser {
  telegram_id:         number
  first_name:          string
  username:            string | null
  photo_url:           string | null
  email:               string | null
  email_verified:      boolean
  has_password:        boolean
  role:                string
  status:              string
  level:               number
  total_xp:            number
  streak_days:         number
  daily_goal_minutes:  number
}

interface AuthState {
  user:             AppUser | null
  token:            string | null
  isLoading:        boolean
  isAuthenticated:  boolean
  needsOnboarding:  boolean

  initAuth:         () => Promise<void>
  loginEmail:       (email: string, password: string) => Promise<void>
  loginGoogle:      (idToken: string) => Promise<void>
  loginTelegram:    (data: Parameters<typeof auth.telegramLogin>[0]) => Promise<void>
  loginWithToken:   (token: string) => Promise<void>
  logout:           () => Promise<void>
  refreshUser:      () => Promise<void>
  patchUser:        (patch: Partial<AppUser>) => void
  completeOnboarding: () => Promise<void>
}

function mapToUser(r: AuthResponse | MeResponse): AppUser {
  const me = r as MeResponse
  return {
    // Every other field has a fallback but this didn't, despite AppUser
    // typing it as a non-optional number — an email/Google-only account
    // could store undefined against a type that promises a real id.
    telegram_id:        r.telegram_id ?? 0,
    first_name:         r.first_name ?? '',
    username:           r.username ?? null,
    photo_url:          r.photo_url ?? null,
    email:              r.email ?? null,
    email_verified:     r.email_verified ?? false,
    has_password:       r.has_password ?? false,
    role:               r.role   ?? 'student',
    status:             r.status ?? 'active',
    level:              me.level              ?? 1,
    total_xp:           me.total_xp           ?? 0,
    streak_days:        me.streak_days        ?? 0,
    daily_goal_minutes: me.daily_goal_minutes ?? 20,
  }
}

async function saveToken(token: string) {
  try { await SecureStore.setItemAsync(TOKEN_KEY, token) }
  catch { try { localStorage.setItem(TOKEN_KEY, token) } catch {} }
}

async function getToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(TOKEN_KEY) }
  catch { try { return localStorage.getItem(TOKEN_KEY) } catch {} return null }
}

async function clearToken() {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY) }
  catch { try { localStorage.removeItem(TOKEN_KEY) } catch {} }
}

async function checkOnboarding(): Promise<boolean> {
  try { return !(await AsyncStorage.getItem(ONBOARDING_KEY)) }
  catch { return false }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  token:           null,
  isLoading:       true,
  isAuthenticated: false,
  needsOnboarding: false,

  initAuth: async () => {
    set({ isLoading: true })
    try {
      const token = await getToken()
      if (!token) { set({ isLoading: false }); return }
      set({ token })

      // Serve stable identity fields immediately — unlocks the UI (avatar, name,
      // auth guard) without a network round-trip. Gamification counters (streak,
      // XP, level) are NOT restored from cache; they arrive with auth.me() below
      // so we never flash yesterday's streak count or a stale level badge.
      const cachedRaw = await AsyncStorage.getItem(USER_CACHE_KEY).catch(() => null)
      if (cachedRaw) {
        try {
          const identity: UserIdentityCache = JSON.parse(cachedRaw)
          const needsOnboarding = await checkOnboarding()
          set({ user: fromIdentityCache(identity), isAuthenticated: true, needsOnboarding, isLoading: false })
        } catch {}
      }

      const me = await auth.me()
      const fresh = mapToUser(me)
      const needsOnboarding = await checkOnboarding()
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(toIdentityCache(fresh))).catch(() => {})
      set({ user: fresh, isAuthenticated: true, needsOnboarding, isLoading: false })
    } catch (err: any) {
      // Keep cached user alive on transient network failures.
      // Only force-logout on explicit auth rejection (401/403).
      const msg: string = err?.message ?? ''
      const isAuthError  = /HTTP 40[13]/.test(msg)
      if (isAuthError || !get().isAuthenticated) {
        await clearToken()
        AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {})
        set({ token: null, user: null, isAuthenticated: false, needsOnboarding: false })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  loginEmail: async (email, password) => {
    const res = await auth.emailLogin({ email, password })
    await saveToken(res.access_token)
    const me = await auth.me()
    if (!me.email_verified) {
      await clearToken()
      throw new Error('EMAIL_NOT_VERIFIED')
    }
    const fresh = mapToUser(me)
    const needsOnboarding = await checkOnboarding()
    AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(toIdentityCache(fresh))).catch(() => {})
    set({ token: res.access_token, user: fresh, isAuthenticated: true, needsOnboarding })
  },

  loginGoogle: async (idToken) => {
    const res = await auth.googleLogin(idToken)
    await saveToken(res.access_token)
    const me = await auth.me()
    const fresh = mapToUser(me)
    const needsOnboarding = await checkOnboarding()
    AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(toIdentityCache(fresh))).catch(() => {})
    set({ token: res.access_token, user: fresh, isAuthenticated: true, needsOnboarding })
  },

  loginTelegram: async (data) => {
    const res = await auth.telegramLogin(data)
    await saveToken(res.access_token)
    const me = await auth.me()
    const fresh = mapToUser(me)
    const needsOnboarding = await checkOnboarding()
    AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(toIdentityCache(fresh))).catch(() => {})
    set({ token: res.access_token, user: fresh, isAuthenticated: true, needsOnboarding })
  },

  loginWithToken: async (token) => {
    await saveToken(token)
    const me = await auth.me()
    const fresh = mapToUser(me)
    const needsOnboarding = await checkOnboarding()
    AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(toIdentityCache(fresh))).catch(() => {})
    set({ token, user: fresh, isAuthenticated: true, needsOnboarding })
  },

  logout: async () => {
    try { await auth.logout() } catch {}
    await clearToken()
    AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {})
    set({ token: null, user: null, isAuthenticated: false, needsOnboarding: false })
  },

  refreshUser: async () => {
    try {
      const me = await auth.me()
      const fresh = mapToUser(me)
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(toIdentityCache(fresh))).catch(() => {})
      set({ user: fresh })
    } catch {}
  },

  patchUser: (patch) => {
    const { user } = get()
    if (user) set({ user: { ...user, ...patch } })
  },

  completeOnboarding: async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, '1') } catch {}
    set({ needsOnboarding: false })
  },
}))
