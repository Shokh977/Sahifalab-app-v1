// lib/challenges.ts — step-25 shared helpers for the 5 metrics × 4 types.
// One place for "how do I display a metric value" and "how do I frame
// progress without ever sounding discouraging" — every card/screen that
// renders challenge data should go through these, not reinvent them.
import type { Challenge } from './api'

export const METRIC_UNIT_LABEL: Record<Challenge['metric'], string> = {
  focus_minutes:      'soat',
  flashcard_reviews:  'karta',
  lessons_completed:  'dars',
  courses_completed:  'kurs',
  tests_passed:       'test',
}

/** Formats a raw metric value (stored in DB units) for display. Only focus_minutes needs minutes→hours. */
export function fmtMetricValue(value: number, metric: Challenge['metric']): string {
  if (metric === 'focus_minutes') {
    const h = value / 60
    return h % 1 === 0 ? `${h}` : h.toFixed(1)
  }
  return `${Math.round(value)}`
}

export function fmtMetricGoal(value: number, metric: Challenge['metric']): string {
  return `${fmtMetricValue(value, metric)} ${METRIC_UNIT_LABEL[metric]}`
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

export function daysUntil(iso: string): number {
  return daysLeft(iso)
}

export function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

/** Warm, never-shaming pace hint — 'cumulative' only (the only type with a fixed target + deadline shape). */
export function paceHint(ch: Challenge): string {
  const now = Date.now()
  const startMs = new Date(ch.starts_at).getTime()
  const endMs   = new Date(ch.ends_at).getTime()
  const totalMs = Math.max(1, endMs - startMs)
  const target  = ch.target_value ?? 0
  const expectedByNow = target * Math.min(1, Math.max(0, (now - startMs) / totalMs))

  if (ch.progress_value >= expectedByNow * 1.05) {
    return "Rejadan oldindasiz! 🔥"
  }
  const remainingDays = daysLeft(ch.ends_at)
  const remaining = Math.max(0, target - ch.progress_value)
  const perDay = remainingDays > 0 ? remaining / remainingDays : remaining
  const isTimeBased = ch.metric === 'focus_minutes'
  if (remainingDays <= 0 || (isTimeBased && perDay > 180)) {
    return "Har daqiqa muhim — davom eting! 💪"
  }
  const perDayStr = isTimeBased ? `${Math.round(perDay)} daqiqa` : `${Math.ceil(perDay)} ta ${METRIC_UNIT_LABEL[ch.metric]}`
  return `Kuniga ~${perDayStr} — yetib borasiz! 💪`
}

/** rank/total → 0-100 percentile (higher = better standing). */
export function computePercentile(rank: number | null, totalParticipants: number): number | null {
  if (rank == null || totalParticipants <= 0) return null
  return Math.round((1 - (rank - 1) / totalParticipants) * 100)
}

/**
 * Sprint framing (step-25 Part 5) — rank is the hero number, but the
 * headline text is ALWAYS percentile-based, never "you're in Nth place out
 * of M" read as a loss. percentile is 0-100 (higher = better standing).
 */
export function percentileFraming(percentile: number | null): string {
  if (percentile == null) return "Ishtirok etayapsiz — davom eting! 💪"
  if (percentile >= 90) return `Siz eng faol ${100 - percentile}% ichidasiz! 🔥`
  if (percentile >= 50) return `Siz eng faol ${100 - percentile}% ichidasiz`
  return "Ishtirok etayapsiz — har fokus sessiya reytingni oshiradi 💪"
}

/** Where the CTA should take the user, and what it should say — metric-aware. A
 * focus_minutes challenge deep-links to the Taymer; a flashcard_reviews
 * challenge to Kartalar; the rest to Kurslar. "Fokusni boshlash" only makes
 * sense for focus_minutes — every other metric gets a generic "Davom etish". */
export function metricCtaRoute(metric: Challenge['metric']): string {
  switch (metric) {
    case 'focus_minutes':     return '/(tabs)/study'
    case 'flashcard_reviews': return '/(tabs)/flashcards'
    default:                  return '/(tabs)/courses'
  }
}

export function metricCtaLabel(metric: Challenge['metric']): string {
  return metric === 'focus_minutes' ? 'Fokusni boshlash' : 'Davom etish'
}

/** The plain-language goal sentence for a challenge, by type — shared by the Ochiq card and the detail screen. */
export function challengeGoalText(ch: Challenge): string {
  if (ch.challenge_type === 'consistency') {
    return `Har kuni kamida ${fmtMetricGoal(ch.daily_minimum ?? 0, ch.metric)} · ${ch.required_days} kun ketma-ket`
  }
  if (ch.challenge_type === 'sprint') {
    return `Maqsadsiz — muddat ichida eng ko'p to'plagan ${ch.winner_count ?? 1} kishi yutadi`
  }
  if (ch.challenge_type === 'team') {
    return `${ch.team_a_name ?? 'Guruh A'} vs ${ch.team_b_name ?? 'Guruh B'} — jamoaviy raqobat, g'olib guruh a'zolari mukofot oladi`
  }
  const days = daysBetween(ch.starts_at, ch.ends_at)
  return `${days} kun ichida ${fmtMetricGoal(ch.target_value ?? 0, ch.metric)}`
}

const METRIC_RULE_TEXT: Record<Challenge['metric'], string> = {
  focus_minutes:     'Faqat fokus taymer vaqti hisoblanadi.',
  flashcard_reviews: "Faqat takrorlangan kartochkalar hisoblanadi.",
  lessons_completed: 'Yakunlangan darslar hisoblanadi.',
  courses_completed: 'Yakunlangan kurslar hisoblanadi.',
  tests_passed:      "80% va undan yuqori natija bilan topshirilgan testlar hisoblanadi.",
}

export function metricRuleText(metric: Challenge['metric']): string {
  return METRIC_RULE_TEXT[metric]
}

/** Team standing line — always an invitation, never guilt (step-25 Part 5/7). */
export function teamStandingLine(myTotal: number, otherTotal: number, metric: Challenge['metric']): string {
  const diff = Math.abs(myTotal - otherTotal)
  const diffStr = fmtMetricGoal(diff, metric)
  if (myTotal >= otherTotal) {
    return diff === 0 ? "Durrang holatida — hal qiluvchi zarbani bering! 🔥" : `Guruhingiz ${diffStr} oldinda! 🔥`
  }
  return `Guruhingizga yordam kerak — ${diffStr} orqada, har daqiqa muhim! 💪`
}
