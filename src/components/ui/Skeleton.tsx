/**
 * Skeleton — block / text line / row placeholders. The shimmer is an opacity
 * pulse on the UI thread (shimmer.duration per cycle); under reduce motion
 * the placeholder is static.
 */
import React, { useEffect } from 'react'
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../design/ThemeProvider'
import { easing, shimmer } from '../../design/motion'
import { radius, space, tileSize } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'

const DIM = 0.5

function usePulse() {
  const reduceMotion = useReducedMotion()
  const t = useSharedValue(1)
  useEffect(() => {
    if (reduceMotion) return
    t.set(withRepeat(withTiming(DIM, { duration: shimmer.duration / 2, easing: easing.standard }), -1, true))
    return () => cancelAnimation(t)
  }, [reduceMotion, t])
  return useAnimatedStyle(() => ({ opacity: t.get() }))
}

export interface SkeletonBlockProps {
  width?: DimensionValue
  height?: DimensionValue
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

/** A plain rectangle (cover image, card, tile). */
export function SkeletonBlock({ width = '100%', height = tileSize, borderRadius = radius.md, style }: SkeletonBlockProps) {
  const { colors } = useTheme()
  const pulse = usePulse()
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: colors.surfaceRaised }, pulse, style]}
    />
  )
}

/** One line of text, sized to the body type token's x-height band. */
export function SkeletonLine({ width = '100%', style }: { width?: DimensionValue; style?: StyleProp<ViewStyle> }) {
  return <SkeletonBlock width={width} height={typeScale.body.fontSize - 3} borderRadius={radius.full} style={style} />
}

/** A ListRow-shaped placeholder: leading tile + two lines. */
export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonBlock width={tileSize} height={tileSize} borderRadius={radius.sm} />
      <View style={styles.lines}>
        <SkeletonLine width="70%" />
        <SkeletonLine width="40%" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  lines: { flex: 1, gap: space.xs },
})
