/**
 * EmptyState — one Lucide icon, a title, an optional line of body text and
 * at most one action.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button } from './Button'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: { label: string; onPress: () => void }
  style?: StyleProp<ViewStyle>
}

export function EmptyState({ icon: Icon, title, body, action, style }: EmptyStateProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceRaised }]}>
        <Icon size={iconSize.md} color={colors.textMuted} strokeWidth={iconStroke} />
      </View>
      <Text style={[typeScale.headline, styles.center, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[typeScale.body, styles.center, { color: colors.textMuted }]}>{body}</Text> : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: space.xs },
  tile: {
    width: avatarSize.lg, height: avatarSize.lg, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.xs,
  },
  center: { textAlign: 'center' },
  action: { alignSelf: 'center', marginTop: space.sm },
})
