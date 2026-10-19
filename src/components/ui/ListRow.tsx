/**
 * ListRow — leading icon tile / avatar / thumbnail; trailing chevron / value /
 * count badge / check; states: pressed, done (dimmed + check), skeleton.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { Check, ChevronRight, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space, tileSize } from '../../design/spacing'
import { stateOpacity } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'
import { Avatar } from './Avatar'
import { Badge, type BadgeStatus } from './Badge'
import { Pressable } from './Pressable'
import { SkeletonRow } from './Skeleton'

export type ListRowLeading =
  /** color: an identity colour (e.g. a deck's) for the icon on a neutral tile. */
  | { kind: 'icon'; icon: LucideIcon; color?: string }
  | { kind: 'avatar'; name: string; uri?: string | null; id?: number | string | null }
  | { kind: 'thumbnail'; uri: string }

export type ListRowTrailing =
  | { kind: 'chevron' }
  /** color: a semantic text colour (e.g. successText for "Bepul"). */
  | { kind: 'value'; value: string; color?: string }
  | { kind: 'count'; count: number }
  /** A state chip (dot + label), e.g. "Tekshirilmoqda". */
  | { kind: 'status'; label: string; status: BadgeStatus }
  | { kind: 'check' }

export interface ListRowProps {
  title: string
  subtitle?: string
  leading?: ListRowLeading
  trailing?: ListRowTrailing
  onPress?: () => void
  /** Secondary actions (opens a sheet, typically). */
  onLongPress?: () => void
  /** Completed item: dimmed, with a check in place of the trailing slot. */
  done?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

export function ListRow({ title, subtitle, leading, trailing, onPress, onLongPress, done, loading, style }: ListRowProps) {
  const { colors } = useTheme()
  if (loading) return <SkeletonRow style={[styles.row, style]} />

  const lead = leading && (
    leading.kind === 'icon' ? (
      <View style={[styles.tile, { backgroundColor: leading.color ? colors.surfaceRaised : colors.accentSoft }]}>
        <leading.icon size={iconSize.sm} color={leading.color ?? colors.accentText} strokeWidth={iconStroke} />
      </View>
    ) : leading.kind === 'avatar' ? (
      <Avatar name={leading.name} uri={leading.uri} id={leading.id} size="md" />
    ) : (
      <Image source={{ uri: leading.uri }} style={[styles.tile, { backgroundColor: colors.surfaceRaised }]} contentFit="cover" cachePolicy="memory-disk" />
    )
  )

  const end = done ? { kind: 'check' as const } : trailing
  const tail = end && (
    end.kind === 'chevron' ? <ChevronRight size={iconSize.sm} color={colors.textFaint} strokeWidth={iconStroke} />
    : end.kind === 'value' ? <Text style={[typeScale.callout, tabular, { color: end.color ?? colors.textMuted }]} numberOfLines={1}>{end.value}</Text>
    : end.kind === 'count' ? <Badge kind="count" count={end.count} style={styles.center} />
    : end.kind === 'status' ? <Badge kind="status" status={end.status} label={end.label} style={styles.center} />
    : <Check size={iconSize.sm} color={colors.successText} strokeWidth={iconStroke} />
  )

  const body = (
    <>
      {lead}
      <View style={styles.text}>
        <Text style={[typeScale.headline, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {tail}
    </>
  )

  const opacity = done ? stateOpacity.done : 1
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        baseOpacity={opacity}
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        accessibilityState={{ checked: done }}
        style={[styles.row, style]}
      >
        {body}
      </Pressable>
    )
  }
  return <View style={[styles.row, { opacity }, style]}>{body}</View>
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: layout.minTouch + space.xs,
    paddingVertical: space.xs,
  },
  tile: { width: tileSize, height: tileSize, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  center: { alignSelf: 'center' },
})
