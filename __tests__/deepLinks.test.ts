import { describe, expect, it } from '@jest/globals'
import { parseDeepLink } from '../lib/deepLinks'

// The link table: every link that worked before the redesign must still
// open the same screen. Add rows, never remove them.
const OLD_LINKS: [string, string][] = [
  ['sahifalab://', '/(tabs)'],
  ['sahifalab://home', '/(tabs)'],
  ['sahifalab://study', '/(tabs)/study'],
  ['sahifalab://courses', '/(tabs)/courses'],
  ['sahifalab://notifications', '/(tabs)/notifications'],
  ['sahifalab://profile', '/(tabs)/profile'],
  ['sahifalab://profile/12345', '/(screens)/profile/12345'],
  ['sahifalab://streak-detail', '/(screens)/streak-detail'],
  ['sahifalab://leaderboard', '/(screens)/leaderboard'],
  ['sahifalab://course/7', '/(screens)/course/7'],
  ['sahifalab://courses/7', '/(screens)/course/7'],
  ['sahifalab://courses/7/lesson/99', '/(screens)/lesson/99'],
  ['sahifalab://tests/5', '/(screens)/test/5'],
  ['sahifalab://certificates/abc', '/(screens)/certificate/abc'],
  ['sahifalab://payment-complete/42', '/(screens)/payment-complete/42'],
  ['sahifalab://flashcards', '/(tabs)/flashcards'],
  ['sahifalab://flashcards/3', '/(screens)/flashcard-deck/3'],
  ['sahifalab://flashcards/3/study', '/(screens)/flashcard-study/3'],
  ['sahifalab://deck/8', '/(screens)/public-deck/8'],
  ['https://sahifalab.uz/deck/8', '/(screens)/public-deck/8'],
  ['https://www.sahifalab.uz/deck/8', '/(screens)/public-deck/8'],
  ['sahifalab://ai/flashcards', '/(screens)/ai-flashcard-generate'],
  ['sahifalab://weekly-review', '/(screens)/weekly-review'],
  ['sahifalab://daily-quiz', '/(screens)/daily-quiz'],
]

// New names (redesign Phase 4a). Books open sahifalab.uz via their routes.
const NEW_LINKS: [string, string][] = [
  ['sahifalab://bugun', '/(tabs)'],
  ['sahifalab://fokus', '/(tabs)/study'],
  ['sahifalab://kurslar', '/(tabs)/courses'],
  ['sahifalab://kartalar', '/(tabs)/flashcards'],
  ['sahifalab://bellashuv', '/(tabs)/musobaqalar'],
  ['sahifalab://musobaqalar', '/(tabs)/musobaqalar'],
  ['sahifalab://challenge/haftalik-sprint', '/(screens)/challenge/haftalik-sprint'],
  ['sahifalab://bellashuv/haftalik-sprint', '/(screens)/challenge/haftalik-sprint'],
  ['sahifalab://books', '/(screens)/books'],
  ['sahifalab://kitoblar', '/(screens)/books'],
  ['sahifalab://book/12', '/(screens)/book/12'],
  ['sahifalab://kitoblar/12', '/(screens)/book/12'],
  ['sahifalab://read/12', '/(screens)/book-reader/12'],
  ['sahifalab://badges', '/(screens)/badges'],
  ['sahifalab://nishonlar', '/(screens)/badges'],
]

describe('deep links: redesign names', () => {
  it.each(NEW_LINKS)('%s → %s', (url, route) => {
    expect(parseDeepLink(url)).toBe(route)
  })
})

describe('deep links: every old link keeps its destination', () => {
  it.each(OLD_LINKS)('%s → %s', (url, route) => {
    expect(parseDeepLink(url)).toBe(route)
  })

  it('returns null for unknown links', () => {
    expect(parseDeepLink('sahifalab://nope')).toBeNull()
    expect(parseDeepLink('https://example.com/deck/8')).toBeNull()
  })
})
