import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Pressable, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../../hooks/useTheme'
import { useReduceMotion } from '../../../hooks/useReduceMotion'
import { typography, radius } from '../../../lib/constants'
import { challenges as challengesApi, type Challenge } from '../../../lib/api'

const ORANGE = '#F0A32B'
const LIVE_RED = '#FF6A5E'
const LIVE_RED_TEXT = '#FF8B80'
const GREEN = '#5FD37E'
const POLL_MS = 30_000
const LAST_RANK_KEY = 'sahifalab_challenge_last_rank_v1'

type RankData = { active: Challenge | null; suggestion: Challenge | null; lastEnded: Challenge | null }

async function fetchRankData(): Promise<RankData> {
  const [mine, list] = await Promise.all([challengesApi.mine(), challengesApi.list('upcoming_active')])
  const active = mine.find(x => x.status === 'active' && !x.completed_at && !x.is_winner && !x.failed_at) ?? null
  let suggestion: Challenge | null = null
  if (!active) {
    const myIds = new Set(mine.map(x => x.id))
    suggestion = list.filter(x => !myIds.has(x.id)).sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))[0] ?? null
  }
  const lastEnded = mine
    .filter(x => x.status === 'ended' && x.final_rank != null)
    .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0] ?? null
  return { active, suggestion, lastEnded }
}

async function readLastRank(challengeId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RANK_KEY)
    const map = raw ? JSON.parse(raw) : {}
    return typeof map[challengeId] === 'number' ? map[challengeId] : null
  } catch { return null }
}
async function writeLastRank(challengeId: string, rank: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RANK_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[challengeId] = rank
    await AsyncStorage.setItem(LAST_RANK_KEY, JSON.stringify(map))
  } catch {}
}

function AvatarStack({ avatars }: { avatars: string[] }) {
  const shown = avatars.slice(0, 3)
  if (shown.length === 0) return null
  return (
    <View style={styles.avatarStack}>
      {shown.map((uri, i) => (
        <Image
          key={i} source={{ uri }} contentFit="cover" cachePolicy="memory-disk"
          style={[styles.avatar, { marginLeft: i === 0 ? 0 : -7, zIndex: shown.length - i }]}
        />
      ))}
    </View>
  )
}

function LiveBadge({ reduceMotion }: { reduceMotion: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduceMotion])

  const opacity = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] })
  const scale = reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] })

  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, { opacity, transform: [{ scale }] }]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  )
}

export function RankGridCard({ staggerIndex }: { staggerIndex: number }) {
  const { c, theme } = useTheme()
  const router = useRouter()
  const reduceMotion = useReduceMotion()
  const [data, setData] = useState<RankData | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [joining, setJoining] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await fetchRankData()
      setData(result)
      if (result.active?.rank != null) {
        const last = await readLastRank(result.active.id)
        setDelta(last != null ? last - result.active.rank : null)
        await writeLastRank(result.active.id, result.active.rank)
      } else {
        setDelta(null)
      }
    } catch {}
  }, [])

  // Poll every 30s while this screen is focused — the app has no realtime
  // channel for challenges/leaderboards (only messaging uses Supabase
  // Realtime), so periodic refetch is what "feels live" without new infra.
  useFocusEffect(useCallback(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [load]))

  async function handleJoin() {
    if (!data?.suggestion) return
    setJoining(true)
    try {
      await challengesApi.join(data.suggestion.id)
      router.push(`/(screens)/challenge/${data.suggestion.slug}` as any)
    } catch {
      router.push(`/(screens)/challenge/${data.suggestion.slug}` as any)
    } finally {
      setJoining(false)
    }
  }

  const cardBorder = theme === 'dark' ? 'rgba(240,163,43,0.28)' : 'rgba(240,163,43,0.18)'

  // Renders the same JSX element type (LinearGradient in dark theme, plain
  // View in light) on every render — NOT a locally-defined component
  // function, which would recreate its type each render and force a full
  // remount (killing the LIVE pulse's animated value, flickering) every
  // 30s when the poll refetches.
  function renderShell(inner: React.ReactNode) {
    return theme === 'dark' ? (
      <LinearGradient
        colors={['#2A2118', '#191C22']} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
        style={[styles.cardInner, { borderColor: cardBorder, borderWidth: 1 }]}
      >
        {inner}
      </LinearGradient>
    ) : (
      <View style={[styles.cardInner, { backgroundColor: '#1D1B18', borderColor: cardBorder, borderWidth: 1 }]}>
        {inner}
      </View>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (data === null) {
    return (
      <View style={[styles.shell, { flex: 1 }]}>
        {renderShell(
          <>
            <View style={styles.topRow}>
              <View style={styles.skeletonPill} />
            </View>
            <View style={[styles.skeletonLine, { width: '60%', height: 24, marginTop: 6 }]} />
            <View style={styles.avatarStack}>
              <ActivityIndicator size="small" color="#8A9098" />
            </View>
          </>,
        )}
      </View>
    )
  }

  const { active, suggestion, lastEnded } = data

  function content() {
    // State 1 — live, enrolled, ranked
    if (active && active.rank != null) {
      const deltaColor = delta == null ? '#8A9098' : delta > 0 ? GREEN : delta < 0 ? LIVE_RED_TEXT : '#8A9098'
      const deltaText = delta == null ? '' : delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : '—'
      return (
        <>
          <Text style={[styles.giantNumeral, { color: 'rgba(240,163,43,0.14)' }]} numberOfLines={1}>
            {active.rank}
          </Text>
          <View style={styles.topRow}>
            <LiveBadge reduceMotion={reduceMotion} />
            {deltaText !== '' && (
              <Text style={[styles.delta, { color: deltaColor }]} accessibilityLiveRegion="polite">{deltaText}</Text>
            )}
          </View>
          <View>
            <Text style={styles.rankRow}>
              <Text style={{ color: ORANGE, fontFamily: typography.fontFamily.bold, fontSize: 15 }}>#</Text>
              <Text style={{ color: '#F2F3F5', fontFamily: typography.fontFamily.extrabold, fontSize: 30 }}>{active.rank}</Text>
            </Text>
            <Text style={styles.caption}>Bellashuv reytingi</Text>
          </View>
          <View style={styles.bottomRow}>
            <AvatarStack avatars={active.participant_avatars ?? []} />
            <Text style={styles.participants}>+{active.participant_count} ishtirokchi</Text>
          </View>
        </>
      )
    }

    // State 1b — enrolled but this challenge type has no numeric rank
    if (active) {
      return (
        <>
          <View style={styles.topRow}>
            <LiveBadge reduceMotion={reduceMotion} />
          </View>
          <View>
            <Text style={[styles.rankRow, { color: '#F2F3F5', fontFamily: typography.fontFamily.bold, fontSize: 16 }]}>
              Ishtirok etayapsiz
            </Text>
            <Text style={styles.caption}>Bellashuv reytingi</Text>
          </View>
          <View style={styles.bottomRow}>
            <AvatarStack avatars={active.participant_avatars ?? []} />
            <Text style={styles.participants}>+{active.participant_count} ishtirokchi</Text>
          </View>
        </>
      )
    }

    // State 2 — live, not enrolled
    if (suggestion) {
      return (
        <>
          <View style={styles.topRow}>
            <LiveBadge reduceMotion={reduceMotion} />
          </View>
          <View>
            <Text numberOfLines={2} style={[styles.rankRow, { color: '#F2F3F5', fontFamily: typography.fontFamily.bold, fontSize: 15 }]}>
              {suggestion.title}
            </Text>
            <Text style={styles.caption}>{suggestion.participant_count} ishtirokchi jonli</Text>
          </View>
          <Pressable onPress={handleJoin} disabled={joining} style={[styles.joinBtn, { opacity: joining ? 0.6 : 1 }]}>
            {joining ? <ActivityIndicator size="small" color="#191C22" /> : <Text style={styles.joinBtnText}>Qo'shilish</Text>}
          </Pressable>
        </>
      )
    }

    // State 3 — no competition running
    return (
      <>
        <View>
          <Text style={[styles.rankRow, { color: '#8A9098', fontFamily: typography.fontFamily.bold, fontSize: 16 }]}>
            {lastEnded?.final_rank != null ? `Oxirgi natija #${lastEnded.final_rank}` : 'Hozircha bellashuv yo‘q'}
          </Text>
          <Text style={styles.caption}>Bellashuv reytingi</Text>
        </View>
      </>
    )
  }

  const targetSlug = active?.slug ?? suggestion?.slug ?? lastEnded?.slug
  const a11yLabel = active?.rank != null
    ? `Bellashuv reytingi, ${active.rank}-o'rin${delta ? `, ${delta > 0 ? 'yaxshilandi' : 'pasaydi'} ${Math.abs(delta)} pog'ona` : ''}`
    : suggestion
      ? `Yangi bellashuv, ${suggestion.title}, qo'shilish uchun bosing`
      : "Bellashuv reytingi, hozircha faol musobaqa yo'q"

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        disabled={!targetSlug}
        onPress={() => targetSlug && router.push(`/(screens)/challenge/${targetSlug}` as any)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={{ flex: 1 }}
      >
        {renderShell(content())}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { borderRadius: radius.cardXl, overflow: 'hidden' },
  cardInner: {
    flex: 1, borderRadius: radius.cardXl, padding: 13, gap: 10,
    minHeight: 88, overflow: 'hidden', position: 'relative',
  },
  giantNumeral: {
    position: 'absolute', right: -6, bottom: -18, fontSize: 86, fontWeight: '800',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,90,80,0.16)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: LIVE_RED },
  liveText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, color: LIVE_RED_TEXT },
  delta: { fontSize: 12, fontWeight: '700' },
  rankRow: { flexDirection: 'row', alignItems: 'baseline' },
  caption: { fontSize: 11, color: '#8A9098', marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#191C22' },
  participants: { fontSize: 10, color: '#8A9098' },
  joinBtn: {
    backgroundColor: ORANGE, borderRadius: radius.full, paddingVertical: 8, alignItems: 'center', marginTop: 'auto',
  },
  joinBtnText: { color: '#191C22', fontSize: 12, fontWeight: '700' },
  skeletonPill: { width: 44, height: 16, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  skeletonLine: { borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
})
