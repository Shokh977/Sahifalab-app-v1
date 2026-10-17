/**
 * Pure helpers for the Fokus timer — tested in __tests__/focusTimer.test.ts.
 */

const SECOND = 1000
const MINUTE = 60 * SECOND

/** "24:59", "5:00", "1:05:00" — rounds up so a fresh 25:00 shows 25:00. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / SECOND))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Remaining fraction 0–1 of the current phase. */
export function progressAt(remainingMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0
  return Math.min(1, Math.max(0, remainingMs / totalMs))
}

/** Delay until the displayed second changes (≥ 16 ms so it never spins). */
export function msToNextSecond(remainingMs: number): number {
  const r = remainingMs % SECOND
  return Math.max(16, r === 0 ? SECOND : r)
}

/** The last minutes of a focus round turn the ring to the warning colour. */
export const WARNING_MS = 5 * MINUTE

export type StrokeTone = 'focus' | 'warning' | 'break' | 'done'

export function strokeTone(phase: 'focus' | 'break', remainingMs: number, complete = false): StrokeTone {
  if (complete) return 'done'
  if (phase === 'break') return 'break'
  if (remainingMs <= 0) return 'done'
  return remainingMs <= WARNING_MS ? 'warning' : 'focus'
}

/** Stats always show a number: "0 daq", never "—". */
export function statValue(n: number | null | undefined, unit = ''): string {
  const v = Number.isFinite(n as number) ? Math.max(0, Math.round(n as number)) : 0
  return unit ? `${v} ${unit}` : String(v)
}

export const CUSTOM_MIN = 5
export const CUSTOM_MAX = 180

/** "45" → 45; anything outside 5–180 or not a whole number → null. */
export function validCustomMinutes(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null
  const n = Number(text.trim())
  return n >= CUSTOM_MIN && n <= CUSTOM_MAX ? n : null
}

/** XP the app shows for focus minutes (display only — the server awards XP). */
export function displayXp(minutes: number): number {
  return Math.round(Math.max(0, minutes) * 1.66)
}
