import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { typography, radius } from '../../lib/constants'
import type { WeeklyReviewVM } from '../../hooks/useWeeklyReview'

function headlineFor(vm: WeeklyReviewVM): string {
  if (vm.focusMinutes === 0) return "Bu hafta hali boshlanmadi"
  if (vm.vsLastWeekPct !== null && vm.vsLastWeekPct >= 10) return "Ajoyib sur'at bilan ketyapsiz!"
  if (vm.vsLastWeekPct !== null && vm.vsLastWeekPct <= -20) return "Bu hafta biroz sekinroq"
  return "Yaxshi ketyapsiz"
}

export function Hero({ vm, c }: { vm: WeeklyReviewVM; c: any }) {
  const parts: string[] = [`${vm.activeDays} kun faol`]
  if (vm.streakDays > 0) parts.push(`${vm.streakDays} kunlik seriya`)
  if (vm.vsLastWeekPct !== null) parts.push(`o'tgan haftaga nisbatan ${vm.vsLastWeekPct >= 0 ? '+' : ''}${vm.vsLastWeekPct}%`)

  return (
    <View style={s.root}>
      <View style={[s.pill, { backgroundColor: c.accentPrimaryMuted }]}>
        <View style={[s.dot, { backgroundColor: c.accentPrimary }]} />
        <Text style={[s.pillText, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
          {vm.weekNumber}-hafta {vm.isOngoing ? '· davom etmoqda' : ''}
        </Text>
      </View>

      <Text numberOfLines={2} style={[s.headline, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
        {headlineFor(vm)}
      </Text>

      <Text style={[s.subline, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {parts.join(' · ')}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 11 },
  headline: { fontSize: 27, lineHeight: 32, letterSpacing: -0.8 },
  subline: { fontSize: 13.5, lineHeight: 20 },
})
