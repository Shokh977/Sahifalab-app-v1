import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/** OS-level "reduce motion" setting — the Bugun grid's pulse, stagger-in,
 * and rank-change transitions all check this and skip animating when true. */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (mounted) setReduced(v) })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => { mounted = false; sub.remove() }
  }, [])

  return reduced
}
