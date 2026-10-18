/**
 * Pure helpers for Kartalar and the study screen (redesign Phase 6) —
 * tested in __tests__/cards.test.ts.
 */
import { estMinutes } from '../flashcards/queueMath'

/**
 * "18 ta karta bugun · ~3 daqiqa"; when today's 150-review cap bit:
 * "Bugun 150 ta · qolganlari ertaga".
 */
export function heroCopy(due: number, capped = false): string {
  return capped ? `Bugun ${due} ta · qolganlari ertaga` : `${due} ta karta bugun · ~${estMinutes(due)} daqiqa`
}

/** Copying a deck bigger than this asks how many new cards per day. */
export const DAILY_PROMPT_OVER = 50
export const DAILY_NEW_OPTIONS = [10, 20, 30] as const
export const DAILY_NEW_DEFAULT = 20

export function needsDailyPrompt(cardCount: number): boolean {
  return cardCount > DAILY_PROMPT_OVER
}

/** The four grades sent to SM-2 (the backend already scores 4 = easy). */
export const GRADES = [
  { rating: 1, label: 'Bilmayman', tone: 'danger' },
  { rating: 2, label: 'Qiyin', tone: 'warning' },
  { rating: 3, label: 'Bilaman', tone: 'success' },
  { rating: 4, label: 'Oson', tone: 'accent' },
] as const

export type Grade = (typeof GRADES)[number]['rating']

export interface ReviewOutcome { rating: number; nextReview: string | null }

/** End of the local day after `now`. */
function endOfTomorrow(nowMs: number): number {
  const d = new Date(nowMs)
  d.setDate(d.getDate() + 1)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/**
 * Session summary: accuracy (Bilaman/Oson count as correct, like the old
 * screen's rating ≥ 3) and how many of the reviewed cards come back by the
 * end of tomorrow (the server's next_review for each).
 */
export function sessionSummary(outcomes: readonly ReviewOutcome[], nowMs: number): { reviewed: number; correct: number; accuracy: number; tomorrow: number } {
  // A card failed and retried counts once, by its last grade.
  const reviewed = outcomes.length
  const correct = outcomes.filter(o => o.rating >= 3).length
  const limit = endOfTomorrow(nowMs)
  const tomorrow = outcomes.filter(o => o.nextReview != null && Date.parse(o.nextReview) <= limit).length
  return { reviewed, correct, accuracy: reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0, tomorrow }
}

/** "1 kun", "3 kun", "bugun" — the next-interval hint on a grade button. */
export function intervalHint(days: number | null | undefined): string | null {
  if (days == null) return null
  if (days <= 0) return 'bugun'
  return `${days} kun`
}
