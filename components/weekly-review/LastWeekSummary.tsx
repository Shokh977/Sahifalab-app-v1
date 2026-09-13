import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { typography, spacing, radius } from '../../lib/constants'
import { formatDuration, formatNumber } from '../../lib/weeklyReviewFormat'
import type { WeeklyReviewLastWeekVM } from '../../hooks/useWeeklyReview'

function derivedSentence(lw: WeeklyReviewLastWeekVM): string {
  if (lw.rank != null) return `Reytingda ${lw.rank}-o'rinni egallagansiz.`
  if (lw.streakEnd > 0) return `Seriya ${lw.streakEnd} kunda yakunlandi.`
  return "Bu hafta yakuniy hisobot."
}

export function LastWeekSummary({ lastWeek, c }: { lastWeek: WeeklyReviewLastWeekVM | null; c: any }) {
  if (!lastWeek) return null

  return (
    <View>
      <Text style={[s.eyebrow, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>
        O'TGAN HAFTA YAKUNI — {lastWeek.rangeLabel}
      </Text>
      <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold, fontVariant: ['tabular-nums'] }]}>
              {formatDuration(lastWeek.focusMinutes)}
            </Text>
            <Text style={[s.metricLabel, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>Fokus</Text>
          </View>
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold, fontVariant: ['tabular-nums'] }]}>
              +{formatNumber(lastWeek.xp)}
            </Text>
            <Text style={[s.metricLabel, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>XP</Text>
          </View>
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold, fontVariant: ['tabular-nums'] }]}>
              {lastWeek.activeDays}
            </Text>
            <Text style={[s.metricLabel, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>Faol kun</Text>
          </View>
        </View>
        <Text style={[s.sentence, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {derivedSentence(lastWeek)}
        </Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  eyebrow: { fontSize: 10.5, letterSpacing: 1.2, marginBottom: spacing.sm },
  card: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 18 },
  metricLabel: { fontSize: 11 },
  sentence: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
})
