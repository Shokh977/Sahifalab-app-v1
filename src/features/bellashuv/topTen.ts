/**
 * The live competition's progress line (Phase 7.5 A3). The old bar was
 * progress_value / target_value — your share of the competition's own
 * target — so it sat empty until you had contributed, and always for a
 * competition you hadn't joined. Now it measures what matters on a
 * leaderboard: the distance to #10. Pure; tested in topTen.test.ts.
 */

export const TOP_N = 10

export type TopTen =
  | { kind: 'in'; rank: number }
  | { kind: 'gap'; left: number; progress: number }

/**
 * `caller` is your row from the leaderboard endpoint (null = not joined);
 * `board` its top rows. null = nothing honest to show (no bar at all).
 */
export function topTenGap(
  caller: { rank: number; progress_value: number } | null | undefined,
  board: readonly { rank: number; progress_value: number }[],
): TopTen | null {
  if (!caller || caller.rank < 1) return null
  if (caller.rank <= TOP_N) return { kind: 'in', rank: caller.rank }
  const tenth = board.find(e => e.rank === TOP_N) ?? (board.length >= TOP_N ? board[TOP_N - 1] : undefined)
  if (!tenth || tenth.progress_value <= 0) return null
  const left = Math.max(1, tenth.progress_value - caller.progress_value)
  const progress = Math.min(1, Math.max(0, caller.progress_value / tenth.progress_value))
  return { kind: 'gap', left, progress }
}
