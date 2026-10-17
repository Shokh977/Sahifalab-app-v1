/**
 * Chip — filter (soft accent when selected) or choice (accent fill when
 * selected); default, selected, disabled. 40 tall with hitSlop to 48.
 */
import React from 'react'
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { controlHeight, iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'

export type ChipVariant = 'filter' | 'choice'

export interface ChipProps {
  label: string
  selected?: boolean
  onPress?: () => void
  variant?: ChipVariant
  icon?: LucideIcon
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

const SLOP = (layout.minTouch - controlHeight.sm) / 2

export function Chip({ label, selected, onPress, variant = 'filter', icon: Icon, disabled, style }: ChipProps) {
  const { colors } = useTheme()
  const filled = selected && variant === 'choice'
  const bg = filled ? colors.accent : selected ? colors.accentSoft : colors.surface
  const border = selected ? colors.accent : colors.border
  const fg = filled ? colors.onAccent : selected ? colors.accentText : colors.text

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      hitSlop={SLOP}
      baseOpacity={disabled ? stateOpacity.disabled : 1}
      accessibilityRole={variant === 'choice' ? 'radio' : 'checkbox'}
      accessibilityState={{ selected: !!selected, checked: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }, style]}
    >
      {Icon && <Icon size={iconSize.sm - 4} color={fg} strokeWidth={iconStroke} />}
      <Text style={[typeScale.callout, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    height: controlHeight.sm,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 2,
    alignSelf: 'flex-start',
  },
})
