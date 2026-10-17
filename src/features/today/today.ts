/**
 * Pure helpers for Bugun (Home). No React, no I/O — unit-tested in
 * __tests__/today.test.ts.
 */

/** Ordinary Uzbek ʻ (U+02BB) in oʻ / gʻ, for server and legacy strings
 *  that still carry an ASCII apostrophe or a curly quote. */
export function uzText(s: string): string {
  return s.replace(/([oOgG])['‘’`]/g, '$1ʻ')
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Xayrli tong'
  if (hour >= 11 && hour < 17) return 'Xayrli kun'
  return 'Xayrli kech'
}

/** Rough review time: ~8 s per card, at least one minute. */
export function reviewMinutes(cards: number): number {
  return Math.max(1, Math.ceil((cards * 8) / 60))
}

export function quizClosesIn(seconds: number): string {
  if (seconds <= 0) return 'Yopildi'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `Yopilishiga ${h} s ${m} d`
}

export function isMonday(d: Date): boolean {
  return d.getDay() === 1
}

export const MINUTE_MS = 60_000

/** Local calendar date as yyyy-mm-dd. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WEEKDAY_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'] as const
const WEEKDAY_LONG = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'] as const

/** "2026-10-19" → "Du" / "Dushanba" (parsed as a local date). */
export function weekdayOf(isoDate: string): { short: string; long: string } {
  const [y, m, d] = isoDate.split('-').map(Number)
  const day = new Date(y, (m ?? 1) - 1, d ?? 1).getDay()
  return { short: WEEKDAY_SHORT[day], long: WEEKDAY_LONG[day] }
}

// ── Weekly rank ──────────────────────────────────────────────────────────────

export interface RankEntry { rank: number; score: number; is_me?: boolean }

export type RankGap =
  | { kind: 'none' }                                   // not ranked this week
  | { kind: 'top'; rank: 1 }
  | { kind: 'unknown'; rank: number }                  // ranked, but the row above isn't loaded
  | { kind: 'gap'; rank: number; target: number; xp: number; progress: number }

export function rankGap(entries: readonly RankEntry[], myRank: number | null | undefined): RankGap {
  if (myRank == null || myRank < 1) return { kind: 'none' }
  if (myRank === 1) return { kind: 'top', rank: 1 }
  const me = entries.find(e => e.is_me) ?? entries.find(e => e.rank === myRank)
  const above = entries.find(e => e.rank === myRank - 1)
  if (!me || !above) return { kind: 'unknown', rank: myRank }
  const xp = Math.max(1, above.score - me.score)
  const progress = above.score > 0 ? Math.min(1, Math.max(0, me.score / above.score)) : 0
  return { kind: 'gap', rank: myRank, target: myRank - 1, xp, progress }
}

// ── Today plan ───────────────────────────────────────────────────────────────

export interface PlanInput {
  quiz: { number: number; state: 'not_started' | 'in_progress' | 'submitted'; correct: number | null; secondsLeft: number; answered?: number } | null
  /** null = the user has no decks, so the row is hidden. */
  dueCards: number | null
  course: { id: number; title: string; progress: number } | null
}

export type PlanRowKey = 'quiz' | 'cards' | 'course'

export interface PlanRow {
  key: PlanRowKey
  title: string
  subtitle: string
  done: boolean
}

/** Rows in plan order with done rows moved to the bottom, plus the count. */
export function buildPlanRows(input: PlanInput): { rows: PlanRow[]; done: number; total: number } {
  const rows: PlanRow[] = []

  if (input.quiz) {
    const q = input.quiz
    const done = q.state === 'submitted'
    rows.push({
      key: 'quiz',
      title: `5 Savol #${q.number}`,
      subtitle: done
        ? `${q.correct ?? 0}/5 · bajarildi`
        : q.state === 'in_progress' && (q.answered ?? 0) > 0
          ? `Davom etish · ${q.answered}/5 · ${quizClosesIn(q.secondsLeft)}`
          : quizClosesIn(q.secondsLeft),
      done,
    })
  }

  if (input.dueCards != null) {
    const n = input.dueCards
    rows.push({
      key: 'cards',
      title: 'Kartalar',
      subtitle: n > 0 ? `${n} ta · ~${reviewMinutes(n)} daq` : 'Bugun takrorlash yoʻq',
      done: n === 0,
    })
  }

  if (input.course) {
    const pct = Math.round(Math.min(1, Math.max(0, input.course.progress)) * 100)
    rows.push({
      key: 'course',
      title: uzText(input.course.title),
      subtitle: `${pct}% bajarildi`,
      done: input.course.progress >= 1,
    })
  }

  const sorted = [...rows.filter(r => !r.done), ...rows.filter(r => r.done)]
  const done = rows.filter(r => r.done).length
  return { rows: sorted, done, total: rows.length }
}

/** The unfinished enrolled course with the most progress (ties: first). */
export function pickCurrentCourse<T extends { progress: number }>(enrolled: readonly T[]): T | null {
  let best: T | null = null
  for (const e of enrolled) {
    if (e.progress >= 1) continue
    if (!best || e.progress > best.progress) best = e
  }
  return best
}

/** The deck with the most due cards, or null when nothing is due. */
export function pickTopDueDeck<T extends { id: number; due_count: number }>(decks: readonly T[]): { id: number; due: number } | null {
  let best: T | null = null
  for (const d of decks) if (d.due_count > 0 && (!best || d.due_count > best.due_count)) best = d
  return best ? { id: best.id, due: best.due_count } : null
}
