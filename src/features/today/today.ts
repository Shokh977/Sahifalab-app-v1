/**
 * Pure helpers for Bugun (Home). No React, no I/O — unit-tested in
 * __tests__/today.test.ts.
 */
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

/** "3 s 25 d qoldi" — the tile-sized countdown. */
export function quizClosesShort(seconds: number): string {
  if (seconds <= 0) return 'Yopildi'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h} s ${m} d qoldi`
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

/** The daily task the primary action points at ("next"). */
export type PlanKey = 'focus' | 'quiz' | 'cards' | 'course'

/** Which tile the primary action points at. */
export function nextTileKey(target: 'focus' | 'quiz' | 'review' | 'course' | 'none'): PlanKey | null {
  return target === 'review' ? 'cards' : target === 'none' ? null : target
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
