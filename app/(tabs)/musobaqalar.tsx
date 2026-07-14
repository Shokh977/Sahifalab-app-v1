import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { ChevronRight, ChevronDown, Trophy } from 'lucide-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { challenges as challengesApi, type Challenge } from '../../lib/api'
import { shareChallengeCompletion } from '../../lib/share'
import {
  daysLeft, daysUntil, fmtMetricValue, fmtMetricGoal, paceHint,
  percentileFraming, computePercentile, teamStandingLine, METRIC_UNIT_LABEL,
  metricCtaRoute, metricCtaLabel, challengeGoalText,
} from '../../lib/challenges'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import { ChallengeCoverImage } from '../../components/study/ChallengeCoverImage'
import { ChallengeProgressRing } from '../../components/study/ChallengeProgressRing'
import { ParticipantAvatarStack } from '../../components/study/ParticipantAvatarStack'
import { ConsistencyDayDots, type DayDotState } from '../../components/study/ConsistencyDayDots'
import { TeamHeadToHeadBar } from '../../components/study/TeamHeadToHeadBar'

// Musobaqalar shows challenge cards ONLY — no tree, no Bosqichlar, no
// achievements, no leaderboard (the leaderboard lives in the challenge
// detail screen). Grouped: Faol (joined + running) → Ochiq (joinable) →
// Yakunlangan (collapsed history). See step-22 (structure), step-23
// (cover-image redesign), step-25 (metrics/types/team battles — the Faol
// card body now differs by challenge_type; everything else is unchanged).

// ── Entrance animation wrapper — fade + slide up, staggered, capped at 6 ──────

function CardEntrance({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0)
  const ty      = useSharedValue(12)
  React.useEffect(() => {
    const delay = Math.min(index, 5) * 60
    opacity.value = withDelay(delay, withTiming(1, { duration: 280 }))
    ty.value      = withDelay(delay, withTiming(0, { duration: 280 }))
  }, [])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }))
  return <Animated.View style={style}>{children}</Animated.View>
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
  const [showAllEnded, setShowAllEnded] = useState(false)

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
    // Optimistic transition: move the card from Ochiq → Faol immediately
    // rather than waiting on a round trip + full list reload.
    setOpen(prev => prev.filter(x => x.id !== ch.id))
    setMine(prev => [...prev, { ...ch, joined: true, progress_value: 0, completed_at: null, rank: null }])
    try {
      await challengesApi.join(ch.id)
      load(true)  // quiet background re-sync (real rank, team assignment, etc.)
    } catch (e: any) {
      // revert on failure
      setMine(prev => prev.filter(x => x.id !== ch.id))
      setOpen(prev => [...prev, ch])
      Alert.alert('Xatolik', e?.message ?? "Qo'shilib bo'lmadi")
    } finally {
      setJoiningId(null)
    }
  }

  const active    = mine.filter(c => c.status === 'active' && !c.completed_at && !c.is_winner && !c.failed_at)
  // Joined-but-not-started-yet — must never be lost between the Faol filter
  // (requires status === 'active') and the Ochiq list (only shows what the
  // caller hasn't joined). Without this bucket, joining an upcoming
  // challenge makes its card vanish entirely until it starts.
  const upcomingJoined = mine.filter(c => c.status === 'upcoming')
  const completedOrEnded = mine.filter(c => c.status === 'ended' || !!c.completed_at || c.is_winner || !!c.failed_at)
  const endedVisible = showAllEnded ? completedOrEnded : completedOrEnded.slice(0, 3)

  const hasAnything = active.length > 0 || upcomingJoined.length > 0 || open.length > 0 || completedOrEnded.length > 0

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Bellashuv
        </Text>
        <ProfileAvatarButton size={28} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : !hasAnything ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={[styles.emptyTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Hozircha faol bellashuv yo'q
          </Text>
          <Text style={[styles.emptyDesc, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Tez orada yangi bellashuv qo'shiladi!
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
              <Text style={[styles.sectionLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>Faol</Text>
              {active.map((ch, i) => (
                <CardEntrance key={ch.id} index={i}>
                  <ActiveCard
                    ch={ch} c={c}
                    onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)}
                    onStartFocus={() => router.push(metricCtaRoute(ch.metric) as any)}
                    onShare={() => shareChallengeCompletion({ title: ch.title, rewardXp: ch.reward_xp, rank: ch.rank })}
                  />
                </CardEntrance>
              ))}
            </View>
          )}

          {upcomingJoined.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>Tez orada boshlanadi</Text>
              {upcomingJoined.map(ch => (
                <UpcomingMineRow key={ch.id} ch={ch} c={c} onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)} />
              ))}
            </View>
          )}

          {open.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>Ochiq</Text>
              {open.map((ch, i) => (
                <CardEntrance key={ch.id} index={active.length + i}>
                  <OpenCard
                    ch={ch} c={c}
                    joining={joiningId === ch.id}
                    onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)}
                    onJoin={() => handleJoin(ch)}
                  />
                </CardEntrance>
              ))}
            </View>
          )}

          {completedOrEnded.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>Yakunlangan</Text>
              {endedVisible.map(ch => (
                <EndedRow key={ch.id} ch={ch} c={c} onPress={() => router.push(`/(screens)/challenge/${ch.slug}` as any)} />
              ))}
              {completedOrEnded.length > 3 && (
                <Pressable style={styles.showMoreBtn} onPress={() => setShowAllEnded(v => !v)}>
                  <Text style={[styles.showMoreText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                    {showAllEnded ? 'Kamroq ko\'rsatish' : `Barchasini ko'rsatish (${completedOrEnded.length})`}
                  </Text>
                  <ChevronDown size={14} color={c.textSecondary} style={showAllEnded ? { transform: [{ rotate: '180deg' }] } : undefined} />
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ── Faol card — the hero card: cover image + a body that differs by type ─────

function ActiveCard({ ch, c, onPress, onStartFocus, onShare }: {
  ch: Challenge; c: any; onPress: () => void; onStartFocus: () => void; onShare: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const completed = !!ch.completed_at

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.cardShadow,
        { backgroundColor: c.bgSecondary, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <ChallengeCoverImage
        coverImageUrl={ch.cover_image_url}
        color={ch.color}
        icon={ch.icon}
        title={ch.title}
        statusPill={completed ? { text: 'Yakunlandi' } : { text: 'FAOL', color: ch.color }}
        countdownPill={completed ? null : `${daysLeft(ch.ends_at)} kun qoldi`}
      />

      <View style={styles.activeBody}>
        {completed ? (
          <View style={styles.completedRow}>
            <View style={[styles.completedBadge, { backgroundColor: ch.color + '22' }]}>
              <Trophy size={28} color={ch.color} />
            </View>
            <Text style={[styles.completedText, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              ✅ Yakunlandi{ch.rank != null ? ` · #${ch.rank}-o'rin` : ''}
            </Text>
          </View>
        ) : ch.challenge_type === 'consistency' ? (
          <ConsistencyBody ch={ch} c={c} />
        ) : ch.challenge_type === 'sprint' ? (
          <SprintBody ch={ch} c={c} />
        ) : ch.challenge_type === 'team' ? (
          <TeamBody ch={ch} c={c} />
        ) : (
          <CumulativeBody ch={ch} c={c} />
        )}

        <Pressable
          onPress={completed ? onShare : onStartFocus}
          style={[styles.ctaBtn, { backgroundColor: ch.color }]}
        >
          <Text style={styles.ctaBtnText}>{completed ? 'Ulashish' : metricCtaLabel(ch.metric)}</Text>
        </Pressable>
      </View>
    </Pressable>
  )
}

// ── cumulative body — animated ring, hours/units, rank, pace hint ────────────

function CumulativeBody({ ch, c }: { ch: Challenge; c: any }) {
  const target = ch.target_value ?? 0
  const pct = target > 0 ? ch.progress_value / target : 0
  return (
    <>
      <View style={styles.progressRow}>
        <ChallengeProgressRing progress={pct} color={ch.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.hoursText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {fmtMetricValue(ch.progress_value, ch.metric)} / {fmtMetricGoal(target, ch.metric)}
          </Text>
          {ch.rank != null && (
            <Text style={[styles.rankText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Reyting: #{ch.rank}
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.paceText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        {paceHint(ch)}
      </Text>
    </>
  )
}

// ── consistency body — day dots (abstract: qualifying vs remaining) ──────────

function ConsistencyBody({ ch, c }: { ch: Challenge; c: any }) {
  const required = ch.required_days ?? 0
  const qualifying = Math.min(ch.qualifying_days, required)
  const days: DayDotState[] = Array.from({ length: Math.max(required, 1) }, (_, i) => i < qualifying ? 'filled' : 'hollow')

  return (
    <>
      <Text style={[styles.consistencyGoal, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
        Har kuni kamida {fmtMetricGoal(ch.daily_minimum ?? 0, ch.metric)}
      </Text>
      <ConsistencyDayDots days={days} color={ch.color} label={`${qualifying} / ${required}`} />
      <Text style={[styles.paceText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        {ch.misses_used > 0
          ? `🔥 ${ch.current_run} kunlik seriya · ${Math.max(0, (ch.allowed_misses ?? 0) - ch.misses_used)} ta imkoniyat qoldi`
          : `🔥 ${ch.current_run} kunlik seriya`}
      </Text>
    </>
  )
}

// ── sprint body — rank is the hero number, percentile framing under it ───────

function SprintBody({ ch, c }: { ch: Challenge; c: any }) {
  return (
    <>
      <View style={styles.sprintRow}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.sprintRank, { color: ch.color, fontFamily: typography.fontFamily.bold }]}>
            {ch.rank != null ? `#${ch.rank}` : '—'}
          </Text>
          <Text style={[styles.sprintRankLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            sizning o'rningiz
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hoursText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {fmtMetricGoal(ch.progress_value, ch.metric)}
          </Text>
          {ch.winner_count != null && (
            <Text style={[styles.rankText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              🏆 Top {ch.winner_count} g'olib bo'ladi
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.paceText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        {percentileFraming(computePercentile(ch.rank, ch.participant_count))}
      </Text>
    </>
  )
}

// ── team body — the head-to-head bar, your contribution, invitation line ─────

function TeamBody({ ch, c }: { ch: Challenge; c: any }) {
  const myColor = ch.team === 'A' ? ch.team_a_color : ch.team_b_color
  return (
    <>
      <TeamHeadToHeadBar
        teamAName={ch.team_a_name ?? "Guruh A"} teamAColor={ch.team_a_color ?? '#F5A623'} teamATotal={ch.team_a_total}
        teamBName={ch.team_b_name ?? "Guruh B"} teamBColor={ch.team_b_color ?? '#5AC8FA'} teamBTotal={ch.team_b_total}
        fmtValue={v => fmtMetricGoal(v, ch.metric)}
      />
      <Text style={[styles.paceText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
        Sizning hissangiz: {fmtMetricGoal(ch.progress_value, ch.metric)}{myColor ? ' 🔵' : ''}
      </Text>
      <Text style={[styles.paceText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
        {teamStandingLine(
          ch.team === 'A' ? ch.team_a_total : ch.team_b_total,
          ch.team === 'A' ? ch.team_b_total : ch.team_a_total,
          ch.metric,
        )}
      </Text>
    </>
  )
}

// ── Ochiq card — the sell card: cover image, avatar stack, join-from-card ─────

function OpenCard({ ch, c, joining, onPress, onJoin }: {
  ch: Challenge; c: any; joining: boolean; onPress: () => void; onJoin: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const isUpcoming = ch.status === 'upcoming'

  return (
    <View
      style={[styles.cardShadow, { backgroundColor: c.bgSecondary, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <Pressable onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}>
        <ChallengeCoverImage
          coverImageUrl={ch.cover_image_url}
          color={ch.color}
          icon={ch.icon}
          title={ch.title}
          statusPill={isUpcoming ? { text: `${daysLeft(ch.starts_at)} kundan keyin` } : { text: 'Ochiq' }}
          countdownPill={isUpcoming ? null : `${daysLeft(ch.ends_at)} kun qoldi`}
          height={120}
        />
      </Pressable>

      <View style={styles.openBody}>
        <View style={styles.openRow}>
          <Text style={styles.openRowEmoji}>🎯</Text>
          <Text style={[styles.openRowText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
            {challengeGoalText(ch)}
          </Text>
        </View>
        {ch.reward_xp > 0 && (
          <View style={styles.openRow}>
            <Text style={styles.openRowEmoji}>🏆</Text>
            <Text style={[styles.openRowText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
              +{ch.reward_xp} XP{ch.badge_key ? ` · "${ch.badge_key}" nishoni` : ''}
            </Text>
          </View>
        )}

        <ParticipantAvatarStack
          avatars={ch.participant_avatars}
          participantCount={ch.participant_count}
          cardBg={c.bgSecondary}
        />

        <Pressable
          onPress={onJoin}
          disabled={joining}
          style={[styles.joinBtn, { backgroundColor: c.accentPrimary, opacity: joining ? 0.6 : 1 }]}
        >
          {joining
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.joinBtnText}>Qo'shilish</Text>
          }
        </Pressable>
      </View>
    </View>
  )
}

// ── Tez orada row — joined but not started yet; a holding state so the ───────
// card doesn't disappear between "Faol" (requires status active) and
// "Ochiq" (only unjoined challenges) until the challenge actually starts.

function UpcomingMineRow({ ch, c, onPress }: { ch: Challenge; c: any; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.endedRow, { borderColor: c.border }]}>
      {ch.cover_image_url ? (
        <Image source={{ uri: ch.cover_image_url }} style={styles.endedThumb} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.endedThumb, styles.endedThumbFallback, { backgroundColor: ch.color + '22' }]}>
          <Trophy size={22} color={ch.color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.endedTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {ch.title}
        </Text>
        <Text style={[styles.endedSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          ✓ Qo'shildingiz · {daysUntil(ch.starts_at)} kundan keyin boshlanadi
        </Text>
      </View>
      <ChevronRight size={16} color={c.textMuted} />
    </Pressable>
  )
}

// ── Yakunlangan row — compact history, no big image, no negative styling ──────

function endedResultText(ch: Challenge): string {
  if (ch.challenge_type === 'team') {
    return ch.is_winner ? "G'olib guruh! 🏆" : 'Yakunlandi'
  }
  if (ch.challenge_type === 'sprint') {
    return ch.is_winner ? `G'olib · #${ch.final_rank}-o'rin` : ch.final_rank != null ? `#${ch.final_rank}-o'rin` : 'Yakunlandi'
  }
  if (ch.challenge_type === 'consistency') {
    return ch.completed_at
      ? `Seriya yakunlandi · ${ch.qualifying_days} kun`
      : `${ch.qualifying_days}/${ch.required_days ?? 0} kun`
  }
  return `${fmtMetricValue(ch.progress_value, ch.metric)}/${fmtMetricValue(ch.target_value ?? 0, ch.metric)} ${METRIC_UNIT_LABEL[ch.metric]}`
}

function EndedRow({ ch, c, onPress }: { ch: Challenge; c: any; onPress: () => void }) {
  const won = !!ch.completed_at || ch.is_winner
  return (
    <Pressable onPress={onPress} style={[styles.endedRow, { borderColor: won ? c.success : c.border }]}>
      {ch.cover_image_url ? (
        <Image source={{ uri: ch.cover_image_url }} style={styles.endedThumb} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.endedThumb, styles.endedThumbFallback, { backgroundColor: ch.color + '22' }]}>
          <Trophy size={22} color={ch.color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.endedTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {ch.title}
        </Text>
        <Text style={[styles.endedSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {endedResultText(ch)}
        </Text>
      </View>
      {won && <Text style={styles.endedBadge}>🏅</Text>}
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
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: typography.size.lg, marginTop: spacing.sm },
  emptyDesc:  { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },

  scroll: { padding: spacing.base, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 17 },

  // Shared card shell — elevation + rounded clip for the cover image
  cardShadow: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },

  // Faol card
  activeBody: { padding: spacing.base, gap: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  hoursText: { fontSize: 16 },
  rankText:  { fontSize: 13, marginTop: 2 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completedBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  completedText: { fontSize: 15, flex: 1 },
  paceText: { fontSize: 13 },
  ctaBtn: { paddingVertical: 13, borderRadius: radius.lg, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Consistency body
  consistencyGoal: { fontSize: 14 },

  // Sprint body
  sprintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  sprintRank: { fontSize: 32, lineHeight: 36 },
  sprintRankLabel: { fontSize: 11, textAlign: 'center' },

  // Ochiq card
  openBody: { padding: spacing.base, gap: spacing.sm },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openRowEmoji: { fontSize: 14 },
  openRowText: { fontSize: 14, flex: 1 },
  joinBtn: { paddingVertical: 13, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.xs },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Yakunlangan row
  endedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1.5,
  },
  endedThumb: { width: 48, height: 48, borderRadius: radius.md },
  endedThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  endedTitle: { fontSize: 14 },
  endedSub:   { fontSize: 12, marginTop: 1 },
  endedBadge: { fontSize: 18 },

  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.xs },
  showMoreText: { fontSize: 13 },
})
