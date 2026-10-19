/**
 * SegmentedControl — 2–3 segments; the selection indicator slides with
 * springs.nav (no bounce), and jumps under reduce motion.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'
import { useTheme } from '../../design/ThemeProvider'
import { springs } from '../../design/motion'
import { controlHeight, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'

export interface SegmentedControlProps {
  segments: readonly string[]
  index: number
  onChange: (index: number) => void
  style?: StyleProp<ViewStyle>
}

const INSET = 3

export function SegmentedControl({ segments, index, onChange, style }: SegmentedControlProps) {
  const { colors, scheme, elevation } = useTheme()
  const reduceMotion = useReducedMotion()
  const [width, setWidth] = useState(0)
  const segW = width > 0 ? (width - INSET * 2) / segments.length : 0
  const x = useSharedValue(0)

  useEffect(() => {
    const to = index * segW
    x.set(reduceMotion ? to : withSpring(to, springs.nav))
  }, [index, segW, reduceMotion, x])

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surfaceRaised }, style]}
    >
      {segW > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { width: segW, backgroundColor: scheme === 'dark' ? colors.border : colors.surface },
            elevation,
            indicator,
          ]}
        />
      )}
      {segments.map((label, i) => {
        const active = i === index
        return (
          <Pressable
            key={label}
            noFeedback
            haptic={active ? undefined : 'selection'}
            onPress={() => onChange(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={styles.segment}
          >
            <Text style={[typeScale.callout, { color: active ? colors.text : colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', height: controlHeight.sm, borderRadius: radius.md, padding: INSET },
  indicator: { position: 'absolute', top: INSET, bottom: INSET, left: INSET, borderRadius: radius.md - INSET },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
})
