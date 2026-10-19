/**
 * One badge in a 4-column grid: a tile and the name (Phase 7.5 D2 — no
 * emoji). Earned → the badge kind's line icon on its soft tint with a 1 px
 * tinted line (tree stages keep their tree art). Locked → the same icon in
 * textMuted on surfaceRaised with a lock — a readable silhouette, never a
 * faded ghost.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  CalendarCheck, Lock, Moon, Star, Timer, TreeDeciduous, Trophy, Users, Zap, type LucideIcon,
} from 'lucide-react-native'
import { isStageBadge, stageNum } from '../../../lib/badges'
import { MagicTree } from '../../../components/streak/MagicTree'
import type { StageNumber } from '../../../lib/treeTheme'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { uzText } from '../today/today'
import { BADGE_ART, badgeArtKind, type ProfileBadge } from './badges'

const ICONS: Record<(typeof BADGE_ART)[keyof typeof BADGE_ART]['icon'], LucideIcon> = {
  moon: Moon, timer: Timer, trophy: Trophy, users: Users, zap: Zap, calendarCheck: CalendarCheck, star: Star,
}

/** Icon and tint for a badge (tree stages: the tree icon, green). */
export function badgeVisual(badge: ProfileBadge): { Icon: LucideIcon; tint: 'green' | (typeof BADGE_ART)[keyof typeof BADGE_ART]['tint'] } {
  const kind = badgeArtKind(badge)
  if (kind === 'tree') return { Icon: TreeDeciduous, tint: 'green' }
  return { Icon: ICONS[BADGE_ART[kind].icon], tint: BADGE_ART[kind].tint }
}

/** The tree for a stage badge, or null. */
export function stageArt(badge: ProfileBadge, earned = badge.earned) {
  const key = badge.source && isStageBadge(badge.source.key) ? badge.source.key : null
  if (!key || !earned) return null
  return <MagicTree stage={stageNum(key) as StageNumber} state="alive" size="badge" simplified animate={false} />
}

export function BadgeArt({ badge, size }: { badge: ProfileBadge; size: number }) {
  const { colors, tint } = useTheme()
  const { Icon, tint: tintName } = badgeVisual(badge)
  const t = tint(tintName)
  const iconPx = Math.round(size * 0.47)

  if (!badge.earned) {
    return (
      <View style={[styles.tile, { width: size, height: size, backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Icon size={iconPx} color={colors.textMuted} strokeWidth={iconStroke} />
        <View style={[styles.lock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Lock size={iconSize.sm - 8} color={colors.textMuted} strokeWidth={iconStroke + 0.4} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: t.soft, borderColor: t.line }]}>
      {stageArt(badge) ?? <Icon size={iconPx} color={t.ink} strokeWidth={iconStroke} />}
    </View>
  )
}

export function BadgeCell({ badge, width, onPress }: { badge: ProfileBadge; width: number; onPress: () => void }) {
  const { colors } = useTheme()
  const name = uzText(badge.name)
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${name}, ${badge.earned ? 'olingan' : 'hali olinmagan'}`}
      style={[styles.cell, { width }]}
    >
      <BadgeArt badge={badge} size={width} />
      <Text
        numberOfLines={2}
        style={[typeScale.caption, styles.name, { color: badge.earned ? colors.text : colors.textMuted }]}
      >
        {name}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center', gap: space.xxs },
  tile: { borderRadius: radius.lg + 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lock: {
    position: 'absolute',
    right: space.xxs,
    bottom: space.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    padding: 2,
  },
  name: { textAlign: 'center' },
})
