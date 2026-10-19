/**
 * Today's focus progress as words (Phase 7.5 A2). Before the goal:
 * "12 / 20 daq". Once it's met, "180 / 10 daq" read like a bug, so the
 * right side says "Maqsad bajarildi ✓" and the minutes move under the bar:
 * "180 daq bugun" · "Maqsad: 10 daq". Pure; tested in focusLabel.test.ts.
 */

export const DEFAULT_GOAL_MINUTES = 20

export type FocusLabel =
  | { done: false; right: string; progress: number }
  | { done: true; right: string; value: string; sub: string; progress: 1 }

export function focusLabel(minutes: number, goalMinutes: number): FocusLabel {
  const goal = goalMinutes > 0 ? goalMinutes : DEFAULT_GOAL_MINUTES
  const m = Math.max(0, Math.floor(minutes))
  if (m >= goal) {
    return { done: true, right: 'Maqsad bajarildi ✓', value: `${m} daq`, sub: `Maqsad: ${goal} daq`, progress: 1 }
  }
  return { done: false, right: `${m} / ${goal} daq`, progress: m / goal }
}
