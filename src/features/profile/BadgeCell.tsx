/**
 * One badge in a 4-column grid: a square tile and the name.
 * Earned → the badge's emoji (or its tree for stage badges) on a category
 * tint. Locked → a readable silhouette: the category's outline icon in
 * textMuted on surfaceRaised with a lock, the name in textMuted (AA) —
 * never a faded ghost.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Crown, Lock, Medal, TreeDeciduous, Trophy, type LucideIcon } from 'lucide-react-native'
import { getBadgeEmoji, isStageBadge, stageNum } from '../../../lib/badges'
import { getLevelEmoji } from '../../../lib/levelTitles'
import { MagicTree } from '../../../components/streak/MagicTree'
import type { StageNumber } from '../../../lib/treeTheme'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { uzText } from '../today/today'
import type { BadgeCategory, ProfileBadge } from './badges'

export const CATEGORY_ICON: Record<BadgeCategory, LucideIcon> = {
  bellashuv: Trophy, bosqich: TreeDeciduous, yutuq: Medal, unvon: Crown,
}
/** badgeColors index per category (orange, green, violet, amber). */
const CATEGORY_TINT: Record<BadgeCategory, number> = { bellashuv: 0, bosqich: 6, yutuq: 3, unvon: 7 }

export function BadgeArt({ badge, size }: { badge: ProfileBadge; size: number }) {
  const { colors, badgeColors } = useTheme()
  const Icon = CATEGORY_ICON[badge.category]
  const stageKey = badge.source && badge.category === 'bosqich' && isStageBadge(badge.source.key) ? badge.source.key : null

  if (!badge.earned) {
    return (
      <View style={[styles.tile, { width: size, height: size, backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Icon size={size * 0.42} color={colors.textMuted} strokeWidth={iconStroke} />
        <View style={[styles.lock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Lock size={iconSize.sm - 8} color={colors.textMuted} strokeWidth={iconStroke + 0.4} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: badgeColors[CATEGORY_TINT[badge.category]], borderColor: 'transparent' }]}>
      {stageKey ? (
        <MagicTree stage={stageNum(stageKey) as StageNumber} state="alive" size="badge" simplified animate={false} />
      ) : (
        <Text style={[typeScale.title1, styles.emoji]} accessibilityElementsHidden>
          {badge.category === 'unvon' ? getLevelEmoji(badge.level ?? 1) : getBadgeEmoji(badge.source?.key ?? '')}
        </Text>
      )}
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
  tile: { borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { textAlign: 'center' },
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
