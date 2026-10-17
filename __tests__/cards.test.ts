import { describe, expect, it } from '@jest/globals'
import {
  DAILY_NEW_DEFAULT, DAILY_NEW_OPTIONS, GRADES, heroCopy, intervalHint, needsDailyPrompt, sessionSummary,
} from '../src/features/cards/cards'

describe('cards helpers', () => {
  it('writes the hero line', () => {
    expect(heroCopy(18)).toBe('18 ta karta bugun · ~3 daqiqa')
    expect(heroCopy(1)).toBe('1 ta karta bugun · ~1 daqiqa')
  })

  it('asks for a daily amount only above 50 cards', () => {
    expect(needsDailyPrompt(50)).toBe(false)
    expect(needsDailyPrompt(51)).toBe(true)
    expect(needsDailyPrompt(500)).toBe(true)
    expect(DAILY_NEW_OPTIONS).toEqual([10, 20, 30])
    expect(DAILY_NEW_DEFAULT).toBe(20)
  })

  it('has four grades including Oson = 4', () => {
    expect(GRADES.map(g => [g.rating, g.label])).toEqual([[1, 'Bilmayman'], [2, 'Qiyin'], [3, 'Bilaman'], [4, 'Oson']])
  })

  it('summarises accuracy and what comes back by tomorrow', () => {
    const now = new Date(2026, 9, 18, 14, 0).getTime()
    const s = sessionSummary([
      { rating: 1, nextReview: new Date(2026, 9, 18, 14, 1).toISOString() },  // today
      { rating: 3, nextReview: new Date(2026, 9, 19, 9, 0).toISOString() },   // tomorrow
      { rating: 4, nextReview: new Date(2026, 9, 22, 9, 0).toISOString() },   // later
      { rating: 2, nextReview: null },
    ], now)
    expect(s).toEqual({ reviewed: 4, correct: 2, accuracy: 50, tomorrow: 2 })
    expect(sessionSummary([], now)).toEqual({ reviewed: 0, correct: 0, accuracy: 0, tomorrow: 0 })
  })

  it('formats interval hints', () => {
    expect(intervalHint(0)).toBe('bugun')
    expect(intervalHint(3)).toBe('3 kun')
    expect(intervalHint(null)).toBeNull()
  })
})
