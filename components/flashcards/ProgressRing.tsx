/**
 * ProgressRing — SVG due-share/mastery ring for ReviewDueCard (Kartalar
 * redesign). Same animated-stroke-offset pattern as components/study/
 * ChallengeProgressRing.tsx, generalised to accept explicit colors (the
 * Kartalar screen uses its own scoped palette, not the app-wide theme) and
 * arbitrary centered content instead of a hardcoded percentage label.
 */
import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { useReduceMotion } from '../../hooks/useReduceMotion'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function ProgressRing({
  progress, color, track, size = 56, stroke = 6, children,
}: {
  progress: number   // 0-1
  color:    string
  track:    string
  size?:    number
  stroke?:  number
  children?: React.ReactNode
}) {
  const reduceMotion = useReduceMotion()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2
  const pct = Math.max(0, Math.min(1, progress))

  const offset = useSharedValue(reduceMotion ? circumference * (1 - pct) : circumference)

  useEffect(() => {
    if (reduceMotion) {
      offset.value = circumference * (1 - pct)
    } else {
      offset.value = withTiming(circumference * (1 - pct), { duration: 700, easing: Easing.out(Easing.cubic) })
    }
  }, [pct, reduceMotion])

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }))

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cx} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={cx} cy={cx} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cx})`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
})
