/**
 * Which three rows the rival ladder shows (Phase 7.5 C4): the person above
 * you, you, the person below. At #1: you and the two below. Last: the two
 * above and you. Fewer people: whoever there is. Pure; rivalLadder.test.ts.
 */
export interface LadderEntry { rank: number; is_me?: boolean }

export function ladderRows<T extends LadderEntry>(entries: readonly T[], myRank: number | null | undefined): T[] {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank)
  const i = sorted.findIndex(e => e.is_me) >= 0 ? sorted.findIndex(e => e.is_me) : sorted.findIndex(e => e.rank === myRank)
  if (i < 0) return []
  const start = Math.max(0, Math.min(i - 1, sorted.length - 3))
  return sorted.slice(start, start + 3)
}

/** XP between you and the person right above (as rankGap counts it; null at #1). */
export function gapAbove<T extends LadderEntry & { score: number }>(rows: readonly T[]): { xp: number; name: T } | null {
  const i = rows.findIndex(r => r.is_me)
  if (i <= 0) return null
  return { xp: Math.max(1, rows[i - 1].score - rows[i].score), name: rows[i - 1] }
}
