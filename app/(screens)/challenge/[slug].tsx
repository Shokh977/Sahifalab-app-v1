import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Users, Trophy, Timer, Award } from 'lucide-react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../../hooks/useTheme'
import { typography, spacing, radius } from '../../../lib/constants'
import { challenges as challengesApi, type ChallengeDetail, type TeamLeaderboard } from '../../../lib/api'
import { useAuthStore } from '../../../stores/authStore'
import {
  daysLeft, daysUntil, fmtMetricValue, fmtMetricGoal, paceHint,
  percentileFraming, computePercentile, teamStandingLine,
  metricCtaRoute, metricCtaLabel, challengeGoalText, metricRuleText,
} from '../../../lib/challenges'
import { ConsistencyDayDots, type DayDotState } from '../../../components/study/ConsistencyDayDots'
import { TeamHeadToHeadBar } from '../../../components/study/TeamHeadToHeadBar'

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
  const [teamLb, setTeamLb]       = useState<TeamLeaderboard | null>(null)

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

  useEffect(() => {
    if (data?.challenge_type === 'team' && data.joined) {
      challengesApi.teamLeaderboard(data.id).then(setTeamLb).catch(() => {})
    }
  }, [data?.id, data?.challenge_type, data?.joined])

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
        <Text style={{ color: c.textMuted, fontFamily: typography.fontFamily.regular }}>Bellashuv topilmadi</Text>
      </View>
    )
  }

  const target = data.target_value ?? 0
  const pct = target > 0 ? Math.min(100, Math.round((data.progress_value / target) * 100)) : 0
  const showCumulativeProgress = data.joined && data.status === 'active' && !data.completed_at && data.challenge_type === 'cumulative'
  const callerInLeaderboard = data.leaderboard.some(l => l.user_id === myId)
  const percentile = computePercentile(data.rank, data.participant_count)

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
              {challengeGoalText(data)}
            </Text>
            <Text style={[styles.metricRule, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {metricRuleText(data.metric)}
            </Text>
          </View>

          {/* ── Your progress — body differs by type (step-25) ───────────── */}
          {data.joined && data.challenge_type === 'team' && (
            <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Guruhlar jangi
              </Text>
              <TeamHeadToHeadBar
                teamAName={data.team_a_name ?? 'Guruh A'} teamAColor={data.team_a_color ?? '#F5A623'} teamATotal={data.team_a_total}
                teamBName={data.team_b_name ?? 'Guruh B'} teamBColor={data.team_b_color ?? '#5AC8FA'} teamBTotal={data.team_b_total}
                fmtValue={v => fmtMetricGoal(v, data.metric)}
              />
              <Text style={[styles.progressPct, { color: c.textPrimary, fontFamily: typography.fontFamily.medium, alignSelf: 'flex-start', marginTop: spacing.xs }]}>
                Sizning hissangiz: {fmtMetricGoal(data.progress_value, data.metric)}
              </Text>
              {!data.completed_at && (
                <Text style={[styles.paceHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {teamStandingLine(
                    data.team === 'A' ? data.team_a_total : data.team_b_total,
                    data.team === 'A' ? data.team_b_total : data.team_a_total,
                    data.metric,
                  )}
                </Text>
              )}
            </View>
          )}

          {data.joined && data.challenge_type === 'consistency' && (
            <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sizning seriyangiz
              </Text>
              <ConsistencyDayDots
                days={data.daily_progress.map((d): DayDotState =>
                  d.qualified ? 'filled' : d.value > 0 ? 'grace' : 'hollow')}
                color={data.color}
                label={`${data.qualifying_days} / ${data.required_days ?? 0}`}
              />
              {data.failed_at ? (
                <Text style={[styles.paceHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  Seriya uzildi. Keyingi bellashuvda yana urinib ko'ring!
                </Text>
              ) : data.completed_at ? (
                <Text style={[styles.completedText, { color: data.color, fontFamily: typography.fontFamily.semibold }]}>
                  ✅ Seriyani yakunladingiz!
                </Text>
              ) : (
                <Text style={[styles.paceHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  🔥 {data.current_run} kunlik seriya · {Math.max(0, (data.allowed_misses ?? 0) - data.misses_used)} ta imkoniyat qoldi
                </Text>
              )}
            </View>
          )}

          {data.joined && data.challenge_type === 'sprint' && !data.completed_at && (
            <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sizning o'rningiz
              </Text>
              <Text style={[styles.progressBig, { color: data.color, fontFamily: typography.fontFamily.extrabold }]}>
                {data.rank != null ? `#${data.rank}` : '—'}
              </Text>
              <Text style={[styles.paceHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {percentileFraming(percentile)}
              </Text>
              {data.winner_count != null && (
                <Text style={[styles.metricRule, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  🏆 Top {data.winner_count} g'olib bo'ladi
                </Text>
              )}
            </View>
          )}

          {showCumulativeProgress && (
            <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sizning progressingiz
              </Text>
              <Text style={[styles.progressBig, { color: data.color, fontFamily: typography.fontFamily.extrabold }]}>
                {fmtMetricValue(data.progress_value, data.metric)} / {fmtMetricGoal(target, data.metric)}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                <View style={[styles.progressFill, { backgroundColor: data.color, width: `${pct}%` as any }]} />
              </View>
              <Text style={[styles.progressPct, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>{pct}%</Text>
              <Text style={[styles.paceHint, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {paceHint(data)}
              </Text>
            </View>
          )}

          {data.joined && data.completed_at && data.challenge_type === 'cumulative' && (
            <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <Text style={[styles.completedText, { color: data.color, fontFamily: typography.fontFamily.semibold }]}>
                ✅ Yakunladingiz!
              </Text>
            </View>
          )}

          {/* ── Leaderboard — team challenges get within-team top contributors instead ── */}
          {data.challenge_type === 'team' ? (
            teamLb && (
              <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  🏆 Faol ishtirokchilar
                </Text>
                <View style={styles.teamCols}>
                  {([['team_a', teamLb.team_a], ['team_b', teamLb.team_b]] as const).map(([key, team]) => (
                    <View key={key} style={{ flex: 1, gap: spacing.xs }}>
                      <Text numberOfLines={1} style={[styles.teamColHeader, { color: team.color ?? data.color, fontFamily: typography.fontFamily.bold }]}>
                        {team.name}
                      </Text>
                      {team.top.map((p, i) => (
                        <View key={p.user_id} style={styles.teamContribRow}>
                          <Text style={[styles.teamContribRank, { color: c.textMuted }]}>#{i + 1}</Text>
                          <Text numberOfLines={1} style={[styles.teamContribName, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                            {p.first_name}
                          </Text>
                          <Text style={[styles.teamContribValue, { color: c.textSecondary }]}>
                            {fmtMetricValue(p.progress_value, data.metric)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )
          ) : (
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
                      {fmtMetricValue(entry.progress_value, data.metric)}
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
                    {fmtMetricValue(data.progress_value, data.metric)}
                  </Text>
                </View>
              )}
            </View>
          )}

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
              onPress={() => router.push(metricCtaRoute(data.metric) as any)}
              style={[styles.primaryBtn, { backgroundColor: data.color }]}
            >
              <Text style={styles.primaryBtnText}>{metricCtaLabel(data.metric)}</Text>
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

  body: { padding: spacing.base, gap: spacing.sm },

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

  teamCols: { flexDirection: 'row', gap: spacing.base },
  teamColHeader: { fontSize: 14, marginBottom: 2 },
  teamContribRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamContribRank: { fontSize: 11, width: 18 },
  teamContribName: { fontSize: 12, flex: 1 },
  teamContribValue: { fontSize: 11 },

  rewardSection: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rewardText: { flex: 1, fontSize: 14 },

  actionBar: { padding: spacing.base, borderTopWidth: StyleSheet.hairlineWidth },
  primaryBtn: { paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
