import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface Props {
  progress: number   // 0-1
  color:    string
  size?:    number
  stroke?:  number
}

/** Small animated progress ring for the Faol challenge card — fills 0→progress on mount. */
export function ChallengeProgressRing({ progress, color, size = 72, stroke = 7 }: Props) {
  const { c } = useTheme()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2

  const pct = Math.max(0, Math.min(1, progress))
  const offset = useSharedValue(circumference)

  useEffect(() => {
    offset.value = withTiming(circumference * (1 - pct), { duration: 800, easing: Easing.out(Easing.cubic) })
  }, [pct])

  const animProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cx} r={radius} stroke={c.bgTertiary} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={cx} cy={cx} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cx})`}
          animatedProps={animProps}
        />
      </Svg>
      <Text style={[styles.pct, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {Math.round(pct * 100)}%
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pct: { fontSize: 15, fontVariant: ['tabular-nums'] },
})
