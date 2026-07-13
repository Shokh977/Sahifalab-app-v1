import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, Image, Pressable,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { ArrowLeft, Info } from 'lucide-react-native'
import { RoleBadge } from '../../components/ui/RoleBadge'
import { TopBadgeIndicator } from '../../components/profile/TopBadgeIndicator'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { leaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '../../lib/api'
import { typography, spacing, radius, getLevelTier } from '../../lib/constants'
import { InfoModal } from '../../components/ui/InfoModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEDAL = ['🥇', '🥈', '🥉'] as const

function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function AvatarCircle({
  uri, name, size, borderColor, borderWidth = 2,
}: {
  uri?:         string | null
  name:         string
  size:         number
  borderColor?: string
  borderWidth?: number
}) {
  const { c } = useTheme()
  const initials = (name || 'U').split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  return uri ? (
    <Image
      source={{ uri }}
      style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: borderColor ? borderWidth : 0,
        borderColor: borderColor ?? 'transparent',
      }}
    />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: c.bgTertiary,
      borderWidth:  borderColor ? borderWidth : 1,
      borderColor:  borderColor ?? c.border,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: c.accentPrimary, fontSize: size * 0.35, fontFamily: typography.fontFamily.bold }}>
        {initials}
      </Text>
    </View>
  )
}

// ── Top 3 Podium ─────────────────────────────────────────────────────────────

function Podium({ entries, authId, c, onPress }: {
  entries: LeaderboardEntry[]
  authId:  number | null
  c:       any
  onPress: (e: LeaderboardEntry) => void
}) {
  if (entries.length === 0) return null

  const first  = entries[0]
  const second = entries[1] ?? null
  const third  = entries[2] ?? null

  type PodiumItemProps = {
    entry:  LeaderboardEntry
    rank:   1 | 2 | 3
    isMe:   boolean
  }

  function PodiumItem({ entry, rank, isMe }: PodiumItemProps) {
    const avatarSize = rank === 1 ? 56 : 48
    const tier       = getLevelTier(entry.level ?? 1)
    return (
      <Pressable onPress={() => onPress(entry)} style={styles.podiumItem}>
        {rank === 1 && <Text style={styles.crownEmoji}>👑</Text>}
        <AvatarCircle
          uri={entry.photo_url}
          name={entry.first_name}
          size={avatarSize}
          borderColor={isMe ? c.accentPrimary : tier.border}
          borderWidth={rank === 1 ? 3 : 2}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
          <Text
            style={[
              styles.podiumName,
              { color: isMe ? c.accentPrimary : c.textPrimary, fontFamily: typography.fontFamily.semibold },
              rank !== 1 && { fontSize: 11 },
            ]}
            numberOfLines={1}
          >
            {entry.first_name}{isMe ? ' (Sen)' : ''}
          </Text>
          <RoleBadge accountType={entry.account_type} size={12} />
          <TopBadgeIndicator topBadge={entry.top_badge} />
        </View>
        <Text style={[
          styles.podiumXP,
          { color: c.accentPrimary, fontFamily: typography.fontFamily.bold },
          rank !== 1 && { fontSize: 13 },
        ]}>
          {(entry.score ?? 0).toLocaleString()} XP
        </Text>
        {!!formatTime(entry.minutes) && (
          <Text style={[styles.podiumTime, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {formatTime(entry.minutes)}
          </Text>
        )}
        <Text style={styles.podiumMedal}>{MEDAL[rank - 1]}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.podiumRow, { backgroundColor: c.accentPrimaryMuted }]}>
      {/* 2nd place */}
      <View style={[styles.podiumCol, styles.podiumColSide, styles.podiumColLeft]}>
        {second && <PodiumItem entry={second} rank={2} isMe={second.telegram_id === authId} />}
      </View>

      {/* 1st place */}
      <View style={[styles.podiumCol, styles.podiumColCenter]}>
        <PodiumItem entry={first} rank={1} isMe={first.telegram_id === authId} />
      </View>

      {/* 3rd place */}
      <View style={[styles.podiumCol, styles.podiumColSide, styles.podiumColRight]}>
        {third && <PodiumItem entry={third} rank={3} isMe={third.telegram_id === authId} />}
      </View>
    </View>
  )
}

// ── Rank Row ─────────────────────────────────────────────────────────────────

function RankRow({
  entry, authId, c, onPress,
}: {
  entry:   LeaderboardEntry
  authId:  number | null
  c:       any
  onPress: (e: LeaderboardEntry) => void
}) {
  const isMe = entry.telegram_id === authId
  const tier = getLevelTier(entry.level ?? 1)

  return (
    <Pressable
      onPress={() => onPress(entry)}
      style={[
        styles.rankRow,
        isMe && { backgroundColor: c.accentPrimaryMuted, borderRadius: radius.card },
      ]}
    >
      {/* Rank */}
      <View style={styles.rankNumWrap}>
        <Text style={[styles.rankNum, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          #{entry.rank ?? '?'}
        </Text>
      </View>

      {/* Avatar */}
      <AvatarCircle uri={entry.photo_url} name={entry.first_name} size={36} />

      {/* Name + role badge */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <Text
          style={[
            styles.rankName,
            { color: isMe ? c.accentPrimary : c.textPrimary, fontFamily: isMe ? typography.fontFamily.semibold : typography.fontFamily.regular, flex: 1 },
          ]}
          numberOfLines={1}
        >
          {entry.first_name}{isMe ? ' (Sen)' : ''}
        </Text>
        <RoleBadge accountType={entry.account_type} size={13} />
        <TopBadgeIndicator topBadge={entry.top_badge} />
      </View>

      {/* Level badge */}
      <View style={[styles.levelPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
        <Text style={[styles.levelPillText, { color: tier.border, fontFamily: typography.fontFamily.semibold }]}>
          Lv.{entry.level ?? 1}
        </Text>
      </View>

      {/* XP + study time */}
      <View style={styles.rankStats}>
        <Text style={[styles.rankXP, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {(entry.score ?? 0).toLocaleString()} XP
        </Text>
        {!!formatTime(entry.minutes) && (
          <Text style={[styles.rankTime, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {formatTime(entry.minutes)}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type TabKey = 'global' | 'friends'

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'week',  label: 'Bu hafta' },
  { key: 'month', label: 'Bu oy'    },
  { key: 'all',   label: 'Hammasi'  },
]

const PERIOD_INFO: Record<LeaderboardPeriod, { title: string; body: string }> = {
  week:  { title: "Haftalik reyting", body: "Joriy hafta dushanbasidan (Toshkent vaqti) yig'ilgan XP bo'yicha." },
  month: { title: 'Oylik reyting',    body: "Joriy oy 1-sanasidan (Toshkent vaqti) yig'ilgan XP bo'yicha."     },
  all:   { title: "Umumiy reyting",   body: "Barcha vaqt davomida yig'ilgan umumiy XP bo'yicha."                },
}

export default function LeaderboardScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const authUser = useAuthStore(s => s.user)

  const [activeTab,  setActiveTab]  = useState<TabKey>('global')
  const [period,     setPeriod]     = useState<LeaderboardPeriod>('week')
  const [entries,    setEntries]    = useState<LeaderboardEntry[]>([])
  const [myRank,     setMyRank]     = useState<number | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [infoModal,  setInfoModal]  = useState<{ title: string; body: string } | null>(null)

  const authId = authUser?.telegram_id ?? null

  const load = useCallback(async (tab: TabKey, p: LeaderboardPeriod, refresh = false) => {
    if (!refresh) setLoading(true)
    else setRefreshing(true)
    try {
      const res = tab === 'global'
        ? await leaderboard.weekly(p)
        : await leaderboard.friends(p)
      const patched = (res.entries ?? []).map(e => ({
        ...e,
        is_me: e.telegram_id === authId,
      }))
      setEntries(patched)
      setMyRank(res.my_rank ?? patched.find(e => e.is_me)?.rank ?? null)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [authId])

  useEffect(() => { load(activeTab, period) }, [activeTab, period])

  const handleTabSwitch = (tab: TabKey) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setEntries([])
    setMyRank(null)
  }

  const handlePeriodSwitch = (p: LeaderboardPeriod) => {
    if (p === period) return
    setPeriod(p)
    setEntries([])
    setMyRank(null)
  }

  const handleEntryPress = (entry: LeaderboardEntry) => {
    router.push(`/(screens)/profile/${entry.telegram_id}` as any)
  }

  const handleInfoPress = () => {
    if (activeTab === 'friends') {
      setInfoModal({
        title: "Do'stlar reytingi",
        body:  "Siz kuzatayotgan foydalanuvchilarning XP reytingi. Ularni profilingizdan kuzatish orqali shu yerda ko'rasiz.",
      })
      return
    }
    setInfoModal(PERIOD_INFO[period])
  }

  // split top 3 and rest
  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  const myEntry = authId ? entries.find(e => e.telegram_id === authId) ?? null : null
  const myInView = myEntry ? myEntry.rank != null && (myEntry.rank ?? 999) <= 3 + rest.length : false

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBtn}>
          <ArrowLeft size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Reyting
        </Text>
        <Pressable onPress={handleInfoPress} hitSlop={12} style={styles.topBtn}>
          <Info size={20} color={c.textSecondary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
        {(['global', 'friends'] as TabKey[]).map(t => (
          <Pressable key={t} onPress={() => handleTabSwitch(t)} style={styles.tabBtn}>
            <Text style={[
              styles.tabLabel,
              { fontFamily: activeTab === t ? typography.fontFamily.semibold : typography.fontFamily.regular },
              { color: activeTab === t ? c.accentPrimary : c.textSecondary },
            ]}>
              {t === 'global' ? 'Global' : "Do'stlar"}
            </Text>
            {activeTab === t && <View style={[styles.tabLine, { backgroundColor: c.accentPrimary }]} />}
          </Pressable>
        ))}
      </View>

      {/* Period filter */}
      <View style={[styles.periodRow, { borderBottomColor: c.border }]}>
        {PERIODS.map(p => {
          const active = p.key === period
          return (
            <Pressable key={p.key} onPress={() => handlePeriodSwitch(p.key)} style={styles.periodBtn}>
              <Text style={[
                styles.periodLabel,
                {
                  fontFamily:      active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                  color:           active ? c.accentPrimary : c.textSecondary,
                  backgroundColor: active ? c.accentPrimaryMuted : 'transparent',
                  borderColor:     active ? c.accentPrimary : c.border,
                },
              ]}>
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={c.accentPrimary} style={{ marginTop: 60 }} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={[styles.emptyTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            {activeTab === 'friends'
              ? "Kuzatilayotganlar yo'q"
              : period === 'week'
                ? "Bu hafta faollik yo'q"
                : period === 'month'
                  ? "Bu oy faollik yo'q"
                  : "Ma'lumot yo'q"}
          </Text>
          {activeTab === 'friends' ? (
            <>
              <Text style={[styles.emptySub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                Odamlarni kuzating va ularning natijalarini ko'ring!
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/profile' as any)}
                style={[styles.followCta, { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimary }]}
              >
                <Text style={[styles.followCtaText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  👥 Profilga o'tish →
                </Text>
              </Pressable>
            </>
          ) : (period === 'week' || period === 'month') && (
            <Text style={[styles.emptySub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              XP yig'ish uchun darslarni o'qing yoki testlarni bajaring!
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: myEntry && !myInView ? 80 : insets.bottom + 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(activeTab, period, true)}
              tintColor={c.accentPrimary}
            />
          }
        >
          {/* Podium */}
          <Podium entries={top3} authId={authId} c={c} onPress={handleEntryPress} />

          {/* Rest of list */}
          <View style={{ paddingHorizontal: spacing.screenMargin, marginTop: spacing.base, gap: 4 }}>
            {rest.map(entry => (
              <RankRow
                key={entry.telegram_id}
                entry={entry}
                authId={authId}
                c={c}
                onPress={handleEntryPress}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Sticky user row (shown when user is not visible in list) */}
      {myEntry && !myInView && !loading && (
        <View style={[
          styles.stickyUser,
          {
            bottom:          insets.bottom,
            backgroundColor: c.bgSecondary,
            borderTopColor:  c.border,
          },
        ]}>
          <RankRow
            entry={myEntry}
            authId={authId}
            c={c}
            onPress={() => {}}
          />
        </View>
      )}

      <InfoModal
        visible={infoModal !== null}
        title={infoModal?.title ?? ''}
        body={infoModal?.body ?? ''}
        onClose={() => setInfoModal(null)}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
  },
  topBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17 },

  tabRow: {
    flexDirection:  'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 12,
    position:        'relative',
  },
  tabLabel: { fontSize: 15 },
  tabLine:  { position: 'absolute', bottom: 0, left: 20, right: 20, height: 2, borderRadius: 1 },

  // Period filter
  periodRow: {
    flexDirection:     'row',
    gap:               spacing.xs,
    paddingHorizontal: spacing.screenMargin,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  periodBtn:   { flex: 1 },
  periodLabel: {
    textAlign:         'center',
    fontSize:          13,
    paddingVertical:   6,
    borderRadius:      radius.full,
    borderWidth:       1,
    overflow:          'hidden',
  },

  // Podium
  podiumRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: spacing.screenMargin,
    paddingTop:        spacing.xl,
    paddingBottom:     spacing.xl,
    gap:               12,
  },
  podiumCol:       { flex: 1, alignItems: 'center' },
  podiumColCenter: { flex: 1.2 },
  podiumColSide:   { flex: 0.9 },
  podiumColLeft:   {},
  podiumColRight:  {},

  podiumItem: { alignItems: 'center', gap: 6 },
  crownEmoji: { fontSize: 20, marginBottom: 4 },
  podiumName: { fontSize: 13, textAlign: 'center', maxWidth: 80 },
  podiumXP:   { fontSize: 15, textAlign: 'center' },
  podiumTime: { fontSize: 11, textAlign: 'center', marginTop: -4 },
  podiumMedal:{ fontSize: 20 },

  // Rank row
  rankRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingVertical:   12,
    paddingHorizontal: 8,
  },
  rankNumWrap: { width: 28, alignItems: 'flex-end' },
  rankNum:     { fontSize: 13 },
  rankName:    { flex: 1, fontSize: 15 },
  rankStats:   { alignItems: 'flex-end', gap: 1 },
  rankXP:      { fontSize: 14 },
  rankTime:    { fontSize: 11 },

  levelPill: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  levelPillText: { fontSize: 9 },

  // Sticky bottom
  stickyUser: {
    position:        'absolute',
    left:            0,
    right:           0,
    borderTopWidth:  1,
    paddingHorizontal: spacing.screenMargin,
  },

  // Empty
  emptyState: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm, marginTop: 60 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 15, textAlign: 'center' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  followCta: {
    marginTop:         spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  followCtaText: { fontSize: 14 },
})
