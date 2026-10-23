/**
 * Seriya's calendar in the Bugun hero's language: the same WeekDayIcon 3D
 * tiles (flame = studied, ice cube = frozen, ash = missed, dashed = today
 * not done yet). 7 days is the hero's WeekStrip as-is; 30 days is a
 * Monday-aligned grid of smaller tiles with the date under each.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { StreakCalendarDay } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { WeekDayIcon, type WeekDayState } from '../../components/ui'
import { localDateKey, weekdayOf } from '../today/today'
import { WeekStrip, dayState } from '../today/WeekStrip'

const MONTH_TILE = 34
const LEGEND_TILE = 18
const WEEK_HEAD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

const LEGEND: { state: WeekDayState; label: string }[] = [
  { state: 'done', label: 'Oʻqildi' },
  { state: 'frozen', label: 'Muzlatildi' },
  { state: 'missed', label: 'Oʻtkazildi' },
  { state: 'today', label: 'Bugun' },
]

/** Calendar days → Monday-aligned weeks, padded with nulls. Pure (exported for tests). */
export function monthWeeks(days: readonly StreakCalendarDay[]): (StreakCalendarDay | null)[][] {
  if (!days.length) return []
  const [y, m, d] = days[0].date.split('-').map(Number)
  const firstDow = (new Date(y, m - 1, d).getDay() + 6) % 7
  const padded: (StreakCalendarDay | null)[] = [...Array<null>(firstDow).fill(null), ...days]
  const weeks: (StreakCalendarDay | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    const row = padded.slice(i, i + 7)
    while (row.length < 7) row.push(null)
    weeks.push(row)
  }
  return weeks
}

export function StreakCalendar({ days, range, todayDone }: {
  days: readonly StreakCalendarDay[] | undefined
  range: 7 | 30
  /** Goal met today: show today as done even if the calendar lags. */
  todayDone: boolean
}) {
  const { colors } = useTheme()
  const today = localDateKey(new Date())

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        {LEGEND.map(l => (
          <View key={l.state} style={styles.legendItem}>
            <WeekDayIcon state={l.state} day={l.label} size={LEGEND_TILE} />
            <Text style={[typeScale.small, { color: colors.textMuted }]}>{l.label}</Text>
          </View>
        ))}
      </View>

      {range === 7 ? (
        <WeekStrip days={days} todayDone={todayDone} />
      ) : (
        <View style={styles.month}>
          <View style={styles.row}>
            {WEEK_HEAD.map(d => (
              <Text key={d} style={[typeScale.small, styles.cell, { color: colors.textMuted, fontFamily: fonts.semibold }]}>{d}</Text>
            ))}
          </View>
          {monthWeeks(days ?? []).map((week, wi) => (
            <View key={wi} style={styles.row}>
              {week.map((day, i) => {
                if (!day) return <View key={`pad-${wi}-${i}`} style={styles.cell} />
                const isToday = day.date === today
                const n = Number(day.date.slice(8, 10))
                return (
                  <View key={day.date} style={[styles.cell, styles.day]}>
                    <WeekDayIcon
                      state={dayState(day.status, isToday, todayDone)}
                      day={`${n}, ${weekdayOf(day.date).long}${isToday ? ', bugun' : ''}`}
                      size={MONTH_TILE}
                    />
                    <Text style={[typeScale.caption, tabular, {
                      color: isToday ? colors.text : colors.textMuted,
                      fontFamily: isToday ? fonts.extrabold : fonts.semibold,
                    }]}>
                      {n}
                    </Text>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2 },
  month: { gap: space.sm },
  row: { flexDirection: 'row' },
  cell: { flex: 1, textAlign: 'center' },
  day: { alignItems: 'center', gap: space.xxs },
})
