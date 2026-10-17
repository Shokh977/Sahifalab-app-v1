export const MINUTE = 60_000

/** Remaining time as whole kun / soat / daqiqa, rounded up to the minute so
 *  "0 daqiqa" only shows once time is truly up. */
export function splitRemaining(ms: number): { days: number; hours: number; minutes: number } {
  const totalMin = Math.max(0, Math.ceil(ms / MINUTE))
  return {
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
  }
}
