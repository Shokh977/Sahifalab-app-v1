/**
 * O'rmon (the forest): a user's finished streaks of 3+ days, each kept as
 * a tree at the stage it reached (backend forest_service; the profile
 * returns `forest` newest first and `forest_stats`). The current streak is
 * the user's live tree and isn't in the list.
 */
import { stageFromStreak, type StageNumber } from '../../../lib/treeTheme'

export interface ForestTree {
  start: string
  end:   string
  days:  number
}

export interface ForestStats {
  trees:      number
  longest:    number
  total_days: number
}

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

/** "Mar 2026" — when the streak ended. */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : iso
}

export function treeStage(days: number): StageNumber {
  return stageFromStreak(days)
}
