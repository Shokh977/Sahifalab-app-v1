import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'

export type DayDotState = 'filled' | 'hollow' | 'grace' | 'today'

interface Props {
  days:  DayDotState[]
  color: string
  label?: string   // e.g. "5 / 14"
}

/**
 * The day-dots row for 'consistency' challenges (step-25 Part 5) — same
 * visual language as the Seriya calendar: filled = qualifying day, hollow =
 * pending, blue/grace = a day covered by allowed_misses. Capped display —
 * long challenges (e.g. 30 days) wrap rather than shrinking to illegibility.
 */
export function ConsistencyDayDots({ days, color, label }: Props) {
  const { c } = useTheme()
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {days.map((state, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              state === 'filled' && { backgroundColor: color, borderColor: color },
              state === 'grace'  && { backgroundColor: '#5AC8FA', borderColor: '#5AC8FA' },
              state === 'today'  && { borderColor: color, borderWidth: 2, backgroundColor: 'transparent' },
              state === 'hollow' && { backgroundColor: 'transparent', borderColor: c.border },
            ]}
          />
        ))}
      </View>
      {label && (
        <Text style={[styles.label, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
          {label}
        </Text>
      )}
    </View>
  )
}

const DOT = 10

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  row:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 },
  dot:  { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5 },
  label: { fontSize: 13 },
})
