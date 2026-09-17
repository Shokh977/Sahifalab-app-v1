import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native'
import Animated, { useAnimatedStyle, withTiming, useSharedValue, Easing } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { typography } from '../../lib/constants'
import { coursesStrings as s } from '../../lib/coursesStrings'
import type { PremiumTheme } from '../../lib/premiumTheme'

export type SortKey = 'popular' | 'newest' | 'free' | 'top'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: s.sortPopular },
  { key: 'newest',  label: s.sortNewest },
  { key: 'free',    label: s.sortFree },
  { key: 'top',     label: s.sortTop },
]

interface Props {
  active:   SortKey
  onChange: (k: SortKey) => void
  t:        PremiumTheme
  reduceMotion: boolean
}

export function SortTabs({ active, onChange, t, reduceMotion }: Props) {
  const [layouts, setLayouts] = useState<Record<SortKey, { x: number; width: number }>>({} as any)
  const underlineX = useSharedValue(0)
  const underlineW = useSharedValue(0)

  const onTabLayout = (key: SortKey) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    setLayouts(prev => {
      const next = { ...prev, [key]: { x, width } }
      if (key === active) {
        underlineX.value = reduceMotion ? x : withTiming(x, { duration: 200, easing: Easing.out(Easing.quad) })
        underlineW.value = reduceMotion ? width : withTiming(width, { duration: 200, easing: Easing.out(Easing.quad) })
      }
      return next
    })
  }

  const handlePress = (key: SortKey) => {
    if (key === active) return
    const layout = layouts[key]
    if (layout?.width > 0) {
      underlineX.value = reduceMotion ? layout.x : withTiming(layout.x, { duration: 200, easing: Easing.out(Easing.quad) })
      underlineW.value = reduceMotion ? layout.width : withTiming(layout.width, { duration: 200, easing: Easing.out(Easing.quad) })
    }
    onChange(key)
  }

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineW.value,
  }))

  return (
    <View style={[styles.row, { borderBottomColor: t.hairline }]}>
      {SORTS.map(tab => {
        const isActive = tab.key === active
        return (
          <Pressable
            key={tab.key}
            onLayout={onTabLayout(tab.key)}
            onPress={() => handlePress(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[
              styles.label,
              {
                color: isActive ? t.textPrimary : t.textSecondary,
                fontFamily: isActive ? typography.fontFamily.bold : typography.fontFamily.semibold,
              },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
      <Animated.View style={[styles.underline, underlineStyle]}>
        <LinearGradient colors={t.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    position: 'relative',
  },
  tab: { paddingVertical: 11 },
  label: { fontSize: 13.5 },
  underline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    height: 2.5,
    borderRadius: 3,
    overflow: 'hidden',
  },
})
