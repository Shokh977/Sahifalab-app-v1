/**
 * AccentFill — the v2 accent surface: an orange gradient (accentFill, top →
 * bottom) filling its parent. Put it first inside a positioned view and give
 * it the parent's corner radius. Text on it is white and at least 18 px
 * extra bold (type.onAccent) or a 24 px+ number; anything smaller sits in
 * a white pill with accentText (Phase 7.5 B1).
 */
import React from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { accentFill } from '../../design/tokens'

export function AccentFill({ radius, style }: { radius?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={accentFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, radius != null && { borderRadius: radius }, style]}
    />
  )
}
