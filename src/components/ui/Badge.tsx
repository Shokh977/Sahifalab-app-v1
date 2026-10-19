/**
 * Badge — count (accent pill, tabular figures), PRO, status (dot + label,
 * so state is never colour alone).
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'

export type BadgeStatus = 'success' | 'danger' | 'accent' | 'neutral'

export type BadgeProps =
  /** onFill: the badge sits on an accent fill — a white pill instead. */
  | { kind: 'count'; count: number; max?: number; onFill?: boolean; style?: StyleProp<ViewStyle> }
  | { kind: 'pro'; style?: StyleProp<ViewStyle> }
  | { kind: 'status'; status: BadgeStatus; label: string; style?: StyleProp<ViewStyle> }

const DOT = space.xs - 2

export function Badge(props: BadgeProps) {
  const { colors } = useTheme()

  if (props.kind === 'count') {
    const max = props.max ?? 99
    const label = props.count > max ? `${max}+` : String(props.count)
    return (
      // No small white text on orange (Phase 7.5 B1): accentText on a soft
      // pill, or on a white pill when the badge sits on an accent fill.
      <View style={[styles.pill, { backgroundColor: props.onFill ? colors.onAccent : colors.accentSoft }, props.style]} accessibilityLabel={label}>
        <Text style={[typeScale.overline, tabular, styles.numeric, { color: colors.accentText }]}>{label}</Text>
      </View>
    )
  }

  if (props.kind === 'pro') {
    return (
      <View style={[styles.pill, { backgroundColor: colors.accentSoft }, props.style]}>
        <Text style={[typeScale.overline, { color: colors.accentText }]}>PRO</Text>
      </View>
    )
  }

  const dot = {
    success: colors.success, danger: colors.danger, accent: colors.accent, neutral: colors.textFaint,
  }[props.status]
  return (
    <View style={[styles.pill, styles.status, { backgroundColor: colors.surfaceRaised }, props.style]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[typeScale.callout, { color: colors.text }]} numberOfLines={1}>{props.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    minWidth: space.xl - 4,
    paddingHorizontal: space.xs - 2,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  status: { flexDirection: 'row', gap: space.xxs + 2, paddingHorizontal: space.xs, paddingVertical: space.xxs },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  // Numbers in overline type: no caps transform, no tracking ("1 2" otherwise).
  numeric: { textTransform: 'none', letterSpacing: 0 },
})
