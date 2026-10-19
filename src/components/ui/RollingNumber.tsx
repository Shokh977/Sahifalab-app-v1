/**
 * RollingNumber (Phase 7.5 B5) — a value that rolls up when it changes: the
 * old value slides out above while the new one slides in (the Bugun streak
 * tick, extracted for the rival ladder's XP). Reduce motion: no roll, the
 * new value just shows.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { durations, easing } from '../../design/motion'

export function RollingNumber({ value, style, lineHeight }: {
  value: string | number
  style?: StyleProp<TextStyle>
  /** The text's line height: the roll distance and the clip height. */
  lineHeight: number
}) {
  const reduceMotion = useReducedMotion()
  // The system font scale grows the text, so the roll and the clip grow with it.
  const line = lineHeight * useWindowDimensions().fontScale
  const text = String(value)
  const [shown, setShown] = useState(text)
  const [from, setFrom] = useState<string | null>(null)
  const y = useSharedValue(0)

  // A new value: remember the old one for the roll (adjusting state while rendering).
  if (text !== shown) {
    setFrom(reduceMotion ? null : shown)
    setShown(text)
  }

  useEffect(() => {
    if (from == null) return
    y.set(0)
    y.set(withTiming(-line, { duration: durations.slow, easing: easing.standard }))
  }, [from, shown, line, y])

  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }))

  if (from == null) return <Text style={style}>{shown}</Text>
  return (
    <View style={[styles.clip, { height: line }]} accessible accessibilityLabel={shown}>
      <Animated.View style={roll}>
        <Text style={style}>{from}</Text>
        <Text style={style}>{shown}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
})
