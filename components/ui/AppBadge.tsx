import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius } from '../../lib/constants'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'

interface Props {
  label:    string
  variant?: Variant
  style?:   ViewStyle
}

export function AppBadge({ label, variant = 'neutral', style }: Props) {
  const { c } = useTheme()

  const bg: Record<Variant, string> = {
    success: c.successMuted,
    warning: c.warningMuted,
    error:   c.errorMuted,
    info:    c.accentSecondary + '20',
    accent:  c.accentPrimaryMuted,
    neutral: c.bgTertiary,
  }
  const textColor: Record<Variant, string> = {
    success: c.success,
    warning: c.warning,
    error:   c.error,
    info:    c.accentSecondary,
    accent:  c.accentPrimary,
    neutral: c.textSecondary,
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg[variant] }, style]}>
      <Text style={[styles.label, { color: textColor[variant], fontFamily: typography.fontFamily.medium }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical:   4,
    paddingHorizontal: 10,
    borderRadius:      radius.cardSm,
    alignSelf:         'flex-start',
  },
  label: {
    fontSize: typography.size.sm,
  },
})
