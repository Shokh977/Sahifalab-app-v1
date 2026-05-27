import React from 'react'
import {
  ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

type Variant = 'primary' | 'secondary' | 'danger' | 'success'
type Size    = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  label:      string
  onPress:    () => void
  variant?:   Variant
  size?:      Size
  disabled?:  boolean
  loading?:   boolean
  leftIcon?:  React.ReactNode
  fullWidth?: boolean
  style?:     ViewStyle
  textStyle?: TextStyle
}

const SIZE_MAP: Record<Size, { height: number; paddingH: number; fontSize: number; radius: number }> = {
  sm: { height: 32,  paddingH: 12, fontSize: typography.size.sm,   radius: 8  },
  md: { height: 44,  paddingH: 20, fontSize: typography.size.base, radius: 10 },
  lg: { height: 52,  paddingH: 24, fontSize: typography.size.lg,   radius: 12 },
  xl: { height: 56,  paddingH: 28, fontSize: typography.size.lg,   radius: 14 },
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function AppButton({
  label, onPress, variant = 'primary', size = 'lg',
  disabled, loading, leftIcon, fullWidth = true, style, textStyle,
}: Props) {
  const { c } = useTheme()
  const scale = useSharedValue(1)
  const s     = SIZE_MAP[size]

  const bg: Record<Variant, string> = {
    primary:   c.accentPrimary,
    secondary: 'transparent',
    danger:    c.error,
    success:   c.success,
  }
  const textColor: Record<Variant, string> = {
    primary:   c.textInverse,
    secondary: c.textPrimary,
    danger:    '#fff',
    success:   '#fff',
  }
  const borderColor: Record<Variant, string | undefined> = {
    primary:   undefined,
    secondary: c.border,
    danger:    undefined,
    success:   undefined,
  }

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePressIn  = () => { scale.value = withTiming(0.98, { duration: 100 }) }
  const handlePressOut = () => { scale.value = withTiming(1.0,  { duration: 200 }) }

  const handlePress = async () => {
    if (disabled || loading) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        animStyle,
        styles.base,
        {
          height:            s.height,
          paddingHorizontal: s.paddingH,
          borderRadius:      s.radius,
          backgroundColor:   bg[variant],
          borderWidth:       variant === 'secondary' ? 1 : 0,
          borderColor:       borderColor[variant],
          opacity:           disabled ? 0.4 : 1,
        },
        fullWidth && styles.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <View style={styles.row}>
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
          <Text
            style={[
              styles.label,
              {
                fontSize:   s.fontSize,
                color:      textColor[variant],
                fontFamily: typography.fontFamily.semibold,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base:  { alignItems: 'center', justifyContent: 'center' },
  full:  { width: '100%' },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon:  { alignItems: 'center', justifyContent: 'center' },
  label: { letterSpacing: 0.1 },
})
