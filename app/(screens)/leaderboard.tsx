/**
 * Reyting — the full XP ranking (v2 · Reyting, Phase 8). An iOS large
 * title that hands over to the nav bar as you scroll ("Bellashuv" back,
 * info on how XP is earned); Global / Doʻstlar and Bu hafta / Bu oy /
 * Hammasi segmented controls; the podium; then one grouped card — the
 * whole list (Global: the top 100; past it, "···" and the rows around
 * you). Your row is
 * highlighted in the list and also floats at the bottom with
 * "#22 gacha 22 XP" and a Fokus button. A person opens a sheet.
 * Switching lists crossfades (durations.fade).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import Animated, {
  useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { Info, Trophy, Users, WifiOff } from 'lucide-react-native'
import { leaderboard, type LeaderboardEntry, type LeaderboardPeriod, type WeeklyLeaderboard } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../src/design/ThemeProvider'
import { ThemeDecor } from '../../src/features/themes/ThemeDecor'
import { durations, easing } from '../../src/design/motion'
import { layout, radius, space } from '../../src/design/spacing'
import { fonts, tabular, type as typeScale } from '../../src/design/typography'
import {
  EmptyState, LargeTitle, LargeTitleBar, SegmentedControl, Sheet, SkeletonBlock, SkeletonRow,
} from '../../src/components/ui'
import { boardItems, chaseNote, myEntry, type BoardItem } from '../../src/features/bellashuv/bellashuv'
import { MyRankBar } from '../../src/features/bellashuv/MyRankBar'
import { PersonSheet } from '../../src/features/bellashuv/PersonSheet'
import { Podium } from '../../src/features/bellashuv/Podium'
import { RankingRow } from '../../src/features/bellashuv/RankingRow'
import { groupDigits } from '../../src/features/courses/courses'
import { daysToWeeklyReset } from '../../src/features/today/rivals'

type Scope = 'global' | 'friends'
const SCOPES: readonly Scope[] = ['global', 'friends']
const SCOPE_LABELS = ['Global', 'Doʻstlar'] as const
const PERIODS: readonly LeaderboardPeriod[] = ['week', 'month', 'all']
const PERIOD_LABELS = ['Bu hafta', 'Bu oy', 'Hammasi'] as const
const PERIOD_SHORT: Record<LeaderboardPeriod, string> = { week: 'bu hafta', month: 'bu oy', all: 'jami' }

/** How XP is earned (backend xp_service): the info button's sheet. */
const XP_RULES: { what: string; how: string }[] = [
  { what: 'Fokus', how: 'har daqiqa 1,66 XP — soatiga ~100 XP' },
  { what: 'Testlar', how: '25 XP, kuniga 100 XP gacha' },
  { what: 'Kursni tugatish', how: '200 XP, har bir kurs uchun bir marta' },
  { what: 'Daraxt bosqichlari', how: 'har yangi bosqichda bonus XP' },
]

const CARD_RADIUS = 28
const SKELETON_ROWS = 6
const BAR_SPACE = 96

type Item = BoardItem<LeaderboardEntry>
interface Board { entries: LeaderboardEntry[]; around: LeaderboardEntry[]; total: number | null }

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Item>)

export default function LeaderboardScreen() {
  const { colors, elevation } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const user = useAuthStore(s => s.user)
  const authId = user?.telegram_id ?? null

  const [scope, setScope] = useState<Scope>('global')
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  const key = `${scope}:${period}`
  const cache = useRef(new Map<string, Board>())
  const [board, setBoard] = useState<Board | null>(null)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [info, setInfo] = useState(false)
  const [person, setPerson] = useState<LeaderboardEntry | null>(null)
  const [now] = useState(() => Date.now())

  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler(e => { scrollY.set(e.contentOffset.y) })

  // Crossfade: the old list fades out while the new one loads, then in.
  const fade = useSharedValue(1)
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.get() }))
  const fadeTo = useCallback((to: number) => {
    fade.set(reduceMotion ? to : withTiming(to, { duration: durations.fade, easing: easing.standard }))
  }, [fade, reduceMotion])

  const load = useCallback(async (s: Scope, p: LeaderboardPeriod, k: string) => {
    const mark = (e: LeaderboardEntry) => ({ ...e, is_me: authId != null && e.telegram_id === authId })
    try {
      const res: WeeklyLeaderboard = s === 'global' ? await leaderboard.weekly(p) : await leaderboard.friends(p)
      const next = {
        entries: (res.entries ?? []).map(mark),
        around: (res.around_me ?? []).map(mark),
        total: res.total ?? null,
      }
      cache.current.set(k, next)
      return next
    } catch {
      return null
    }
  }, [authId])

  // A switch fades the old list out, swaps in the new one (cached, or
  // when it arrives) and fades it in; a cached list refreshes in place.
  useEffect(() => {
    let cancelled = false
    const cached = cache.current.get(key)
    fadeTo(0)
    const fresh = load(scope, period, key)
    const fadedOut = new Promise(r => setTimeout(r, reduceMotion ? 0 : durations.fade))
    Promise.all([cached ? Promise.resolve(cached) : fresh, fadedOut]).then(([b]) => {
      if (cancelled) return
      setBoard(b)
      setFailed(!b)
      fadeTo(1)
    })
    if (cached) fresh.then(b => { if (!cancelled && b) setBoard(b) })
    return () => { cancelled = true }
  }, [scope, period, key, load, fadeTo, reduceMotion])

  const refresh = async () => {
    setRefreshing(true)
    const b = await load(scope, period, key)
    if (b) setBoard(b)
    setRefreshing(false)
  }

  const openProfile = (e: LeaderboardEntry) => {
    setPerson(null)
    router.push((e.is_me ? '/(tabs)/profile' : `/(screens)/profile/${e.telegram_id}`) as any)
  }
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/musobaqalar' as any))

  const entries = board?.entries ?? []
  const around = board?.around ?? []
  const podium = [...entries].sort((a, b) => a.rank - b.rank).filter(e => e.rank <= 3).slice(0, 3)
  const items = board ? boardItems(entries, around) : []
  const me = board ? myEntry(entries, around) : null
  const note = me ? chaseNote(me, [...entries, ...around]) : undefined
  const people = board?.total ?? entries.length
  const meta = [
    `${groupDigits(people)} kishi`,
    'XP boʻyicha',
    period === 'week' ? `${daysToWeeklyReset(now)} kun qoldi` : null,
  ].filter(Boolean).join(' · ')

  let state: React.ReactNode = null
  if (!board && failed) {
    state = (
      <EmptyState
        icon={WifiOff}
        title="Reyting yuklanmadi"
        body="Internet aloqasini tekshirib, qayta urinib koʻring."
        action={{ label: 'Qayta urinish', onPress: () => { setFailed(false); load(scope, period, key).then(b => { if (b) setBoard(b); else setFailed(true) }) } }}
      />
    )
  } else if (!board) {
    state = (
      <View style={styles.gapSm}>
        <SkeletonBlock height={space.huge * 4} borderRadius={CARD_RADIUS} />
        {Array.from({ length: SKELETON_ROWS }, (_, i) => <SkeletonRow key={i} />)}
      </View>
    )
  } else if (entries.length === 0) {
    state = scope === 'friends' ? (
      <EmptyState
        icon={Users}
        title="Kuzatilayotganlar yoʻq"
        body="Odamlarni kuzating va natijalarini shu yerda koʻring."
        action={{ label: 'Profilga oʻtish', onPress: () => router.push('/(tabs)/profile' as any) }}
      />
    ) : (
      <EmptyState
        icon={Trophy}
        title={period === 'week' ? 'Bu hafta hali faollik yoʻq' : period === 'month' ? 'Bu oy hali faollik yoʻq' : 'Hali maʼlumot yoʻq'}
        body="Fokus, testlar va kurslar XP beradi."
      />
    )
  }

  const header = (
    <View>
      <LargeTitle title="Reyting" scrollY={scrollY} />
      <View style={styles.headerBlock}>
        <SegmentedControl size="md" segments={SCOPE_LABELS} index={SCOPES.indexOf(scope)} onChange={i => setScope(SCOPES[i])} />
        <SegmentedControl size="md" segments={PERIOD_LABELS} index={PERIODS.indexOf(period)} onChange={i => setPeriod(PERIODS[i])} />
        <Animated.View style={[styles.gapMd, fadeStyle]}>
          {state}
          {podium.length > 0 && (
            <View style={[styles.podiumCard, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
              <ThemeDecor variant="podium" radius={CARD_RADIUS} />
              <ThemeDecor variant="border" radius={CARD_RADIUS} />
              <Podium
                entries={podium.map(e => ({ id: e.telegram_id, rank: e.rank, name: e.is_me ? 'Siz' : e.first_name || e.username || '', photoUrl: e.photo_url, xp: e.score }))}
                onPress={id => { const e = podium.find(p => p.telegram_id === id); if (e) setPerson(e) }}
              />
              <Text style={[typeScale.callout, tabular, styles.center, { color: colors.textMuted }]} numberOfLines={2}>{meta}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LargeTitleBar
        title="Reyting"
        scrollY={scrollY}
        backLabel="Bellashuv"
        onBack={back}
        actions={[{ icon: Info, onPress: () => setInfo(true), accessibilityLabel: 'XP qanday yigʻiladi' }]}
      />

      <AnimatedFlashList
        data={items}
        keyExtractor={(it, i) => (it.kind === 'gap' ? `gap-${i}` : String(it.e.telegram_id))}
        getItemType={it => it.kind}
        ListHeaderComponent={header}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: BAR_SPACE + insets.bottom + space.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        renderItem={({ item, index }) => {
          const first = index === 0
          const last = index === items.length - 1
          return (
            <Animated.View
              style={[
                styles.groupRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                first && styles.groupTop,
                last && styles.groupBottom,
                fadeStyle,
              ]}
            >
              {item.kind === 'gap' ? (
                <View style={[styles.gap, { borderTopColor: colors.border }]} accessible accessibilityLabel="Oraliq oʻrinlar">
                  <Text style={[typeScale.label, styles.dots, { color: colors.textMuted }]}>···</Text>
                </View>
              ) : (
                <RankingRow e={item.e} mine={item.e.is_me} first={first || item.e.is_me} dense onPress={() => setPerson(item.e)} />
              )}
            </Animated.View>
          )
        }}
      />

      {board && (
        <View style={[styles.floating, { bottom: insets.bottom + space.sm }]} pointerEvents="box-none">
          <MyRankBar
            me={me}
            note={note}
            name={user?.first_name ?? ''}
            photoUrl={user?.photo_url}
            id={authId ?? undefined}
            onPress={me ? () => setPerson(me) : undefined}
            onFocus={() => router.push('/(tabs)/study' as any)}
          />
        </View>
      )}

      <PersonSheet entry={person} periodLabel={PERIOD_SHORT[period]} onClose={() => setPerson(null)} onOpenProfile={openProfile} />

      <Sheet visible={info} onClose={() => setInfo(false)} title="XP qanday yigʻiladi" scaleBehind>
        <View style={styles.rules}>
          {XP_RULES.map(r => (
            <View key={r.what} style={styles.rule}>
              <Text style={[typeScale.rowTitle, { color: colors.text }]}>{r.what}</Text>
              <Text style={[typeScale.callout, { color: colors.textMuted }]}>{r.how}</Text>
            </View>
          ))}
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>
            Haftalik reyting dushanba 00:00 da (Toshkent vaqti) yangilanadi, oylik — har oyning 1-sanasida. «Hammasi» — barcha vaqtdagi XP.
          </Text>
        </View>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBlock: { paddingHorizontal: layout.gutter, gap: space.sm, paddingBottom: space.md },
  gapSm: { gap: space.sm },
  gapMd: { gap: space.md, paddingTop: space.xs },
  podiumCard: { borderRadius: CARD_RADIUS, borderWidth: 1, paddingTop: space.md + 2, paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm },
  center: { textAlign: 'center' },
  // The rows under the podium read as one grouped card (iOS inset list).
  groupRow: { marginHorizontal: layout.gutter, paddingHorizontal: space.md, borderLeftWidth: 1, borderRightWidth: 1 },
  groupTop: { borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.xs },
  groupBottom: { borderBottomWidth: 1, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, paddingBottom: space.xs },
  gap: { borderTopWidth: 1, alignItems: 'center', paddingVertical: space.xxs },
  dots: { fontFamily: fonts.extrabold, letterSpacing: 2 },
  floating: { position: 'absolute', left: layout.gutter, right: layout.gutter },
  rules: { gap: space.md },
  rule: { gap: space.xxs / 2 },
})
