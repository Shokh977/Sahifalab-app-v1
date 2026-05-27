/**
 * Circular SVG progress ring for the study timer.
 * Uses Reanimated useAnimatedProps to animate strokeDashoffset without JS bridge overhead.
 */
import React, { useEffect } from 'react'
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const DIAMETER     = 240
const STROKE       = 4
const RADIUS       = (DIAMETER - STROKE) / 2  // 118
const CX           = DIAMETER / 2              // 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS     // ≈ 741.1

interface Props {
  progress:    number   // 0-1, 1 = full time remaining
  strokeColor: string   // caller controls color changes
}

export function TimerCircle({ progress, strokeColor }: Props) {
  const { c } = useTheme()

  const offset = useSharedValue(CIRCUMFERENCE * (1 - progress))

  useEffect(() => {
    offset.value = withTiming(CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress))), {
      duration: 600,
      easing:   Easing.out(Easing.cubic),
    })
  }, [progress])

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }))

  return (
    <View style={{ width: DIAMETER, height: DIAMETER }}>
      <Svg width={DIAMETER} height={DIAMETER}>
        {/* Track */}
        <Circle
          cx={CX}
          cy={CX}
          r={RADIUS}
          stroke={c.bgTertiary}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={CX}
          cy={CX}
          r={RADIUS}
          stroke={strokeColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeLinecap="round"
          transform={`rotate(-90, ${CX}, ${CX})`}
          animatedProps={animProps}
        />
      </Svg>
    </View>
  )
}

export const TIMER_DIAMETER = DIAMETER
