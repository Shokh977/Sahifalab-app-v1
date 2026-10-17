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

describe('deep links: every old link keeps its destination', () => {
  it.each(OLD_LINKS)('%s → %s', (url, route) => {
    expect(parseDeepLink(url)).toBe(route)
  })

  it('returns null for unknown links', () => {
    expect(parseDeepLink('sahifalab://nope')).toBeNull()
    expect(parseDeepLink('https://example.com/deck/8')).toBeNull()
  })
})
