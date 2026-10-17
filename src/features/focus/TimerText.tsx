/**
 * The countdown text. Only this component re-renders, once per second, on
 * a timeout aligned to the next second boundary (not an interval) — the
 * screen around it stays still.
 */
import React, { useEffect, useState } from 'react'
import { Text, type StyleProp, type TextStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { tabular, type as typeScale } from '../../design/typography'
import { formatClock, msToNextSecond } from './timerMath'

export function TimerText({ getRemainingMs, status, syncKey, color, style }: {
  getRemainingMs: () => number
  status: 'idle' | 'active' | 'paused'
  syncKey: string | number
  color?: string
  style?: StyleProp<TextStyle>
}) {
  const { colors } = useTheme()
  const [ms, setMs] = useState(getRemainingMs)

  useEffect(() => {
    const now = getRemainingMs()
    const delay = status === 'active' ? msToNextSecond(now) : 0
    const t = setTimeout(() => setMs(getRemainingMs()), delay)
    return () => clearTimeout(t)
  }, [ms, status, syncKey, getRemainingMs])

  const label = formatClock(ms)
  return (
    <Text
      accessibilityRole="timer"
      accessibilityLabel={`${label} qoldi`}
      style={[typeScale.display, tabular, { color: color ?? colors.text }, style]}
    >
      {label}
    </Text>
  )
}
