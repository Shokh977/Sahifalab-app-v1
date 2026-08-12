import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  auth, courses, enrollments, lessons as lessonsApi, leaderboard, focusStats, flashcards as flashcardsApi, streaks,
  type MeResponse, type Course, type LeaderboardEntry, type FocusStats, type StreakState,
} from '../lib/api'
import { useAuthStore } from './authStore'

const CACHE_KEY = 'sahifalab_dashboard_cache'
const CACHE_TTL = 300_000 // 5 min

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
  flashcardDueCount: number
  fetchedAt:         number
  // Streak state machine — derived from /api/streaks/detail's streak_state
  // (active | at_risk | frozen_today | lost). streakJustLost/streakLostPrevDays/
  // streakLostCanFreeze/streakLostCanBuyFreeze are kept for StreakLostModal,
  // which only ever fires for the genuinely-terminal 'lost' state now — NOT
  // for 'at_risk', which used to be misreported as loss (see P2).
  streakState?:             StreakState
  streakJustLost?:          boolean
  streakLostPrevDays?:      number
  streakLostCanFreeze?:     boolean   // can_freeze: window open + freeze available
  streakLostCanBuyFreeze?:  boolean   // window open but no freezes to use
  streakAtRisk?:            boolean   // streak_state === 'at_risk'
  streakFrozenToday?:       boolean   // streak_state === 'frozen_today'
  windowClosesAt?:          string | null
  streakCanFreeze?:         boolean   // unconditional can_freeze, for StreakAtRiskModal
  streakCanBuyFreeze?:      boolean   // unconditional can_freeze_if_purchased && !can_freeze
}

interface DashboardState {
  data:       DashboardData | null
  loading:    boolean
  refreshing: boolean
  error:      string | null
  // Per-session flag: once the streak-lost modal has been shown, don't show it again
  streakLostSeen: boolean
  // The at-risk modal may reappear once more per session while the window is
  // still open (one dismissal must not silently forfeit the streak) — capped
  // at 2 shows, reset whenever streak_state moves off 'at_risk' so a later,
  // separate at-risk episode gets its own fresh allowance.
  atRiskModalShownCount: number

  fetch:                 () => Promise<void>
  refresh:               () => Promise<void>
  patchFocusStats:       (patch: Partial<FocusStats>) => void
  markStreakLostSeen:    () => void
  bumpAtRiskModalShown:  () => void
  clear:                 () => void
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
    return JSON.parse(raw) as DashboardData   // caller checks TTL — always return what we have
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

  // Use streak detail's streak_state to correct the lazy-reset streak_days in
  // focusStats. The backend doesn't reset streak_days to 0 immediately when a
  // streak breaks; it returns the old count alongside streak_state. Only zero
  // it out when the streak is genuinely 'lost' — 'at_risk' and 'frozen_today'
  // must keep showing the real count (P2: the app used to show 0 the moment
  // the freeze window opened, while the streak was still fully recoverable).
  let stats = statsRes.status === 'fulfilled' ? statsRes.value : emptyFocus()
  const streakDetail = streakRes.status === 'fulfilled' ? streakRes.value : null
  const streakState  = streakDetail?.streak_state
  const streakJustLost = !!(streakDetail && streakState === 'lost' && streakDetail.streak_days > 0)
  const streakLostPrevDays   = streakJustLost ? streakDetail!.streak_days : 0
  const streakLostCanFreeze  = streakJustLost ? streakDetail!.can_freeze : false
  const streakLostCanBuyFreeze = streakJustLost
    ? (streakDetail!.can_freeze_if_purchased && !streakDetail!.can_freeze)
    : false
  const streakAtRisk      = streakState === 'at_risk'
  const streakFrozenToday = streakState === 'frozen_today'
  const windowClosesAt    = streakDetail?.window_closes_at ?? null
  // Unconditional (not state-gated) freeze-eligibility flags, for
  // StreakAtRiskModal — streakLostCanFreeze/streakLostCanBuyFreeze above stay
  // gated to 'lost' specifically for StreakLostModal's existing contract.
  const streakCanFreeze    = !!streakDetail?.can_freeze
  const streakCanBuyFreeze = !!(streakDetail?.can_freeze_if_purchased && !streakDetail?.can_freeze)
  if (streakJustLost) {
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
    enrolled:               validEnrolled,
    recommended,
    leaderboard:            lbEntries,
    myLeaderRank:           myLeaderRank,
    focusStats:             stats,
    flashcardDueCount,
    fetchedAt:              Date.now(),
    streakState,
    streakJustLost,
    streakLostPrevDays,
    streakLostCanFreeze,
    streakLostCanBuyFreeze,
    streakAtRisk,
    streakFrozenToday,
    windowClosesAt,
    streakCanFreeze,
    streakCanBuyFreeze,
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => {
  // A fresh at-risk episode gets its own fresh allowance — reset the
  // reappear-once-more counter the moment streak_state moves off 'at_risk'.
  function applyFresh(fresh: DashboardData) {
    const wasAtRisk = get().data?.streakAtRisk
    set({ data: fresh })
    if (wasAtRisk && !fresh.streakAtRisk) {
      set({ atRiskModalShownCount: 0 })
    }
  }

  return {
  data:            null,
  loading:         false,
  refreshing:      false,
  error:           null,
  streakLostSeen:  false,
  atRiskModalShownCount: 0,

  fetch: async () => {
    if (get().loading) return

    // Already have fresh in-memory data — nothing to do
    const existing = get().data
    if (existing && Date.now() - existing.fetchedAt < CACHE_TTL) return

    set({ loading: true, error: null })

    // Serve any cached data immediately — even stale — so the screen renders
    // from cache instead of showing a blank skeleton for 4-5 s.
    const cached = await loadCache()
    if (cached) {
      set({ data: cached })
      // Cache is still fresh (cold restart within TTL) — no network call needed
      if (Date.now() - cached.fetchedAt < CACHE_TTL) {
        set({ loading: false })
        return
      }
    }

    try {
      const fresh = await fetchAll()
      syncToAuth(fresh)
      await saveCache(fresh)
      applyFresh(fresh)
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
      applyFresh(fresh)
    } catch (e: any) {
      set({ error: e?.message ?? 'Xatolik yuz berdi' })
    } finally {
      set({ refreshing: false })
    }
  },

  markStreakLostSeen:   () => set({ streakLostSeen: true }),
  bumpAtRiskModalShown: () => set(s => ({ atRiskModalShownCount: s.atRiskModalShownCount + 1 })),

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
  }
})
