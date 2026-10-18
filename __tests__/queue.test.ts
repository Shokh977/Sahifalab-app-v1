import { describe, expect, it } from '@jest/globals'
import {
  DEFAULT_NEW_PER_DAY, REVIEW_CAP, estMinutes, reviewsDoneToday, todayReviewQueue, trimSession, type QueueDeck,
} from '../src/features/flashcards/queueMath'


const deck = (id: number, over: Partial<QueueDeck> = {}): QueueDeck => ({
  id, due_count: 0, new_per_day: null, reviews_due_today: 0, new_available: 0, introduced_today: 0, ...over,
})

describe('todayReviewQueue', () => {
  it('turns 4 459 new cards in an old deck into 20 for today', () => {
    const q = todayReviewQueue([deck(1, { due_count: 4459, new_available: 4459 })])
    expect(q.newToday).toBe(DEFAULT_NEW_PER_DAY)
    expect(q.total).toBe(20)
    expect(q.estMinutes).toBe(3)
  })

  it('adds reviews to each deck\'s new cards and respects the deck limit', () => {
    const q = todayReviewQueue([
      deck(1, { reviews_due_today: 30, new_available: 4459 }),
      deck(2, { reviews_due_today: 5, new_available: 200, new_per_day: 10, introduced_today: 4 }),
      deck(3, { new_available: 3 }),
    ])
    expect(q.reviewsDue).toBe(35)
    expect(q.newToday).toBe(20 + 6 + 3)
    expect(q.total).toBe(64)
    expect(q.perDeck[2]).toEqual({ reviews: 5, fresh: 6, total: 11 })
    expect(q.top).toEqual({ id: 1, due: 50 })
    expect(q.capped).toBe(false)
  })

  it('caps reviews at 150 a day, most-due decks first', () => {
    const q = todayReviewQueue([
      deck(1, { reviews_due_today: 40 }),
      deck(2, { reviews_due_today: 700 }),
    ])
    expect(q.reviewsDue).toBe(REVIEW_CAP)
    expect(q.capped).toBe(true)
    expect(q.perDeck[2].reviews).toBe(150)
    expect(q.perDeck[1].reviews).toBe(0)
  })

  it('counts reviews already done today against the cap', () => {
    const q = todayReviewQueue([deck(1, { reviews_due_today: 500 })], { reviewedToday: 120 })
    expect(q.reviewsDue).toBe(30)
    expect(todayReviewQueue([deck(1, { reviews_due_today: 500 })], { reviewedToday: 200 }).reviewsDue).toBe(0)
  })

  it('falls back to the stats total on an older backend', () => {
    const old: QueueDeck = { id: 1, due_count: 4459 }
    const q = todayReviewQueue([old], { fallbackReviewsDue: 778 })
    expect(q.reviewsDue).toBe(150)
    expect(q.newToday).toBe(20)
    expect(q.capped).toBe(true)
  })

  it('is empty with no decks or nothing due', () => {
    expect(todayReviewQueue([]).total).toBe(0)
    const q = todayReviewQueue([deck(1)])
    expect(q.total).toBe(0)
    expect(q.top).toBeNull()
    expect(q.estMinutes).toBe(0)
  })
})

describe('helpers', () => {
  it('estimates 7 s a card, rounded up', () => {
    expect(estMinutes(1)).toBe(1)
    expect(estMinutes(48)).toBe(6)
    expect(estMinutes(150)).toBe(18)
  })
  it('counts only re-reviews toward the cap', () => {
    expect(reviewsDoneToday([deck(1, { introduced_today: 12 })], { today_reviewed: 40 })).toBe(28)
    expect(reviewsDoneToday([deck(1, { introduced_today: 12 })], null)).toBe(0)
  })
})

describe('trimSession', () => {
  const cards = [
    { id: 1, status: 'reviewing' }, { id: 2, status: 'learning' }, { id: 3, status: 'reviewing' },
    { id: 4, status: 'new' }, { id: 5, status: 'new' },
  ]
  it('keeps the allowed reviews and every new card', () => {
    expect(trimSession(cards, 1).map(c => c.id)).toEqual([1, 4, 5])
    expect(trimSession(cards, 0).map(c => c.id)).toEqual([4, 5])
  })
  it('leaves the session alone when the allowance is unknown', () => {
    expect(trimSession(cards, undefined)).toHaveLength(5)
  })
})
