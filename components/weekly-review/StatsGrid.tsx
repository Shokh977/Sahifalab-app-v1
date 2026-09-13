import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Zap, Flame, Target, BookOpen, ListChecks, Sparkles } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'
import { formatNumber } from '../../lib/weeklyReviewFormat'
import type { WeeklyReviewStatVM } from '../../hooks/useWeeklyReview'

// Icon/tint/label resolved by KEY, never by array position — a reordered
// or partial `stats` array from the backend still renders correctly.
const STAT_META: Record<string, { Icon: React.ComponentType<any>; tint: string; label: string; subLabel?: (sub: number) => string }> = {
  xp:                  { Icon: Zap,        tint: '#F59E0B', label: 'XP' },
  streak:              { Icon: Flame,      tint: '#FF4500', label: 'Seriya' },
  flashcard_accuracy:  { Icon: Target,     tint: '#4DA6FF', label: 'Flashcard aniqlik', subLabel: n => `${n} ta takrorlash` },
  courses:             { Icon: BookOpen,   tint: '#A855F7', label: 'Kurslar', subLabel: n => `${n} ta dars` },
  quizzes:             { Icon: ListChecks, tint: '#22C55E', label: 'Testlar' },
  daily_quiz:          { Icon: Sparkles,   tint: '#F5A623', label: '5 Savol' },
}

function StatCard({ stat, c }: { stat: WeeklyReviewStatVM; c: any }) {
  const meta = STAT_META[stat.key]
  if (!meta) return null
  const { Icon, tint, label, subLabel } = meta

  return (
    <View style={[card.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={card.top}>
        <View style={[card.iconChip, { backgroundColor: tint + '1a' }]}>
          <Icon size={15} color={tint} />
        </View>
        {stat.deltaPct != null && stat.deltaPct !== 0 ? (
          <Text style={[card.delta, { color: stat.deltaPct > 0 ? c.success : c.textMuted, fontFamily: typography.fontFamily.bold }]}>
            {stat.deltaPct > 0 ? '+' : ''}{stat.deltaPct}%
          </Text>
        ) : null}
      </View>
      <Text style={[card.value, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold, fontVariant: ['tabular-nums'] }]}>
        {formatNumber(stat.value)}{stat.unit ? ` ${stat.unit}` : ''}
      </Text>
      <Text numberOfLines={1} style={[card.label, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
        {label}
      </Text>
      {stat.subCount != null && subLabel && (
        <Text numberOfLines={1} style={[card.sub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {subLabel(stat.subCount)}
        </Text>
      )}
    </View>
  )
}

export function StatsGrid({ stats, c }: { stats: WeeklyReviewStatVM[]; c: any }) {
  return (
    <View>
      <Text style={[grid.eyebrow, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>
        TO'LIQ STATISTIKA
      </Text>
      <View style={grid.root}>
        {stats.map(stat => <StatCard key={stat.key} stat={stat} c={c} />)}
      </View>
    </View>
  )
}

const grid = StyleSheet.create({
  eyebrow: { fontSize: 10.5, letterSpacing: 1.2, marginBottom: spacing.sm },
  root: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
})

const card = StyleSheet.create({
  root: { width: '47%', borderRadius: 22, borderWidth: 1, padding: 16, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  delta: { fontSize: 11 },
  value: { fontSize: 21, marginTop: 4 },
  label: { fontSize: 12 },
  sub: { fontSize: 11 },
})
