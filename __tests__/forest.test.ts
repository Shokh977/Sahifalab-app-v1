import { describe, expect, it } from '@jest/globals'
import { monthLabel, treeStage } from '../src/features/forest/forest'

describe('forest', () => {
  it('labels a tree by the month its streak ended', () => {
    expect(monthLabel('2026-03-14')).toBe('Mar 2026')
    expect(monthLabel('2025-12-01')).toBe('Dek 2025')
  })

  it('grows a tree to the stage its streak reached', () => {
    expect(treeStage(3)).toBe(2)
    expect(treeStage(45)).toBe(5)
    expect(treeStage(130)).toBe(8)
    expect(treeStage(400)).toBe(10)
  })
})
