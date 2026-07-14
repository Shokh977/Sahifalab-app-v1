import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'
import type { Badge, BadgeGroups } from '../../lib/api'
import { BadgeTile } from './BadgeTile'
import { BadgeDetailSheet } from './BadgeDetailSheet'

interface Props {
  data:    BadgeGroups | null
  loading: boolean
  variant: 'private' | 'public'
}

const SECTIONS: Array<{ key: keyof BadgeGroups['groups']; label: string; emoji: string }> = [
  { key: 'challenges',   label: 'Bellashuv',   emoji: '🏆' },
  { key: 'stages',       label: 'Bosqichlar',  emoji: '🌳' },
  { key: 'achievements', label: 'Yutuqlar',    emoji: '🏅' },
]

/**
 * Trofey Xonasi — same three groups on both profiles (step-24). The one
 * behavioral difference is upstream: the backend only ever sends locked
 * badges when variant === 'private' (GET /profile/me/badges), so this
 * component doesn't need its own earned/locked filtering logic — it just
 * renders whatever the API gave it.
 */
export function TrophyRoom({ data, loading, variant }: Props) {
  const { c } = useTheme()
  const [selected, setSelected] = useState<Badge | null>(null)

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={c.accentPrimary} />
      </View>
    )
  }

  if (!data) return null

  const { groups, summary } = data
  const isEmpty = summary.earned_count === 0

  if (variant === 'public' && isEmpty) {
    return (
      <View style={styles.emptyPublic}>
        <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          Hali nishonlar yo'q
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {variant === 'public' && (
        <Text style={[styles.summaryText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
          {summary.earned_count} / {summary.total_count} yutuq
        </Text>
      )}

      {variant === 'private' && isEmpty && (
        <Text style={[styles.encourage, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
          Birinchi nishoningizni oling! 🌱
        </Text>
      )}

      {SECTIONS.map(section => {
        const items = groups[section.key]
        if (items.length === 0) return null
        return (
          <View key={section.key} style={{ gap: spacing.sm }}>
            <Text style={[styles.sectionHeader, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {section.emoji} {section.label}
            </Text>
            <View style={styles.grid}>
              {items.map(b => (
                <BadgeTile key={b.key} badge={b} onPress={() => setSelected(b)} />
              ))}
            </View>
          </View>
        )
      })}

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyPublic: { paddingVertical: spacing.base, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  summaryText: { fontSize: 13 },
  encourage: { fontSize: 14 },
  sectionHeader: { fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
