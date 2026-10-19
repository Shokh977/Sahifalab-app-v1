/**
 * Profil — redesign Phase 5. Opens from the avatar, with a back button.
 * Identity, the level hero, three stats, the newest earned badges (the
 * full grid lives on /(screens)/badges) and one list card. About two
 * screen heights.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { BarChart3, ChevronLeft, Flame, GraduationCap, Heart, Pencil, Settings, Share2 } from 'lucide-react-native'
import { shareProfile } from '../../lib/share'
import { useProfileStore } from '../../stores/profileStore'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { focusStats, leaderboard, profile as profileApi, type BadgeGroups } from '../../lib/api'
import { LEVEL_TITLES } from '../../lib/levelTitles'
import type { ProfileData } from '../../lib/types'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import {
  Avatar, Button, Card, IconButton, ListRow, Pressable, SkeletonBlock, SkeletonRow, StatTile,
} from '../../src/components/ui'
import { uzText } from '../../src/features/today/today'
import { allBadges, summary, topEarned, type ProfileBadge } from '../../src/features/profile/badges'
import { BadgeCell } from '../../src/features/profile/BadgeCell'
import { BadgeSheet } from '../../src/features/profile/BadgeSheet'
import { FollowListSheet, type FollowKind } from '../../src/features/profile/FollowListSheet'
import { LevelHeroCard } from '../../src/features/profile/LevelHeroCard'
import { focusHours } from '../../src/features/profile/profileFormat'

const BADGE_COLS = 4
const BADGE_PREVIEW = 8

function teacherRow(role: string, status: string): { title: string; subtitle: string; route: string } {
  const isTeacher = role === 'admin' || (role === 'teacher' && status === 'active')
  if (isTeacher) return { title: 'Oʻqituvchi paneli', subtitle: 'Dashboard · Kurslar · Hamyon', route: '/(screens)/teacher-dashboard' }
  if (role === 'teacher' && status !== 'active') {
    return { title: 'Oʻqituvchi arizasi', subtitle: 'Ariza koʻrib chiqilmoqda', route: '/(screens)/become-teacher' }
  }
  return { title: 'Oʻqituvchi boʻlish', subtitle: '70% komissiya · Ariza topshiring', route: '/(screens)/become-teacher' }
}

export default function ProfileTab() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { ownProfile, loadOwnProfile } = useProfileStore()
  const authUser = useAuthStore(s => s.user)
  const dashData = useDashboardStore(s => s.data)

  // Fallbacks for when the dashboard cache doesn't have these yet.
  const [fetched, setFetched] = useState<{ streak?: number; minutes?: number; rank?: number | null }>({})
  const streak = dashData?.focusStats?.streak_days ?? fetched.streak ?? 0
  const focusMinutes = dashData?.focusStats?.total_focus_minutes ?? fetched.minutes ?? 0
  const rank = dashData?.myLeaderRank ?? fetched.rank ?? null
  const [groups, setGroups] = useState<BadgeGroups['groups'] | null>(null)
  const [badgesLoaded, setBadgesLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [follow, setFollow] = useState<FollowKind | null>(null)
  const [selected, setSelected] = useState<ProfileBadge | null>(null)
  const [gridWidth, setGridWidth] = useState(0)

  const load = useCallback(async () => {
    const dash = useDashboardStore.getState().data
    await Promise.allSettled([
      loadOwnProfile(),
      dash?.focusStats
        ? Promise.resolve()
        : focusStats.get().then(s => setFetched(f => ({ ...f, streak: s.streak_days ?? 0, minutes: s.total_focus_minutes ?? 0 }))),
      dash?.myLeaderRank != null
        ? Promise.resolve()
        : leaderboard.weekly('week').then(r => setFetched(f => ({ ...f, rank: r.my_rank ?? null }))),
      profileApi.getMyBadges().then(r => setGroups(r.groups)),
    ])
    setBadgesLoaded(true)
  }, [loadOwnProfile])

  // The tab stays mounted under the root Stack: reload quietly on return.
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  useFocusEffect(useCallback(() => { loadRef.current() }, []))

  const p = ownProfile as ProfileData | null
  const level = p?.level ?? authUser?.level ?? 1
  const badges = allBadges(groups, level, LEVEL_TITLES)
  const counts = summary(badges)
  const preview = topEarned(badges, BADGE_PREVIEW)
  const cell = gridWidth > 0 ? (gridWidth - space.sm * (BADGE_COLS - 1)) / BADGE_COLS : 0
  const teacher = teacherRow(authUser?.role ?? '', authUser?.status ?? 'active')
  const name = uzText(p?.first_name ?? authUser?.first_name ?? '')

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))
  const share = () => {
    const id = authUser?.telegram_id ?? p?.telegram_id
    if (!id) return
    shareProfile({ telegramId: id, firstName: authUser?.first_name ?? p?.first_name, level: authUser?.level, streakDays: streak, isOwn: true })
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Orqaga" onPress={back} />
        <Text style={[typeScale.headline, styles.flex, styles.center, { color: colors.text }]} accessibilityRole="header">Profil</Text>
        <IconButton icon={Share2} accessibilityLabel="Profilni ulashish" onPress={share} />
        <IconButton icon={Settings} accessibilityLabel="Sozlamalar" onPress={() => router.push('/(screens)/settings' as any)} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Identity */}
        <View style={styles.identity}>
          <Avatar name={name || '?'} id={authUser?.telegram_id} uri={p?.photo_url ?? authUser?.photo_url} size="lg" level={level} />
          <View style={styles.flex}>
            {p || authUser ? (
              <>
                <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                {p?.username ? <Text style={[typeScale.callout, { color: colors.accentText }]}>@{p.username}</Text> : null}
                <View style={styles.counts}>
                  <Pressable noFeedback onPress={() => setFollow('followers')} accessibilityLabel={`${p?.followers_count ?? 0} kuzatuvchi`}>
                    <Text style={[typeScale.callout, { color: colors.textMuted }]}>
                      <Text style={{ color: colors.text }}>{p?.followers_count ?? 0}</Text> kuzatuvchi
                    </Text>
                  </Pressable>
                  <Pressable noFeedback onPress={() => setFollow('following')} accessibilityLabel={`${p?.following_count ?? 0} kuzatilmoqda`}>
                    <Text style={[typeScale.callout, { color: colors.textMuted }]}>
                      <Text style={{ color: colors.text }}>{p?.following_count ?? 0}</Text> kuzatilmoqda
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <SkeletonRow />
            )}
          </View>
          <IconButton icon={Pencil} accessibilityLabel="Profilni tahrirlash" onPress={() => router.push('/(screens)/edit-profile' as any)} />
        </View>

        <LevelHeroCard level={level} xp={p?.total_xp ?? authUser?.total_xp ?? 0} nextXp={p?.next_level_xp ?? 0} />

        <View style={styles.stats}>
          <StatTile value={focusHours(focusMinutes)} label="soat" />
          <StatTile value={streak} label="seriya" />
          <StatTile value={rank ?? 0} label="reyting" format={n => (rank == null ? '0' : `#${n}`)} />
        </View>

        {/* Nishonlar */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[typeScale.overline, styles.flex, { color: colors.textMuted }]} accessibilityRole="header">Nishonlar</Text>
            <Button
              label={`Hammasi (${counts.label})`}
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(screens)/badges' as any)}
            />
          </View>
          <View style={styles.grid} onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}>
            {!badgesLoaded && cell > 0
              ? Array.from({ length: BADGE_COLS }, (_, i) => <SkeletonBlock key={i} width={cell} height={cell} />)
              : cell > 0 && preview.map(b => <BadgeCell key={b.key} badge={b} width={cell} onPress={() => setSelected(b)} />)}
          </View>
          {badgesLoaded && preview.length === 0 && (
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Birinchi nishoningizni oling — fokusdan boshlang.</Text>
          )}
        </View>

        <Card style={styles.rows}>
          <ListRow title="Statistika" subtitle="Oʻqish vaqti, kunlar, tendensiya" leading={{ kind: 'icon', icon: BarChart3 }} trailing={{ kind: 'chevron' }} onPress={() => router.push('/(screens)/streak-detail' as any)} />
          <ListRow title="Seriya va inventar" subtitle={`Joriy: ${streak} kunlik seriya`} leading={{ kind: 'icon', icon: Flame }} trailing={{ kind: 'chevron' }} onPress={() => router.push('/(screens)/streak-detail' as any)} />
          <ListRow title="Sevimli kurslar" subtitle="Saqlangan kurslaringiz" leading={{ kind: 'icon', icon: Heart }} trailing={{ kind: 'chevron' }} onPress={() => router.push('/(screens)/saved' as any)} />
          <ListRow title={teacher.title} subtitle={teacher.subtitle} leading={{ kind: 'icon', icon: GraduationCap }} trailing={{ kind: 'chevron' }} onPress={() => router.push(teacher.route as any)} />
        </Card>
      </ScrollView>

      <BadgeSheet badge={selected} onClose={() => setSelected(null)} />
      <FollowListSheet
        kind={follow}
        userId={authUser?.telegram_id ?? 0}
        onClose={() => setFollow(null)}
        onOpenUser={id => router.push(`/(screens)/profile/${id}` as any)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xxs },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.xs, gap: layout.sectionGap },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  counts: { flexDirection: 'row', gap: space.md, marginTop: space.xxs },
  stats: { flexDirection: 'row', gap: space.xs },
  section: { gap: space.xs },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  rows: { paddingVertical: space.xxs },
})
