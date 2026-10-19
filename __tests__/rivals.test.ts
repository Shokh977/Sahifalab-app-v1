import { describe, expect, it } from '@jest/globals'
import { daysToWeeklyReset, focusMinutesForXp, ladderFor } from '../src/features/today/rivals'

describe('focusMinutesForXp', () => {
  it('uses 1.66 XP a minute in the first 3 hours', () => {
    expect(focusMinutesForXp(22, 0)).toBe(14)       // 22 / 1.66 = 13.3
    expect(focusMinutesForXp(1, 0)).toBe(1)
    expect(focusMinutesForXp(0, 0)).toBe(1)
  })
  it('slows down past 3 hours and 6 hours today', () => {
    expect(focusMinutesForXp(22, 200)).toBe(27)     // 22 / 0.83 = 26.5
    expect(focusMinutesForXp(22, 400)).toBe(53)     // 22 / 0.42 = 52.4
  })
  it('crosses a tier boundary', () => {
    // 170 min done: 10 min at 1.66 (16.6 XP), the rest at 0.83.
    expect(focusMinutesForXp(30, 170)).toBe(10 + Math.ceil((30 - 16.6) / 0.83))
  })
})

describe('daysToWeeklyReset', () => {
  // Tashkent = UTC+5.
  const at = (iso: string) => Date.parse(iso)
  it('counts days to Monday 00:00 in Tashkent', () => {
    expect(daysToWeeklyReset(at('2026-10-19T00:00:00+05:00'))).toBe(7)   // Monday 00:00
    expect(daysToWeeklyReset(at('2026-10-19T00:30:00+05:00'))).toBe(7)   // Monday 00:30
    expect(daysToWeeklyReset(at('2026-10-24T12:00:00+05:00'))).toBe(2)   // Saturday noon
    expect(daysToWeeklyReset(at('2026-10-25T21:00:00+05:00'))).toBe(1)   // Sunday evening
  })
  it('does not depend on the device timezone', () => {
    // Sunday 23:30 in Tashkent is still Sunday 18:30 UTC.
    expect(daysToWeeklyReset(at('2026-10-25T18:30:00Z'))).toBe(1)
  })
})

describe('ladderFor', () => {
  const row = (rank: number, me = false) => ({
    rank, telegram_id: rank, first_name: `P${rank}`, username: null, photo_url: null, level: 1, score: 1000 - rank, minutes: 0, is_me: me,
  })
  it('uses the list when you are in it', () => {
    const entries = [1, 2, 3, 4, 5].map(r => row(r, r === 3))
    expect(ladderFor(entries, [], 3).map(e => e.rank)).toEqual([2, 3, 4])
  })
  it('uses around_me when you are past the list', () => {
    const entries = [1, 2, 3].map(r => row(r))
    expect(ladderFor(entries, [row(102), row(103, true), row(104)], 103).map(e => e.rank)).toEqual([102, 103, 104])
    expect(ladderFor(entries, undefined, 103)).toEqual([])
  })
})
