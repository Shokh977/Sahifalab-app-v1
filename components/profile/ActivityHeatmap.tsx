/**
 * ActivityHeatmap — GitHub-style activity grid for the Faollik tab.
 * Supports Yil / Oy / Xafta filters.
 *
 * Colours:
 *   both quiz + focus  → #e8792f (solid orange)
 *   quiz only          → rgba(232,121,47,0.55)
 *   focus only         → rgba(139,92,246, 0.25–0.80) by XP intensity
 *   empty              → rgba(255,255,255,0.06) dark / rgba(0,0,0,0.08) light
 */
import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { profile as profileApi, HeatmapDay } from '../../lib/api'
import { typography, spacing } from '../../lib/constants'

const CELL = 11
const GAP  = 2

const UZ_MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

type FilterPeriod = 'year' | 'month' | 'week'

const PERIOD_CONFIG: Record<FilterPeriod, { label: string; days: number; weeks: number; xpTitle: string }> = {
  year:  { label: 'Yil',   days: 365, weeks: 52, xpTitle: 'YILLIK XP MANBAI'   },
  month: { label: 'Oy',    days: 30,  weeks: 5,  xpTitle: 'OYLIK XP MANBAI'    },
  week:  { label: 'Xafta', days: 7,   weeks: 1,  xpTitle: 'HAFTALIK XP MANBAI' },
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function cellColor(day: HeatmapDay | undefined, isDark: boolean): string {
  const empty = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  if (!day || day.total === 0) return empty
  const hasQuiz  = day.quiz > 0
  const hasFocus = day.focus_xp > 0
  if (hasQuiz && hasFocus) return '#e8792f'
  if (hasQuiz)             return 'rgba(232,121,47,0.55)'
  const alpha = Math.min(0.80, 0.25 + (day.focus_xp / 50) * 0.55)
  return `rgba(139,92,246,${alpha.toFixed(2)})`
}

interface Props {
  telegramId:        number
  profileFocusHours?: number
}

export function ActivityHeatmap({ telegramId, profileFocusHours }: Props) {
  const { c, theme } = useTheme()
  const isDark = theme === 'dark'

  const [period,  setPeriod]  = useState<FilterPeriod>('year')
  const [data,    setData]    = useState<HeatmapDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const config = PERIOD_CONFIG[period]

  useEffect(() => {
    setLoading(true)
    setError(false)
    profileApi.getHeatmap(telegramId, config.days)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [telegramId, period])

  // Build grid working backwards from today
  const today     = isoToday()
  const dayOfWeek = new Date(today).getDay()
  const gridEnd   = addDays(today, 6 - dayOfWeek)
  const gridStart = addDays(gridEnd, -(config.weeks * 7 - 1))

  const map = new Map(data.map(d => [d.date, d]))

  type Cell = { iso: string; day: HeatmapDay | undefined }
  const weeks: Cell[][] = []
  for (let w = 0; w < config.weeks; w++) {
    const week: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const iso = addDays(gridStart, w * 7 + d)
      week.push({ iso, day: map.get(iso) })
    }
    weeks.push(week)
  }

  // Month labels (only for year view — looks cluttered on shorter periods)
  const monthLabels: { weekIdx: number; label: string }[] = []
  if (period === 'year') {
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const m = new Date(week[0].iso).getMonth()
      if (m !== lastMonth) {
        monthLabels.push({ weekIdx: wi, label: UZ_MONTHS_SHORT[m] })
        lastMonth = m
      }
    })
  }

  // Aggregate stats from fetched data
  const activeDays   = data.filter(d => d.total > 0).length
  const totalFocusXP = data.reduce((s, d) => s + d.focus_xp, 0)
  const totalQuiz    = data.reduce((s, d) => s + d.quiz,     0)

  // For year view use real profile focus_hours if provided; otherwise estimate
  const focusDisplay = period === 'year' && profileFocusHours != null
    ? (profileFocusHours >= 10 ? `${Math.round(profileFocusHours)}s` : `${profileFocusHours.toFixed(1)}s`)
    : `${(totalFocusXP / 10).toFixed(1)}s`

  const colW = CELL + GAP

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.brand} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          Faollik ma'lumotlari yuklanmadi
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      {/* Period filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
        {(Object.keys(PERIOD_CONFIG) as FilterPeriod[]).map(p => {
          const active = period === p
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.filterBtn,
                active && { backgroundColor: c.brand },
              ]}
            >
              <Text style={[
                styles.filterLabel,
                {
                  color:      active ? '#fff' : c.textMuted,
                  fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                },
              ]}>
                {PERIOD_CONFIG[p].label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
        <View style={styles.statGroup}>
          <Text style={[styles.statVal, { color: '#e8792f', fontFamily: typography.fontFamily.bold }]}>
            {focusDisplay}
          </Text>
          <Text style={[styles.statLbl, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Fokus
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.statGroup}>
          <Text style={[styles.statVal, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {activeDays}
          </Text>
          <Text style={[styles.statLbl, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Faol kun
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.statGroup}>
          <Text style={[styles.statVal, { color: '#a78bfa', fontFamily: typography.fontFamily.bold }]}>
            {totalQuiz}
          </Text>
          <Text style={[styles.statLbl, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Test
          </Text>
        </View>
      </View>

      {/* Heatmap scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollOuter}>
        <View>
          {/* Month labels (year view only) */}
          {monthLabels.length > 0 && (
            <View style={[styles.monthRow, { height: 14 }]}>
              {monthLabels.map(({ weekIdx, label }) => (
                <View key={weekIdx} style={{ position: 'absolute', left: weekIdx * colW }}>
                  <Text style={[styles.monthLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Grid */}
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={[styles.col, { marginRight: GAP }]}>
                {week.map(({ iso, day }) => (
                  <View
                    key={iso}
                    style={[
                      styles.cell,
                      { backgroundColor: cellColor(day, isDark), marginBottom: GAP },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <Text style={[styles.legendText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Kam
            </Text>
            {['rgba(255,255,255,0.06)','rgba(139,92,246,0.3)','rgba(139,92,246,0.6)','rgba(232,121,47,0.55)','#e8792f'].map((col, i) => (
              <View key={i} style={[styles.legendCell, { backgroundColor: isDark ? col : col.replace('255,255,255','0,0,0') }]} />
            ))}
            <Text style={[styles.legendText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Ko'p
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Dynamic XP breakdown */}
      {(totalFocusXP > 0 || totalQuiz > 0) && (
        <View style={styles.xpBreakdown}>
          <Text style={[styles.xpTitle, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            {config.xpTitle}
          </Text>
          {totalFocusXP > 0 && (
            <View style={styles.xpRow}>
              <View style={[styles.xpDot, { backgroundColor: '#a78bfa' }]} />
              <Text style={[styles.xpLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Fokus sessiyalar: {totalFocusXP} XP
              </Text>
            </View>
          )}
          {totalQuiz > 0 && (
            <View style={styles.xpRow}>
              <View style={[styles.xpDot, { backgroundColor: '#e8792f' }]} />
              <Text style={[styles.xpLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Test yechish: {totalQuiz * 25} XP
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  center: {
    alignItems:      'center',
    paddingVertical: spacing['2xl'],
  },
  errorText: {
    fontSize: typography.size.sm,
  },

  // Filter tabs
  filterRow: {
    flexDirection:  'row',
    borderRadius:   10,
    borderWidth:    StyleSheet.hairlineWidth,
    overflow:       'hidden',
    padding:        3,
    gap:            3,
  },
  filterBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.xs + 1,
    borderRadius:    8,
  },
  filterLabel: {
    fontSize: typography.size.xs,
  },

  // Stats row
  statsRow: {
    flexDirection:  'row',
    borderRadius:   12,
    borderWidth:    StyleSheet.hairlineWidth,
    overflow:       'hidden',
  },
  statGroup: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm,
    gap:             2,
  },
  statVal: {
    fontSize: typography.size.lg,
  },
  statLbl: {
    fontSize: typography.size.xs,
  },
  statDivider: {
    width:          StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },

  // Heatmap scroll
  scrollOuter: {},
  monthRow: {
    position:     'relative',
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 9,
  },
  grid: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },
  cell: {
    width:        CELL,
    height:       CELL,
    borderRadius: 2,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
    marginTop:     4,
  },
  legendText: {
    fontSize: 9,
  },
  legendCell: {
    width:        CELL,
    height:       CELL,
    borderRadius: 2,
  },

  // XP breakdown
  xpBreakdown: {
    gap:        4,
    paddingTop: spacing.xs,
  },
  xpTitle: {
    fontSize:      9,
    letterSpacing: 0.5,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  xpDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  xpLabel: {
    fontSize: typography.size.sm,
  },
})
