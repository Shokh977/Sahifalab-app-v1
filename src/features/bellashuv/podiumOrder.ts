/**
 * Podium order (Phase 7.5 D1): columns #2, #1, #3 — the winner in the
 * middle. Missing places are left out (two people: #2, #1; one: #1).
 * Pure; podium.test.ts.
 */
export function podiumColumns<T extends { rank: number }>(entries: readonly T[]): T[] {
  const at = (r: number) => entries.find(e => e.rank === r)
  return [at(2), at(1), at(3)].filter((e): e is T => !!e)
}
