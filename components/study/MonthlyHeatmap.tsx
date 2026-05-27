/**
 * MonthlyHeatmap — adaptive heatmap for 7 / 30 / 90 day views.
 *
 * 7 days  : 7 cells in a row filling container width, date inside (80% opacity),
 *           day label below (Du…Ya).
 * 30/90 d : weeks as columns, Mon–Sun as rows, day labels on left,
 *           cell size expands so the grid fills container width.
 */
import React, { useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'
import type { HeatmapDay } from '../../lib/api'

const DAY_LABELS  = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya']
const GAP         = 3
const DAY_LABEL_W = 28   // width of the Mon-Sun label column for 30/90 view

function intensityColor(total: number, hit: string, empty: string): string {
  if (total === 0)  return empty
  if (total <= 10)  return hit + '3D'  // ~24%
  if (total <= 25)  return hit + '7A'  // ~48%
  if (total <= 50)  return hit + 'B8'  // ~72%
  return hit
}

// day-of-week → DAY_LABELS index (JS Sunday=0 → index 6)
function dowIndex(d: Date): number {
  const dow = d.getDay()
  return dow === 0 ? 6 : dow - 1
}

interface Props {
  data: HeatmapDay[]
  days: 7 | 30 | 90
}

export function MonthlyHeatmap({ data, days }: Props) {
  const { c }          = useTheme()
  const { width: scrW } = useWindowDimensions()
  // fallback width until onLayout fires (screenW - card padding * 2 - screen margin * 2)
  const [containerW, setContainerW] = useState(scrW - 72)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const dayMap   = new Map(data.map(d => [d.date, d]))

  // ── 7-day horizontal row ────────────────────────────────────────────────────
  if (days === 7) {
    const cellW = Math.floor((containerW - 6 * GAP) / 7)

    const cells = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().slice(0, 10)
      return {
        dateStr,
        dayNum:  d.getDate(),
        label:   DAY_LABELS[dowIndex(d)],
        total:   dayMap.get(dateStr)?.total ?? 0,
        isToday: dateStr === todayStr,
      }
    })

    return (
      <View onLayout={e => setContainerW(e.nativeEvent.layout.width)}>
        <View style={styles.weekRow}>
          {cells.map(cell => {
            const bg = intensityColor(cell.total, c.success, c.bgTertiary)
            return (
              <View key={cell.dateStr} style={[styles.weekCell, { width: cellW }]}>
                <View style={[
                  styles.weekCellBox,
                  { width: cellW, height: cellW, backgroundColor: bg, borderRadius: Math.max(4, Math.floor(cellW / 6)) },
                  cell.isToday && { borderWidth: 1.5, borderColor: c.accentPrimary },
                ]}>
                  <Text style={[
                    styles.weekCellDate,
                    { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, opacity: 0.8 },
                  ]}>
                    {cell.dayNum}
                  </Text>
                </View>
                <Text style={[styles.weekCellLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {cell.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  // ── 30 / 90-day grid: columns = weeks, rows = Mon–Sun ──────────────────────
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (days - 1))
  // Align back to the Monday of that week
  const startDow = startDate.getDay()
  startDate.setDate(startDate.getDate() + (startDow === 0 ? -6 : 1 - startDow))

  const columns: Array<Array<{ dateStr: string; localDay: number; total: number } | null>> = []
  const cursor = new Date(startDate)
  while (cursor <= today) {
    const col: Array<{ dateStr: string; localDay: number; total: number } | null> = []
    for (let dow = 0; dow < 7; dow++) {
      if (cursor > today) {
        col.push(null)
      } else {
        const dateStr  = cursor.toISOString().slice(0, 10)
        const localDay = cursor.getDate()
        col.push({ dateStr, localDay, total: dayMap.get(dateStr)?.total ?? 0 })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    columns.push(col)
  }

  const numCols  = columns.length
  const gridW    = containerW - DAY_LABEL_W - 4  // 4 = gap between label col and grid
  const cellSize = Math.floor((gridW - (numCols - 1) * GAP) / numCols)

  return (
    <View onLayout={e => setContainerW(e.nativeEvent.layout.width)}>
      <View style={styles.gridWrap}>
        {/* Day labels column */}
        <View style={[styles.dayLabelsCol, { width: DAY_LABEL_W }]}>
          {DAY_LABELS.map(label => (
            <View key={label} style={{ height: cellSize + GAP, justifyContent: 'center' }}>
              <Text style={[styles.dayLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Week columns */}
        <View style={styles.grid}>
          {columns.map((col, ci) => (
            <View key={ci} style={[styles.weekCol, { gap: GAP }]}>
              {col.map((cell, ri) => {
                if (!cell) {
                  return (
                    <View
                      key={ri}
                      style={{ width: cellSize, height: cellSize, backgroundColor: 'transparent' }}
                    />
                  )
                }
                const isToday  = cell.dateStr === todayStr
                const bg       = intensityColor(cell.total, c.success, c.bgTertiary)
                const showDate = days === 30
                return (
                  <View
                    key={ri}
                    style={[
                      {
                        width:           cellSize,
                        height:          cellSize,
                        borderRadius:    Math.max(2, Math.floor(cellSize / 5)),
                        backgroundColor: bg,
                        alignItems:      'center',
                        justifyContent:  'center',
                      },
                      isToday && { borderWidth: 1.5, borderColor: c.accentPrimary },
                    ]}
                  >
                    {showDate && (
                      <Text style={[
                        styles.gridCellDate,
                        { color: c.textPrimary, fontFamily: typography.fontFamily.regular },
                      ]}>
                        {cell.localDay}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── 7-day ──────────────────────────────────────────────────────────────────
  weekRow: {
    flexDirection:  'row',
    gap:            GAP,
    alignItems:     'flex-start',
  },
  weekCell: {
    alignItems: 'center',
    gap:        5,
  },
  weekCellBox: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  weekCellDate: {
    fontSize: 13,
  },
  weekCellLabel: {
    fontSize: 10,
  },

  // ── 30/90-day ──────────────────────────────────────────────────────────────
  gridWrap: {
    flexDirection: 'row',
    gap:           4,
  },
  dayLabelsCol: {
    alignItems:  'flex-end',
    paddingRight: 2,
  },
  dayLabel: {
    fontSize: 9,
  },
  grid: {
    flex:          1,
    flexDirection: 'row',
    gap:           GAP,
  },
  weekCol: {
    flexDirection: 'column',
  },
  gridCellDate: {
    fontSize: 9,
    opacity:  0.8,
  },
})
