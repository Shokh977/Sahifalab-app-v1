/**
 * Reyting — the full XP ranking, rebuilt in Phase 8 on the Bellashuv v2
 * board: Global / Doʻstlar, the period (Bu hafta · Bu oy · Hammasi), the
 * podium, everyone after the top 3 in one inset card, and your row pinned
 * at the bottom (with "#22 gacha 22 XP") when you're outside the list.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Info, Trophy, Users, WifiOff } from 'lucide-react-native'
import { leaderboard, type LeaderboardEntry, type LeaderboardPeriod, type WeeklyLeaderboard } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, radius, space } from '../../src/design/spacing'
import { tabular, type as typeScale } from '../../src/design/typography'
import {
  Chip, EmptyState, ScreenHeader, SegmentedControl, Sheet, SkeletonBlock, SkeletonRow,
} from '../../src/components/ui'
import { boardSections, chaseNote } from '../../src/features/bellashuv/bellashuv'
import { Podium } from '../../src/features/bellashuv/Podium'
import { RankingRow } from '../../src/features/bellashuv/RankingRow'
import { groupDigits } from '../../src/features/courses/courses'
import { daysToWeeklyReset } from '../../src/features/today/rivals'

type Scope = 'global' | 'friends'
const SCOPES: readonly Scope[] = ['global', 'friends']
const SCOPE_LABEL = ['Global', 'Doʻstlar'] as const

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'week', label: 'Bu hafta' },
  { key: 'month', label: 'Bu oy' },
  { key: 'all', label: 'Hammasi' },
]

const PERIOD_INFO: Record<LeaderboardPeriod, { title: string; body: string }> = {
  week: { title: 'Haftalik reyting', body: 'Joriy hafta dushanbasidan (Toshkent vaqti) yigʻilgan XP boʻyicha.' },
  month: { title: 'Oylik reyting', body: 'Joriy oy 1-sanasidan (Toshkent vaqti) yigʻilgan XP boʻyicha.' },
  all: { title: 'Umumiy reyting', body: 'Barcha vaqt davomida yigʻilgan umumiy XP boʻyicha.' },
}
const FRIENDS_INFO = {
  title: 'Doʻstlar reytingi',
  body: 'Siz kuzatayotgan foydalanuvchilarning XP reytingi. Ularni profilidan kuzatsangiz, shu yerda koʻrinadi.',
}

const CARD_RADIUS = 28
const SKELETON_ROWS = 6

interface Board { entries: LeaderboardEntry[]; around: LeaderboardEntry[]; total: number | null }

export default function LeaderboardScreen() {
  const { colors, elevation } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const authId = useAuthStore(s => s.user?.telegram_id ?? null)

  const [scope, setScope] = useState<Scope>('global')
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  const [board, setBoard] = useState<Board | null>(null)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [info, setInfo] = useState(false)

  const load = useCallback(async (s: Scope, p: LeaderboardPeriod) => {
    const mark = (e: LeaderboardEntry) => ({ ...e, is_me: authId != null && e.telegram_id === authId })
    try {
      const res: WeeklyLeaderboard = s === 'global' ? await leaderboard.weekly(p) : await leaderboard.friends(p)
      setBoard({
        entries: (res.entries ?? []).map(mark),
        around: (res.around_me ?? []).map(mark),
        total: res.total ?? null,
      })
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [authId])

  useEffect(() => {
    setBoard(null)
    load(scope, period)
  }, [scope, period, load])

  const refresh = async () => {
    setRefreshing(true)
    await load(scope, period)
    setRefreshing(false)
  }

  const openProfile = (e: LeaderboardEntry) =>
    router.push((e.is_me ? '/(tabs)/profile' : `/(screens)/profile/${e.telegram_id}`) as any)

  const { podium, rest, pinned } = boardSections(board?.entries ?? [], board?.around)
  const note = pinned ? chaseNote(pinned, [...(board?.entries ?? []), ...(board?.around ?? [])]) : undefined
  const people = board?.total ?? board?.entries.length ?? 0
  const meta = [
    `${groupDigits(people)} kishi`,
    'XP boʻyicha',
    period === 'week' ? `${daysToWeeklyReset(Date.now())} kun qoldi` : null,
  ].filter(Boolean).join(' · ')
  const infoCopy = scope === 'friends' ? FRIENDS_INFO : PERIOD_INFO[period]

  const controls = (
    <View style={styles.controls}>
      <SegmentedControl segments={SCOPE_LABEL} index={SCOPES.indexOf(scope)} onChange={i => setScope(SCOPES[i])} />
      <View style={styles.chips}>
        {PERIODS.map(p => (
          <Chip key={p.key} label={p.label} variant="choice" selected={period === p.key} onPress={() => setPeriod(p.key)} />
        ))}
      </View>
    </View>
  )

  const header = (
    <View style={styles.headerBlock}>
      {controls}
      {podium.length > 0 && (
        <View style={[styles.podiumCard, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
          <Podium entries={podium.map(e => ({ id: e.telegram_id, rank: e.rank, name: e.is_me ? 'Siz' : e.first_name || e.username || '', photoUrl: e.photo_url, xp: e.score }))} />
          <Text style={[typeScale.callout, tabular, styles.center, { color: colors.textMuted }]} numberOfLines={2}>{meta}</Text>
        </View>
      )}
    </View>
  )

  let body: React.ReactNode
  if (!board && failed) {
    body = (
      <>
        <View style={styles.pad}>{controls}</View>
        <EmptyState
          icon={WifiOff}
          title="Reyting yuklanmadi"
          body="Internet aloqasini tekshirib, qayta urinib koʻring."
          action={{ label: 'Qayta urinish', onPress: () => load(scope, period) }}
        />
      </>
    )
  } else if (!board) {
    body = (
      <View style={styles.pad}>
        {controls}
        <SkeletonBlock height={space.huge * 4} borderRadius={CARD_RADIUS} />
        {Array.from({ length: SKELETON_ROWS }, (_, i) => <SkeletonRow key={i} />)}
      </View>
    )
  } else if (board.entries.length === 0) {
    body = (
      <>
        <View style={styles.pad}>{controls}</View>
        {scope === 'friends' ? (
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
            body="Fokus, darslar va testlar XP beradi."
          />
        )}
      </>
    )
  } else {
    body = (
      <FlashList
        data={rest}
        keyExtractor={e => String(e.telegram_id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: (pinned ? space.huge * 2 : 0) + insets.bottom + space.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        renderItem={({ item, index }) => {
          const firstRow = index === 0
          const lastRow = index === rest.length - 1
          return (
            <View
              style={[
                styles.groupRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                firstRow && styles.groupTop,
                lastRow && styles.groupBottom,
              ]}
            >
              <RankingRow e={item} mine={item.is_me} first={firstRow || item.is_me} onPress={() => openProfile(item)} />
            </View>
          )
        }}
      />
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Reyting"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/musobaqalar' as any))}
        actions={[{ icon: Info, onPress: () => setInfo(true), accessibilityLabel: 'Reyting haqida' }]}
      />
      {body}

      {board && pinned && (
        <View style={[styles.pinBar, { paddingBottom: insets.bottom + space.sm, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <RankingRow e={pinned} mine note={note} onPress={() => openProfile(pinned)} />
        </View>
      )}

      <Sheet visible={info} onClose={() => setInfo(false)} title={infoCopy.title}>
        <Text style={[typeScale.body, { color: colors.textMuted }]}>{infoCopy.body}</Text>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter, gap: space.sm },
  controls: { gap: space.sm, paddingBottom: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  headerBlock: { paddingHorizontal: layout.gutter, gap: space.md, paddingBottom: space.md },
  podiumCard: { borderRadius: CARD_RADIUS, borderWidth: 1, paddingTop: space.md + 2, paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm },
  center: { textAlign: 'center' },
  // The rows after the podium read as one inset card (iOS grouped list).
  groupRow: { marginHorizontal: layout.gutter, paddingHorizontal: space.md, borderLeftWidth: 1, borderRightWidth: 1 },
  groupTop: { borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.xs },
  groupBottom: { borderBottomWidth: 1, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, paddingBottom: space.xs },
  pinBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.sm, paddingHorizontal: layout.gutter, borderTopWidth: 1 },
})
