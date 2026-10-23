import { describe, expect, it } from '@jest/globals'
import { digitFill, streakMood } from '../src/features/streak/streakMood'

describe('streakMood', () => {
  it('is done once the goal is met, whatever the server state says', () => {
    expect(streakMood('active', true, 12)).toBe('done')
    expect(streakMood('at_risk', true, 12)).toBe('done')
    expect(streakMood('frozen_today', true, 12)).toBe('done')
    expect(streakMood('lost', true, 0)).toBe('done')
  })

  it('tells the not-done-yet states apart', () => {
    expect(streakMood('active', false, 12)).toBe('pending')
    expect(streakMood(undefined, false, 12)).toBe('pending')
    expect(streakMood('frozen_today', false, 12)).toBe('frozen')
    expect(streakMood('at_risk', false, 12)).toBe('at_risk')
  })

  it('is lost with no streak', () => {
    expect(streakMood('lost', false, 5)).toBe('lost')
    expect(streakMood('active', false, 0)).toBe('lost')
  })
})

describe('digitFill', () => {
  it('is empty at zero, full at the goal, and inside the glyph band between', () => {
    expect(digitFill(0)).toBe(0)
    expect(digitFill(NaN)).toBe(0)
    expect(digitFill(1)).toBe(1)
    expect(digitFill(2)).toBe(1)
    expect(digitFill(0.5)).toBeCloseTo(0.52)
    expect(digitFill(0.01)).toBeGreaterThan(0.18)
    expect(digitFill(0.99)).toBeLessThan(0.86)
  })
})
