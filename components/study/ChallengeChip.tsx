import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Trophy } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { challenges as challengesApi, type Challenge } from '../../lib/api'

function fmtHours(minutes: number): string {
  const h = minutes / 60
  return h % 1 === 0 ? `${h}` : h.toFixed(1)
}

/**
 * Contextual chip shown on the Taymer screen when the user is in an active
 * cohort challenge — deliberately placed where the progress is actually
 * earned. Musobaqalar (the tab) owns the full challenge system; this is
 * just a pointer back to it, not a duplicate of it.
 */
export function ChallengeChip() {
  const { c }  = useTheme()
  const router = useRouter()
  const [ch, setCh] = useState<Challenge | null>(null)

  useEffect(() => {
    let cancelled = false
    challengesApi.mine().then(list => {
      if (cancelled) return
      const active = list.find(x => x.status === 'active' && !x.completed_at)
      setCh(active ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!ch) return null

  const pct = Math.min(100, Math.round((ch.progress_value / ch.target_value) * 100))

  return (
    <Pressable
      onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)}
      style={[styles.chip, { backgroundColor: ch.color + '18', borderColor: ch.color }]}
    >
      <Trophy size={14} color={ch.color} />
      <Text numberOfLines={1} style={[styles.text, { color: ch.color, fontFamily: typography.fontFamily.semibold }]}>
        {ch.title} · {fmtHours(ch.progress_value)}/{fmtHours(ch.target_value)} soat
      </Text>
      <View style={[styles.track, { backgroundColor: ch.color + '33' }]}>
        <View style={[styles.fill, { backgroundColor: ch.color, width: `${pct}%` as any }]} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1,
    marginBottom: spacing.sm,
  },
  text:  { fontSize: 12, flexShrink: 1 },
  track: { width: 36, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: 4, borderRadius: 2 },
})
