import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth, TOKEN_KEY, type AuthResponse, type MeResponse } from '../lib/api'

const ONBOARDING_KEY = 'sahifalab_onboarding_done'

export interface AppUser {
  telegram_id:         number
  first_name:          string
  username:            string | null
  photo_url:           string | null
  email:               string | null
  email_verified:      boolean
  has_password:        boolean
  role:                string
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
    telegram_id:        r.telegram_id,
    first_name:         r.first_name ?? '',
    username:           r.username ?? null,
    photo_url:          r.photo_url ?? null,
    email:              r.email ?? null,
    email_verified:     r.email_verified ?? false,
    has_password:       r.has_password ?? false,
    role:               r.role ?? 'student',
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
      const me = await auth.me()
      const needsOnboarding = await checkOnboarding()
      set({ user: mapToUser(me), isAuthenticated: true, needsOnboarding })
    } catch {
      await clearToken()
      set({ token: null, user: null, isAuthenticated: false, needsOnboarding: false })
    } finally {
      set({ isLoading: false })
    }
  },

  loginEmail: async (email, password) => {
    const res = await auth.emailLogin({ email, password })
    await saveToken(res.access_token)
    const me = await auth.me()
    const needsOnboarding = await checkOnboarding()
    set({ token: res.access_token, user: mapToUser(me), isAuthenticated: true, needsOnboarding })
  },

  loginGoogle: async (idToken) => {
    const res = await auth.googleLogin(idToken)
    await saveToken(res.access_token)
    const me = await auth.me()
    const needsOnboarding = await checkOnboarding()
    set({ token: res.access_token, user: mapToUser(me), isAuthenticated: true, needsOnboarding })
  },

  loginTelegram: async (data) => {
    const res = await auth.telegramLogin(data)
    await saveToken(res.access_token)
    const me = await auth.me()
    const needsOnboarding = await checkOnboarding()
    set({ token: res.access_token, user: mapToUser(me), isAuthenticated: true, needsOnboarding })
  },

  loginWithToken: async (token) => {
    await saveToken(token)
    const me = await auth.me()
    const needsOnboarding = await checkOnboarding()
    set({ token, user: mapToUser(me), isAuthenticated: true, needsOnboarding })
  },

  logout: async () => {
    try { await auth.logout() } catch {}
    await clearToken()
    set({ token: null, user: null, isAuthenticated: false, needsOnboarding: false })
  },

  refreshUser: async () => {
    try {
      const me = await auth.me()
      set({ user: mapToUser(me) })
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
