/**
 * Today's review queue (redesign Phase 7.5 A1) — the ONE card count the app
 * shows: Bugun's button and plan tile, the Kartalar hero, deck badges and
 * how long a study session runs all read it. No other count may be shown.
 *
 *   reviewsDue = cards in learning/review due by the end of the user's local
 *                day (server: reviews_due_today), at most REVIEW_CAP a day
 *   newToday   = per deck, min(daily limit ?? 20, new cards left) minus the
 *                new cards already introduced today
 *   total      = reviewsDue + newToday
 *   estMinutes = ceil(total × 7 s / 60) — 5.2 s measured average plus margin
 *
 * Overdue backlogs are not re-spread here (the scheduler is untouched); the
 * cap only limits what is shown and studied today.
 *
 * This file is the pure part (no stores; safe for other pure modules and
 * tests). The store-bound selectors are in ./queue.
 */
import type { FlashcardDeck, FlashcardStats } from '../../../lib/types'

/** Same as the backend's DEFAULT_NEW_PER_DAY: decks without a limit. */
export const DEFAULT_NEW_PER_DAY = 20
export const REVIEW_CAP = 150
export const SECONDS_PER_CARD = 7

export type QueueDeck = Pick<FlashcardDeck, 'id' | 'due_count'> &
  Partial<Pick<FlashcardDeck, 'new_per_day' | 'reviews_due_today' | 'new_available' | 'introduced_today'>>

export interface DeckQueue { reviews: number; fresh: number; total: number }

export interface TodayQueue {
  reviewsDue: number
  newToday: number
  total: number
  estMinutes: number
  /** More reviews were due than REVIEW_CAP allows today. */
  capped: boolean
  perDeck: Record<number, DeckQueue>
  /** The deck with the most cards today, or null when nothing is due. */
  top: { id: number; due: number } | null
}

export const EMPTY_QUEUE: TodayQueue = { reviewsDue: 0, newToday: 0, total: 0, estMinutes: 0, capped: false, perDeck: {}, top: null }

export function estMinutes(cards: number): number {
  return cards > 0 ? Math.ceil((cards * SECONDS_PER_CARD) / 60) : 0
}

function newLeft(d: QueueDeck): number {
  const limit = d.new_per_day ?? DEFAULT_NEW_PER_DAY
  // Older backends don't send new_available: due_count then holds the new
  // cards (plus reviews), an upper bound that the daily limit clips anyway.
  const available = d.new_available ?? Math.max(0, d.due_count)
  return Math.max(0, Math.min(limit, available) - (d.introduced_today ?? 0))
}

/**
 * Pure. `reviewedToday` is how many reviews of already-learned cards were
 * done today (they count against the cap); `fallbackReviewsDue` is the
 * total for backends that don't send reviews_due_today per deck.
 */
export function todayReviewQueue(
  decks: readonly QueueDeck[],
  opts: { reviewedToday?: number; fallbackReviewsDue?: number } = {},
): TodayQueue {
  if (decks.length === 0) return EMPTY_QUEUE
  const perDeckFields = decks.every(d => d.reviews_due_today != null)
  const capLeft = Math.max(0, REVIEW_CAP - Math.max(0, opts.reviewedToday ?? 0))

  // Most-due decks take the capped reviews first.
  const order = [...decks].sort((a, b) => (b.reviews_due_today ?? 0) - (a.reviews_due_today ?? 0))
  let budget = capLeft
  let rawReviews = 0
  const perDeck: Record<number, DeckQueue> = {}
  for (const d of order) {
    const raw = perDeckFields ? d.reviews_due_today ?? 0 : 0
    rawReviews += raw
    const reviews = Math.min(raw, budget)
    budget -= reviews
    const fresh = newLeft(d)
    perDeck[d.id] = { reviews, fresh, total: reviews + fresh }
  }

  if (!perDeckFields) rawReviews = Math.max(0, opts.fallbackReviewsDue ?? 0)
  const reviewsDue = Math.min(rawReviews, capLeft)
  const newToday = decks.reduce((n, d) => n + perDeck[d.id].fresh, 0)
  const total = reviewsDue + newToday

  let top: TodayQueue['top'] = null
  for (const d of decks) {
    const due = perDeck[d.id].total
    if (due > 0 && (!top || due > top.due)) top = { id: d.id, due }
  }

  return { reviewsDue, newToday, total, estMinutes: estMinutes(total), capped: rawReviews > capLeft, perDeck, top }
}

/** Reviews of learned cards done today = all reviews today minus first reviews. */
export function reviewsDoneToday(decks: readonly QueueDeck[], stats: Pick<FlashcardStats, 'today_reviewed'> | null): number {
  const introduced = decks.reduce((n, d) => n + (d.introduced_today ?? 0), 0)
  return Math.max(0, (stats?.today_reviewed ?? 0) - introduced)
}

/**
 * A study session's cards (reviews first, then new — the server's order)
 * trimmed to the reviews still allowed today for that deck. New cards are
 * already limited by the server. `allowedReviews` undefined = no trim
 * (deck not in the local store, or an older backend).
 */
export function trimSession<T extends { status: string }>(cards: readonly T[], allowedReviews: number | undefined): T[] {
  if (allowedReviews == null) return [...cards]
  let left = Math.max(0, allowedReviews)
  return cards.filter(c => {
    if (c.status === 'new') return true
    if (left === 0) return false
    left -= 1
    return true
  })
}
