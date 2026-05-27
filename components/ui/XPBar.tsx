import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius } from '../../lib/constants'

interface Props {
  current:     number
  max:         number
  height?:     number
  showLabel?:  boolean
}

export function XPBar({ current, max, height = 8, showLabel = false }: Props) {
  const { c }   = useTheme()
  const pct     = Math.min(current / Math.max(max, 1), 1)
  const fillPct = useSharedValue(pct)

  useEffect(() => {
    fillPct.value = withTiming(pct, {
      duration: 600,
      easing:   Easing.out(Easing.cubic),
    })
  }, [pct])

  const animWidth = useAnimatedStyle(() => ({ width: `${fillPct.value * 100}%` as any }))

  return (
    <View>
      {showLabel && (
        <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {current.toLocaleString()} / {max.toLocaleString()} XP
        </Text>
      )}
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: c.bgTertiary }]}>
        <Animated.View style={[styles.fill, animWidth, { height, borderRadius: height / 2, overflow: 'hidden' }]}>
          <LinearGradient
            colors={['#F5A623', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: typography.size.xs, marginBottom: 4 },
  track: { width: '100%', overflow: 'hidden' },
  fill:  {},
})
