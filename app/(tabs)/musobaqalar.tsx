import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { Users, Clock, Trophy, ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { challenges as challengesApi, type Challenge } from '../../lib/api'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'

// Musobaqalar shows challenge cards ONLY — no tree, no Bosqichlar, no
// achievements, no leaderboard (the leaderboard lives in the challenge
// detail screen). Grouped: Faol (joined + running) → Ochiq (joinable) →
// Yakunlangan (collapsed history). See step-22.

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

function fmtHours(minutes: number): string {
  const h = minutes / 60
  return h % 1 === 0 ? `${h}` : h.toFixed(1)
}

export default function MusobaqalarScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [mine, setMine]           = useState<Challenge[]>([])
  const [open, setOpen]           = useState<Challenge[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const [mineRes, listRes] = await Promise.all([
        challengesApi.mine(),
        challengesApi.list('upcoming_active'),
      ])
      setMine(mineRes)
      const myIds = new Set(mineRes.map(c => c.id))
      setOpen(listRes.filter(c => !myIds.has(c.id)))
    } catch {
      // fail quiet — empty state covers it
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleJoin(ch: Challenge) {
    setJoiningId(ch.id)
    try {
      await challengesApi.join(ch.id)
      await load(true)
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? "Qo'shilib bo'lmadi")
    } finally {
      setJoiningId(null)
    }
  }

  const active    = mine.filter(c => c.status === 'active' && !c.completed_at)
  const completedOrEnded = mine.filter(c => c.status === 'ended' || !!c.completed_at)

  const hasAnything = active.length > 0 || open.length > 0 || completedOrEnded.length > 0

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Musobaqalar
        </Text>
        <ProfileAvatarButton size={28} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : !hasAnything ? (
        <View style={styles.empty}>
          <Trophy size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Hozircha faol musobaqa yo'q
          </Text>
          <Text style={[styles.emptyDesc, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Tez orada! Yangi musobaqalar shu yerda ko'rinadi.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={c.brand} />}
        >
          {active.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>FAOL</Text>
              {active.map(ch => <ActiveCard key={ch.id} ch={ch} c={c} onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)} />)}
            </View>
          )}

          {open.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>OCHIQ</Text>
              {open.map(ch => (
                <OpenCard
                  key={ch.id} ch={ch} c={c}
                  joining={joiningId === ch.id}
                  onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)}
                  onJoin={() => handleJoin(ch)}
                />
              ))}
            </View>
          )}

          {completedOrEnded.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>YAKUNLANGAN</Text>
              {completedOrEnded.map(ch => <EndedRow key={ch.id} ch={ch} c={c} onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)} />)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ── Faol card — largest, progress + rank ──────────────────────────────────────

function ActiveCard({ ch, c, onPress }: { ch: Challenge; c: any; onPress: () => void }) {
  const pct = Math.min(100, Math.round((ch.progress_value / ch.target_value) * 100))
  return (
    <Pressable onPress={onPress} style={[styles.activeCard, { backgroundColor: ch.color + '18', borderColor: ch.color }]}>
      <View style={styles.activeHeader}>
        <Text numberOfLines={2} style={[styles.activeTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {ch.title}
        </Text>
        {ch.rank != null && (
          <View style={[styles.rankChip, { backgroundColor: ch.color }]}>
            <Text style={styles.rankChipText}>#{ch.rank}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.activeProgressText, { color: ch.color, fontFamily: typography.fontFamily.bold }]}>
        {fmtHours(ch.progress_value)} / {fmtHours(ch.target_value)} soat
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View style={[styles.progressFill, { backgroundColor: ch.color, width: `${pct}%` as any }]} />
      </View>

      <View style={styles.activeFooter}>
        <View style={styles.footerItem}>
          <Clock size={13} color={c.textMuted} />
          <Text style={[styles.footerText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {daysLeft(ch.ends_at)} kun qoldi
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Users size={13} color={c.textMuted} />
          <Text style={[styles.footerText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {ch.participant_count} kishi
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

// ── Ochiq card — joinable, participant count prominent ────────────────────────

function OpenCard({ ch, c, joining, onPress, onJoin }: {
  ch: Challenge; c: any; joining: boolean; onPress: () => void; onJoin: () => void
}) {
  const isUpcoming = ch.status === 'upcoming'
  return (
    <Pressable onPress={onPress} style={[styles.openCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={[styles.openIconWrap, { backgroundColor: ch.color + '22' }]}>
        <Trophy size={20} color={ch.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.openTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {ch.title}
        </Text>
        <Text style={[styles.openMeta, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
          {ch.participant_count} kishi qatnashmoqda
        </Text>
        <Text style={[styles.openSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {isUpcoming ? `${daysLeft(ch.starts_at)} kundan keyin boshlanadi` : `${daysLeft(ch.ends_at)} kun qoldi`}
        </Text>
      </View>
      <Pressable
        onPress={onJoin}
        disabled={joining}
        style={[styles.joinBtn, { backgroundColor: ch.color, opacity: joining ? 0.6 : 1 }]}
      >
        {joining
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.joinBtnText}>Qo'shilish</Text>
        }
      </Pressable>
    </Pressable>
  )
}

// ── Yakunlangan row — collapsed history ────────────────────────────────────────

function EndedRow({ ch, c, onPress }: { ch: Challenge; c: any; onPress: () => void }) {
  const won = !!ch.completed_at
  return (
    <Pressable onPress={onPress} style={[styles.endedRow, { borderColor: c.border }]}>
      <Text style={styles.endedEmoji}>{won ? '🏆' : '🎯'}</Text>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.endedTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {ch.title}
        </Text>
        <Text style={[styles.endedSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {won ? `Yakunlandi · +${ch.reward_xp} XP` : `${fmtHours(ch.progress_value)}/${fmtHours(ch.target_value)} soat`}
        </Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: { fontSize: typography.size.xl },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xs },
  emptyTitle: { fontSize: typography.size.lg, marginTop: spacing.sm },
  emptyDesc:  { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },

  scroll: { padding: spacing.base, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8 },

  activeCard: { borderRadius: radius.xl, borderWidth: 1.5, padding: spacing.base, gap: spacing.xs },
  activeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  activeTitle: { flex: 1, fontSize: typography.size.lg, lineHeight: 22 },
  rankChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  rankChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  activeProgressText: { fontSize: typography.size.base, marginTop: spacing.xs },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: 8, borderRadius: 4 },
  activeFooter: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.xs },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12 },

  openCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm,
  },
  openIconWrap: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  openTitle: { fontSize: typography.size.base },
  openMeta:  { fontSize: 13, marginTop: 2 },
  openSub:   { fontSize: 12, marginTop: 1 },
  joinBtn:   { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  endedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  endedEmoji: { fontSize: 20 },
  endedTitle: { fontSize: 14 },
  endedSub:   { fontSize: 12, marginTop: 1 },
})
