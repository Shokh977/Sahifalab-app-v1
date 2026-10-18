/**
 * Today's review queue selectors (redesign Phase 7.5 A1): the one card
 * count every screen shows, read from the flashcard store for the signed-in
 * user. The math, constants and docs are in ./queueMath.
 */
import { useAuthStore } from '../../../stores/authStore'
import { useFlashcardStore } from '../../../stores/flashcardStore'
import type { FlashcardDeck, FlashcardStats } from '../../../lib/types'
import { EMPTY_QUEUE, reviewsDoneToday, todayReviewQueue, type TodayQueue } from './queueMath'

export * from './queueMath'

function queueFor(decks: readonly FlashcardDeck[], stats: FlashcardStats | null): TodayQueue {
  return todayReviewQueue(decks, {
    reviewedToday: reviewsDoneToday(decks, stats),
    fallbackReviewsDue: stats?.total_due,
  })
}

/** The signed-in user's queue from the flashcard store (outside React). */
export function getTodayReviewQueue(userId: number | null | undefined): TodayQueue {
  if (userId == null) return EMPTY_QUEUE
  const { decks, stats } = useFlashcardStore.getState()
  return queueFor(decks.filter(d => d.user_id === userId), stats)
}

/** Hook form: re-renders when decks, stats or the user change. */
export function useTodayReviewQueue(): TodayQueue {
  const userId = useAuthStore(s => s.user?.telegram_id ?? null)
  const decks = useFlashcardStore(s => s.decks)
  const stats = useFlashcardStore(s => s.stats)
  if (userId == null) return EMPTY_QUEUE
  return queueFor(decks.filter(d => d.user_id === userId), stats)
}

/** Reviews still allowed today for one deck, when the store can tell. */
export function allowedReviewsFor(userId: number | null | undefined, deckId: number): number | undefined {
  if (userId == null) return undefined
  const deck = useFlashcardStore.getState().decks.find(d => d.id === deckId && d.user_id === userId)
  if (!deck || deck.reviews_due_today == null) return undefined
  return getTodayReviewQueue(userId).perDeck[deckId]?.reviews
}
