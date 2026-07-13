import React from 'react'
import { Text } from 'react-native'
import { getBadgeEmoji } from '../../lib/badges'
import type { TopBadge } from '../../lib/api'

/**
 * One tiny badge icon next to a user's name (step-24 Part 6) — leaderboard
 * rows, deck creator cards, anywhere a name+avatar appears. Only their
 * single most prestigious badge, never a row of them (that's the trophy
 * room's job) — this is what turns a badge into a currency other users
 * recognize and want.
 */
export function TopBadgeIndicator({ topBadge }: { topBadge?: TopBadge | null }) {
  if (!topBadge) return null
  return <Text style={{ fontSize: 13 }}>{getBadgeEmoji(topBadge.key)}</Text>
}
