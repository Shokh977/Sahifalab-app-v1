/**
 * Stepper — − value + with 48×48 targets; min/max bounds disable the ends;
 * disabled as a whole. Selection haptic on change.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'

export interface StepperProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  /** Shown after the number, e.g. "×" or "ta". */
  suffix?: string
  disabled?: boolean
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

export function Stepper({ value, onChange, min = 1, max = 99, suffix = '', disabled, accessibilityLabel, style }: StepperProps) {
  const { colors } = useTheme()
  const canDown = !disabled && value > min
  const canUp = !disabled && value < max

  const button = (dir: -1 | 1) => {
    const enabled = dir < 0 ? canDown : canUp
    const Icon = dir < 0 ? Minus : Plus
    return (
      <Pressable
        onPress={() => onChange(Math.min(max, Math.max(min, value + dir)))}
        disabled={!enabled}
        haptic="selection"
        baseOpacity={enabled ? 1 : stateOpacity.disabled}
        accessibilityLabel={dir < 0 ? 'Kamaytirish' : 'Oshirish'}
        style={styles.btn}
      >
        <Icon size={iconSize.sm} color={colors.text} strokeWidth={iconStroke} />
      </Pressable>
    )
  }

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => {
        if (e.nativeEvent.actionName === 'increment' && canUp) onChange(value + 1)
        if (e.nativeEvent.actionName === 'decrement' && canDown) onChange(value - 1)
      }}
      style={[
        styles.row,
        { backgroundColor: colors.surfaceRaised, opacity: disabled ? stateOpacity.disabled : 1 },
        style,
      ]}
    >
      {button(-1)}
      <Text style={[typeScale.headline, tabular, styles.value, { color: colors.text }]}>{value}{suffix}</Text>
      {button(1)}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, alignSelf: 'flex-start' },
  btn: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: space.xxl, textAlign: 'center' },
})
