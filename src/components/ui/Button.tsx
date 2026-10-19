/**
 * Button — primary (orange gradient), secondary (outline), ghost,
 * destructive; sm 40 / md 48 / lg 54; default, pressed, disabled, loading.
 * Filled buttons carry white 18 px extra bold labels (type.onAccent — the
 * large-text bar for white on orange) and, in light mode, the accent shadow.
 */
import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { controlHeight, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'
import { AccentFill } from './AccentFill'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

export function Button({
  label, onPress, variant = 'primary', size = 'md', icon: Icon, disabled, loading, fullWidth, style, accessibilityLabel,
}: ButtonProps) {
  const { colors, accentShadow } = useTheme()
  const primary = variant === 'primary'
  const filled = primary || variant === 'destructive'
  const bg = variant === 'destructive' ? colors.danger : 'transparent'
  const fg = filled ? colors.onAccent : variant === 'secondary' ? colors.text : colors.accentText
  const inactive = disabled || loading
  const textStyle = filled ? typeScale.onAccent : size === 'sm' ? typeScale.callout : typeScale.headline

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      haptic={variant === 'primary' ? 'light' : undefined}
      baseOpacity={disabled ? stateOpacity.disabled : 1}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: !!loading, disabled: !!inactive }}
      style={[
        styles.base,
        {
          height: controlHeight[size],
          paddingHorizontal: size === 'sm' ? space.md : space.lg,
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? colors.border : 'transparent',
        },
        primary && !disabled && accentShadow,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {primary && <AccentFill radius={radius.md} />}
      {/* Label stays laid out while loading so the button never changes width. */}
      <View style={[styles.content, loading && styles.hidden]}>
        {Icon && <Icon size={iconSize.sm} color={fg} strokeWidth={iconStroke} />}
        <Text numberOfLines={1} style={[textStyle, { color: fg }]}>{label}</Text>
      </View>
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color={fg} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  hidden: { opacity: 0 },
})
