import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import { radius, spacing } from '../../lib/constants'

// Same card geometry as the ready state (radius/padding/heights match
// Hero/FocusCard/DailyActivityCard/StatsGrid) so there's no layout shift
// when real data replaces the skeleton.
function Block({ style, c }: { style: any; c: any }) {
  const opacity = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])
  return <Animated.View style={[style, { backgroundColor: c.bgTertiary, opacity }]} />
}

export function WeeklyReviewSkeleton({ c }: { c: any }) {
  return (
    <View style={s.root}>
      <Block c={c} style={[s.pill]} />
      <Block c={c} style={[s.headline]} />
      <Block c={c} style={[s.subline]} />

      <Block c={c} style={[s.card, { height: 150, borderRadius: radius.cardLg }]} />
      <Block c={c} style={[s.card, { height: 240, borderRadius: radius.cardLg }]} />

      <View style={s.grid}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Block key={i} c={c} style={[s.gridCard]} />
        ))}
      </View>

      <Block c={c} style={[s.card, { height: 76, borderRadius: radius.cardLg }]} />
      <Block c={c} style={[s.card, { height: 90, borderRadius: radius.cardLg }]} />
    </View>
  )
}

const s = StyleSheet.create({
  root: { padding: spacing.lg, gap: spacing.md },
  pill: { width: 130, height: 26, borderRadius: radius.full },
  headline: { width: '80%', height: 32, borderRadius: 8 },
  subline: { width: '60%', height: 18, borderRadius: 6 },
  card: { width: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { width: '47%', height: 100, borderRadius: 22 },
})
