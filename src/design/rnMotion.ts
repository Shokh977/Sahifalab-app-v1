/**
 * Reduce motion for core `Animated` — the older sheets and modals that are
 * not on `Sheet` yet (redesign spec rule 5). Reanimated code checks
 * useReducedMotion() and its animations follow the system setting by
 * default; core `Animated` does neither, so under reduce motion these
 * helpers make movement (slides, scales, indicators) jump to its end and
 * skip idle loops, while opacity fades still run.
 */
import { AccessibilityInfo, Animated } from 'react-native'

let reduced = false
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduced = v }).catch(() => {})
AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => { reduced = v })

/** The system "reduce motion" setting, read at call time. */
export function reduceMotionNow(): boolean {
  return reduced
}

type Value = Animated.Value | Animated.ValueXY

function jump(value: Value, toValue: Animated.TimingAnimationConfig['toValue'], useNativeDriver: boolean): Animated.CompositeAnimation {
  return Animated.timing(value, { toValue, duration: 0, useNativeDriver })
}

/** `Animated.spring` for movement: jumps to the end under reduce motion. */
export function moveSpring(value: Value, config: Animated.SpringAnimationConfig): Animated.CompositeAnimation {
  return reduced ? jump(value, config.toValue as Animated.TimingAnimationConfig['toValue'], config.useNativeDriver) : Animated.spring(value, config)
}

/** `Animated.timing` for movement: jumps to the end under reduce motion. */
export function moveTiming(value: Value, config: Animated.TimingAnimationConfig): Animated.CompositeAnimation {
  return reduced ? jump(value, config.toValue, config.useNativeDriver) : Animated.timing(value, config)
}

/** `Animated.loop` for idle pulses: does nothing under reduce motion. */
export function idleLoop(animation: Animated.CompositeAnimation): Animated.CompositeAnimation {
  return reduced ? { start: () => {}, stop: () => {}, reset: () => {} } : Animated.loop(animation)
}
