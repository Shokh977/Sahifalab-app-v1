import { describe, expect, it } from '@jest/globals'
import { MINUTE, splitRemaining } from '../src/components/ui/countdownTime'

describe('splitRemaining', () => {
  it('splits into days, hours and minutes', () => {
    expect(splitRemaining((2 * 1440 + 3 * 60 + 4) * MINUTE)).toEqual({ days: 2, hours: 3, minutes: 4 })
  })
  it('rounds a partial minute up', () => {
    expect(splitRemaining(30_000)).toEqual({ days: 0, hours: 0, minutes: 1 })
    expect(splitRemaining(59 * MINUTE + 1)).toEqual({ days: 0, hours: 1, minutes: 0 })
  })
  it('never goes negative', () => {
    expect(splitRemaining(0)).toEqual({ days: 0, hours: 0, minutes: 0 })
    expect(splitRemaining(-5 * MINUTE)).toEqual({ days: 0, hours: 0, minutes: 0 })
  })
})
