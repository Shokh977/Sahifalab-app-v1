import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getBadgeEmoji, isStageBadge, stageNum } from '../../lib/badges'
import { stagePalettes } from '../../lib/treeTheme'
import type { StageNumber } from '../../lib/treeTheme'
import type { TopBadge } from '../../lib/api'

/**
 * One tiny badge icon next to a user's name (step-24 Part 6) — leaderboard
 * rows, deck creator cards, anywhere a name+avatar appears. Only their
 * single most prestigious badge, never a row of them (that's the trophy
 * room's job) — this is what turns a badge into a currency other users
 * recognize and want.
 *
 * Tree-stage badges do NOT use the tree art here (step-24 amendment): at
 * 16px the trunk/canopy shapes that distinguish the 10 stages collapse to a
 * couple of sub-pixel blobs — the amendment explicitly calls for a colored
 * number chip fallback at this size instead of an unreadable tree.
 */
export function TopBadgeIndicator({ topBadge }: { topBadge?: TopBadge | null }) {
  if (!topBadge) return null

  if (topBadge.kind === 'stage' && isStageBadge(topBadge.key)) {
    const stage = stageNum(topBadge.key) as StageNumber
    const color = stagePalettes[stage]?.base ?? '#2fa07f'
    return (
      <View style={[styles.chip, { backgroundColor: color }]}>
        <Text style={styles.chipText}>{stage}</Text>
      </View>
    )
  }

  return <Text style={{ fontSize: 13 }}>{getBadgeEmoji(topBadge.key)}</Text>
}

const styles = StyleSheet.create({
  chip: {
    width: 16, height: 16, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontSize: 9, fontWeight: '700', color: '#fff' },
})
