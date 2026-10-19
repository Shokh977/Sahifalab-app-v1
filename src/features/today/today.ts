/**
 * Pure helpers for Bugun (Home). No React, no I/O — unit-tested in
 * __tests__/today.test.ts.
 */
import { focusLabel } from './focusLabel'

/** Ordinary Uzbek ʻ (U+02BB) in oʻ / gʻ, for server and legacy strings
 *  that still carry an ASCII apostrophe or a curly quote. */
export function uzText(s: string): string {
  return s.replace(/([oOgG])['‘’`]/g, '$1ʻ')
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

// ── Today plan (Phase 7.5 C3: a 2×2 grid of tiles) ──────────────────────────

export interface PlanInput {
  /** Always in the plan (Phase 7.5 A6). */
  focus: { minutes: number; goal: number }
  quiz: {
    number: number
    state: 'not_started' | 'in_progress' | 'submitted'
    correct: number | null
    secondsLeft: number
    answered?: number
    /** Your place once submitted (newer backends). */
    rank?: number | null
  } | null
  /** Today's review queue; null = no decks, so no tile. */
  cards: { total: number; estMinutes: number } | null
  course: { id: number; title: string; progress: number; totalLessons: number } | null
}

export type PlanKey = 'focus' | 'quiz' | 'cards' | 'course'
/** Kept for callers that still name rows. */
export type PlanRowKey = PlanKey

export interface PlanTileData {
  key: PlanKey
  value: string
  title: string
  sub?: string
  /** 0–1: a bar instead of the sub-line (the course). */
  progress?: number
  /** Top-right text on an unfinished tile ("30%"). */
  status?: string
  done: boolean
  next: boolean
}

/** Which tile the primary action points at. */
export function nextTileKey(target: 'focus' | 'quiz' | 'review' | 'course' | 'none'): PlanKey | null {
  return target === 'review' ? 'cards' : target === 'none' ? null : target
}

/**
 * The plan's tiles: Fokus, 5 Savol, Kartalar (with decks), the course (when
 * enrolled). Order: the "next" tile, the other unfinished ones, then done.
 */
export function planTiles(input: PlanInput, next: PlanKey | null): { tiles: PlanTileData[]; done: number; total: number } {
  const tiles: PlanTileData[] = []

  const f = focusLabel(input.focus.minutes, input.focus.goal)
  const goal = input.focus.goal > 0 ? input.focus.goal : 20
  tiles.push({
    key: 'focus',
    value: `${Math.max(0, Math.floor(input.focus.minutes))} daq`,
    title: 'Fokus',
    sub: `Maqsad ${goal} daq`,
    done: f.done,
    next: false,
  })

  if (input.quiz) {
    const q = input.quiz
    const done = q.state === 'submitted'
    const answered = q.answered ?? 0
    tiles.push({
      key: 'quiz',
      value: done ? `${q.correct ?? 0}/5` : q.state === 'in_progress' && answered > 0 ? `${answered}/5` : 'Oʻynash',
      title: `5 Savol #${q.number}`,
      sub: done
        ? (q.rank ? `#${q.rank}-oʻrin bugun` : 'Bajarildi')
        : quizClosesIn(q.secondsLeft),
      done,
      next: false,
    })
  }

  if (input.cards) {
    const n = input.cards.total
    tiles.push({
      key: 'cards',
      value: `${n} ta`,
      title: 'Kartalar',
      sub: n > 0 ? `~${input.cards.estMinutes} daqiqa` : 'Bugun takrorlash yoʻq',
      done: n === 0,
      next: false,
    })
  }

  if (input.course) {
    const c = input.course
    const p = Math.min(1, Math.max(0, c.progress))
    const lesson = c.totalLessons > 0 ? Math.min(c.totalLessons, Math.round(p * c.totalLessons) + 1) : 1
    tiles.push({
      key: 'course',
      value: `${lesson}-dars`,
      title: uzText(c.title),
      progress: p,
      status: `${Math.round(p * 100)}%`,
      done: p >= 1,
      next: false,
    })
  }

  const nextTile = tiles.find(t => t.key === next && !t.done)
  if (nextTile) nextTile.next = true
  const ordered = [
    ...tiles.filter(t => t.next),
    ...tiles.filter(t => !t.next && !t.done),
    ...tiles.filter(t => t.done),
  ]
  return { tiles: ordered, done: tiles.filter(t => t.done).length, total: tiles.length }
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
