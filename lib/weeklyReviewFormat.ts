/**
 * weeklyReviewFormat.ts — pure, dependency-free formatting helpers for the
 * Haftalik sharh screen. Kept separate from the hook/components so every
 * duration/number on screen goes through exactly one function each — no
 * screen re-implements "830 -> 13s 50d" inline.
 */

/** 830 -> "13s 50d", 45 -> "45d", 540 -> "9s", 0 -> "—". */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}s ${m}d`
  if (h > 0) return `${h}s`
  return `${m}d`
}

/** 1008 -> "1 008" — locale-grouped, no decimals (this screen only ever
 * shows whole minutes/XP/counts). */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('uz-UZ')
}

const UZ_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

/** "2026-08-17" -> "17-23 Avg" — a Mon-Sun range label for a week_start ISO date. */
export function formatWeekRange(weekStartIso: string): string {
  const [y, m, d] = weekStartIso.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(Date.UTC(y, m - 1, d + 6))
  const startMonth = UZ_MONTHS_SHORT[start.getUTCMonth()]
  const endMonth = UZ_MONTHS_SHORT[end.getUTCMonth()]
  if (startMonth === endMonth) return `${start.getUTCDate()}-${end.getUTCDate()} ${endMonth}`
  return `${start.getUTCDate()} ${startMonth} - ${end.getUTCDate()} ${endMonth}`
}

/** ISO-8601 week-of-year number for a "YYYY-MM-DD" date string — the
 * hero pill's "{N}-hafta" label. Standard ISO week algorithm: shift to the
 * nearest Thursday of that week, then count Thursdays since the year start. */
export function isoWeekNumber(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayNum = (date.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000))
}
