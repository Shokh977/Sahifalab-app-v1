import React from 'react'
import {
  ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, TextStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius, spacing } from '../../lib/constants'

interface Props {
  label:     string
  onPress:   () => void
  variant?:  'primary' | 'secondary' | 'ghost' | 'danger'
  loading?:  boolean
  disabled?: boolean
  style?:    ViewStyle
  textStyle?: TextStyle
  fullWidth?: boolean
}

export function Button({
  label, onPress, variant = 'primary', loading, disabled, style, textStyle, fullWidth = true,
}: Props) {
  const { c } = useTheme()

  const bg = {
    primary:   c.brand,
    secondary: c.bgTertiary,
    ghost:     'transparent',
    danger:    c.error,
  }[variant]

  const textColor = {
    primary:   '#fff',
    secondary: c.textPrimary,
    ghost:     c.brand,
    danger:    '#fff',
  }[variant]

  const handlePress = async () => {
    if (disabled || loading) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.7 : 1 },
        fullWidth && styles.full,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor, fontFamily: typography.fontFamily.semibold }, textStyle]}>
            {label}
          </Text>
      }
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base:  { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  full:  { width: '100%' },
  label: { fontSize: typography.size.base, letterSpacing: 0.1 },
})
