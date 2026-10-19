/**
 * BadgeTile (Phase 7.5 B5) — an earned badge in the Profil grid: a 72 px
 * tinted tile (radius 22, soft background, 1 px line) with a 34 px line
 * icon — or the badge's own artwork — and its name under it (2 lines max).
 * No emoji medals.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconStroke, space } from '../../design/spacing'
import type { TintName } from '../../design/tokens'
import { type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'

export const BADGE_TILE = 72
const ICON = 34
const RADIUS = 22

export function BadgeTile({ name, icon: Icon, art, tint, locked, onPress, style }: {
  name: string
  icon?: LucideIcon
  /** Real artwork (e.g. the tree), shown instead of the icon. */
  art?: React.ReactNode
  tint: TintName
  /** Not earned yet: neutral and faded. */
  locked?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const { colors, tint: tintOf } = useTheme()
  const t = tintOf(tint)
  const body = (
    <>
      <View
        style={[
          styles.tile,
          locked
            ? { backgroundColor: colors.surfaceRaised, borderColor: colors.border }
            : { backgroundColor: t.soft, borderColor: t.line },
        ]}
      >
        {art ?? (Icon ? <Icon size={ICON} color={locked ? colors.textFaint : t.ink} strokeWidth={iconStroke} /> : null)}
      </View>
      <Text style={[typeScale.caption, styles.name, { color: locked ? colors.textMuted : colors.text }]} numberOfLines={2}>
        {name}
      </Text>
    </>
  )
  const a11y = `${name}${locked ? ', hali olinmagan' : ''}`
  return onPress ? (
    <Pressable onPress={onPress} accessibilityLabel={a11y} style={[styles.root, style]}>{body}</Pressable>
  ) : (
    <View accessible accessibilityLabel={a11y} style={[styles.root, style]}>{body}</View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.xs, width: BADGE_TILE + space.xs },
  tile: {
    width: BADGE_TILE,
    height: BADGE_TILE,
    borderRadius: RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { textAlign: 'center' },
})
