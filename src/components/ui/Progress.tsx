/**
 * ProgressBar and ProgressRing — thin / thick; value changes animate on the
 * UI thread (durations.slow, easing.standard), instantly under reduce motion.
 */
import React, { useEffect } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing } from '../../design/motion'
import { avatarSize, progressThickness, radius } from '../../design/spacing'

export type ProgressThickness = keyof typeof progressThickness

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0))

function useProgress(value: number) {
  const reduceMotion = useReducedMotion()
  const p = useSharedValue(reduceMotion ? clamp01(value) : 0)
  useEffect(() => {
    const to = clamp01(value)
    p.set(reduceMotion ? to : withTiming(to, { duration: durations.slow, easing: easing.standard }))
  }, [value, reduceMotion, p])
  return p
}

export interface ProgressBarProps {
  /** 0–1 */
  value: number
  thickness?: ProgressThickness
  /** Fill colour; defaults to accent. */
  color?: string
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

export function ProgressBar({ value, thickness = 'thin', color, accessibilityLabel, style }: ProgressBarProps) {
  const { colors } = useTheme()
  const p = useProgress(value)
  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }))
  const h = progressThickness[thickness]
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp01(value) * 100) }}
      style={[styles.track, { height: h, backgroundColor: colors.surfaceRaised }, style]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color ?? colors.accent }, fill]} />
    </View>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export interface ProgressRingProps extends ProgressBarProps {
  size?: number
  /** Centre content (score, icon). */
  children?: React.ReactNode
}

export function ProgressRing({
  value, thickness = 'thick', color, size = avatarSize.xl, accessibilityLabel, style, children,
}: ProgressRingProps) {
  const { colors } = useTheme()
  const p = useProgress(value)
  const stroke = progressThickness[thickness]
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - p.get()) }))

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp01(value) * 100) }}
      style={[{ width: size, height: size }, styles.center, style]}
    >
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.rotate]}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceRaised} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? colors.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  center: { alignItems: 'center', justifyContent: 'center' },
  rotate: { transform: [{ rotate: '-90deg' }] },
})
