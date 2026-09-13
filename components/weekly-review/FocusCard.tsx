import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { typography, spacing, radius } from '../../lib/constants'
import { formatDuration } from '../../lib/weeklyReviewFormat'
import type { WeeklyReviewVM } from '../../hooks/useWeeklyReview'

export function FocusCard({ vm, c }: { vm: WeeklyReviewVM; c: any }) {
  const pct = vm.goalMinutes ? Math.min(100, Math.round(vm.focusMinutes / vm.goalMinutes * 100)) : null
  const [hourStr, minStr] = formatDuration(vm.focusMinutes).split(' ')

  return (
    <View style={[
      s.root,
      { backgroundColor: c.bgSecondary, borderColor: c.border },
      Platform.OS === 'ios' ? iosHighlightStyle(c.border) : { elevation: 0 },
    ]}>
      <View style={s.row}>
        <View style={s.left}>
          <Text numberOfLines={1} style={[s.eyebrow, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>
            FOKUS VAQTI
          </Text>
          <Text style={[s.duration, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold, fontVariant: ['tabular-nums'] }]}>
            {hourStr}
            {minStr ? <Text style={s.unitGlyph}> {minStr}</Text> : null}
          </Text>
          {vm.goalMinutes !== null && (
            <Text style={[s.goalLine, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
              Maqsad {formatDuration(vm.goalMinutes)} · {pct}%
            </Text>
          )}
        </View>

        <View style={s.right}>
          {vm.vsLastWeekPct !== null && (
            <View style={[s.deltaPill, { backgroundColor: c.bgTertiary }]}>
              <Text
                numberOfLines={1}
                style={[s.deltaText, { color: vm.vsLastWeekPct >= 0 ? c.success : c.textMuted, fontFamily: typography.fontFamily.bold }]}
              >
                {vm.vsLastWeekPct >= 0 ? '↑' : '↓'} {Math.abs(vm.vsLastWeekPct)}%
              </Text>
            </View>
          )}
          <Text style={[s.avgText, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>
            {formatDuration(vm.avgMinutesPerDay)} / kun
          </Text>
        </View>
      </View>

      {vm.goalMinutes !== null && pct !== null && (
        <View style={[s.track, { backgroundColor: c.bgTertiary }]}>
          <LinearGradient
            colors={[c.accentPrimary, c.accentPrimaryLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.fill, { width: `${pct}%` }]}
          />
        </View>
      )}
    </View>
  )
}

function iosHighlightStyle(color: string) {
  return { borderTopWidth: 1, borderTopColor: color }
}

const s = StyleSheet.create({
  root: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  left: { flex: 1, gap: 4 },
  right: { flexShrink: 0, alignItems: 'flex-end', gap: 4 },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.2 },
  duration: { fontSize: 40, letterSpacing: -1.6 },
  unitGlyph: { fontSize: 17, fontWeight: '700' },
  goalLine: { fontSize: 13 },
  deltaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9 },
  deltaText: { fontSize: 12 },
  avgText: { fontSize: 12 },
  track: { height: 8, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
})
