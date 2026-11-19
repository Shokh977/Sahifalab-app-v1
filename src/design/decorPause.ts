/**
 * Decorative motion (banner scenes, avatar rings, the animated tree) holds
 * still while the user scrolls, and carries on when the scroll settles.
 *
 * Every one of those redraws on the UI thread; during a fling the UI thread
 * also has to move the whole page each frame, and the two together dropped
 * frames (the public profile "freezing" on scroll). Smooth apps pause
 * ambient animation under a moving finger the same way.
 *
 * It's a shared value, not React state: the clocks read it on the UI thread
 * (motion.tsx WithClock, MagicTree's clock), so starting or ending a scroll
 * re-renders nothing.
 */
import { useEffect, useMemo, useRef } from 'react'
import { makeMutable } from 'react-native-reanimated'

/** 1 while a page is being scrolled (counts nested scrollers). */
export const decorPaused = makeMutable(0)

/** Resume this long after the scroll stops, so a quick second flick doesn't restart it. */
const RESUME_MS = 180

/**
 * Spread onto a ScrollView: decorative motion pauses for the drag and the
 * momentum after it.
 */
export function usePauseDecorWhileScrolling() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(false)
  // Leaving the screen mid-scroll must not leave everything paused.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (active.current) { active.current = false; decorPaused.value = Math.max(0, decorPaused.value - 1) }
  }, [])
  return useMemo(() => {
    const start = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
      if (!active.current) { active.current = true; decorPaused.value = decorPaused.value + 1 }
    }
    const end = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        if (active.current) { active.current = false; decorPaused.value = Math.max(0, decorPaused.value - 1) }
      }, RESUME_MS)
    }
    return {
      onScrollBeginDrag: start,
      onMomentumScrollBegin: start,
      // A drag that ends without a fling has no momentum events.
      onScrollEndDrag: end,
      onMomentumScrollEnd: end,
    }
  }, [])
}
