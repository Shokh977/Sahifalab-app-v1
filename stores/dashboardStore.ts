import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  auth, courses, enrollments, lessons as lessonsApi, profile, leaderboard, focusStats, flashcards as flashcardsApi, streaks,
  type MeResponse, type Course, type LeaderboardEntry, type FocusStats, type HeatmapDay,
} from '../lib/api'
import { useAuthStore } from './authStore'

const CACHE_KEY = 'sahifalab_dashboard_cache'
const CACHE_TTL = 60_000 // 60 seconds

export interface EnrolledCourse {
  course_id:   number
  created_at:  string
  courses:     Course | null
  progress:    number // 0-1, computed later
}

export interface DashboardData {
  user:              MeResponse | null
  enrolled:          EnrolledCourse[]
  recommended:       Course[]
  leaderboard:       LeaderboardEntry[]
  myLeaderRank:      number | null
  focusStats:        FocusStats
  heatmap:           HeatmapDay[]
  flashcardDueCount: number
  fetchedAt:         number
}

interface DashboardState {
  data:       DashboardData | null
  loading:    boolean
  refreshing: boolean
  error:      string | null

  fetch:           () => Promise<void>
  refresh:         () => Promise<void>
  patchFocusStats: (patch: Partial<FocusStats>) => void
  clear:           () => void
}

function emptyFocus(): FocusStats {
  // Seed streak_days from authStore so cached-zero never wins over login value
  const streak = useAuthStore.getState().user?.streak_days ?? 0
  return {
    today_minutes:       0,
    today_sessions:      0,
    week_minutes:        0,
    streak_days:         streak,
    last_study_at:       null,
    daily_goal:          useAuthStore.getState().user?.daily_goal_minutes ?? 20,
    total_focus_minutes: 0,
    sessions_count:      0,
    longest_streak:      streak,
    freeze_count:        0,
  }
}

function syncToAuth(data: DashboardData) {
  const patch: Record<string, any> = {}
  if (data.focusStats.streak_days !== undefined)
    patch.streak_days = data.focusStats.streak_days
  if (data.user?.level    !== undefined) patch.level    = data.user.level
  if (data.user?.total_xp !== undefined) patch.total_xp = data.user.total_xp
  if (Object.keys(patch).length) useAuthStore.getState().patchUser(patch as any)
}

async function loadCache(): Promise<DashboardData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: DashboardData = JSON.parse(raw)
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null
    return parsed
  } catch {
    return null
  }
}

async function saveCache(data: DashboardData) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
}

const INTERESTS_KEY = 'sahifalab_user_interests'
const EXPERIENCE_KEY = 'sahifalab_user_experience'

async function fetchAll(): Promise<DashboardData> {
  // Load personalization data in parallel with API calls
  const [savedInterestsRaw, savedLevel] = await Promise.all([
    AsyncStorage.getItem(INTERESTS_KEY).catch(() => null),
    AsyncStorage.getItem(EXPERIENCE_KEY).catch(() => null),
  ])
  const savedInterests: number[] = savedInterestsRaw ? JSON.parse(savedInterestsRaw) : []

  const [meRes, enrollRes, coursesRes, leaderRes, statsRes, flashRes, streakRes] = await Promise.allSettled([
    auth.me(),
    enrollments.mine(),
    // Fetch more courses so we have a real pool to personalize from
    courses.list({ limit: 20, ordering: '-created_at', ...(savedLevel ? { level: savedLevel } : {}) }),
    leaderboard.weekly(),
    focusStats.get(),
    flashcardsApi.getStats(),
    streaks.detail(),
  ])

  const user       = meRes.status       === 'fulfilled' ? meRes.value              : null
  const enrolled   = enrollRes.status   === 'fulfilled' ? enrollRes.value           : []
  const recCourses = coursesRes.status  === 'fulfilled' ? coursesRes.value.courses  : []
  const lbRaw      = leaderRes.status   === 'fulfilled' ? leaderRes.value           : { entries: [] as import('../lib/api').LeaderboardEntry[], my_rank: null as number | null }
  const flashStats = flashRes.status    === 'fulfilled' ? flashRes.value            : null

  // Use streak detail's is_active to correct the lazy-reset streak_days in focusStats.
  // The backend doesn't reset streak_days to 0 immediately when a streak breaks; it
  // returns the old count with is_active: false. Override it here so every consumer
  // (UnifiedBanner, StreakBanner, profile stats) sees the real value of 0.
  let stats = statsRes.status === 'fulfilled' ? statsRes.value : emptyFocus()
  const streakDetail = streakRes.status === 'fulfilled' ? streakRes.value : null
  if (streakDetail && !streakDetail.is_active && stats.streak_days > 0) {
    stats = { ...stats, streak_days: 0 }
  }
  const flashcardDueCount = flashStats?.total_due ?? 0

  // Patch is_me using caller's telegram_id (fallback endpoint sets is_me: false)
  const callerId = user?.telegram_id ?? null
  const lbEntries = lbRaw.entries.map(e => ({
    ...e,
    is_me: callerId !== null && e.telegram_id === callerId,
  }))
  const myLeaderRank = lbRaw.my_rank ?? lbEntries.find(e => e.is_me)?.rank ?? null
  const lbData = { entries: lbEntries, my_rank: myLeaderRank }

  // Fetch heatmap only if we have a user
  let heatmap: HeatmapDay[] = []
  if (user?.telegram_id) {
    try { heatmap = await profile.getHeatmap(user.telegram_id, 30) } catch {}
  }

  // Filter enrolled courses: remove ones where course data is null
  const rawEnrolled = enrolled.filter(e => e.courses !== null)

  // Fetch actual progress for each enrolled course in parallel
  const progressResults = await Promise.allSettled(
    rawEnrolled.map(e => lessonsApi.getProgress(e.course_id)),
  )

  const validEnrolled: EnrolledCourse[] = rawEnrolled.map((e, i) => {
    const pr           = progressResults[i]
    const completedCnt = pr.status === 'fulfilled' ? pr.value.completed_lesson_ids.length : 0
    const totalLessons = e.courses?.total_lessons ?? 0
    const progress     = totalLessons > 0 ? Math.min(1, completedCnt / totalLessons) : 0
    return { ...e, progress }
  })

  // Recommended = courses not already enrolled, sorted by interest match then recency
  const enrolledIds = new Set(validEnrolled.map(e => e.course_id))
  const available   = recCourses.filter(c => !enrolledIds.has(c.id))

  let recommended: Course[]
  if (savedInterests.length > 0) {
    const matching = available.filter(c => c.category_id !== null && savedInterests.includes(c.category_id))
    const rest     = available.filter(c => c.category_id === null || !savedInterests.includes(c.category_id))
    recommended    = [...matching, ...rest].slice(0, 4)
  } else {
    recommended = available.slice(0, 4)
  }

  return {
    user,
    enrolled:          validEnrolled,
    recommended,
    leaderboard:       lbEntries,
    myLeaderRank:      myLeaderRank,
    focusStats:        stats,
    heatmap,
    flashcardDueCount,
    fetchedAt:         Date.now(),
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data:       null,
  loading:    false,
  refreshing: false,
  error:      null,

  fetch: async () => {
    if (get().loading) return
    set({ loading: true, error: null })

    // Serve stale cache immediately while fetching fresh
    const cached = await loadCache()
    if (cached) set({ data: cached })

    try {
      const fresh = await fetchAll()
      syncToAuth(fresh)
      await saveCache(fresh)
      set({ data: fresh })
    } catch (e: any) {
      if (!get().data) set({ error: e?.message ?? 'Xatolik yuz berdi' })
    } finally {
      set({ loading: false })
    }
  },

  refresh: async () => {
    set({ refreshing: true, error: null })
    try {
      const fresh = await fetchAll()
      syncToAuth(fresh)
      await saveCache(fresh)
      set({ data: fresh })
    } catch (e: any) {
      set({ error: e?.message ?? 'Xatolik yuz berdi' })
    } finally {
      set({ refreshing: false })
    }
  },

  patchFocusStats: (patch) => {
    const { data } = get()
    if (!data) return
    const updated = { ...data, focusStats: { ...data.focusStats, ...patch } }
    set({ data: updated })
    // Keep authStore streak in sync
    if (patch.streak_days !== undefined)
      useAuthStore.getState().patchUser({ streak_days: patch.streak_days })
  },

  clear: () => {
    set({ data: null, loading: false, refreshing: false, error: null })
    AsyncStorage.removeItem(CACHE_KEY).catch(() => {})
  },
}))
