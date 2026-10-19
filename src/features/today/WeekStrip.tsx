/**
 * The hero's week (Phase 7.5 C2): the last 7 local days as WeekDayIcon
 * tiles in 7 equal columns, each with its day label (today in `text` 800,
 * other days muted 600). Studied → flame tile, frozen → ice cube, missed →
 * ash, today not yet done → the dashed tile; today turns into a flame the
 * moment the goal is met. Every tile has a spoken label.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { StreakCalendarDay } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { fonts, type as typeScale } from '../../design/typography'
import { WeekDayIcon, type WeekDayState } from '../../components/ui'
import { localDateKey, weekdayOf } from './today'

/** The last 7 local dates, oldest first. */
function lastSevenDays(now: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    return localDateKey(d)
  })
}

/** Calendar status → tile. Pure (exported for tests). */
export function dayState(status: StreakCalendarDay['status'] | undefined, isToday: boolean, todayDone: boolean): WeekDayState {
  if (isToday) return todayDone || status === 'studied' ? 'done' : status === 'frozen' ? 'frozen' : 'today'
  if (status === 'studied') return 'done'
  if (status === 'frozen') return 'frozen'
  if (status === 'missed') return 'missed'
  return 'future'
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
  // is a day old; past dates it doesn't cover read as missed (or neutral if
  // there is no calendar at all).
  const byDate = new Map((days ?? []).map(d => [d.date, d.status] as const))
  const fallback: StreakCalendarDay['status'] = byDate.size > 0 ? 'missed' : 'future'

  return (
    <View style={styles.row}>
      {lastSevenDays(now).map(date => {
        const isToday = date === today
        const status = byDate.get(date) ?? (isToday ? undefined : fallback)
        const { short, long } = weekdayOf(date)
        return (
          <View key={date} style={styles.day}>
            <WeekDayIcon state={dayState(status, isToday, !!todayDone)} day={isToday ? `${long}, bugun` : long} />
            <Text style={[typeScale.small, { color: isToday ? colors.text : colors.textMuted, fontFamily: isToday ? fonts.extrabold : fonts.semibold }]}>
              {short}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xxs },
  day: { flex: 1, alignItems: 'center', gap: space.xxs + 2 },
})
