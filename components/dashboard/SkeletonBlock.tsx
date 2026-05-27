import React, { useEffect } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  width?:        number | string
  height?:       number
  borderRadius?: number
  style?:        ViewStyle
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const { c }   = useTheme()
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
      true,
    )
  }, [])

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: c.bgTertiary },
        anim,
        style,
      ]}
    />
  )
}
