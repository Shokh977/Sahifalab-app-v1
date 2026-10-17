/**
 * Focus complete: "+N XP" rises from the ring centre toward the header's XP
 * counter and fades (UI thread). Skipped under reduce motion — the counter
 * itself still updates. Trigger by changing `trigger` (e.g. a counter).
 */
import React, { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing } from '../../design/motion'
import { tabular, type as typeScale } from '../../design/typography'

export function XpFly({ amount, trigger, distance }: {
  amount: number
  /** Changes on each completion; 0 = never shown. */
  trigger: number
  /** How far up the header counter is from the ring centre (px). */
  distance: number
}) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const y = useSharedValue(0)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(1)

  useEffect(() => {
    if (!trigger || reduceMotion) return
    y.set(0)
    scale.set(1)
    opacity.set(withSequence(
      withTiming(1, { duration: durations.fast }),
      withDelay(durations.celebrate, withTiming(0, { duration: durations.fade, easing: easing.exit })),
    ))
    y.set(withDelay(durations.fade, withTiming(-distance, { duration: durations.celebrate, easing: easing.standard })))
    scale.set(withDelay(durations.fade, withTiming(0.6, { duration: durations.celebrate, easing: easing.standard })))
  }, [trigger, reduceMotion, distance, y, opacity, scale])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: y.get() }, { scale: scale.get() }],
  }))

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]} accessibilityElementsHidden>
      <Text style={[typeScale.title2, tabular, { color: colors.accentText }]}>+{amount} XP</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center' },
})
