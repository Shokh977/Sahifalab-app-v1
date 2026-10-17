/** 20687 → "20 687" (Uzbek thousands separator: a space). */
export function groupThousands(n: number): string {
  const sign = n < 0 ? '-' : ''
  return sign + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Focus minutes → whole hours for the profile stat ("128"). */
export function focusHours(minutes: number): number {
  return Math.floor(Math.max(0, minutes) / 60)
}
