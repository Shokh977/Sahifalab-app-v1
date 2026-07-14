import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

interface Props {
  teamAName:  string
  teamAColor: string
  teamATotal: number
  teamBName:  string
  teamBColor: string
  teamBTotal: number
  fmtValue:   (v: number) => string
}

/**
 * The head-to-head bar for 'team' challenges (step-25 Part 5) — deliberately
 * the star of the card. One bar, two colors meeting proportionally at the
 * split point, animating as totals change, so which team is ahead (and by
 * how much) reads instantly.
 */
export function TeamHeadToHeadBar({ teamAName, teamAColor, teamATotal, teamBName, teamBColor, teamBTotal, fmtValue }: Props) {
  const { c } = useTheme()
  const total = Math.max(1, teamATotal + teamBTotal)
  const aShare = teamATotal / total

  const widthA = useSharedValue(0.5)
  useEffect(() => {
    widthA.value = withTiming(aShare, { duration: 700, easing: Easing.out(Easing.cubic) })
  }, [aShare])

  const styleA = useAnimatedStyle(() => ({ width: `${widthA.value * 100}%` }))
  const styleB = useAnimatedStyle(() => ({ width: `${(1 - widthA.value) * 100}%` }))

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.namesRow}>
        <Text numberOfLines={1} style={[styles.name, { color: teamAColor, fontFamily: typography.fontFamily.bold }]}>
          {teamAName}
        </Text>
        <Text numberOfLines={1} style={[styles.name, styles.nameRight, { color: teamBColor, fontFamily: typography.fontFamily.bold }]}>
          {teamBName}
        </Text>
      </View>

      <View style={[styles.bar, { backgroundColor: c.bgTertiary }]}>
        <Animated.View style={[styles.barFill, styleA, { backgroundColor: teamAColor }]} />
        <Animated.View style={[styles.barFill, styleB, { backgroundColor: teamBColor }]} />
      </View>

      <View style={styles.namesRow}>
        <Text style={[styles.total, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {fmtValue(teamATotal)}
        </Text>
        <Text style={[styles.total, styles.nameRight, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {fmtValue(teamBTotal)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  namesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 14, flexShrink: 1 },
  nameRight: { textAlign: 'right' },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12 },
  total: { fontSize: 13 },
})
