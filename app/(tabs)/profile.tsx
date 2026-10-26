/**
 * Profil — redesign Phase 5, rebuilt to the v2 board in Phase 7.5 D2, and
 * to the "6-qadam" profile in Phase A: the banner header with the ringed
 * avatar and level chip, name and counts, "Tahrirlash", the hero tree
 * card, four stat tiles, the gradient level card, the newest earned badges
 * as tinted icon tiles (the full grid lives on /(screens)/badges) and one
 * menu card. Everyone has the free look until Pro cosmetics ship.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router'
import { Award, BarChart3, ChevronRight, Clock, Flame, GraduationCap, Heart, Lightbulb, Sparkles, Trophy, type LucideIcon } from 'lucide-react-native'
import { shareProfile } from '../../lib/share'
import { useProfileStore } from '../../stores/profileStore'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { focusStats, leaderboard, profile as profileApi, type BadgeGroups } from '../../lib/api'
import { LEVEL_TITLES, getLevelInfo } from '../../lib/levelTitles'
import type { ProfileData } from '../../lib/types'
import { useTheme } from '../../src/design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, layout, radius, space } from '../../src/design/spacing'
import { fonts, type as typeScale } from '../../src/design/typography'
import { BadgeTile, Button, Card, Pressable, SkeletonBlock, SkeletonRow, SectionTitle } from '../../src/components/ui'
import { uzText } from '../../src/features/today/today'
import { allBadges, summary, topEarned, type ProfileBadge } from '../../src/features/profile/badges'
import { badgeVisual, stageArt } from '../../src/features/profile/BadgeCell'
import { BadgeSheet } from '../../src/features/profile/BadgeSheet'
import { FollowListSheet, type FollowKind } from '../../src/features/profile/FollowListSheet'
import { LevelHeroCard } from '../../src/features/profile/LevelHeroCard'
import { focusHours } from '../../src/features/profile/profileFormat'
import { ProfileStat } from '../../src/features/profile/ProfileStat'
import { ProfileHeader } from '../../src/features/profile/ProfileHeader'
import { TreeHeroCard } from '../../src/features/profile/TreeHeroCard'
import { bannerKind, ringKind, treeLookKind } from '../../src/features/profile/cosmetics/cosmetics'

const BADGE_COLS = 4
const BADGE_PREVIEW = 8
const MENU_ICON = 40

/** A menu row: a raised 40 px icon square, title 16/700, subtitle, chevron. */
function MenuRow({ icon: Icon, title, subtitle, first, onPress }: {
  icon: LucideIcon; title: string; subtitle: string; first?: boolean; onPress: () => void
}) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${title}, ${subtitle}`}
      style={[styles.menuRow, !first && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Icon size={iconSize.sm} color={colors.text} strokeWidth={iconStroke + 0.1} />
      </View>
      <View style={styles.flex}>
        <Text style={[typeScale.tileTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{subtitle}</Text>
      </View>
      <ChevronRight size={iconSize.sm - 2} color={colors.textMuted} strokeWidth={iconStroke + 0.2} />
    </Pressable>
  )
}

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
  const focused = useIsFocused()
  const { ownProfile, loadOwnProfile } = useProfileStore()
  const authUser = useAuthStore(s => s.user)
  const dashData = useDashboardStore(s => s.data)

  // Fallbacks for when the dashboard cache doesn't have these yet.
  const [fetched, setFetched] = useState<{ streak?: number; minutes?: number; rank?: number | null; longest?: number }>({})
  const streak = dashData?.focusStats?.streak_days ?? fetched.streak ?? 0
  const longest = dashData?.focusStats?.longest_streak ?? fetched.longest ?? 0
  const focusMinutes = dashData?.focusStats?.total_focus_minutes ?? fetched.minutes ?? 0
  const rank = dashData?.myLeaderRank ?? fetched.rank ?? null
  const [groups, setGroups] = useState<BadgeGroups['groups'] | null>(null)
  const [badgesLoaded, setBadgesLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [follow, setFollow] = useState<FollowKind | null>(null)
  const [selected, setSelected] = useState<ProfileBadge | null>(null)

  const load = useCallback(async () => {
    const dash = useDashboardStore.getState().data
    await Promise.allSettled([
      loadOwnProfile(),
      dash?.focusStats
        ? Promise.resolve()
        : focusStats.get().then(s => setFetched(f => ({ ...f, streak: s.streak_days ?? 0, minutes: s.total_focus_minutes ?? 0, longest: s.longest_streak ?? 0 }))),
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
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressViewOffset={insets.top}
          />
        }
      >
        <ProfileHeader
          banner={bannerKind(p?.look?.banner)}
          ring={ringKind(p?.look?.ring)}
          name={name}
          id={authUser?.telegram_id}
          uri={p?.photo_url ?? authUser?.photo_url}
          level={level}
          levelTitle={getLevelInfo(level).title}
          own
          onBack={back}
          onShare={share}
          onMore={() => router.push('/(screens)/settings' as any)}
          animated={focused}
        />

        <View style={styles.content}>
        {/* Identity */}
        <View style={styles.identity}>
          {p || authUser ? (
            <>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
              {p?.username ? <Text style={[styles.handle, { color: colors.accentText }]}>@{p.username}</Text> : null}
              <View style={styles.counts}>
                <Pressable noFeedback onPress={() => setFollow('followers')} accessibilityLabel={`${p?.followers_count ?? 0} kuzatuvchi`}>
                  <Text style={[styles.countText, { color: colors.textMuted }]}>
                    <Text style={[styles.bold, { color: colors.text }]}>{p?.followers_count ?? 0}</Text> kuzatuvchi
                  </Text>
                </Pressable>
                <Text style={[styles.countText, { color: colors.textMuted }]}>·</Text>
                <Pressable noFeedback onPress={() => setFollow('following')} accessibilityLabel={`${p?.following_count ?? 0} kuzatilmoqda`}>
                  <Text style={[styles.countText, { color: colors.textMuted }]}>
                    <Text style={[styles.bold, { color: colors.text }]}>{p?.following_count ?? 0}</Text> kuzatilmoqda
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <SkeletonRow />
          )}
        </View>
        <View style={styles.ownActions}>
          <Button label="Profilni bezash" icon={Sparkles} size="lg" onPress={() => router.push('/(screens)/profile-customize' as any)} style={styles.flex} />
          <Button label="Tahrirlash" variant="secondary" size="lg" onPress={() => router.push('/(screens)/edit-profile' as any)} style={styles.editBtn} />
        </View>

        <TreeHeroCard streak={streak} uid="profile-own" animate={focused} look={treeLookKind(p?.look?.tree)} />

        <View style={styles.statGrid}>
          <View style={styles.stats}>
            <ProfileStat icon={Clock} tint="orange" value={String(focusHours(focusMinutes))} label="soat oʻqish" />
            <ProfileStat icon={Flame} tint="orange" value={String(longest)} label="eng uzun seriya" />
          </View>
          <View style={styles.stats}>
            <ProfileStat icon={Trophy} tint="gold" value={rank == null ? '—' : `#${rank}`} label="haftalik oʻrin" />
            <ProfileStat icon={Award} tint="green" value={String(p?.courses_completed ?? 0)} label="tugatilgan kurslar" />
          </View>
        </View>

        <LevelHeroCard level={level} xp={p?.total_xp ?? authUser?.total_xp ?? 0} nextXp={p?.next_level_xp ?? 0} />

        {/* Nishonlar */}
        <View style={styles.section}>
          <SectionTitle
            title="Nishonlar"
            link={{ label: `Hammasi · ${counts.earned}/${counts.total}`, onPress: () => router.push('/(screens)/badges' as any) }}
          />
          <View style={styles.grid}>
            {!badgesLoaded
              ? Array.from({ length: BADGE_COLS }, (_, i) => <SkeletonBlock key={i} width={avatarSize.podium} height={avatarSize.podium} />)
              : preview.map(b => {
                  const v = badgeVisual(b)
                  return (
                    <BadgeTile
                      key={b.key}
                      name={uzText(b.name)}
                      icon={v.Icon}
                      art={stageArt(b) ?? undefined}
                      tint={v.tint}
                      onPress={() => setSelected(b)}
                    />
                  )
                })}
          </View>
          {badgesLoaded && preview.length === 0 && (
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Birinchi nishoningizni oling — fokusdan boshlang.</Text>
          )}
        </View>

        <Card style={styles.menu}>
          <MenuRow first icon={BarChart3} title="Statistika" subtitle="Oʻqish vaqti, kunlar, tendensiya" onPress={() => router.push('/(screens)/streak-detail' as any)} />
          <MenuRow icon={Flame} title="Seriya va inventar" subtitle={`Joriy: ${streak} kunlik seriya`} onPress={() => router.push('/(screens)/streak-detail' as any)} />
          <MenuRow icon={Heart} title="Sevimli kurslar" subtitle="Saqlangan kurslaringiz" onPress={() => router.push('/(screens)/saved' as any)} />
          <MenuRow icon={Lightbulb} title="Mening savollarim" subtitle="5 SAVOLGA savol yuboring" onPress={() => router.push('/(screens)/my-questions' as any)} />
          <MenuRow icon={GraduationCap} title={teacher.title} subtitle={teacher.subtitle} onPress={() => router.push(teacher.route as any)} />
        </Card>
        </View>
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
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: fonts.bold },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.md + 2 },
  identity: { gap: 2 },
  name: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  handle: { fontFamily: fonts.semibold, fontSize: 16 },
  countText: { fontFamily: fonts.regular, fontSize: 15 },
  counts: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, marginTop: 2, flexWrap: 'wrap' },
  ownActions: { flexDirection: 'row', gap: space.sm },
  editBtn: { width: 128 },
  statGrid: { gap: space.sm - 2 },
  stats: { flexDirection: 'row', gap: space.sm - 2 },
  section: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  menu: { padding: 0, overflow: 'hidden', borderRadius: radius.xl },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingVertical: space.sm + 2, paddingHorizontal: space.md },
  menuIcon: { width: MENU_ICON, height: MENU_ICON, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
})
