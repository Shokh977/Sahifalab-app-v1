/**
 * Deep link URL → in-app route. Moved out of app/_layout.tsx (redesign
 * Phase 4a) so every link can be unit-tested — __tests__/deepLinks.test.ts
 * is the old-link → destination table. Rule: never drop an entry; add
 * aliases and redirect instead.
 *
 * Handles sahifalab://… and https://(www.)sahifalab.uz/… alike.
 */
export function parseDeepLink(url: string): string | null {
  const path  = url
    .replace(/^sahifalab:\/\//, '')
    .replace(/^https?:\/\/(www\.)?sahifalab\.uz\/?/, '')
  const parts = path.split('/')
  const seg0  = parts[0] ?? ''
  const seg1  = parts[1]
  const seg2  = parts[2]
  const seg3  = parts[3]

  // Dynamic profile must be checked before tabRoutes swallows bare "profile"
  if (seg0 === 'profile' && seg1) return `/(screens)/profile/${seg1}`
  if (seg0 === 'streak-detail')   return '/(screens)/streak-detail'

  const tabRoutes: Record<string, string> = {
    '':            '/(tabs)',
    home:          '/(tabs)',
    study:         '/(tabs)/study',
    courses:       '/(tabs)/courses',
    notifications: '/(tabs)/notifications',
    profile:       '/(tabs)/profile',
    // Redesign tab names (Phase 4a): Bugun · Fokus · Kurslar · Kartalar · Bellashuv
    bugun:         '/(tabs)',
    fokus:         '/(tabs)/study',
    kurslar:       '/(tabs)/courses',
    kartalar:      '/(tabs)/flashcards',
    bellashuv:     '/(tabs)/musobaqalar',
    musobaqalar:   '/(tabs)/musobaqalar',
  }
  // Bare tab links only: "courses/7" and "courses/7/lesson/9" used to stop
  // here and open the Kurslar tab instead of the course (bug found by the
  // Phase 4a link table).
  if (seg0 in tabRoutes && !seg1) return tabRoutes[seg0]

  if (seg0 === 'leaderboard')                              return '/(screens)/leaderboard'
  // Badge page (Phase 5)
  if (seg0 === 'badges' || seg0 === 'nishonlar')           return '/(screens)/badges'
  // Competition detail: sahifalab://challenge/{slug} (also bellashuv/{slug})
  if ((seg0 === 'challenge' || seg0 === 'bellashuv') && seg1) return `/(screens)/challenge/${seg1}`
  // Books left the app (Phase 4a): these routes open sahifalab.uz instead.
  if ((seg0 === 'books' || seg0 === 'kitoblar') && !seg1)  return '/(screens)/books'
  if ((seg0 === 'book' || seg0 === 'kitoblar') && seg1)    return `/(screens)/book/${seg1}`
  if (seg0 === 'read' && seg1)                             return `/(screens)/book-reader/${seg1}`
  if (seg0 === 'course'          && seg1)                  return `/(screens)/course/${seg1}`
  // sahifalab://courses/{id}/lesson/{lessonId}
  if (seg0 === 'courses' && seg1 && seg2 === 'lesson' && seg3)
                                                           return `/(screens)/lesson/${seg3}`
  // sahifalab://courses/{id}
  if (seg0 === 'courses' && seg1 && !seg2)                 return `/(screens)/course/${seg1}`
  if (seg0 === 'tests'           && seg1)                  return `/(screens)/test/${seg1}`
  if (seg0 === 'certificates'    && seg1)                  return `/(screens)/certificate/${seg1}`
  if (seg0 === 'payment-complete'&& seg1)                  return `/(screens)/payment-complete/${seg1}`
  // Flashcard deep links
  // sahifalab://flashcards → Kartalar tab
  if (seg0 === 'flashcards' && !seg1)                      return '/(tabs)/flashcards'
  // sahifalab://flashcards/{id} → deck detail
  if (seg0 === 'flashcards' && seg1 && seg2 !== 'study')   return `/(screens)/flashcard-deck/${seg1}`
  // sahifalab://flashcards/{id}/study → study session
  if (seg0 === 'flashcards' && seg1 && seg2 === 'study')   return `/(screens)/flashcard-study/${seg1}`
  // sahifalab://deck/{id} or https://sahifalab.uz/deck/{id} → public deck preview
  if (seg0 === 'deck' && seg1)                             return `/(screens)/public-deck/${seg1}`
  // 088/089 Tanga+AI deep links
  // sahifalab://ai/flashcards → AI flashcard-generation screen
  if (seg0 === 'ai' && seg1 === 'flashcards')              return '/(screens)/ai-flashcard-generate'
  // sahifalab://weekly-review → this week's AI-generated personal review
  if (seg0 === 'weekly-review')                            return '/(screens)/weekly-review'
  // 090_daily_quiz — sahifalab://daily-quiz → today's "5 Savol"
  if (seg0 === 'daily-quiz')                               return '/(screens)/daily-quiz'

  return null
}
