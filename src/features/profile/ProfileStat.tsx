/**
 * Profile building blocks shared by Profil (yours) and the public profile:
 * the stat tile (tinted icon square, value, label — Phase 7.5 D2) and the
 * accent-ringed avatar.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import type { TintName } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'
import { Avatar } from '../../components/ui'

const STAT_ICON = 32
export const PROFILE_AVATAR = 72
const AVATAR_RING = 3

export function ProfileStat({ icon: Icon, tint, value, label }: { icon: LucideIcon; tint: TintName; value: string; label: string }) {
  const { colors, tint: tintOf, elevation } = useTheme()
  const t = tintOf(tint)
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={[styles.statIcon, { backgroundColor: t.soft }]}>
        <Icon size={iconSize.sm - 2} color={t.ink} strokeWidth={iconStroke + 0.2} />
      </View>
      <Text style={[typeScale.statValue, tabular, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={[typeScale.small, { color: colors.textMuted }]} numberOfLines={2}>{label}</Text>
    </View>
  )
}

export function ProfileAvatar({ name, id, uri }: { name: string; id?: number | null; uri?: string | null }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.ring, { borderColor: colors.accent }]}>
      <Avatar name={name || '?'} id={id} uri={uri} diameter={PROFILE_AVATAR - AVATAR_RING * 2} />
    </View>
  )
}

const styles = StyleSheet.create({
  stat: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: space.sm + 2, gap: space.xs },
  statIcon: { width: STAT_ICON, height: STAT_ICON, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: PROFILE_AVATAR, height: PROFILE_AVATAR, borderRadius: radius.full, borderWidth: AVATAR_RING,
    alignItems: 'center', justifyContent: 'center',
  },
})
