import { useEffect, useRef } from 'react'

/**
 * Runs `fn` every `ms` while `enabled`, as a chain of timeouts (not an
 * interval): the next run is scheduled only after the previous one, and
 * everything is cleared on unmount or when disabled. For polling only —
 * never for animation (that runs on the UI thread).
 */
export function useRepeatingTimeout(fn: () => void, ms: number, enabled = true, runNow = true): void {
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  useEffect(() => {
    if (!enabled) return
    let t: ReturnType<typeof setTimeout> | undefined
    let alive = true
    const loop = () => {
      t = setTimeout(() => {
        if (!alive) return
        fnRef.current()
        loop()
      }, ms)
    }
    if (runNow) fnRef.current()
    loop()
    return () => { alive = false; if (t) clearTimeout(t) }
  }, [ms, enabled, runNow])
}
