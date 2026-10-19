import { describe, expect, it } from '@jest/globals'
import { topTenGap } from '../src/features/bellashuv/topTen'

const board = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, progress_value: 1000 - i * 60 })) // #10 = 460

describe('topTenGap', () => {
  it('says you are in the top 10 with your rank', () => {
    expect(topTenGap({ rank: 3, progress_value: 880 }, board)).toEqual({ kind: 'in', rank: 3 })
    expect(topTenGap({ rank: 10, progress_value: 460 }, board)).toEqual({ kind: 'in', rank: 10 })
  })
  it('measures the gap to #10 and fills the bar by your share of it', () => {
    expect(topTenGap({ rank: 14, progress_value: 115 }, board)).toEqual({ kind: 'gap', left: 345, progress: 0.25 })
  })
  it('never shows an empty claim: tied with #10 still needs 1', () => {
    expect(topTenGap({ rank: 11, progress_value: 460 }, board)).toEqual({ kind: 'gap', left: 1, progress: 1 })
  })
  it('hides the bar without data', () => {
    expect(topTenGap(null, board)).toBeNull()                                  // not joined
    expect(topTenGap({ rank: 12, progress_value: 5 }, board.slice(0, 5))).toBeNull() // #10 not loaded
    expect(topTenGap({ rank: 12, progress_value: 0 }, board.map(e => ({ ...e, progress_value: 0 })))).toBeNull()
  })
})
