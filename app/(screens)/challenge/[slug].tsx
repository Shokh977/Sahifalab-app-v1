import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Users, Clock, Trophy, Timer, Award } from 'lucide-react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../../hooks/useTheme'
import { typography, spacing, radius } from '../../../lib/constants'
import { challenges as challengesApi, type ChallengeDetail } from '../../../lib/api'
import { useAuthStore } from '../../../stores/authStore'

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}
function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}
function fmtHours(minutes: number): string {
  const h = minutes / 60
  return h % 1 === 0 ? `${h}` : h.toFixed(1)
}

export default function ChallengeDetailScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const myId     = useAuthStore(s => s.user?.telegram_id)

  const [data, setData]           = useState<ChallengeDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joining, setJoining]     = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const res = await challengesApi.get(slug)
      setData(res)
    } catch {
      // stays null -> not-found state
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [slug])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleJoin() {
    if (!data) return
    setJoining(true)
    try {
      await challengesApi.join(data.id)
      await load(true)
    } catch (e: any) {
      Alert.alert('Xatolik', e?.message ?? "Qo'shilib bo'lmadi")
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnAlone} hitSlop={12}>
          <ChevronLeft size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={{ color: c.textMuted, fontFamily: typography.fontFamily.regular }}>Musobaqa topilmadi</Text>
      </View>
    )
  }

  const pct = Math.min(100, Math.round((data.progress_value / data.target_value) * 100))
  const paceHint = data.joined && data.status === 'active' && !data.completed_at
    ? (() => {
        const remainingMinutes = Math.max(0, data.target_value - data.progress_value)
        const remainingDays = Math.max(1, daysLeft(data.ends_at))
        const perDay = Math.round(remainingMinutes / remainingDays)
        return perDay > 0 ? `Kuniga ~${perDay} daqiqa — yetib borasiz!` : null
      })()
    : null

  const callerInLeaderboard = data.leaderboard.some(l => l.user_id === myId)

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor="#fff" />}
      >
        {/* ── Header: gradient band ─────────────────────────────────────── */}
        <LinearGradient
          colors={[data.color, data.color + '99']}
          style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerIconWrap}>
            <Timer size={36} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{data.title}</Text>
          {data.description && <Text style={styles.headerDesc}>{data.description}</Text>}

          <View style={styles.statusStrip}>
            <Text style={styles.statusStripText}>
              {data.status === 'upcoming'
                ? `Boshlanishiga ${daysUntil(data.starts_at)} kun`
                : data.status === 'active'
                ? `Tugashiga ${daysLeft(data.ends_at)} kun`
                : data.status === 'cancelled'
                ? 'Bekor qilingan'
                : 'Yakunlandi'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Big participant count — this IS the motivation ─────────── */}
          <View style={[styles.participantCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Users size={22} color={data.color} />
            <Text style={[styles.participantNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
              {data.participant_count}
            </Text>
            <Text style={[styles.participantLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
              kishi qatnashmoqda
            </Text>
          </View>

          {/* ── The goal, stated plainly ─────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.goalText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {Math.round((new Date(data.ends_at).getTime() - new Date(data.starts_at).getTime()) / 86_400_000)} kun ichida {fmtHours(data.target_value)} soat fokus
            </Text>
            <Text style={[styles.metricRule, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Faqat fokus taymer vaqti hisoblanadi.
            </Text>
          </View>

          {/* ── Your progress ──────────────────────────────────────────── */}
          {data.joined && (
            <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sizning progressingiz
              </Text>
              <Text style={[styles.progressBig, { color: data.color, fontFamily: typography.fontFamily.extrabold }]}>
                {fmtHours(data.progress_value)} / {fmtHours(data.target_value)} soat
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                <View style={[styles.progressFill, { backgroundColor: data.color, width: `${pct}%` as any }]} />
              </View>
              <Text style={[styles.progressPct, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>{pct}%</Text>
              {data.completed_at ? (
                <Text style={[styles.completedText, { color: data.color, fontFamily: typography.fontFamily.semibold }]}>
                  ✅ Yakunladingiz!
                </Text>
              ) : paceHint ? (
                <Text style={[styles.paceHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {paceHint}
                </Text>
              ) : null}
            </View>
          )}

          {/* ── Leaderboard ────────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              🏆 Reyting
            </Text>
            {data.leaderboard.length === 0 ? (
              <Text style={[styles.emptyLb, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Hali ishtirokchilar yo'q
              </Text>
            ) : (
              data.leaderboard.map(entry => (
                <View key={entry.user_id} style={[styles.lbRow, { borderBottomColor: c.border }]}>
                  <Text style={[styles.lbRank, { color: entry.rank <= 3 ? data.color : c.textMuted, fontFamily: typography.fontFamily.bold }]}>
                    #{entry.rank}
                  </Text>
                  {entry.photo_url ? (
                    <Image source={{ uri: entry.photo_url }} style={styles.lbAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.lbAvatar, styles.lbAvatarFallback, { backgroundColor: data.color }]}>
                      <Text style={styles.lbAvatarInitial}>{entry.first_name?.slice(0, 1).toUpperCase() ?? '?'}</Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={[styles.lbName, { color: entry.user_id === myId ? data.color : c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                    {entry.first_name}{entry.user_id === myId ? ' (Siz)' : ''}
                  </Text>
                  {entry.completed_at && <Text style={styles.lbCheck}>✅</Text>}
                  <Text style={[styles.lbHours, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                    {fmtHours(entry.progress_value)}s
                  </Text>
                </View>
              ))
            )}
            {/* Caller's own row pinned if outside the top slice returned */}
            {data.joined && !callerInLeaderboard && data.rank != null && (
              <View style={[styles.lbRow, styles.lbCallerRow, { borderTopColor: c.border, backgroundColor: data.color + '10' }]}>
                <Text style={[styles.lbRank, { color: data.color, fontFamily: typography.fontFamily.bold }]}>#{data.rank}</Text>
                <Text style={[styles.lbName, { flex: 1, color: data.color, fontFamily: typography.fontFamily.semibold }]}>Siz</Text>
                <Text style={[styles.lbHours, { color: data.color, fontFamily: typography.fontFamily.semibold }]}>
                  {fmtHours(data.progress_value)}s
                </Text>
              </View>
            )}
          </View>

          {/* ── Reward ─────────────────────────────────────────────────── */}
          <View style={[styles.section, styles.rewardSection, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Award size={20} color={data.color} />
            <Text style={[styles.rewardText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Yakunlaganda: +{data.reward_xp} XP{data.badge_key ? ` va "${data.badge_key}" nishoni` : ''}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Primary action ───────────────────────────────────────────── */}
      {data.status !== 'ended' && data.status !== 'cancelled' && (
        <View style={[styles.actionBar, { backgroundColor: c.bgSecondary, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.sm }]}>
          {!data.joined ? (
            <Pressable
              onPress={handleJoin}
              disabled={joining}
              style={[styles.primaryBtn, { backgroundColor: data.color, opacity: joining ? 0.6 : 1 }]}
            >
              {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Qo'shilish</Text>}
            </Pressable>
          ) : data.status === 'active' && !data.completed_at ? (
            <Pressable
              onPress={() => router.push('/(tabs)/study' as any)}
              style={[styles.primaryBtn, { backgroundColor: data.color }]}
            >
              <Text style={styles.primaryBtnText}>Fokusni boshlash</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  backBtnAlone: { position: 'absolute', top: 50, left: spacing.base },

  header: { paddingHorizontal: spacing.base, paddingBottom: spacing.lg, alignItems: 'center', gap: spacing.xs },
  backBtn: { position: 'absolute', top: 50, left: spacing.base, zIndex: 10 },
  headerIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: spacing.xs },
  headerDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 18 },
  statusStrip: {
    marginTop: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.22)',
  },
  statusStripText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  body: { padding: spacing.base, gap: spacing.sm, marginTop: -spacing.base },

  participantCard: {
    alignItems: 'center', gap: 2, borderRadius: radius.xl, borderWidth: 1,
    paddingVertical: spacing.lg,
  },
  participantNum:  { fontSize: 40, lineHeight: 46 },
  participantLabel: { fontSize: 14 },

  section: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.base, gap: spacing.xs },
  sectionTitle: { fontSize: 15, marginBottom: 2 },
  goalText:  { fontSize: 15, lineHeight: 20 },
  metricRule: { fontSize: 12 },

  progressBig: { fontSize: 22 },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 4 },
  progressFill:  { height: 10, borderRadius: 5 },
  progressPct:   { fontSize: 12, alignSelf: 'flex-end' },
  completedText: { fontSize: 14, marginTop: spacing.xs },
  paceHint:      { fontSize: 13, marginTop: spacing.xs },

  emptyLb: { fontSize: 13, textAlign: 'center', paddingVertical: spacing.base },
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lbCallerRow: { borderTopWidth: 1, borderBottomWidth: 0, marginTop: spacing.xs, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  lbRank: { width: 32, fontSize: 13 },
  lbAvatar: { width: 28, height: 28, borderRadius: 14 },
  lbAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  lbAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  lbName: { flex: 1, fontSize: 14 },
  lbCheck: { fontSize: 12 },
  lbHours: { fontSize: 13 },

  rewardSection: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rewardText: { flex: 1, fontSize: 14 },

  actionBar: { padding: spacing.base, borderTopWidth: StyleSheet.hairlineWidth },
  primaryBtn: { paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
