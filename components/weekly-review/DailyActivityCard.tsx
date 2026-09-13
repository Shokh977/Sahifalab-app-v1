import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Trophy, Flame } from 'lucide-react-native'
import { typography, spacing, radius } from '../../lib/constants'
import { formatDuration } from '../../lib/weeklyReviewFormat'
import { WeeklyBar } from './WeeklyBar'
import type { WeeklyReviewVM } from '../../hooks/useWeeklyReview'

const TRACK_HEIGHT = 136

const UZ_DAYS_FULL = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']
function dowFullName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return UZ_DAYS_FULL[(new Date(y, m - 1, d).getDay() + 6) % 7]
}

function InsightRow({ Icon, tint, c, children }: { Icon: React.ComponentType<any>; tint: string; c: any; children: React.ReactNode }) {
  return (
    <View style={row.root}>
      <View style={[row.iconChip, { backgroundColor: tint + '22' }]}>
        <Icon size={12} color={tint} />
      </View>
      <Text style={[row.sentence, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {children}
      </Text>
    </View>
  )
}

export function DailyActivityCard({ vm, c }: { vm: WeeklyReviewVM; c: any }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const maxMinutes = Math.max(...vm.days.map(d => d.minutes), 1)
  const bestIdx = useMemo(() => {
    let best = -1
    vm.days.forEach((d, i) => { if (d.minutes > 0 && (best === -1 || d.minutes > vm.days[best].minutes)) best = i })
    return best
  }, [vm.days])

  const avgFrac = vm.avgMinutesPerDay > 0 ? Math.min(1, vm.avgMinutesPerDay / maxMinutes) : 0

  const today = vm.days[vm.days.length - 1]
  const todayRemaining = today ? Math.max(0, vm.dailyGoalMinutes - today.minutes) : 0
  const goalMetToday = today ? today.minutes >= vm.dailyGoalMinutes && vm.dailyGoalMinutes > 0 : false

  const selected = selectedIdx !== null ? vm.days[selectedIdx] : null

  return (
    <View style={[card.root, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={card.header}>
        <Text numberOfLines={1} style={[card.eyebrow, { color: c.textMuted, fontFamily: typography.fontFamily.bold }]}>
          KUNLIK FAOLLIK
        </Text>
        <Text numberOfLines={1} style={[card.avgLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
          o'rtacha {formatDuration(vm.avgMinutesPerDay)}
        </Text>
      </View>

      <View style={card.chartWrap}>
        {avgFrac > 0 && (
          <View pointerEvents="none" style={[card.avgLine, { bottom: avgFrac * TRACK_HEIGHT, borderColor: c.textMuted }]} />
        )}
        <View style={card.barsRow}>
          {vm.days.map((d, i) => (
            <WeeklyBar
              key={d.date}
              day={d}
              heightFrac={d.minutes / maxMinutes}
              isBest={i === bestIdx}
              index={i}
              c={c}
              selected={selectedIdx === i}
              onPress={() => setSelectedIdx(selectedIdx === i ? null : i)}
            />
          ))}
        </View>
      </View>

      {selected && (
        <Text style={[card.caption, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {dowFullName(selected.date)}: {formatDuration(selected.minutes)}
        </Text>
      )}

      <View style={[card.hairline, { backgroundColor: c.border }]} />

      {bestIdx >= 0 && (
        <InsightRow Icon={Trophy} tint="#F59E0B" c={c}>
          Eng samarali kun — <Text style={{ fontFamily: typography.fontFamily.bold, color: c.textPrimary }}>
            {dowFullName(vm.days[bestIdx].date)}, {formatDuration(vm.days[bestIdx].minutes)}
          </Text> shug'ullandingiz.
        </InsightRow>
      )}

      <InsightRow Icon={Flame} tint="#FF4500" c={c}>
        {goalMetToday ? (
          <>Bugungi maqsad <Text style={{ fontFamily: typography.fontFamily.bold, color: c.textPrimary }}>bajarildi</Text> — seriyangiz davom etmoqda.</>
        ) : (
          <>Seriyani davom ettirish uchun bugun yana <Text style={{ fontFamily: typography.fontFamily.bold, color: c.textPrimary }}>
            {formatDuration(todayRemaining)}
          </Text> kerak.</>
        )}
      </InsightRow>
    </View>
  )
}

const card = StyleSheet.create({
  root: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.2 },
  avgLabel: { fontSize: 11 },
  chartWrap: { position: 'relative' },
  avgLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  barsRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  caption: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  hairline: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
})

const row = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconChip: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sentence: { flex: 1, lineHeight: 18, fontSize: 13 },
})
