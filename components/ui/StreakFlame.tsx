import React, { useEffect, useImperativeHandle, forwardRef } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, Easing,
} from 'react-native-reanimated'
import { Flame } from 'phosphor-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { getStreakGradient } from '../../lib/constants'

export type StreakFlameHandle = {
  playIncrement: () => void
  playLost:      () => void
}

interface Props {
  streakDays: number
  size?:      number
}

export const StreakFlame = forwardRef<StreakFlameHandle, Props>(
  ({ streakDays, size = 32 }, ref) => {
    const [from, to] = getStreakGradient(streakDays)

    const rotate  = useSharedValue(0)
    const scale   = useSharedValue(1)
    const opacity = useSharedValue(1)

    // Idle sway: gentle rotation -3° ↔ +3° on a 3s loop
    useEffect(() => {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-3,  { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(3,   { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,  // infinite
        true,
      )
    }, [])

    useImperativeHandle(ref, () => ({
      playIncrement: () => {
        scale.value = withSpring(1.2, { damping: 5, stiffness: 300 }, () => {
          scale.value = withSpring(1.0, { damping: 8, stiffness: 200 })
        })
      },
      playLost: () => {
        scale.value   = withTiming(0.6,  { duration: 800 })
        opacity.value = withTiming(0.35, { duration: 800 })
      },
    }))

    const animStyle = useAnimatedStyle(() => ({
      transform: [
        { rotate: `${rotate.value}deg` },
        { scale:  scale.value },
      ],
      opacity: opacity.value,
    }))

    return (
      <Animated.View style={[{ width: size, height: size }, animStyle]}>
        {/* Render icon in gradient color using the top gradient stop as tint */}
        <Flame size={size} color={from} weight="fill" />
      </Animated.View>
    )
  }
)

StreakFlame.displayName = 'StreakFlame'
