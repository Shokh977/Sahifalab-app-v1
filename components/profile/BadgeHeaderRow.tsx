import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'
import { getBadgeEmoji, getTierColor } from '../../lib/badges'
import type { Badge } from '../../lib/api'

const SIZE = 32
const OVERLAP = 6

interface Props {
  badges:      Badge[]
  remaining:   number
  borderColor: string
  onPressMore?: () => void
}

/**
 * The display case (step-24 Part 4) — a badge is only a status symbol if
 * it's seen, and most users never scroll to the Trofey Xonasi. Renders
 * nothing at all when the user has zero badges (no empty-row placeholder).
 */
export function BadgeHeaderRow({ badges, remaining, borderColor, onPressMore }: Props) {
  const { c } = useTheme()
  if (badges.length === 0) return null

  return (
    <View style={styles.row}>
      {badges.map((b, i) => {
        const color = b.group === 'challenges' ? (b.challenge_color || '#F5A623') : getTierColor(b.tier)
        return (
          <View
            key={b.key}
            style={[
              styles.circle,
              { marginLeft: i === 0 ? 0 : -OVERLAP, borderColor, backgroundColor: color + '22', zIndex: badges.length - i },
            ]}
          >
            <Text style={styles.emoji}>{getBadgeEmoji(b.key)}</Text>
          </View>
        )
      })}
      {remaining > 0 && (
        <Pressable onPress={onPressMore} style={[styles.more, { borderColor, backgroundColor: c.bgTertiary }]}>
          <Text style={[styles.moreText, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
            +{remaining}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  circle: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 15 },
  more: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginLeft: -OVERLAP,
  },
  moreText: { fontSize: 11 },
})
