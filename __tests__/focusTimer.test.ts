import { describe, expect, it } from '@jest/globals'
import {
  displayXp, formatClock, msToNextSecond, progressAt, statValue, strokeTone, validCustomMinutes, WARNING_MS,
} from '../src/features/focus/focusTimer'

describe('focusTimer', () => {
  it('formats the clock, rounding up to whole seconds', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00')
    expect(formatClock(25 * 60_000 - 1)).toBe('25:00')
    expect(formatClock(24 * 60_000 + 59_000)).toBe('24:59')
    expect(formatClock(65 * 60_000)).toBe('1:05:00')
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(-500)).toBe('0:00')
  })

  it('computes progress and the next-second delay', () => {
    expect(progressAt(30, 60)).toBe(0.5)
    expect(progressAt(90, 60)).toBe(1)
    expect(progressAt(5, 0)).toBe(0)
    expect(msToNextSecond(12_345)).toBe(345)
    expect(msToNextSecond(12_000)).toBe(1000)
    expect(msToNextSecond(12_005)).toBe(16)
  })

  it('picks the ring tone', () => {
    expect(strokeTone('focus', WARNING_MS + 1)).toBe('focus')
    expect(strokeTone('focus', WARNING_MS)).toBe('warning')
    expect(strokeTone('focus', 0)).toBe('done')
    expect(strokeTone('break', 10)).toBe('break')
    expect(strokeTone('focus', 99_999, true)).toBe('done')
  })

  it('shows 0 instead of a dash', () => {
    expect(statValue(0, 'daq')).toBe('0 daq')
    expect(statValue(null, 'ta')).toBe('0 ta')
    expect(statValue(undefined)).toBe('0')
    expect(statValue(12.4, 'daq')).toBe('12 daq')
  })

  it('validates custom minutes', () => {
    expect(validCustomMinutes('45')).toBe(45)
    expect(validCustomMinutes(' 5 ')).toBe(5)
    expect(validCustomMinutes('4')).toBeNull()
    expect(validCustomMinutes('181')).toBeNull()
    expect(validCustomMinutes('2.5')).toBeNull()
    expect(validCustomMinutes('')).toBeNull()
  })

  it('estimates display XP like the old screen', () => {
    expect(displayXp(25)).toBe(42)
    expect(displayXp(-3)).toBe(0)
  })
})
