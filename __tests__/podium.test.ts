import { describe, expect, it } from '@jest/globals'
import { podiumColumns } from '../src/features/bellashuv/podiumOrder'

describe('podiumColumns', () => {
  const e = (rank: number) => ({ rank })
  it('puts the winner in the middle', () => {
    expect(podiumColumns([e(1), e(2), e(3), e(4)]).map(x => x.rank)).toEqual([2, 1, 3])
  })
  it('handles two people and one', () => {
    expect(podiumColumns([e(1), e(2)]).map(x => x.rank)).toEqual([2, 1])
    expect(podiumColumns([e(1)]).map(x => x.rank)).toEqual([1])
    expect(podiumColumns([])).toEqual([])
  })
})
