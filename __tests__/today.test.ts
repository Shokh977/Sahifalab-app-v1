import { describe, expect, it } from '@jest/globals'
import {
  isMonday, localDateKey, nextTileKey, pickCurrentCourse, planTiles, quizClosesIn,
  rankGap, uzText, weekdayOf,
} from '../src/features/today/today'

describe('uzText', () => {
  it('turns ASCII and curly apostrophes after o/g into ʻ', () => {
    expect(uzText("O'zgarish urug'i")).toBe('Oʻzgarish urugʻi')
    expect(uzText('Ko‘proq so’m')).toBe('Koʻproq soʻm')
    expect(uzText('ta’lim')).toBe('ta’lim')
  })
})

describe('small helpers', () => {
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

describe('planTiles', () => {
  const focus = { minutes: 12, goal: 20 }
  const quiz = { number: 67, state: 'not_started' as const, correct: null, secondsLeft: 3700 }
  const cards = { total: 48, estMinutes: 6 }
  const course = { id: 3, title: "Ingliz tili o'rganish", progress: 0.3, totalLessons: 10 }

  it('builds the four tiles with values and sub-lines', () => {
    const { tiles, done, total } = planTiles({ focus, quiz, cards, course }, null)
    const by = Object.fromEntries(tiles.map(t => [t.key, t]))
    expect(by.focus).toMatchObject({ value: '12 daq', title: 'Fokus', sub: 'Maqsad 20 daq', done: false })
    expect(by.quiz).toMatchObject({ value: 'Oʻynash', title: '5 Savol #67', sub: 'Yopilishiga 1 s 1 d', done: false })
    expect(by.cards).toMatchObject({ value: '48 ta', title: 'Kartalar', sub: '~6 daqiqa', done: false })
    expect(by.course).toMatchObject({ value: '4-dars', title: 'Ingliz tili oʻrganish', progress: 0.3, status: '30%', done: false })
    expect({ done, total }).toEqual({ done: 0, total: 4 })
  })

  it('puts the next tile first, then unfinished, then done', () => {
    const r = planTiles({
      focus: { minutes: 180, goal: 10 },
      quiz: { ...quiz, state: 'submitted', correct: 5, rank: 10 },
      cards, course,
    }, 'cards')
    expect(r.tiles.map(t => [t.key, t.next, t.done])).toEqual([
      ['cards', true, false], ['course', false, false], ['focus', false, true], ['quiz', false, true],
    ])
    expect(r.tiles.find(t => t.key === 'quiz')).toMatchObject({ value: '5/5', sub: '#10-oʻrin bugun' })
    expect(r.tiles.find(t => t.key === 'focus')).toMatchObject({ value: '180 daq', sub: 'Maqsad 10 daq' })
    expect(r.done).toBe(2)
  })

  it('never marks a done tile as next, and hides tiles without data', () => {
    const r = planTiles({ focus: { minutes: 30, goal: 20 }, quiz: null, cards: null, course: null }, 'focus')
    expect(r.tiles).toHaveLength(1)
    expect(r.tiles[0]).toMatchObject({ key: 'focus', next: false, done: true })
  })

  it('shows quiz progress and falls back when the rank is unknown', () => {
    const inProgress = planTiles({ focus, quiz: { ...quiz, state: 'in_progress', answered: 3 }, cards: null, course: null }, 'quiz')
    expect(inProgress.tiles[0]).toMatchObject({ key: 'quiz', value: '3/5', next: true, sub: '1 s 1 d qoldi' })
    const noRank = planTiles({ focus, quiz: { ...quiz, state: 'submitted', correct: 4 }, cards: null, course: null }, null)
    expect(noRank.tiles.find(t => t.key === 'quiz')?.sub).toBe('Bajarildi')
    const empty = planTiles({ focus, quiz: null, cards: { total: 0, estMinutes: 0 }, course: null }, null)
    expect(empty.tiles.find(t => t.key === 'cards')).toMatchObject({ done: true, sub: 'Bugun takrorlash yoʻq' })
  })

  it('maps the primary action to a tile', () => {
    expect(nextTileKey('review')).toBe('cards')
    expect(nextTileKey('focus')).toBe('focus')
    expect(nextTileKey('none')).toBeNull()
  })
})

describe('pickers', () => {
  it('pickCurrentCourse takes the unfinished course with most progress', () => {
    expect(pickCurrentCourse([{ id: 1, progress: 1 }, { id: 2, progress: 0.3 }, { id: 3, progress: 0.6 }])).toEqual({ id: 3, progress: 0.6 })
    expect(pickCurrentCourse([{ id: 1, progress: 1 }])).toBeNull()
  })
})
