import { useEffect, useState } from 'react'
import { MINUTE_MS } from './today'

/** Date.now(), re-read on each minute boundary (a timeout, not an
 *  interval) — drives the greeting, the quiz countdown and day changes. */
export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), MINUTE_MS - (now % MINUTE_MS) + 50)
    return () => clearTimeout(t)
  }, [now])
  return now
}
