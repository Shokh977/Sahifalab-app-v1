import { describe, expect, it } from '@jest/globals'
import { focusLabel } from '../src/features/today/focusLabel'

describe('focusLabel', () => {
  it('shows minutes over the goal before it is met', () => {
    expect(focusLabel(0, 20)).toEqual({ done: false, right: '0 / 20 daq', progress: 0 })
    expect(focusLabel(12, 20)).toEqual({ done: false, right: '12 / 20 daq', progress: 0.6 })
  })

  it('says the goal is done once it is met, with the minutes under the bar', () => {
    expect(focusLabel(10, 10)).toEqual({ done: true, right: 'Maqsad bajarildi ✓', value: '10 daq', sub: 'Maqsad: 10 daq', progress: 1 })
    // The bug: "180 / 10 daq".
    const l = focusLabel(180, 10)
    expect(l.right).toBe('Maqsad bajarildi ✓')
    expect(l.done && l.value).toBe('180 daq')
    expect(l.done && l.sub).toBe('Maqsad: 10 daq')
  })

  it('falls back to a 20-minute goal and ignores bad minutes', () => {
    expect(focusLabel(5, 0).right).toBe('5 / 20 daq')
    expect(focusLabel(-3, 20).right).toBe('0 / 20 daq')
    expect(focusLabel(12.9, 20).right).toBe('12 / 20 daq')
  })
})
