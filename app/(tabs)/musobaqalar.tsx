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
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import { ChallengeCoverImage } from '../../components/study/ChallengeCoverImage'
import { ChallengeProgressRing } from '../../components/study/ChallengeProgressRing'
import { ParticipantAvatarStack } from '../../components/study/ParticipantAvatarStack'

// Musobaqalar shows challenge cards ONLY — no tree, no Bosqichlar, no
// achievements, no leaderboard (the leaderboard lives in the challenge
// detail screen). Grouped: Faol (joined + running) → Ochiq (joinable) →
// Yakunlangan (collapsed history). See step-22 (structure) and step-23
// (cover-image card redesign).

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

function fmtHours(minutes: number): string {
  const h = minutes / 60
  return h % 1 === 0 ? `${h}` : h.toFixed(1)
}

// Warm, never-shaming pace hint — see step-23 acceptance criteria.
function paceHint(ch: Challenge): string {
  const now = Date.now()
  const startMs = new Date(ch.starts_at).getTime()
  const endMs   = new Date(ch.ends_at).getTime()
  const totalMs = Math.max(1, endMs - startMs)
  const expectedByNow = ch.target_value * Math.min(1, Math.max(0, (now - startMs) / totalMs))

  if (ch.progress_value >= expectedByNow * 1.05) {
    return "Rejadan oldindasiz! 🔥"
  }
  const remainingDays = daysLeft(ch.ends_at)
  const remainingMin  = Math.max(0, ch.target_value - ch.progress_value)
  if (remainingDays <= 0 || remainingMin / Math.max(1, remainingDays) > 180) {
    return "Har daqiqa muhim — davom eting! 💪"
  }
  const perDay = Math.round(remainingMin / remainingDays)
  return `Kuniga ~${perDay} daqiqa — yetib borasiz! 💪`
}

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
      load(true)  // quiet background re-sync (real rank, etc.)
    } catch (e: any) {
      // revert on failure
      setMine(prev => prev.filter(x => x.id !== ch.id))
      setOpen(prev => [...prev, ch])
      Alert.alert('Xatolik', e?.message ?? "Qo'shilib bo'lmadi")
    } finally {
      setJoiningId(null)
    }
  }

  const active    = mine.filter(c => c.status === 'active' && !c.completed_at)
  const completedOrEnded = mine.filter(c => c.status === 'ended' || !!c.completed_at)
  const endedVisible = showAllEnded ? completedOrEnded : completedOrEnded.slice(0, 3)

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
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={[styles.emptyTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Hozircha faol musobaqa yo'q
          </Text>
          <Text style={[styles.emptyDesc, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Tez orada yangi musobaqalar qo'shiladi!
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
                    onStartFocus={() => router.push('/(tabs)/study' as any)}
                    onShare={() => shareChallengeCompletion({ title: ch.title, rewardXp: ch.reward_xp, rank: ch.rank })}
                  />
                </CardEntrance>
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

// ── Faol card — the hero card: cover image, animated ring, pace hint ──────────

function ActiveCard({ ch, c, onPress, onStartFocus, onShare }: {
  ch: Challenge; c: any; onPress: () => void; onStartFocus: () => void; onShare: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const completed = !!ch.completed_at
  const pct = ch.target_value > 0 ? ch.progress_value / ch.target_value : 0

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
        ) : (
          <View style={styles.progressRow}>
            <ChallengeProgressRing progress={pct} color={ch.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.hoursText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                {fmtHours(ch.progress_value)} / {fmtHours(ch.target_value)} soat
              </Text>
              {ch.rank != null && (
                <Text style={[styles.rankText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  Reyting: #{ch.rank}
                </Text>
              )}
            </View>
          </View>
        )}

        {!completed && (
          <Text style={[styles.paceText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            {paceHint(ch)}
          </Text>
        )}

        <Pressable
          onPress={completed ? onShare : onStartFocus}
          style={[styles.ctaBtn, { backgroundColor: ch.color }]}
        >
          <Text style={styles.ctaBtnText}>{completed ? 'Ulashish' : 'Fokusni boshlash'}</Text>
        </Pressable>
      </View>
    </Pressable>
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
            {Math.round(daysBetween(ch.starts_at, ch.ends_at))} kun ichida {fmtHours(ch.target_value)} soat fokus
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

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

// ── Yakunlangan row — compact history, no big image, no negative styling ──────

function EndedRow({ ch, c, onPress }: { ch: Challenge; c: any; onPress: () => void }) {
  const won = !!ch.completed_at
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
          {fmtHours(ch.progress_value)}/{fmtHours(ch.target_value)} soat
          {ch.rank != null ? ` · #${ch.rank}` : ''}
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
