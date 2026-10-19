import { describe, expect, it } from '@jest/globals'
import { gapAbove, ladderRows } from '../src/features/today/ladder'

const board = (n: number, me: number) =>
  Array.from({ length: n }, (_, i) => ({ rank: i + 1, score: 1000 - i * 20, is_me: i + 1 === me }))
const ranks = (rows: { rank: number }[]) => rows.map(r => r.rank)

describe('ladderRows', () => {
  it('shows the person above, you and the person below', () => {
    expect(ranks(ladderRows(board(30, 23), 23))).toEqual([22, 23, 24])
  })
  it('at #1 shows you and the two below', () => {
    expect(ranks(ladderRows(board(30, 1), 1))).toEqual([1, 2, 3])
  })
  it('when last shows the two above and you', () => {
    expect(ranks(ladderRows(board(30, 30), 30))).toEqual([28, 29, 30])
  })
  it('works with fewer people', () => {
    expect(ranks(ladderRows(board(2, 2), 2))).toEqual([1, 2])
    expect(ranks(ladderRows(board(1, 1), 1))).toEqual([1])
  })
  it('finds you by rank when is_me is missing, and is empty when you are not on the board', () => {
    const rows = board(10, 0)
    expect(ranks(ladderRows(rows, 5))).toEqual([4, 5, 6])
    expect(ladderRows(rows, null)).toEqual([])
  })
  it('loaded slices: uses the rows it has, sorted', () => {
    const slice = [{ rank: 24, score: 451 }, { rank: 22, score: 489 }, { rank: 23, score: 467, is_me: true }]
    expect(ranks(ladderRows(slice, 23))).toEqual([22, 23, 24])
  })
})

describe('gapAbove', () => {
  it("is the XP between you and the person above", () => {
    const rows = ladderRows([{ rank: 22, score: 489 }, { rank: 23, score: 467, is_me: true }, { rank: 24, score: 451 }], 23)
    expect(gapAbove(rows)?.xp).toBe(22)
    expect(gapAbove(ladderRows(board(5, 1), 1))).toBeNull()
  })
})
