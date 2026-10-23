import { describe, expect, it } from '@jest/globals'
import {
  isMonday, localDateKey, nextTileKey, pickCurrentCourse, quizClosesIn,
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


describe('pickers', () => {
  it('pickCurrentCourse takes the unfinished course with most progress', () => {
    expect(pickCurrentCourse([{ id: 1, progress: 1 }, { id: 2, progress: 0.3 }, { id: 3, progress: 0.6 }])).toEqual({ id: 3, progress: 0.6 })
    expect(pickCurrentCourse([{ id: 1, progress: 1 }])).toBeNull()
  })
})


