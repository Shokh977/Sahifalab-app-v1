import { describe, expect, it } from '@jest/globals'
import {
  buildPlanRows, greeting, isMonday, localDateKey, pickCurrentCourse, pickTopDueDeck, quizClosesIn,
  rankGap, reviewMinutes, uzText, weekdayOf,
} from '../src/features/today/today'

describe('uzText', () => {
  it('turns ASCII and curly apostrophes after o/g into ʻ', () => {
    expect(uzText("O'zgarish urug'i")).toBe('Oʻzgarish urugʻi')
    expect(uzText('Ko‘proq so’m')).toBe('Koʻproq soʻm')
    expect(uzText('ta’lim')).toBe('ta’lim')
  })
})

describe('greeting', () => {
  it.each([[5, 'Xayrli tong'], [10, 'Xayrli tong'], [11, 'Xayrli kun'], [16, 'Xayrli kun'], [17, 'Xayrli kech'], [2, 'Xayrli kech']])(
    '%i:00 → %s', (h, g) => expect(greeting(h)).toBe(g),
  )
})

describe('small helpers', () => {
  it('reviewMinutes', () => {
    expect(reviewMinutes(1)).toBe(1)
    expect(reviewMinutes(15)).toBe(2)
    expect(reviewMinutes(30)).toBe(4)
  })
  it('quizClosesIn', () => {
    expect(quizClosesIn(3 * 3600 + 25 * 60 + 9)).toBe('Yopilishiga 3 s 25 d')
    expect(quizClosesIn(0)).toBe('Yopildi')
  })
  it('isMonday / localDateKey / weekdayOf', () => {
    expect(isMonday(new Date(2026, 9, 19))).toBe(true)
    expect(isMonday(new Date(2026, 9, 18))).toBe(false)
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(weekdayOf('2026-10-19')).toEqual({ short: 'Du', long: 'Dushanba' })
    expect(weekdayOf('2026-10-18')).toEqual({ short: 'Ya', long: 'Yakshanba' })
  })
})

describe('rankGap', () => {
  const entries = [
    { rank: 55, score: 500 },
    { rank: 56, score: 420 },
    { rank: 57, score: 300, is_me: true },
  ]
  it('measures the gap to the next rank', () => {
    expect(rankGap(entries, 57)).toEqual({ kind: 'gap', rank: 57, target: 56, xp: 120, progress: 300 / 420 })
  })
  it('handles first place, no rank and a missing row', () => {
    expect(rankGap(entries, 1)).toEqual({ kind: 'top', rank: 1 })
    expect(rankGap(entries, null)).toEqual({ kind: 'none' })
    expect(rankGap([{ rank: 1, score: 9 }], 80)).toEqual({ kind: 'unknown', rank: 80 })
  })
  it('never asks for 0 XP on a tie', () => {
    expect(rankGap([{ rank: 4, score: 10 }, { rank: 5, score: 10, is_me: true }], 5)).toMatchObject({ xp: 1 })
  })
})

describe('buildPlanRows', () => {
  it('moves done rows to the bottom and counts them', () => {
    const { rows, done, total } = buildPlanRows({
      quiz: { number: 67, state: 'submitted', correct: 4, secondsLeft: 100 },
      dueCards: 12,
      course: { id: 3, title: "Ingliz tili o'rganish", progress: 0.4 },
    })
    expect(rows.map(r => r.key)).toEqual(['cards', 'course', 'quiz'])
    expect(rows[0]).toEqual({ key: 'cards', title: 'Kartalar', subtitle: '12 ta · ~2 daq', done: false })
    expect(rows[1].title).toBe('Ingliz tili oʻrganish')
    expect(rows[1].subtitle).toBe('40% bajarildi')
    expect(rows[2].subtitle).toBe('4/5 · bajarildi')
    expect({ done, total }).toEqual({ done: 1, total: 3 })
  })
  it('hides rows without data and marks 0 due as done', () => {
    const r = buildPlanRows({ quiz: { number: 2, state: 'not_started', correct: null, secondsLeft: 3700 }, dueCards: 0, course: null })
    expect(r.rows.map(x => [x.key, x.done])).toEqual([['quiz', false], ['cards', true]])
    expect(r.rows[0].subtitle).toBe('Yopilishiga 1 s 1 d')
    expect(buildPlanRows({ quiz: null, dueCards: null, course: null })).toEqual({ rows: [], done: 0, total: 0 })
    const resumed = buildPlanRows({ quiz: { number: 2, state: 'in_progress', correct: null, secondsLeft: 600, answered: 3 }, dueCards: null, course: null })
    expect(resumed.rows[0].subtitle).toBe('Davom etish · 3/5 · Yopilishiga 0 s 10 d')
  })
})

describe('pickers', () => {
  it('pickCurrentCourse takes the unfinished course with most progress', () => {
    expect(pickCurrentCourse([{ id: 1, progress: 1 }, { id: 2, progress: 0.3 }, { id: 3, progress: 0.6 }])).toEqual({ id: 3, progress: 0.6 })
    expect(pickCurrentCourse([{ id: 1, progress: 1 }])).toBeNull()
  })
  it('pickTopDueDeck takes the deck with most due cards', () => {
    expect(pickTopDueDeck([{ id: 1, due_count: 2 }, { id: 2, due_count: 9 }, { id: 3, due_count: 0 }])).toEqual({ id: 2, due: 9 })
    expect(pickTopDueDeck([{ id: 1, due_count: 0 }])).toBeNull()
  })
})
