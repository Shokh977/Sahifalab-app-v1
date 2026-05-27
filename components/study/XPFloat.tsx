/**
 * Floating "+N XP" label that rises from the center of the timer circle
 * and fades out. Call show() via ref to trigger.
 */
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence,
  withTiming, withSpring, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

export type XPFloatHandle = { show: (amount: number) => void }

export const XPFloat = forwardRef<XPFloatHandle>((_, ref) => {
  const { c }    = useTheme()
  const [xp, setXP] = useState(0)

  const translateY = useSharedValue(0)
  const opacity    = useSharedValue(0)
  const scale      = useSharedValue(0.8)

  useImperativeHandle(ref, () => ({
    show: (amount) => {
      setXP(amount)
      translateY.value = 0
      opacity.value    = 0
      scale.value      = 0.8

      translateY.value = withTiming(-60, { duration: 600, easing: Easing.out(Easing.cubic) })
      scale.value      = withSpring(1.0, { damping: 8, stiffness: 200 })
      opacity.value    = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 150 }),
      )
    },
  }))

  const animStyle = useAnimatedStyle(() => ({
    transform:  [{ translateY: translateY.value }, { scale: scale.value }],
    opacity:    opacity.value,
  }))

  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="none">
      <Text style={[styles.text, { color: c.accentPrimary, fontFamily: typography.fontFamily.extrabold }]}>
        +{xp} XP
      </Text>
    </Animated.View>
  )
})

XPFloat.displayName = 'XPFloat'

const styles = StyleSheet.create({
  wrap: {
    position:  'absolute',
    alignSelf: 'center',
  },
  text: { fontSize: 20 },
})
