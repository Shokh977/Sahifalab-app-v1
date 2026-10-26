/**
 * AccentFill — the v2 accent surface: the theme's accent gradient (accentFill,
 * top → bottom; orange in Standart) filling its parent. Put it first inside a positioned view and give
 * it the parent's corner radius. Text on it is white and at least 18 px
 * extra bold (type.onAccent) or a 24 px+ number; anything smaller sits in
 * a white pill with accentText (Phase 7.5 B1). `deep` is the darker
 * accentFillDeep, where white text of any size passes AA (Phase 8).
 */
import React from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../design/ThemeProvider'

export function AccentFill({ radius, deep, style }: { radius?: number; deep?: boolean; style?: StyleProp<ViewStyle> }) {
  const { accentFill, accentFillDeep } = useTheme()
  return (
    <LinearGradient
      colors={deep ? accentFillDeep : accentFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, radius != null && { borderRadius: radius }, style]}
    />
  )
}
