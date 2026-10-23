/**
 * What the hero's streak number says about today. The number is a gauge:
 * its digits fill from the bottom with today's focus progress and turn
 * green once the goal is met. The base colour of the unfilled digits and
 * the status line under it tell the rest:
 *
 *   done     — goal met today: green digits, "Bugun saqlandi"
 *   pending  — streak safe so far, today not done: faint digits filling orange
 *   frozen   — a freeze covered yesterday: icy digits melting into orange
 *   at_risk  — yesterday missed, no freeze: red digits, last chance today
 *   lost     — no streak: faint 0, start again
 *
 * Meeting the goal wins over a stale server state (the dashboard may lag a
 * finished session). Pure; tested in streakMood.test.ts.
 */
import type { StreakState } from '../../../lib/api'

export type StreakMood = 'done' | 'pending' | 'frozen' | 'at_risk' | 'lost'

export function streakMood(state: StreakState | undefined, goalMet: boolean, streak: number): StreakMood {
  if (goalMet) return 'done'
  if (state === 'lost' || streak <= 0) return 'lost'
  if (state === 'frozen_today') return 'frozen'
  if (state === 'at_risk') return 'at_risk'
  return 'pending'
}

export const MOOD_TEXT: Record<StreakMood, string> = {
  done: 'Bugun saqlandi',
  pending: 'Bugun hali yonmadi',
  frozen: 'Muz saqlab qoldi',
  at_risk: 'Bugun oxirgi imkon',
  lost: 'Yangidan boshlang',
}

/**
 * Height of the filled part of the digits, as a share of the line box.
 * Digits don't span the whole line (there's room under the baseline and
 * above the cap height), so 0 < p < 1 maps onto the glyph band — a third of
 * the goal visibly fills a third of the digit, not just the empty descender.
 */
export function digitFill(progress: number): number {
  if (!(progress > 0)) return 0
  if (progress >= 1) return 1
  return 0.18 + 0.68 * progress
}
