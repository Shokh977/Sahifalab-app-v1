import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Trophy, Users } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { challenges as challengesApi, type Challenge } from '../../lib/api'

function fmtHours(minutes: number): string {
  const h = minutes / 60
  return h % 1 === 0 ? `${h}` : h.toFixed(1)
}
function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

/**
 * Dashboard discovery surface for Musobaqalar — this is how challenges get
 * *found*; the tab is where they're actually managed. Shows at most one
 * card: the caller's own active progress if joined, otherwise the best
 * not-yet-joined challenge to invite them into.
 */
export function ChallengeDashboardCard() {
  const { c }  = useTheme()
  const router = useRouter()
  const [active, setActive] = useState<Challenge | null>(null)
  const [suggestion, setSuggestion] = useState<Challenge | null>(null)
  const [joining, setJoining] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([challengesApi.mine(), challengesApi.list('upcoming_active')]).then(([mine, list]) => {
      if (cancelled) return
      const myActive = mine.find(x => x.status === 'active' && !x.completed_at)
      if (myActive) {
        setActive(myActive)
      } else {
        const myIds = new Set(mine.map(x => x.id))
        const candidate = list.filter(x => !myIds.has(x.id)).sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))[0]
        setSuggestion(candidate ?? null)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
    return () => { cancelled = true }
  }, [])

  async function handleJoin() {
    if (!suggestion) return
    setJoining(true)
    try {
      await challengesApi.join(suggestion.id)
      router.push(`/(screens)/challenge/${suggestion.slug}` as any)
    } catch {
      router.push(`/(screens)/challenge/${suggestion.slug}` as any)
    } finally {
      setJoining(false)
    }
  }

  if (!loaded || (!active && !suggestion)) return null

  if (active) {
    const pct = Math.min(100, Math.round((active.progress_value / active.target_value) * 100))
    return (
      <Pressable
        onPress={() => router.push(`/(screens)/challenge/${active.slug}` as any)}
        style={[styles.card, { backgroundColor: active.color + '18', borderColor: active.color, marginHorizontal: spacing.screenMargin }]}
      >
        <Trophy size={20} color={active.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Marafon: {fmtHours(active.progress_value)}/{fmtHours(active.target_value)} soat
          </Text>
          <View style={[styles.track, { backgroundColor: c.border }]}>
            <View style={[styles.fill, { backgroundColor: active.color, width: `${pct}%` as any }]} />
          </View>
        </View>
      </Pressable>
    )
  }

  if (!suggestion) return null
  const isUpcoming = suggestion.status === 'upcoming'

  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border, marginHorizontal: spacing.screenMargin }]}>
      <Trophy size={20} color={suggestion.color} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Yangi musobaqa: {suggestion.title}
        </Text>
        <Text style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {isUpcoming ? `${daysUntil(suggestion.starts_at)} kundan keyin boshlanadi` : `${suggestion.participant_count} kishi qatnashmoqda`}
        </Text>
      </View>
      <Pressable onPress={handleJoin} disabled={joining} style={[styles.joinBtn, { backgroundColor: suggestion.color, opacity: joining ? 0.6 : 1 }]}>
        {joining ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.joinBtnText}>Qo'shilish</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.sm,
  },
  title: { fontSize: 14 },
  sub:   { fontSize: 12, marginTop: 1 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill:  { height: 5, borderRadius: 3 },
  joinBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  joinBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
