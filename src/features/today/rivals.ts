/**
 * Bugun's ranking card (Phase 7.5 C4), the pure parts: how many minutes of
 * focus earn a given XP, how many days until the weekly reset, and the
 * rows the rival ladder shows. Tested in rivals.test.ts.
 */
import type { LeaderboardEntry } from '../../../lib/api'
import { ladderRows } from './ladder'

/**
 * Focus XP rules (backend xp_service.DEEP_WORK_XP_PER_MINUTE and migration
 * 083's taper): per day, 1.66 XP/min up to 3 h, 0.83 up to 6 h, then 0.42.
 */
export const FOCUS_XP_TIERS = [
  { untilMinutes: 180, xpPerMinute: 1.66 },
  { untilMinutes: 360, xpPerMinute: 0.83 },
  { untilMinutes: Infinity, xpPerMinute: 0.42 },
] as const

/** Minutes of focus, starting after `todayMinutes`, that earn `xp`. */
export function focusMinutesForXp(xp: number, todayMinutes: number): number {
  let left = Math.max(0, xp)
  let at = Math.max(0, todayMinutes)
  let minutes = 0
  for (const tier of FOCUS_XP_TIERS) {
    if (left <= 0) break
    if (at >= tier.untilMinutes) continue
    const room = tier.untilMinutes - at
    const need = left / tier.xpPerMinute
    const used = Math.min(room, need)
    minutes += used
    left -= used * tier.xpPerMinute
    at += used
  }
  return Math.max(1, Math.ceil(minutes - 1e-9))
}

/** The weekly ranking restarts Monday 00:00 in Tashkent (UTC+5, no DST). */
const TASHKENT_OFFSET_MS = 5 * 3_600_000
const DAY_MS = 86_400_000

/** Whole days left until the weekly reset, counting today (1–7). */
export function daysToWeeklyReset(nowMs: number): number {
  const local = new Date(nowMs + TASHKENT_OFFSET_MS)        // Tashkent wall clock, read in UTC
  const dow = local.getUTCDay()                              // 0 = Sunday … 6 = Saturday
  const daysUntilMonday = dow === 0 ? 1 : 8 - dow            // Monday → 7
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  const resetLocal = midnight + daysUntilMonday * DAY_MS
  return Math.max(1, Math.ceil((resetLocal - (nowMs + TASHKENT_OFFSET_MS)) / DAY_MS))
}

/**
 * The three ladder rows: from the list when you're in it, otherwise from
 * `around_me` (the backend's rows at your rank −1, you, +1).
 */
export function ladderFor(
  entries: readonly LeaderboardEntry[],
  around: readonly LeaderboardEntry[] | undefined,
  myRank: number | null | undefined,
): LeaderboardEntry[] {
  const inList = entries.some(e => e.is_me) || (myRank != null && entries.some(e => e.rank === myRank))
  if (inList) return ladderRows(entries, myRank)
  return around && around.length > 0 ? ladderRows(around, myRank) : []
}
