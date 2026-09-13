import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, AccessibilityInfo, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { typography } from '../../lib/constants'
import { formatDuration } from '../../lib/weeklyReviewFormat'
import type { WeeklyReviewDayVM } from '../../hooks/useWeeklyReview'

const TRACK_HEIGHT = 136
const TRACK_MAX_WIDTH = 30

const UZ_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

function dowIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

export function WeeklyBar({
  day, heightFrac, isBest, index, c, onPress, selected,
}: {
  day: WeeklyReviewDayVM
  heightFrac: number // 0..1, this day's minutes / max(days.minutes)
  isBest: boolean
  index: number
  c: any
  onPress: () => void
  selected: boolean
}) {
  const progress = useSharedValue(0)

  useEffect(() => {
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled) return
      if (reduce) {
        progress.value = heightFrac
      } else {
        progress.value = withDelay(index * 40, withTiming(heightFrac, { duration: 600, easing: Easing.out(Easing.cubic) }))
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightFrac])

  const fillStyle = useAnimatedStyle(() => ({
    height: `${Math.max(0, progress.value) * 100}%`,
  }))

  const hasData = day.minutes > 0
  const durationColor = isBest ? c.accentPrimary : (hasData ? c.textSecondary : c.textDisabled)

  return (
    <Pressable style={bar.col} onPress={onPress} accessibilityRole="button" hitSlop={4}>
      <View style={[bar.track, { height: TRACK_HEIGHT, maxWidth: TRACK_MAX_WIDTH, backgroundColor: c.bgTertiary, borderWidth: selected ? 1.5 : 0, borderColor: c.accentPrimary }]}>
        <Animated.View style={[bar.fillWrap, fillStyle]}>
          {isBest ? (
            <LinearGradient
              colors={[c.accentPrimaryLight, c.accentPrimary]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, glowStyle(c.accentPrimary)]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hasData ? c.textDisabled : 'transparent' }]} />
          )}
        </Animated.View>
      </View>
      <Text
        numberOfLines={1}
        style={[bar.weekday, { color: day.isToday ? c.accentPrimary : c.textMuted, fontFamily: typography.fontFamily.bold }]}
      >
        {UZ_DAYS[dowIndex(day.date)]}
      </Text>
      <Text
        numberOfLines={1}
        style={[bar.duration, { color: durationColor, fontFamily: typography.fontFamily.semibold, fontVariant: ['tabular-nums'] }]}
      >
        {formatDuration(day.minutes)}
      </Text>
    </Pressable>
  )
}

function glowStyle(color: string) {
  return { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 0 }
}

const bar = StyleSheet.create({
  col:      { flex: 1, alignItems: 'center', gap: 6 },
  track:    { width: '100%', borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
  fillWrap: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  weekday:  { fontSize: 11.5 },
  duration: { fontSize: 11 },
})
