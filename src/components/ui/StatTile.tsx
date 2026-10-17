/**
 * StatTile — a number, its label and an optional delta (arrow + sign, so
 * direction is never colour alone). Counts up once on first mount;
 * later value changes show directly. Under reduce motion it never counts.
 */
import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { TrendingDown, TrendingUp } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { durations } from '../../design/motion'
import { iconStroke, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'

export interface StatTileProps {
  value: number
  label: string
  /** Change since the last period; positive is shown as an increase. */
  delta?: number
  /** Formats the shown number (e.g. thousands separators, "12 soat"). */
  format?: (n: number) => string
  style?: StyleProp<ViewStyle>
}

/** easeOutCubic, for the count-up only. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function useCountUp(target: number, enabled: boolean): number {
  const [shown, setShown] = useState(enabled ? 0 : target)
  const counted = useRef(!enabled)

  useEffect(() => {
    if (counted.current) { setShown(target); return }
    counted.current = true
    let frame = 0
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durations.celebrate)
      setShown(Math.round(target * easeOut(t)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return shown
}

export function StatTile({ value, label, delta, format = String, style }: StatTileProps) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const shown = useCountUp(value, !reduceMotion)
  const up = (delta ?? 0) >= 0
  const Arrow = up ? TrendingUp : TrendingDown

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${format(value)}${delta != null ? `, ${up ? '+' : '−'}${Math.abs(delta)}` : ''}`}
      style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      <Text style={[typeScale.title1, tabular, { color: colors.text }]} numberOfLines={1}>{format(shown)}</Text>
      <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
      {delta != null && (
        <View style={styles.delta}>
          <Arrow size={typeScale.callout.fontSize} color={up ? colors.successText : colors.dangerText} strokeWidth={iconStroke} />
          <Text style={[typeScale.callout, tabular, { color: up ? colors.successText : colors.dangerText }]}>
            {up ? '+' : '−'}{Math.abs(delta)}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: space.md, borderRadius: radius.lg, borderWidth: 1, gap: space.xxs },
  delta: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
})
