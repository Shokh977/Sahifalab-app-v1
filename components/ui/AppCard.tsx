import React from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { radius, shadows } from '../../lib/constants'

interface Props {
  children:  React.ReactNode
  padding?:  number
  cardRadius?: number
  shadow?:   boolean
  onPress?:  () => void
  style?:    ViewStyle
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function AppCard({ children, padding = 16, cardRadius = radius.card, shadow = false, onPress, style }: Props) {
  const { c, theme } = useTheme()
  const scale        = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const shadowStyle = shadow ? (theme === 'dark' ? shadows.dark.card : shadows.light.card) : {}

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 100 }) }}
        onPressOut={() => { scale.value = withTiming(1.0,  { duration: 200 }) }}
        style={[
          animStyle,
          styles.card,
          {
            backgroundColor: c.bgSecondary,
            borderColor:     c.border,
            borderRadius:    cardRadius,
            padding,
            ...shadowStyle,
          },
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    )
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.bgSecondary,
          borderColor:     c.border,
          borderRadius:    cardRadius,
          padding,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
})
