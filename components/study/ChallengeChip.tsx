import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Trophy } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { challenges as challengesApi, type Challenge } from '../../lib/api'
import { fmtMetricValue, fmtMetricGoal } from '../../lib/challenges'

/** One-line summary + 0-1 progress fraction, type-aware (step-25). */
function summaryFor(ch: Challenge): { text: string; pct: number } {
  switch (ch.challenge_type) {
    case 'consistency': {
      const required = ch.required_days ?? 0
      return { text: `${ch.title} · ${ch.qualifying_days}/${required} kun`, pct: required > 0 ? ch.qualifying_days / required : 0 }
    }
    case 'sprint':
      return { text: `${ch.title} · ${ch.rank != null ? `#${ch.rank}` : '—'}`, pct: 0 }
    case 'team': {
      const mine  = ch.team === 'A' ? ch.team_a_total : ch.team_b_total
      const other = ch.team === 'A' ? ch.team_b_total : ch.team_a_total
      const total = Math.max(1, mine + other)
      return { text: `${ch.title} · ${fmtMetricGoal(mine, ch.metric)}`, pct: mine / total }
    }
    default: {
      const target = ch.target_value ?? 0
      return {
        text: `${ch.title} · ${fmtMetricValue(ch.progress_value, ch.metric)}/${fmtMetricGoal(target, ch.metric)}`,
        pct: target > 0 ? ch.progress_value / target : 0,
      }
    }
  }
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
      const active = list.find(x => x.status === 'active' && !x.completed_at && !x.is_winner && !x.failed_at)
      setCh(active ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!ch) return null

  const { text, pct } = summaryFor(ch)
  const pctClamped = Math.min(100, Math.round(pct * 100))

  return (
    <Pressable
      onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)}
      style={[styles.chip, { backgroundColor: ch.color + '18', borderColor: ch.color }]}
    >
      <Trophy size={14} color={ch.color} />
      <Text numberOfLines={1} style={[styles.text, { color: ch.color, fontFamily: typography.fontFamily.semibold }]}>
        {text}
      </Text>
      <View style={[styles.track, { backgroundColor: ch.color + '33' }]}>
        <View style={[styles.fill, { backgroundColor: ch.color, width: `${pctClamped}%` as any }]} />
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
