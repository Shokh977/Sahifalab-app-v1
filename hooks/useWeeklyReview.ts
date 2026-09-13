import { useCallback, useEffect, useState } from 'react'
import { ai as aiApi } from '../lib/api'
import type { WeeklyReviewStats, WeeklyReviewSpotlight } from '../lib/api'
import { isoWeekNumber, formatWeekRange } from '../lib/weeklyReviewFormat'

export interface WeeklyReviewDayVM {
  date:    string
  minutes: number
  isToday: boolean
}

export interface WeeklyReviewStatVM {
  key:        string
  value:      number
  unit?:      string
  deltaPct?:  number | null
  subCount?:  number
}

export interface WeeklyReviewLastWeekVM {
  weekStart:    string // raw ISO date — used to key the "seen" AsyncStorage flag
  rangeLabel:   string
  focusMinutes: number
  xp:           number
  activeDays:   number
  rank?:        number
  streakEnd:    number
}

export interface WeeklyReviewVM {
  weekNumber:       number
  isOngoing:        boolean
  focusMinutes:     number
  goalMinutes:      number | null
  dailyGoalMinutes: number
  avgMinutesPerDay: number
  vsLastWeekPct:    number | null
  activeDays:       number
  streakDays:       number
  days:             WeeklyReviewDayVM[]
  stats:            WeeklyReviewStatVM[]
  lastWeek:         WeeklyReviewLastWeekVM | null
  /** AI-generated narrative for THIS week, when the backend has one cached
   * (omitted entirely for a genuinely zero-activity week — see
   * current_week_progress_v1.py's no-activity skip). Screen falls back to a
   * deterministic sentence when this is undefined. */
  recommendation?:  string
  /** Always present alongside `recommendation` (same no-activity gate) —
   * a real, curated study technique, rotated weekly and phrased around
   * the user's own goal. */
  studyTip?:        WeeklyReviewSpotlight
  /** Evergreen "why this field matters" context for the user's first
   * declared interest — null if they set no interests at onboarding. */
  categoryInsight?: WeeklyReviewSpotlight | null
  /** Only present when the user shows strong real engagement in a
   * declared interest and isn't already a teacher — points at the app's
   * own become-teacher flow. */
  tutorSuggestion?: WeeklyReviewSpotlight | null
}

export type WeeklyReviewStatus = 'loading' | 'error' | 'ready'

function buildStatsGrid(stats: WeeklyReviewStats): WeeklyReviewStatVM[] {
  return [
    { key: 'xp', value: stats.week_xp, unit: 'XP' },
    { key: 'streak', value: stats.streak_days, unit: 'kun' },
    {
      key: 'flashcard_accuracy',
      value: stats.flashcard_accuracy_pct ?? 0,
      unit: '%',
      subCount: stats.flashcard_reviews_this_week,
    },
    { key: 'courses', value: stats.courses_enrolled_count, subCount: stats.lessons_completed_this_week },
    { key: 'quizzes', value: stats.quiz_attempts_this_week },
    { key: 'daily_quiz', value: stats.daily_quiz_played_this_week },
  ]
}

function buildViewModel(res: Awaited<ReturnType<typeof aiApi.weeklyReview>>): WeeklyReviewVM {
  const cw = res.current_week_progress
  const stats = cw.stats

  const days: WeeklyReviewDayVM[] = stats.days.map((d, i) => ({
    date:    d.date,
    minutes: d.minutes,
    // The backend's in-progress-week query always ends the array at "today"
    // (gather_user_stats bounds it to `<= today`) — trusting the array's own
    // shape avoids guessing "today" from the device clock, which could
    // disagree with the server's per-user local day near midnight.
    isToday: i === stats.days.length - 1,
  }))

  const vsLastWeekPct = stats.prev_week_minutes_same_point > 0
    ? Math.round((stats.this_week_minutes - stats.prev_week_minutes_same_point) / stats.prev_week_minutes_same_point * 100)
    : null

  const lastWeek: WeeklyReviewLastWeekVM | null = res.review ? {
    weekStart:    res.review.week_start,
    rangeLabel:   formatWeekRange(res.review.week_start),
    focusMinutes: res.review.stats.this_week_minutes,
    xp:           res.review.stats.week_xp,
    activeDays:   res.review.stats.days_active,
    rank:         res.review.stats.week_xp_rank ?? undefined,
    streakEnd:    res.review.stats.streak_days,
  } : null

  return {
    weekNumber:       isoWeekNumber(cw.week_start),
    isOngoing:        true,
    focusMinutes:     stats.this_week_minutes,
    goalMinutes:      stats.daily_goal_minutes > 0 ? stats.daily_goal_minutes * 7 : null,
    dailyGoalMinutes: stats.daily_goal_minutes,
    avgMinutesPerDay: days.length > 0 ? Math.round(stats.this_week_minutes / days.length) : 0,
    vsLastWeekPct,
    activeDays:       stats.days_active,
    streakDays:       stats.streak_days,
    days,
    stats:            buildStatsGrid(stats),
    lastWeek,
    recommendation:   cw.recommendation,
    studyTip:         cw.study_tip,
    categoryInsight:  cw.category_insight,
    tutorSuggestion:  cw.tutor_suggestion,
  }
}

export function useWeeklyReview() {
  const [status, setStatus] = useState<WeeklyReviewStatus>('loading')
  const [data, setData]     = useState<WeeklyReviewVM | null>(null)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await aiApi.weeklyReview()
      setData(buildViewModel(res))
      setStatus('ready')
    } catch (e: any) {
      setError(e?.message ?? "Yuklab bo'lmadi")
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, status, error, refetch: load }
}
