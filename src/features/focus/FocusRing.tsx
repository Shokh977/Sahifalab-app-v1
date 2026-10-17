/**
 * The Fokus ring. While running, one linear withTiming takes it from the
 * remaining fraction to 0 over the remaining time — the whole countdown is
 * on the UI thread, with no React renders. `syncKey` re-syncs it to the
 * wall clock (after backgrounding or a phase change).
 *
 * Focus complete (section 5): the ring shows full in the success colour and
 * pulses once with springs.pop; under reduce motion it just shows full.
 */
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue,
  withSequence, withSpring, withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing, springs } from '../../design/motion'
import { progressThickness } from '../../design/spacing'
import { progressAt, type StrokeTone } from './timerMath'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const PULSE_PEAK = 1.04

export interface FocusRingProps {
  size: number
  status: 'idle' | 'active' | 'paused'
  /** Reads the store's remaining ms (wall-clock based). */
  getRemainingMs: () => number
  totalMs: number
  tone: StrokeTone
  complete: boolean
  /** Change to re-sync the ring with the clock. */
  syncKey: string | number
  children?: React.ReactNode
}

export function FocusRing({ size, status, getRemainingMs, totalMs, tone, complete, syncKey, children }: FocusRingProps) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const stroke = progressThickness.thick
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r

  const p = useSharedValue(1)
  const scale = useSharedValue(1)

  useEffect(() => {
    cancelAnimation(p)
    if (complete) { p.set(1); return }
    const remaining = getRemainingMs()
    p.set(status === 'idle' ? 1 : progressAt(remaining, totalMs))
    if (status === 'active' && remaining > 0) {
      p.set(withTiming(0, { duration: remaining, easing: Easing.linear }))
    }
  }, [status, totalMs, complete, syncKey, getRemainingMs, p])

  useEffect(() => {
    if (!complete || reduceMotion) return
    scale.set(withSequence(
      withTiming(PULSE_PEAK, { duration: durations.fast, easing: easing.standard }),
      withSpring(1, springs.pop),
    ))
  }, [complete, reduceMotion, scale])

  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.get()) }))
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))

  const color = tone === 'break' || tone === 'done' ? colors.success
    : tone === 'warning' ? colors.accentText
    : colors.accent

  return (
    <Animated.View style={[{ width: size, height: size }, styles.center, pulse]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceRaised} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={arc}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
})
