import React, { useEffect, useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable,
  ScrollView, Modal, FlatList, Image, Share, RefreshControl, Alert,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Share2, X, BarChart2 } from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { useAuthStore } from '../../../stores/authStore'
import { useProfileStore } from '../../../stores/profileStore'
import { profile as profileApi, follows, type SocialUser } from '../../../lib/api'
import { Avatar } from '../../../components/ui/Avatar'
import { HeroLevelCard } from '../../../components/profile/HeroLevelCard'
import { CompareModal, type CompareUser } from '../../../components/profile/CompareModal'
import { typography, spacing, radius } from '../../../lib/constants'
import type { ProfileData, ProfileCertificate } from '../../../lib/types'
import { useDashboardStore } from '../../../stores/dashboardStore'

// ── XP Ring Avatar ────────────────────────────────────────────────────────────

function AvatarWithXPRing({
  uri, name, xpPercent, size = 80,
}: {
  uri?: string | null; name?: string | null; xpPercent: number; size?: number
}) {
  const { c } = useTheme()
  const strokeW  = 4
  const gap      = 3
  const outer    = size + 2 * (strokeW + gap)
  const cx       = outer / 2
  const r        = outer / 2 - strokeW / 2
  const circ     = 2 * Math.PI * r
  const offset   = circ * (1 - Math.min(100, Math.max(0, xpPercent)) / 100)

  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={outer} height={outer} style={StyleSheet.absoluteFillObject}>
        {/* Track */}
        <Circle cx={cx} cy={cx} r={r} stroke={c.border} strokeWidth={strokeW} fill="none" />
        {/* Progress */}
        <Circle
          cx={cx} cy={cx} r={r}
          stroke="#F5A623" strokeWidth={strokeW} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <Avatar uri={uri} name={name} size={size as any} borderWidth={0} />
    </View>
  )
}

// ── Mutual Followers Chip ─────────────────────────────────────────────────────

function MutualChip({ count, c }: { count: number; c: any }) {
  if (count <= 0) return null
  return (
    <View style={[chipStyles.root, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
      <Text style={{ fontSize: 13 }}>👥</Text>
      <Text style={[chipStyles.text, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {count} ta umumiy kuzatuvchi
      </Text>
    </View>
  )
}
const chipStyles = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  text: { fontSize: 12 },
})

// ── Follow Button ─────────────────────────────────────────────────────────────

function FollowButton({
  isFollowing, loading, onPress, c,
}: {
  isFollowing: boolean; loading: boolean; onPress: () => void; c: any
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        fbStyles.btn,
        isFollowing
          ? { backgroundColor: c.bgSecondary, borderColor: c.border, borderWidth: 1 }
          : { backgroundColor: c.accentPrimary },
        pressed && { opacity: 0.88 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isFollowing ? c.textSecondary : '#fff'} size="small" />
      ) : (
        <>
          <Text style={{ fontSize: 15 }}>{isFollowing ? '✓' : '+'}</Text>
          <Text style={[fbStyles.label, {
            color:      isFollowing ? c.textSecondary : '#fff',
            fontFamily: typography.fontFamily.bold,
          }]}>
            {isFollowing ? 'Kuzatilmoqda' : 'Kuzatish'}
          </Text>
        </>
      )}
    </Pressable>
  )
}
const fbStyles = StyleSheet.create({
  btn: {
    flex: 1, height: 44, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#F5A623', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  label: { fontSize: 15 },
})

// ── Follow List Modal ─────────────────────────────────────────────────────────

function FollowListModal({
  visible, type, userId, onClose, router,
}: {
  visible: boolean; type: 'followers' | 'following'; userId: number
  onClose: () => void; router: ReturnType<typeof useRouter>
}) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const [list,    setList]    = useState<SocialUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchList = useCallback(() => {
    if (!userId) return
    setList([]); setError(null); setLoading(true)
    const fn = type === 'followers' ? profileApi.getFollowers : profileApi.getFollowing
    fn(userId)
      .then(data => setList(Array.isArray(data) ? data.map((d: any) => d.user) : []))
      .catch((e: any) => setError(e?.message ?? 'Xatolik yuz berdi'))
      .finally(() => setLoading(false))
  }, [type, userId])

  useEffect(() => {
    if (visible) fetchList()
    else { setList([]); setError(null) }
  }, [visible, fetchList])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[flStyles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <View style={[flStyles.header, { borderBottomColor: c.border }]}>
          <Text style={[flStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {type === 'followers' ? 'Kuzatuvchilar' : 'Kuzatilayotganlar'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={flStyles.closeBtn}>
            <X size={20} color={c.textSecondary} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={c.accentPrimary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={flStyles.empty}>
            <Text style={{ color: '#ff453a', fontFamily: typography.fontFamily.regular, fontSize: 14 }}>⚠️ {error}</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={flStyles.empty}>
            <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 14 }}>
              {type === 'followers' ? "Hali kuzatuvchi yo'q" : "Hali hech kimni kuzatmayapti"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={u => String(u.telegram_id)}
            contentContainerStyle={{ paddingHorizontal: spacing.screenMargin }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onClose(); router.push(`/(screens)/profile/${item.telegram_id}` as any) }}
                style={[flStyles.row, { borderBottomColor: c.border }]}
              >
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={flStyles.avatar} />
                ) : (
                  <View style={[flStyles.avatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: c.accentPrimary, fontFamily: typography.fontFamily.bold, fontSize: 16 }}>
                      {(item.full_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.medium, fontSize: 15 }}>
                    {item.full_name}
                  </Text>
                  {item.username && (
                    <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 12 }}>
                      @{item.username}
                    </Text>
                  )}
                </View>
                <View style={[flStyles.levelPill, { backgroundColor: c.bgTertiary }]}>
                  <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.semibold, fontSize: 11 }}>
                    Lv.{item.level}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  )
}

const flStyles = StyleSheet.create({
  root:      { flex: 1 },
  header:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title:     { fontSize: 17 },
  closeBtn:  { padding: spacing.xs },
  empty:     { alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl },
  row:       {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar:    { width: 44, height: 44, borderRadius: 22 },
  levelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PublicProfileScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { id }   = useLocalSearchParams<{ id: string }>()
  const authUser = useAuthStore(s => s.user)
  const { loadPublicProfile, loadOwnProfile, patchCachedStatus, cache, ownProfile } = useProfileStore()
  const focusStats = useDashboardStore(s => s.data?.focusStats)

  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [refreshing,    setRefreshing]    = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showCompare,   setShowCompare]   = useState(false)
  const [followModal,   setFollowModal]   = useState<{ type: 'followers' | 'following'; visible: boolean }>({
    type: 'followers', visible: false,
  })

  const profileData = cache[Number(id)]?.data ?? null
  const isOwn       = authUser?.telegram_id === Number(id)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try { await loadPublicProfile(id) }
    catch (e: any) { setError(e?.message ?? 'Profil yuklanmadi') }
    finally { setLoading(false) }
  }, [id, loadPublicProfile])

  useEffect(() => { load() }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleFollow = useCallback(async () => {
    if (!profileData) return
    setFollowLoading(true)
    try {
      if (profileData.is_following) {
        Alert.alert(
          'Kuzatishni bekor qilish',
          `${profileData.first_name}ni kuzatishdan to'xtaysiz.`,
          [
            { text: "Yo'q", style: 'cancel' },
            {
              text: 'Bekor qilish', style: 'destructive',
              onPress: async () => {
                await follows.unfollow(profileData.telegram_id)
                patchCachedStatus(profileData.telegram_id, { is_following: false })
              },
            },
          ],
        )
      } else {
        await follows.follow(profileData.telegram_id)
        patchCachedStatus(profileData.telegram_id, { is_following: true })
      }
    } catch {}
    setFollowLoading(false)
  }, [profileData, patchCachedStatus])

  const handleShare = useCallback(async () => {
    if (!profileData) return
    const handle = profileData.username ?? String(profileData.telegram_id)
    await Share.share({
      message: `SAHIFALAB platformasidagi ${profileData.first_name} profili: https://sahifalab.uz/u/${handle}`,
      url: `https://sahifalab.uz/u/${handle}`,
    })
  }, [profileData])

  // Loading
  if (loading && !profileData) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <ActivityIndicator color={c.accentPrimary} size="large" style={{ marginTop: 80 }} />
      </View>
    )
  }

  // Error
  if (error || !profileData) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={[{ fontSize: 15, textAlign: 'center', color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {error ?? 'Foydalanuvchi topilmadi'}
          </Text>
          <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: c.accentPrimary }]}>
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily.medium }}>Qayta urinish</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const p = profileData as ProfileData
  const topCerts = ((p.certificates ?? []) as ProfileCertificate[]).slice(0, 3)

  function fmtDate(iso: string | null): string {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.accentPrimary} />}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}>
              <ArrowLeft size={18} color={c.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleShare} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}>
              <Share2 size={18} color={c.textSecondary} />
            </Pressable>
          </View>

          {/* Centered identity block */}
          <View style={styles.identity}>
            <AvatarWithXPRing
              uri={p.photo_url}
              name={p.first_name}
              xpPercent={p.xp_percent ?? 0}
              size={80}
            />
            <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
              {p.first_name}
            </Text>
            {p.username && (
              <Text style={[styles.handle, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                @{p.username}
              </Text>
            )}
            {(p.bio || p.headline) && (
              <Text style={[styles.bio, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={2}>
                {p.bio ?? p.headline}
              </Text>
            )}

            <MutualChip count={p.mutual_connections ?? 0} c={c} />

            {/* Clickable counts */}
            <View style={styles.countsRow}>
              <Pressable onPress={() => setFollowModal({ type: 'followers', visible: true })}>
                <Text style={[styles.countText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                  <Text style={{ fontFamily: typography.fontFamily.semibold }}>{p.followers_count ?? 0}</Text>
                  {' '}kuzatuvchi
                </Text>
              </Pressable>
              <View style={[styles.countDivider, { backgroundColor: c.border }]} />
              <Pressable onPress={() => setFollowModal({ type: 'following', visible: true })}>
                <Text style={[styles.countText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                  <Text style={{ fontFamily: typography.fontFamily.semibold }}>{p.following_count ?? 0}</Text>
                  {' '}kuzatilmoqda
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Content ───────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* CTA row (visitor only) */}
          {!isOwn && (
            <View style={styles.ctaRow}>
              <FollowButton
                isFollowing={p.is_following}
                loading={followLoading}
                onPress={handleFollow}
                c={c}
              />
              <Pressable
                onPress={() => { if (!ownProfile) loadOwnProfile(); setShowCompare(true) }}
                style={[styles.compareBtn, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
              >
                <BarChart2 size={16} color={c.textSecondary} />
                <Text style={[styles.compareBtnText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  Solishtirish
                </Text>
              </Pressable>
            </View>
          )}

          {/* Trophy section header */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.bold }]}>
            TROFEY XONASI
          </Text>

          {/* Hero card — public variant */}
          <HeroLevelCard
            variant="public"
            level={p.level ?? 1}
            xp={p.total_xp ?? 0}
            nextXp={p.next_level_xp ?? 100}
            xpPercent={p.xp_percent ?? 0}
            rank={null}
            coursesCompleted={p.courses_completed ?? 0}
            followersCount={p.followers_count ?? 0}
            totalFocusMinutes={Math.round((p.focus_hours ?? 0) * 60)}
          />

          {/* Completed courses */}
          {topCerts.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                Tugatilgan kurslar
              </Text>
              <View style={[styles.coursesCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                {topCerts.map((cert, i) => (
                  <React.Fragment key={cert.id}>
                    <Pressable
                      onPress={() => router.push(`/(screens)/certificate/${cert.certificate_id}` as any)}
                      style={({ pressed }) => [
                        styles.courseRow,
                        pressed && { backgroundColor: c.bgTertiary },
                      ]}
                    >
                      <View style={[styles.courseDot, { backgroundColor: c.accentPrimary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
                          {cert.course_title}
                        </Text>
                        <Text style={[styles.courseMeta, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                          ⭐ {Math.round(cert.score)}% · {fmtDate(cert.issued_at)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, color: c.textDisabled }}>›</Text>
                    </Pressable>
                    {i < topCerts.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <FollowListModal
        visible={followModal.visible}
        type={followModal.type}
        userId={p.telegram_id}
        onClose={() => setFollowModal(m => ({ ...m, visible: false }))}
        router={router}
      />

      {!isOwn && authUser && (
        <CompareModal
          visible={showCompare}
          onClose={() => setShowCompare(false)}
          me={{
            name:             authUser.first_name,
            photo_url:        authUser.photo_url ?? null,
            level:            authUser.level,
            total_xp:         authUser.total_xp,
            longest_streak:   focusStats?.longest_streak ?? authUser.streak_days,
            focus_hours:      focusStats?.total_focus_minutes != null
                                ? Math.round((focusStats.total_focus_minutes / 60) * 10) / 10
                                : (ownProfile?.focus_hours ?? 0),
            courses_completed: ownProfile?.courses_completed ?? 0,
          }}
          them={{
            name:             p.first_name,
            photo_url:        p.photo_url,
            level:            p.level,
            total_xp:         p.total_xp,
            longest_streak:   p.longest_streak ?? 0,
            focus_hours:      p.focus_hours,
            courses_completed: p.courses_completed,
          }}
        />
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base, padding: spacing.xl },

  // Header
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom:     spacing.base,
  },
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    gap:               6,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Centered identity
  identity: {
    alignItems:        'center',
    paddingHorizontal: 24,
    paddingTop:        16,
    gap:               8,
  },
  name:   { fontSize: 22, textAlign: 'center' },
  handle: { fontSize: 14 },
  bio:    { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },

  // Counts row
  countsRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  countText:    { fontSize: 13 },
  countDivider: { width: 1, height: 14 },

  // Content
  content: {
    paddingHorizontal: spacing.screenMargin,
    paddingTop:        spacing.base,
    paddingBottom:     48,
    gap:               12,
  },

  // CTA row
  ctaRow:      { flexDirection: 'row', gap: 10 },
  compareBtn:  {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  compareBtnText: { fontSize: 14 },

  // Section labels
  sectionLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  subLabel:     { fontSize: 14 },

  // Courses card
  coursesCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  courseRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingHorizontal: spacing.base,
    paddingVertical:   12,
  },
  courseDot: { width: 8, height: 8, borderRadius: 4 },
  courseTitle: { fontSize: 14 },
  courseMeta:  { fontSize: 12, marginTop: 2 },
  rowDivider:  { height: StyleSheet.hairlineWidth, marginLeft: spacing.base },

  retryBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 20 },
})
