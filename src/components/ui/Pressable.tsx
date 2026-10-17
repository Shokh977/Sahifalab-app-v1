/**
 * Base pressable for the redesign: scale 0.97 + opacity 0.9 on press-in,
 * springs.ui back on release, on the UI thread (spec section 5, "Press").
 * Reduce motion → opacity only. Optional haptic on press.
 */
import React from 'react'
import {
  Pressable as RNPressable, type GestureResponderEvent, type PressableProps as RNPressableProps,
  type StyleProp, type ViewStyle,
} from 'react-native'
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated'
import { durations, easing, press, springs } from '../../design/motion'
import { haptics, type HapticKind } from '../../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable)

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  haptic?: HapticKind
  /** Turn the scale/opacity feedback off (e.g. rows inside a list that dims instead). */
  noFeedback?: boolean
  /** Resting opacity (disabled / done states). The animated press style owns
   *  `opacity`, so dim through this, not through `style`. */
  baseOpacity?: number
}

export function Pressable({ style, haptic, noFeedback, baseOpacity = 1, onPressIn, onPressOut, onPress, disabled, ...rest }: PressableProps) {
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(0) // 0 = rest, 1 = pressed

  const animated = useAnimatedStyle(() => {
    if (noFeedback) return { opacity: baseOpacity }
    const p = progress.get()
    return {
      opacity: baseOpacity * (1 - (1 - press.opacity) * p),
      transform: reduceMotion ? [] : [{ scale: 1 - (1 - press.scale) * p }],
    }
  })

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      onPressIn={(e: GestureResponderEvent) => {
        progress.set(withTiming(1, { duration: durations.fast, easing: easing.standard }))
        onPressIn?.(e)
      }}
      onPressOut={(e: GestureResponderEvent) => {
        progress.set(withSpring(0, springs.ui))
        onPressOut?.(e)
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) haptics[haptic]()
        onPress?.(e)
      }}
      style={[style, animated]}
    />
  )
}
