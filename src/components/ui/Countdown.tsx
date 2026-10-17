/**
 * Countdown — kun / soat / daqiqa tiles, live. Re-renders once per minute
 * (a timeout aligned to the next minute boundary, not an interval).
 */
import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { MINUTE, splitRemaining } from './countdownTime'

export interface CountdownProps {
  target: Date | string | number
  onDone?: () => void
  style?: StyleProp<ViewStyle>
}

export function Countdown({ target, onDone, style }: CountdownProps) {
  const { colors } = useTheme()
  const end = new Date(target).getTime()
  const [now, setNow] = useState(() => Date.now())
  const remaining = end - now
  const doneFor = useRef<number | null>(null)

  useEffect(() => {
    if (remaining <= 0) {
      if (doneFor.current !== end) { doneFor.current = end; onDone?.() }
      return
    }
    const untilNextMinute = (remaining % MINUTE) || MINUTE
    const t = setTimeout(() => setNow(Date.now()), untilNextMinute + 50)
    return () => clearTimeout(t)
  }, [remaining, end, onDone])

  const { days, hours, minutes } = splitRemaining(remaining)
  const tiles = [
    { n: days, label: 'kun' },
    { n: hours, label: 'soat' },
    { n: minutes, label: 'daqiqa' },
  ]

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={`${days} kun ${hours} soat ${minutes} daqiqa qoldi`}
      style={[styles.row, style]}
    >
      {tiles.map(t => (
        <View key={t.label} style={[styles.tile, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[typeScale.title1, tabular, { color: colors.text }]}>{String(t.n).padStart(2, '0')}</Text>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  tile: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, gap: space.xxs },
})
