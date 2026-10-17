/**
 * IconButton — a Lucide icon in a 48×48 target, with an optional unread dot.
 * Default, pressed, disabled, and active (a toggle that is on: the icon
 * turns accent orange, no background).
 */
import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { Pressable } from './Pressable'

export interface IconButtonProps {
  icon: LucideIcon
  onPress?: () => void
  accessibilityLabel: string
  /** Shows a small accent dot (unread, new). */
  dot?: boolean
  /** Toggle state; also announced to screen readers. */
  active?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

const DOT = space.xs

export function IconButton({ icon: Icon, onPress, accessibilityLabel, dot, active, disabled, style }: IconButtonProps) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      baseOpacity={disabled ? stateOpacity.disabled : 1}
      accessibilityLabel={dot ? `${accessibilityLabel}, yangi` : accessibilityLabel}
      accessibilityState={active === undefined ? undefined : { checked: active, disabled: !!disabled }}
      accessibilityRole={active === undefined ? 'button' : 'switch'}
      style={[styles.target, style]}
    >
      <View>
        <Icon size={iconSize.md} color={active ? colors.accent : colors.text} strokeWidth={iconStroke} />
        {dot && <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.bg }]} />}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  target: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: DOT + 2,
    height: DOT + 2,
    borderRadius: radius.full,
    borderWidth: 2,
  },
})
