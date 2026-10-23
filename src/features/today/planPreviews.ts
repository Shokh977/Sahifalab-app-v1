/**
 * Fixed "Bugungi reja" states for the dev gallery and the tests: 4 tasks,
 * 5 tasks (one course), all done, a tournament without a rank yet, and a
 * very long course title. Times are relative to `nowMs` so the bars and
 * "… qoldi" read the same whenever the gallery is opened.
 */
import type { PlanCardsInput } from './planCards'

const DAY = 86_400_000
const WEEK = [35, 50, 20, 0, 45, 25, 0]

function base(nowMs: number): PlanCardsInput {
  return {
    focus: { minutes: 12, goal: 25 },
    quiz: { number: 214, state: 'not_started', correct: null, secondsLeft: 8 * 3600 + 25 * 60 },
    cards: { due: 48, reviewed: 22, estMinutes: 6 },
    courses: [],
    competitions: [{
      id: 'c1', slug: 'oktabr-marafoni', title: 'Oktabr fokus marafoni', rank: 7, participants: 93,
      startsAt: new Date(nowMs - 9 * DAY).toISOString(), endsAt: new Date(nowMs + 5 * DAY).toISOString(), joined: true,
    }],
    review: { isNew: true, lastWeek: WEEK },
    nowMs,
  }
}

export interface PlanPreview { name: string; input: PlanCardsInput; next: 'focus' | 'quiz' | 'cards' | 'course' | null }

export function planPreviews(nowMs: number): PlanPreview[] {
  const four = base(nowMs)
  const five: PlanCardsInput = {
    ...base(nowMs),
    courses: [{ id: 3, title: 'Ingliz tili: boshlangʻich', progress: 0.3, totalLessons: 10 }],
  }
  const allDone: PlanCardsInput = {
    ...base(nowMs),
    focus: { minutes: 40, goal: 25 },
    quiz: { number: 214, state: 'submitted', correct: 4, secondsLeft: 3600, rank: 12 },
    cards: { due: 0, reviewed: 70, estMinutes: 0 },
    courses: [{ id: 3, title: 'Ingliz tili: boshlangʻich', progress: 1, totalLessons: 10 }],
    review: { isNew: false, lastWeek: WEEK },
  }
  const noRank: PlanCardsInput = {
    ...base(nowMs),
    competitions: [{ ...base(nowMs).competitions[0], rank: null }],
  }
  const longTitle: PlanCardsInput = {
    ...base(nowMs),
    courses: [{
      id: 9, title: 'Moliyaviy savodxonlik: shaxsiy byudjet, jamgʻarma va investitsiyaning asosiy tamoyillari',
      progress: 0.55, totalLessons: 24,
    }],
  }
  return [
    { name: '4 ta vazifa', input: four, next: 'cards' },
    { name: '5 ta (1 kurs)', input: five, next: 'focus' },
    { name: 'Hammasi bajarildi', input: allDone, next: null },
    { name: 'Reyting yoʻq', input: noRank, next: 'quiz' },
    { name: 'Uzun kurs nomi', input: longTitle, next: 'course' },
  ]
}
