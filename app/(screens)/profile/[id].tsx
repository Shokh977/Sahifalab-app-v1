/**
 * Public profile — someone else's Profil, on the same kit as yours (the
 * "6-qadam" layout from Phase A): the banner header with frosted nav (back,
 * "Profil", share, more), the ringed avatar and level chip, name, follower
 * counts, mutual connections and Kuzatish / Solishtirish; the hero tree
 * card; four stat tiles; the gradient level card; the newest earned badges
 * as tinted icon tiles. Teachers add their bio card,
 * links and courses; students their finished courses. "···" opens a sheet
 * with Shikoyat qilish / Bloklash. Your own id redirects to Profil. The
 * screen renders in its owner's app theme (Mavzu), whatever yours is.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router'
import {
  Award, Ban, BarChart3, BookOpen, Check, ChevronLeft, Clock, Flag, Flame, Globe, MoreHorizontal, Play, Send,
  Share2, Star, Timer, Trophy, UserPlus, UserX,
} from 'lucide-react-native'
import { RoleBadge } from '../../../components/ui/RoleBadge'
import { CompareModal } from '../../../components/profile/CompareModal'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { ReportContentSheet } from '../../../components/ui/ReportContentSheet'
import { shareProfile } from '../../../lib/share'
import { LEVEL_TITLES, getLevelInfo } from '../../../lib/levelTitles'
import { useAuthStore } from '../../../stores/authStore'
import { useProfileStore } from '../../../stores/profileStore'
import { useDashboardStore } from '../../../stores/dashboardStore'
import {
  profile as profileApi, follows, moderation, courses as coursesApi,
  type BadgeGroups, type Course, type MutualUser, type MyLook,
} from '../../../lib/api'
import type { ProfileCertificate, ProfileData, TeacherProfileData } from '../../../lib/types'
import { ThemeProvider, useTheme } from '../../../src/design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, layout, radius, space } from '../../../src/design/spacing'
import { fonts, type as typeScale } from '../../../src/design/typography'
import {
  Avatar, BadgeTile, Button, Card, EmptyState, IconButton, ListRow, Pressable, SectionTitle, Sheet, SkeletonBlock, SkeletonRow,
} from '../../../src/components/ui'
import { uzText } from '../../../src/features/today/today'
import { allBadges, topEarned, type ProfileBadge } from '../../../src/features/profile/badges'
import { badgeVisual, stageArt } from '../../../src/features/profile/BadgeCell'
import { BadgeSheet } from '../../../src/features/profile/BadgeSheet'
import { FollowListSheet, type FollowKind } from '../../../src/features/profile/FollowListSheet'
import { LevelHeroCard } from '../../../src/features/profile/LevelHeroCard'
import { ProfileStat } from '../../../src/features/profile/ProfileStat'
import { ProfileHeader, useHeaderOnScreen } from '../../../src/features/profile/ProfileHeader'
import { TreeHeroCard } from '../../../src/features/profile/TreeHeroCard'
import { ForestStrip } from '../../../src/features/forest/ForestStrip'
import { ProPill } from '../../../src/features/pro/ProPill'
import { GetLookSheet, type LookTarget } from '../../../src/features/profile/GetLookSheet'
import { bannerKind, ringKind, themeKind, treeLookKind } from '../../../src/features/profile/cosmetics/cosmetics'
import { groupThousands } from '../../../src/features/profile/profileFormat'

const BADGE_COLS = 4
const BADGE_PREVIEW = 8
const MUTUAL_FACES = 3
const FACE = 22

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** "3 ta umumiy" with up to three overlapped faces. */
function MutualChip({ count, users, onPress }: { count: number; users: MutualUser[]; onPress: () => void }) {
  const { colors } = useTheme()
  if (count <= 0) return null
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${count} ta umumiy aloqa`}
      style={[styles.mutual, { backgroundColor: colors.surfaceRaised }]}>
      {users.length > 0 && (
        <View style={styles.faces}>
          {users.slice(0, MUTUAL_FACES).map((u, i) => (
            <Avatar key={u.id} name={u.name} id={u.id} uri={u.avatar_url} diameter={FACE}
              style={[styles.face, { borderColor: colors.surfaceRaised, marginLeft: i === 0 ? 0 : -space.xs }]} />
          ))}
        </View>
      )}
      <Text style={[typeScale.callout, { color: colors.textMuted }]}>{count} ta umumiy</Text>
    </Pressable>
  )
}

/** The teacher's bio, specialisation, experience and education. */
function TeacherInfo({ td }: { td: TeacherProfileData }) {
  const { colors, tint } = useTheme()
  const spec = td.specialization?.trim()
  const exp = (td.experience_years ?? 0) > 0
  const edu = td.education?.trim()
  const bio = td.bio?.trim()
  if (!spec && !exp && !edu && !bio) return null
  const chip = (Icon: typeof Star, label: string, ink: string) => (
    <View style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}>
      <Icon size={iconSize.sm - 8} color={ink} strokeWidth={iconStroke + 0.2} />
      <Text style={[typeScale.callout, { color: colors.text }]}>{label}</Text>
    </View>
  )
  return (
    <Card style={styles.teacherCard}>
      {bio ? <Text style={[typeScale.body, { color: colors.textMuted }]}>{bio}</Text> : null}
      {(spec || exp) && (
        <View style={styles.chips}>
          {spec ? chip(Star, spec, tint('gold').ink) : null}
          {exp ? chip(Clock, `${td.experience_years} yil tajriba`, tint('green').ink) : null}
        </View>
      )}
      {edu ? (
        <View style={[styles.edu, { borderTopColor: colors.border }]}>
          <Award size={iconSize.sm - 6} color={colors.textMuted} strokeWidth={iconStroke} />
          <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]}>{edu}</Text>
        </View>
      ) : null}
    </Card>
  )
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const ownerTheme = useProfileStore(s => s.cache[Number(id)]?.data?.look?.theme)
  return (
    <ThemeProvider themeId={themeKind(ownerTheme)}>
      <PublicProfileBody />
    </ThemeProvider>
  )
}

function PublicProfileBody() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const header = useHeaderOnScreen()
  const { id } = useLocalSearchParams<{ id: string }>()
  const authUser = useAuthStore(s => s.user)
  const { loadPublicProfile, loadOwnProfile, patchCachedStatus, cache, ownProfile } = useProfileStore()
  const myStats = useDashboardStore(s => s.data?.focusStats)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [follow, setFollow] = useState<FollowKind | null>(null)
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [selected, setSelected] = useState<ProfileBadge | null>(null)
  const [lookTarget, setLookTarget] = useState<LookTarget | null>(null)
  const [myUnlocked, setMyUnlocked] = useState<MyLook['unlocked'] | null>(null)

  // What the viewer can use — fetched the first time they tap a cosmetic.
  const openLook = useCallback((t: LookTarget) => {
    setLookTarget(t)
    if (myUnlocked) return
    profileApi.getMyLook()
      .then(l => setMyUnlocked(l.unlocked))
      .catch(() => setMyUnlocked({ banner: {}, ring: {}, tree: {}, theme: {} }))
  }, [myUnlocked])

  const [teacherData, setTeacherData] = useState<TeacherProfileData | null>(null)
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([])
  const [teacherLoading, setTeacherLoading] = useState(false)

  const [mutualUsers, setMutualUsers] = useState<MutualUser[]>([])
  const [mutualLoading, setMutualLoading] = useState(false)
  const [showMutual, setShowMutual] = useState(false)

  const [badges, setBadges] = useState<BadgeGroups | null>(null)
  const [badgesLoading, setBadgesLoading] = useState(true)

  const profileData = cache[Number(id)]?.data ?? null
  const isOwn = !!authUser && authUser.telegram_id === Number(id)
  const isTeacher = profileData?.account_type === 'teacher' || profileData?.role === 'teacher'
    || profileData?.account_type === 'admin' || profileData?.role === 'admin'

  // Your own id: Profil instead of the public view.
  useEffect(() => {
    if (isOwn) router.dismissTo('/(tabs)/profile' as any)
  }, [isOwn, router])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try { await loadPublicProfile(id) }
    catch (e: any) { setError(e?.message ?? 'Profil yuklanmadi') }
    finally { setLoading(false) }
  }, [id, loadPublicProfile])

  useEffect(() => { load() }, [load])

  // Earned badges only (a public profile never shows locked ones).
  useEffect(() => {
    if (!id || isOwn) return
    setBadgesLoading(true)
    profileApi.getUserBadges(id)
      .then(setBadges)
      .catch(() => {})
      .finally(() => setBadgesLoading(false))
  }, [id, isOwn])

  const mutualCount = profileData?.mutual_connections ?? 0
  useEffect(() => {
    if (!id || isOwn || mutualCount <= 0) return
    setMutualLoading(true)
    profileApi.getMutualConnections(Number(id))
      .then(res => setMutualUsers(res.users ?? []))
      .catch(() => {})
      .finally(() => setMutualLoading(false))
  }, [id, isOwn, mutualCount])

  useEffect(() => {
    if (!isTeacher || !id) return
    const tid = Number(id)
    setTeacherLoading(true)
    Promise.all([
      profileApi.getTeacherProfile(tid).catch(() => null),
      coursesApi.list({ teacher_id: tid, limit: 20 }).catch(() => null),
    ]).then(([td, cr]) => {
      if (td) setTeacherData(td)
      setTeacherCourses(cr?.courses ?? [])
    }).finally(() => setTeacherLoading(false))
  }, [isTeacher, id])

  const handleFollow = useCallback(async () => {
    if (!profileData) return
    if (profileData.is_following) { setShowUnfollowConfirm(true); return }
    setFollowLoading(true)
    try {
      await follows.follow(profileData.telegram_id)
      patchCachedStatus(profileData.telegram_id, { is_following: true })
    } catch {}
    setFollowLoading(false)
  }, [profileData, patchCachedStatus])

  const doUnfollow = useCallback(async () => {
    if (!profileData) return
    setShowUnfollowConfirm(false)
    setFollowLoading(true)
    try {
      await follows.unfollow(profileData.telegram_id)
      patchCachedStatus(profileData.telegram_id, { is_following: false })
    } catch {}
    setFollowLoading(false)
  }, [profileData, patchCachedStatus])

  const doBlock = useCallback(async () => {
    if (!profileData) return
    setBlocking(true)
    try {
      await moderation.block(profileData.telegram_id)
      setBlocked(true)
      setShowBlockConfirm(false)
    } catch {}
    setBlocking(false)
  }, [profileData])

  const share = () => {
    if (!profileData) return
    shareProfile({
      telegramId: profileData.telegram_id,
      firstName: profileData.first_name,
      level: profileData.level,
      streakDays: profileData.streak_days,
    })
  }
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))

  if (isOwn) return null

  const bar = (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <IconButton icon={ChevronLeft} accessibilityLabel="Orqaga" onPress={back} />
      <Text style={[typeScale.headline, styles.flex, styles.center, styles.bold, { color: colors.text }]} accessibilityRole="header">Profil</Text>
      <IconButton icon={Share2} accessibilityLabel="Profilni ulashish" onPress={share} disabled={!profileData} />
      <IconButton icon={MoreHorizontal} accessibilityLabel="Boshqa amallar" onPress={() => setShowMore(true)} disabled={!profileData} />
    </View>
  )

  if (!profileData) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {bar}
        <View style={styles.content}>
          {loading || !error ? (
            <>
              <View style={styles.identity}>
                <SkeletonBlock width={72} height={72} borderRadius={36} />
                <View style={styles.flex}><SkeletonRow /></View>
              </View>
              <SkeletonBlock height={space.huge * 3} borderRadius={radius.xl} />
            </>
          ) : (
            <EmptyState
              icon={UserX}
              title={error ?? 'Foydalanuvchi topilmadi'}
              body="Internet aloqasini tekshirib, qayta urinib koʻring."
              action={{ label: 'Qayta urinish', onPress: load }}
            />
          )}
        </View>
      </View>
    )
  }

  const p = profileData as ProfileData
  const name = uzText(p.first_name ?? '')
  const level = p.level ?? 1
  const preview = topEarned(allBadges(badges?.groups, level, LEVEL_TITLES), BADGE_PREVIEW)
  const certs = ((p.certificates ?? []) as ProfileCertificate[]).slice(0, 3)
  const about = p.headline || (!isTeacher ? p.bio : null)
  const links = teacherData ? [
    teacherData.website_url && { icon: Globe, title: teacherData.website_url.replace(/^https?:\/\//, ''), url: teacherData.website_url },
    teacherData.youtube_url && { icon: Play, title: 'YouTube kanali', url: teacherData.youtube_url },
    teacherData.telegram_channel && { icon: Send, title: `@${teacherData.telegram_channel}`, url: `https://t.me/${teacherData.telegram_channel}` },
  ].filter(Boolean) as { icon: typeof Globe; title: string; url: string }[] : []

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        {...header.scrollProps}
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
          banner={bannerKind(p.look?.banner)}
          ring={ringKind(p.look?.ring)}
          name={name}
          id={p.telegram_id}
          uri={p.photo_url}
          level={level}
          levelTitle={getLevelInfo(level).title}
          own={false}
          onBack={back}
          onShare={share}
          onMore={() => setShowMore(true)}
          animated={focused}
          paused={!header.onScreen}
          onBannerPress={() => openLook({ slot: 'banner', id: bannerKind(p.look?.banner) })}
          onRingPress={() => openLook({ slot: 'ring', id: ringKind(p.look?.ring) })}
        />

        <View style={styles.content}>
        {blocked && (
          <View style={[styles.blocked, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Siz bu foydalanuvchini bloklagansiz.</Text>
          </View>
        )}

        {/* Identity */}
        <View style={styles.identity}>
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.name, styles.shrink, { color: colors.text }]} numberOfLines={1}>{name}</Text>
              <RoleBadge role={p.role ?? null} accountType={p.account_type} size={18} />
              {p.is_pro ? <ProPill /> : null}
            </View>
            {p.username ? <Text style={[styles.handle, { color: colors.accentText }]}>@{p.username}</Text> : null}
            <View style={styles.counts}>
              <Pressable noFeedback onPress={() => setFollow('followers')} accessibilityLabel={`${p.followers_count ?? 0} kuzatuvchi`}>
                <Text style={[styles.countText, { color: colors.textMuted }]}>
                  <Text style={[styles.bold, { color: colors.text }]}>{p.followers_count ?? 0}</Text> kuzatuvchi
                </Text>
              </Pressable>
              <Text style={[styles.countText, { color: colors.textMuted }]}>·</Text>
              <Pressable noFeedback onPress={() => setFollow('following')} accessibilityLabel={`${p.following_count ?? 0} kuzatilmoqda`}>
                <Text style={[styles.countText, { color: colors.textMuted }]}>
                  <Text style={[styles.bold, { color: colors.text }]}>{p.following_count ?? 0}</Text> kuzatilmoqda
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {about ? <Text style={[typeScale.body, { color: colors.textMuted }]} numberOfLines={3}>{about}</Text> : null}
        <MutualChip count={mutualCount} users={mutualUsers} onPress={() => setShowMutual(true)} />

        <View style={styles.actions}>
          <Button
            label={p.is_following ? 'Kuzatilmoqda' : 'Kuzatish'}
            icon={p.is_following ? Check : UserPlus}
            variant={p.is_following ? 'secondary' : 'primary'}
            loading={followLoading}
            onPress={handleFollow}
            style={styles.flex}
          />
          {authUser && (
            <Button
              label="Solishtirish"
              icon={BarChart3}
              variant="secondary"
              onPress={() => { if (!ownProfile) loadOwnProfile(); setShowCompare(true) }}
              style={styles.flex}
            />
          )}
        </View>

        <TreeHeroCard
          streak={p.streak_days ?? 0}
          uid={`profile-${p.telegram_id}`}
          look={treeLookKind(p.look?.tree)}
          onLookPress={() => openLook({ slot: 'tree', id: treeLookKind(p.look?.tree) })}
        />

        <ForestStrip
          trees={p.forest ?? []}
          currentStreak={p.streak_days ?? 0}
          look={treeLookKind(p.look?.tree)}
          idPrefix={`p${p.telegram_id}`}
          onOpen={() => router.push(`/(screens)/forest/${p.telegram_id}` as any)}
        />

        <View style={styles.statGrid}>
          <View style={styles.stats}>
            <ProfileStat icon={Timer} tint="orange" value={String(Math.round((p.focus_hours ?? 0) * 10) / 10)} label="soat oʻqish" />
            <ProfileStat icon={Flame} tint="orange" value={String(p.longest_streak ?? 0)} label="eng uzun seriya" />
          </View>
          <View style={styles.stats}>
            <ProfileStat icon={Trophy} tint="gold" value={String(p.total_xp ?? 0)} label="XP" />
            <ProfileStat icon={Award} tint="green" value={String(p.courses_completed ?? 0)} label="tugatilgan kurslar" />
          </View>
        </View>

        <LevelHeroCard level={level} xp={p.total_xp ?? 0} nextXp={p.next_level_xp ?? 0} />

        {/* Nishonlar */}
        <View style={styles.section}>
          <SectionTitle title="Nishonlar" meta={!badgesLoading && preview.length > 0 ? `${preview.length} ta` : undefined} />
          <View style={styles.grid}>
            {badgesLoading
              ? Array.from({ length: BADGE_COLS }, (_, i) => <SkeletonBlock key={i} width={avatarSize.podium} height={avatarSize.podium} />)
              : preview.map(b => {
                  const v = badgeVisual(b)
                  return (
                    <BadgeTile key={b.key} name={uzText(b.name)} icon={v.Icon} art={stageArt(b) ?? undefined} tint={v.tint} onPress={() => setSelected(b)} />
                  )
                })}
          </View>
          {!badgesLoading && preview.length === 0 && (
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Hali nishon yoʻq.</Text>
          )}
        </View>

        {isTeacher && (
          <>
            {teacherData && <TeacherInfo td={teacherData} />}
            {links.length > 0 && (
              <Card style={styles.list}>
                {links.map((l, i) => (
                  <ListRow
                    key={l.url}
                    title={l.title}
                    leading={{ kind: 'icon', icon: l.icon }}
                    trailing={{ kind: 'chevron' }}
                    onPress={() => Linking.openURL(l.url)}
                    style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}
                  />
                ))}
              </Card>
            )}
            <View style={styles.section}>
              <SectionTitle title="Kurslar" meta={teacherCourses.length > 0 ? `${teacherCourses.length} ta` : undefined} />
              {teacherLoading ? (
                <Card style={styles.list}><SkeletonRow /><SkeletonRow /></Card>
              ) : teacherCourses.length > 0 ? (
                <Card style={styles.list}>
                  {teacherCourses.map((c, i) => (
                    <ListRow
                      key={c.id}
                      title={uzText(c.title)}
                      subtitle={[`${groupThousands(c.enrolled_count ?? 0)} oʻquvchi`, c.rating ? `★ ${c.rating.toFixed(1)}` : null].filter(Boolean).join(' · ')}
                      leading={c.thumbnail_url ? { kind: 'thumbnail', uri: c.thumbnail_url } : { kind: 'icon', icon: BookOpen }}
                      trailing={{
                        kind: 'value',
                        value: c.is_paid ? `${groupThousands(c.price ?? 0)} soʻm` : 'Bepul',
                        color: c.is_paid ? undefined : colors.successText,
                      }}
                      onPress={() => router.push(`/(screens)/course/${c.id}` as any)}
                      style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}
                    />
                  ))}
                </Card>
              ) : (
                <Text style={[typeScale.callout, { color: colors.textMuted }]}>Hali kurs yaratilmagan.</Text>
              )}
            </View>
          </>
        )}

        {!isTeacher && certs.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Tugatilgan kurslar" meta={`${p.certificates_count ?? certs.length} ta`} />
            <Card style={styles.list}>
              {certs.map((cert, i) => (
                <ListRow
                  key={cert.id}
                  title={uzText(cert.course_title)}
                  subtitle={[`${Math.round(cert.score)}%`, fmtDate(cert.issued_at)].filter(Boolean).join(' · ')}
                  leading={{ kind: 'icon', icon: Award }}
                  trailing={{ kind: 'chevron' }}
                  onPress={() => router.push(`/(screens)/certificate/${cert.certificate_id}` as any)}
                  style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}
                />
              ))}
            </Card>
          </View>
        )}
        </View>
      </ScrollView>

      <BadgeSheet badge={selected} onClose={() => setSelected(null)} />
      <GetLookSheet
        target={lookTarget}
        owner={{ name, id: p.telegram_id, uri: p.photo_url }}
        unlockedForMe={lookTarget && myUnlocked ? !!myUnlocked[lookTarget.slot][lookTarget.id] : null}
        onClose={() => setLookTarget(null)}
      />
      <FollowListSheet
        kind={follow}
        userId={p.telegram_id}
        onClose={() => setFollow(null)}
        onOpenUser={uid => { setFollow(null); router.push(`/(screens)/profile/${uid}` as any) }}
      />

      <Sheet visible={showMutual} onClose={() => setShowMutual(false)} title="Umumiy aloqalar">
        {mutualLoading ? (
          <><SkeletonRow /><SkeletonRow /></>
        ) : mutualUsers.length === 0 ? (
          <Text style={[typeScale.body, styles.center, { color: colors.textMuted }]}>Umumiy aloqa topilmadi</Text>
        ) : (
          mutualUsers.map(u => (
            <ListRow
              key={u.id}
              title={uzText(u.name)}
              subtitle={u.headline || (u.username ? `@${u.username}` : undefined)}
              leading={{ kind: 'avatar', name: u.name, uri: u.avatar_url, id: u.id }}
              trailing={{ kind: 'value', value: `${u.level}-daraja` }}
              onPress={() => { setShowMutual(false); router.push(`/(screens)/profile/${u.id}` as any) }}
            />
          ))
        )}
      </Sheet>

      <Sheet visible={showMore} onClose={() => setShowMore(false)}>
        <ListRow title="Shikoyat qilish" leading={{ kind: 'icon', icon: Flag, color: colors.textMuted }} onPress={() => { setShowMore(false); setShowReport(true) }} />
        <ListRow title="Bloklash" leading={{ kind: 'icon', icon: Ban, color: colors.dangerText }} onPress={() => { setShowMore(false); setShowBlockConfirm(true) }} />
      </Sheet>

      {authUser && (
        <CompareModal
          visible={showCompare}
          onClose={() => setShowCompare(false)}
          me={{
            name: authUser.first_name,
            photo_url: authUser.photo_url ?? null,
            level: authUser.level,
            total_xp: authUser.total_xp,
            longest_streak: myStats?.longest_streak ?? authUser.streak_days,
            focus_hours: myStats?.total_focus_minutes != null
              ? Math.round((myStats.total_focus_minutes / 60) * 10) / 10
              : (ownProfile?.focus_hours ?? 0),
            courses_completed: ownProfile?.courses_completed ?? 0,
          }}
          them={{
            name: p.first_name,
            photo_url: p.photo_url,
            level: p.level,
            total_xp: p.total_xp,
            longest_streak: p.longest_streak ?? 0,
            focus_hours: p.focus_hours,
            courses_completed: p.courses_completed,
          }}
        />
      )}

      <ConfirmModal
        visible={showUnfollowConfirm}
        emoji="💔"
        title="Kuzatishni toʻxtatish"
        message={`${name} sahifasini kuzatishni toʻxtatasiz.`}
        confirmText="Toʻxtatish"
        cancelText="Yoʻq"
        danger
        onConfirm={doUnfollow}
        onCancel={() => setShowUnfollowConfirm(false)}
      />

      <ReportContentSheet
        visible={showReport}
        targetType="user"
        targetId={p.telegram_id}
        onClose={() => setShowReport(false)}
      />

      <ConfirmModal
        visible={showBlockConfirm}
        emoji="🚫"
        title="Foydalanuvchini bloklash"
        message={`${name} bilan bir-biringizga xabar yubora olmaysiz.`}
        confirmText={blocking ? 'Bloklanmoqda...' : 'Bloklash'}
        cancelText="Bekor qilish"
        danger
        onConfirm={doBlock}
        onCancel={() => setShowBlockConfirm(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xxs },
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  bold: { fontFamily: fonts.bold },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.md + 2 },
  blocked: { borderRadius: radius.md, padding: space.sm, alignItems: 'center' },
  identity: { gap: space.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2 },
  name: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  handle: { fontFamily: fonts.semibold, fontSize: 16 },
  countText: { fontFamily: fonts.regular, fontSize: 15 },
  statGrid: { gap: space.sm - 2 },
  counts: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, marginTop: 2, flexWrap: 'wrap' },
  mutual: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start',
    borderRadius: radius.full, paddingHorizontal: space.sm, paddingVertical: space.xxs + 1,
  },
  faces: { flexDirection: 'row' },
  face: { borderWidth: 1.5, borderRadius: FACE },
  actions: { flexDirection: 'row', gap: space.sm },
  stats: { flexDirection: 'row', gap: space.sm - 2 },
  section: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  list: { padding: 0, overflow: 'hidden', borderRadius: radius.xl },
  teacherCard: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xxs + 1,
    borderRadius: radius.full, paddingHorizontal: space.sm, paddingVertical: space.xxs + 1,
  },
  edu: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, paddingTop: space.sm, borderTopWidth: 1 },
})
