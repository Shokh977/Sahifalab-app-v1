/**
 * The hero's 7-day strip: studied = green with a check, frozen = freeze
 * blue, today = orange outline, missed/future = neutral. Each day has a
 * spoken label, so state is never colour alone.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Check, Snowflake } from 'lucide-react-native'
import type { StreakCalendarDay } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconStroke, radius, space, weekDotSize } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { localDateKey, weekdayOf } from './today'

const STATUS_LABEL: Record<StreakCalendarDay['status'], string> = {
  studied: 'bajarilgan', frozen: 'muzlatilgan', missed: 'oʻtkazib yuborilgan', future: 'kelmagan',
}

/** The last 7 local dates, oldest first. */
function lastSevenDays(now: Date): StreakCalendarDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    return { date: localDateKey(d), status: 'future' as const }
  })
}

export function WeekStrip({ days, todayDone }: {
  days: readonly StreakCalendarDay[] | undefined
  /** Goal met today: show today as done even if the cached calendar lags. */
  todayDone?: boolean
}) {
  const { colors } = useTheme()
  const now = new Date()
  const today = localDateKey(now)
  // Always the last 7 local dates ending today, even when a cached calendar
  // is a day old; dates it doesn't cover read as missed (or neutral if there
  // is no calendar at all).
  const byDate = new Map((days ?? []).map(d => [d.date, d.status] as const))
  const fallback: StreakCalendarDay['status'] = byDate.size > 0 ? 'missed' : 'future'
  const week = lastSevenDays(now).map(d => ({
    date: d.date,
    status: byDate.get(d.date) ?? (d.date === today ? 'future' : fallback),
  }))
  const icon = weekDotSize / 2

  return (
    <View style={styles.row}>
      {week.map(raw => {
        const isToday = raw.date === today
        const day = isToday && todayDone ? { ...raw, status: 'studied' as const } : raw
        const { short, long } = weekdayOf(day.date)
        const bg = day.status === 'studied' ? colors.success
          : day.status === 'frozen' ? colors.freeze
          : colors.surfaceRaised
        const label = `${long}, ${isToday ? 'bugun, ' : ''}${STATUS_LABEL[day.status]}`
        return (
          <View key={day.date} style={styles.day} accessible accessibilityLabel={label}>
            <View
              style={[
                styles.dot,
                { backgroundColor: bg },
                isToday && day.status !== 'studied' && { borderWidth: 2, borderColor: colors.accent },
              ]}
            >
              {day.status === 'studied' && <Check size={icon} color={colors.onAccent} strokeWidth={iconStroke + 1} />}
              {day.status === 'frozen' && <Snowflake size={icon} color={colors.onAccent} strokeWidth={iconStroke} />}
            </View>
            <Text style={[typeScale.overline, styles.letter, { color: isToday ? colors.text : colors.textMuted }]}>
              {short}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xxs },
  day: { alignItems: 'center', gap: space.xxs },
  dot: {
    width: weekDotSize,
    height: weekDotSize,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { textTransform: 'none', letterSpacing: 0 },
})
