import React, { useEffect, useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable,
  ScrollView, Modal, FlatList, Image, RefreshControl, Linking,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeft, Share2, X, BarChart2,
  GraduationCap, Globe, Play, BookOpen,
  Users, Star, Clock, ChevronRight,
} from 'lucide-react-native'
import { RoleBadge } from '../../../components/ui/RoleBadge'
import { useTheme } from '../../../hooks/useTheme'
import { shareProfile } from '../../../lib/share'
import { useAuthStore } from '../../../stores/authStore'
import { useProfileStore } from '../../../stores/profileStore'
import { profile as profileApi, follows, courses as coursesApi, type SocialUser, type MutualUser, type Course } from '../../../lib/api'
import { Avatar } from '../../../components/ui/Avatar'
import { HeroLevelCard } from '../../../components/profile/HeroLevelCard'
import { CompareModal, type CompareUser } from '../../../components/profile/CompareModal'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { typography, spacing, radius } from '../../../lib/constants'
import type { ProfileData, ProfileCertificate, TeacherProfileData } from '../../../lib/types'
import { useDashboardStore } from '../../../stores/dashboardStore'

// ── XP Ring Avatar ────────────────────────────────────────────────────────────

function AvatarWithXPRing({
  uri, name, xpPercent, size = 80,
}: {
  uri?: string | null; name?: string | null; xpPercent: number; size?: number
}) {
  const { c } = useTheme()
  const strokeW = 4
  const gap     = 3
  const outer   = size + 2 * (strokeW + gap)
  const cx      = outer / 2
  const r       = outer / 2 - strokeW / 2
  const circ    = 2 * Math.PI * r
  const offset  = circ * (1 - Math.min(100, Math.max(0, xpPercent)) / 100)

  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={outer} height={outer} style={StyleSheet.absoluteFillObject}>
        <Circle cx={cx} cy={cx} r={r} stroke={c.border} strokeWidth={strokeW} fill="none" />
        <Circle
          cx={cx} cy={cx} r={r}
          stroke="#F5A623" strokeWidth={strokeW} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <Avatar uri={uri} name={name} size={size as any} borderWidth={0} />
    </View>
  )
}


// ── Mutual Chip ───────────────────────────────────────────────────────────────

const AVATAR_CHIP = 24
const OVERLAP     = 8

function MiniAvatar({ uri, name, index }: { uri: string | null; name: string; index: number }) {
  const { c } = useTheme()
  const init  = (name || 'U')[0].toUpperCase()
  return (
    <View style={[
      chipStyles.miniAvatar,
      { marginLeft: index === 0 ? 0 : -OVERLAP, zIndex: 10 - index,
        backgroundColor: c.bgTertiary, borderColor: c.bgPrimary },
    ]}>
      {uri
        ? <Image source={{ uri }} style={chipStyles.miniAvatarImg} />
        : <Text style={[chipStyles.miniAvatarText, { color: c.accentPrimary }]}>{init}</Text>
      }
    </View>
  )
}

function MutualChip({ count, users, onPress, c }: {
  count: number; users: MutualUser[]; onPress: () => void; c: any
}) {
  if (count <= 0) return null
  const shown = users.slice(0, 3)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.root,
        { backgroundColor: c.bgTertiary, borderColor: c.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      {/* Overlapping avatars — only rendered once real data is available */}
      {shown.length > 0 && (
        <View style={chipStyles.avatarStack}>
          {shown.map((u, i) => <MiniAvatar key={u.id} uri={u.avatar_url} name={u.name} index={i} />)}
        </View>
      )}
      <Text style={[chipStyles.text, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {count} ta umumiy
      </Text>
    </Pressable>
  )
}
const chipStyles = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  miniAvatar: {
    width: AVATAR_CHIP, height: AVATAR_CHIP, borderRadius: AVATAR_CHIP / 2,
    borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarImg:  { width: AVATAR_CHIP, height: AVATAR_CHIP },
  miniAvatarText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  text: { fontSize: 12 },
})

// ── Mutual Modal ──────────────────────────────────────────────────────────────

function MutualModal({
  visible, users, loading, onClose, router,
}: {
  visible: boolean; users: MutualUser[]; loading: boolean
  onClose: () => void; router: ReturnType<typeof useRouter>
}) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[mmStyles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <View style={[mmStyles.header, { borderBottomColor: c.border }]}>
          <Text style={[mmStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Umumiy aloqalar
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={mmStyles.closeBtn}>
            <X size={20} color={c.textSecondary} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={c.accentPrimary} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <View style={mmStyles.empty}>
            <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 14 }}>
              Umumiy aloqa topilmadi
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={u => String(u.id)}
            contentContainerStyle={{ paddingHorizontal: spacing.screenMargin }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onClose(); router.push(`/(screens)/profile/${item.id}` as any) }}
                style={[mmStyles.row, { borderBottomColor: c.border }]}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={mmStyles.avatar} />
                ) : (
                  <View style={[mmStyles.avatar, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: c.accentPrimary, fontFamily: typography.fontFamily.bold, fontSize: 16 }}>
                      {(item.name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.medium, fontSize: 15 }}>
                      {item.name}
                    </Text>
                    <RoleBadge accountType={item.account_type} size={14} />
                  </View>
                  {item.headline ? (
                    <Text numberOfLines={1} style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 12 }}>
                      {item.headline}
                    </Text>
                  ) : item.username ? (
                    <Text style={{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 12 }}>
                      @{item.username}
                    </Text>
                  ) : null}
                </View>
                <View style={[mmStyles.levelPill, { backgroundColor: c.bgTertiary }]}>
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
const mmStyles = StyleSheet.create({
  root:     { flex: 1 },
  header:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title:    { fontSize: 17 },
  closeBtn: { padding: spacing.xs },
  empty:    { alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl },
  row:      {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar:   { width: 44, height: 44, borderRadius: 22 },
  levelPill:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
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

// ── Teacher Info Card ─────────────────────────────────────────────────────────

function TeacherInfoCard({ td, c }: { td: TeacherProfileData; c: any }) {
  const hasExp  = (td.experience_years ?? 0) > 0
  const hasEdu  = !!td.education?.trim()
  const hasSpec = !!td.specialization?.trim()
  const hasBio  = !!td.bio?.trim()

  if (!hasExp && !hasEdu && !hasSpec && !hasBio) return null

  return (
    <View style={[tiStyles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>

      {hasBio && (
        <Text style={[tiStyles.bio, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {td.bio}
        </Text>
      )}

      {(hasSpec || hasExp) && (
        <View style={[tiStyles.row, hasBio && { marginTop: spacing.sm }]}>
          {hasSpec && (
            <View style={tiStyles.chip}>
              <Star size={13} color="#F5A623" fill="#F5A623" />
              <Text style={[tiStyles.chipText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                {td.specialization}
              </Text>
            </View>
          )}
          {hasExp && (
            <View style={tiStyles.chip}>
              <Clock size={13} color="#34C759" />
              <Text style={[tiStyles.chipText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                {td.experience_years} yil tajriba
              </Text>
            </View>
          )}
        </View>
      )}

      {hasEdu && (
        <View style={[tiStyles.eduRow, { borderTopColor: c.border }]}>
          <GraduationCap size={14} color={c.textMuted} />
          <Text style={[tiStyles.eduText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {td.education}
          </Text>
        </View>
      )}
    </View>
  )
}
const tiStyles = StyleSheet.create({
  card: {
    borderRadius: radius.cardXl, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base, gap: 0,
  },
  bio: { fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText:  { fontSize: 12 },
  eduRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  eduText: { fontSize: 12, flex: 1, lineHeight: 18 },
})

// ── Social Links ──────────────────────────────────────────────────────────────

function SocialLinks({ td, c }: { td: TeacherProfileData; c: any }) {
  const links: { icon: React.ReactNode; label: string; url: string }[] = []

  if (td.website_url)      links.push({ icon: <Globe size={15} color={c.accentPrimary} />,    label: td.website_url.replace(/^https?:\/\//, ''), url: td.website_url })
  if (td.youtube_url)      links.push({ icon: <Play size={15} color="#FF0000" fill="#FF0000" />, label: 'YouTube kanali',                            url: td.youtube_url })
  if (td.telegram_channel) links.push({ icon: <Text style={{ fontSize: 14 }}>✈️</Text>,       label: `@${td.telegram_channel}`,                  url: `https://t.me/${td.telegram_channel}` })

  if (links.length === 0) return null

  return (
    <View style={[slStyles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      {links.map((l, i) => (
        <React.Fragment key={l.url}>
          <Pressable onPress={() => Linking.openURL(l.url)} style={slStyles.row}>
            {l.icon}
            <Text
              style={[slStyles.label, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}
              numberOfLines={1}
            >
              {l.label}
            </Text>
            <ChevronRight size={14} color={c.textMuted} />
          </Pressable>
          {i < links.length - 1 && <View style={[slStyles.divider, { backgroundColor: c.border }]} />}
        </React.Fragment>
      ))}
    </View>
  )
}
const slStyles = StyleSheet.create({
  card: {
    borderRadius: radius.cardXl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.base, paddingVertical: 13,
  },
  label:   { flex: 1, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.base },
})

// ── Teacher Course Card ───────────────────────────────────────────────────────

function TeacherCourseCard({ course, c, onPress }: { course: Course; c: any; onPress: () => void }) {
  const stars = course.rating ? course.rating.toFixed(1) : null
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        tcStyles.card,
        { backgroundColor: c.bgSecondary, borderColor: c.border },
        pressed && { opacity: 0.88 },
      ]}
    >
      {course.thumbnail_url ? (
        <Image source={{ uri: course.thumbnail_url }} style={tcStyles.thumb} resizeMode="cover" />
      ) : (
        <View style={[tcStyles.thumb, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
          <BookOpen size={22} color={c.textMuted} />
        </View>
      )}
      <View style={tcStyles.info}>
        <Text style={[tcStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={2}>
          {course.title}
        </Text>
        <View style={tcStyles.meta}>
          <View style={tcStyles.metaItem}>
            <Users size={11} color={c.textMuted} />
            <Text style={[tcStyles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {course.enrolled_count ?? 0}
            </Text>
          </View>
          {stars && (
            <View style={tcStyles.metaItem}>
              <Star size={11} color="#F5A623" fill="#F5A623" />
              <Text style={[tcStyles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {stars}
              </Text>
            </View>
          )}
          <View style={[tcStyles.pricePill, {
            backgroundColor: course.is_paid ? 'rgba(245,166,35,0.12)' : 'rgba(52,199,89,0.12)',
          }]}>
            <Text style={[tcStyles.priceText, {
              color: course.is_paid ? '#F5A623' : '#34C759',
              fontFamily: typography.fontFamily.semibold,
            }]}>
              {course.is_paid ? `${(course.price ?? 0).toLocaleString('uz-UZ')} so'm` : 'Bepul'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}
const tcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', gap: 0,
  },
  thumb: { width: 80, height: 80 },
  info:  { flex: 1, paddingHorizontal: spacing.sm, paddingVertical: 10, justifyContent: 'space-between' },
  title: { fontSize: 13, lineHeight: 18 },
  meta:  { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  pricePill: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  priceText: { fontSize: 11 },
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ color: c.textPrimary, fontFamily: typography.fontFamily.medium, fontSize: 15 }}>
                      {item.full_name}
                    </Text>
                    <RoleBadge role={item.role} accountType={item.account_type} size={14} />
                  </View>
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
  const [followModal,        setFollowModal]        = useState<{ type: 'followers' | 'following'; visible: boolean }>({
    type: 'followers', visible: false,
  })
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)

  // Teacher-specific state
  const [teacherData,       setTeacherData]       = useState<TeacherProfileData | null>(null)
  const [teacherCourses,    setTeacherCourses]     = useState<Course[]>([])
  const [teacherLoading,    setTeacherLoading]     = useState(false)

  // Mutual connections
  const [mutualUsers,        setMutualUsers]        = useState<MutualUser[]>([])
  const [mutualLoading,      setMutualLoading]      = useState(false)
  const [showMutualModal,    setShowMutualModal]     = useState(false)

  const profileData = cache[Number(id)]?.data ?? null
  const isOwn       = !!authUser && authUser.telegram_id === Number(id)
  const isTeacher   = profileData?.account_type === 'teacher' || profileData?.role === 'teacher' || profileData?.account_type === 'admin' || profileData?.role === 'admin'

  // Redirect to own profile tab instead of showing public view
  useEffect(() => {
    if (isOwn) router.replace('/(tabs)/profile' as any)
  }, [isOwn])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try { await loadPublicProfile(id) }
    catch (e: any) { setError(e?.message ?? 'Profil yuklanmadi') }
    finally { setLoading(false) }
  }, [id, loadPublicProfile])

  useEffect(() => { load() }, [load])

  // Fetch mutual connections for the chip avatars
  useEffect(() => {
    if (!profileData || !id || isOwn) return
    const count = profileData.mutual_connections ?? 0
    if (count <= 0) return
    setMutualLoading(true)
    profileApi.getMutualConnections(Number(id))
      .then(res => setMutualUsers(res.users ?? []))
      .catch(() => {})
      .finally(() => setMutualLoading(false))
  }, [profileData?.telegram_id, isOwn, id])

  // When profile loads and it's a teacher, fetch teacher-specific data in parallel
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleFollow = useCallback(async () => {
    if (!profileData) return
    if (profileData.is_following) {
      setShowUnfollowConfirm(true)
      return
    }
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

  const handleShare = useCallback(async () => {
    if (!profileData) return
    shareProfile({
      telegramId: profileData.telegram_id,
      firstName:  profileData.first_name,
      level:      profileData.level,
      streakDays: profileData.streak_days,
    })
  }, [profileData])

  if (isOwn) return null

  if (loading && !profileData) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <ActivityIndicator color={c.accentPrimary} size="large" style={{ marginTop: 80 }} />
      </View>
    )
  }

  if (error || !profileData) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 15, textAlign: 'center', color: c.textSecondary, fontFamily: typography.fontFamily.regular }}>
            {error ?? 'Foydalanuvchi topilmadi'}
          </Text>
          <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: c.accentPrimary }]}>
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily.medium }}>Qayta urinish</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const p        = profileData as ProfileData
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
        <View style={[
          styles.header,
          { borderBottomColor: c.border },
          isTeacher && { borderBottomColor: 'rgba(52,199,89,0.2)', borderBottomWidth: 1 },
        ]}>
          <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}>
              <ArrowLeft size={18} color={c.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleShare} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}>
              <Share2 size={18} color={c.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.identity}>
            {/* Avatar + name/handle row */}
            <View style={styles.identityRow}>
              <AvatarWithXPRing uri={p.photo_url} name={p.first_name} xpPercent={p.xp_percent ?? 0} size={72} />

              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]} numberOfLines={1}>
                    {p.first_name}
                  </Text>
                  <RoleBadge role={p.role ?? null} accountType={p.account_type} size={18} />
                </View>
                {p.username && (
                  <Text style={[styles.handle, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                    @{p.username}
                  </Text>
                )}
              </View>
            </View>

            {/* Headline / bio */}
            {p.headline && (
              <Text style={[styles.bio, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={2}>
                {p.headline}
              </Text>
            )}
            {!isTeacher && p.bio && !p.headline && (
              <Text style={[styles.bio, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={2}>
                {p.bio}
              </Text>
            )}

            <MutualChip
              count={p.mutual_connections ?? 0}
              users={mutualUsers}
              onPress={() => setShowMutualModal(true)}
              c={c}
            />

            {/* Follower counts */}
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
              <FollowButton isFollowing={p.is_following} loading={followLoading} onPress={handleFollow} c={c} />
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

          {/* ── TROPHY ROOM ── */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.bold }]}>
            TROFEY XONASI
          </Text>
          <HeroLevelCard
            variant="public"
            level={p.level ?? 1}
            xp={p.total_xp ?? 0}
            nextXp={p.next_level_xp ?? 100}
            xpPercent={p.xp_percent ?? 0}
            rank={null}
            streakDays={p.streak_days ?? 0}
            longestStreak={p.longest_streak ?? 0}
            totalFocusMinutes={Math.round((p.focus_hours ?? 0) * 60)}
          />

          {/* ── TEACHER-SPECIFIC SECTIONS ── */}
          {isTeacher && (
            <>
              {/* Detailed bio / experience / education */}
              {teacherData && <TeacherInfoCard td={teacherData} c={c} />}

              {/* Social links */}
              {teacherData && <SocialLinks td={teacherData} c={c} />}

              {/* Teacher's courses */}
              <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.bold }]}>
                KURSLAR
              </Text>
              {teacherLoading ? (
                <ActivityIndicator color={c.accentPrimary} style={{ marginTop: 8, marginBottom: 8 }} />
              ) : teacherCourses.length > 0 ? (
                <View style={styles.coursesList}>
                  {teacherCourses.map(course => (
                    <TeacherCourseCard
                      key={course.id}
                      course={course}
                      c={c}
                      onPress={() => router.push(`/(screens)/course/${course.id}` as any)}
                    />
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyCoursesCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                  <BookOpen size={22} color={c.textMuted} />
                  <Text style={[styles.emptyCoursesText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    Hali kurs yaratilmagan
                  </Text>
                </View>
              )}

              {/* Divider before stats */}
              <View style={[styles.divider, { backgroundColor: c.border }]} />
            </>
          )}


          {/* Completed courses (students only — teachers/admins show created courses above) */}
          {!isTeacher && topCerts.length > 0 && (
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

      <MutualModal
        visible={showMutualModal}
        users={mutualUsers}
        loading={mutualLoading}
        onClose={() => setShowMutualModal(false)}
        router={router}
      />

      {!isOwn && authUser && (
        <CompareModal
          visible={showCompare}
          onClose={() => setShowCompare(false)}
          me={{
            name:              authUser.first_name,
            photo_url:         authUser.photo_url ?? null,
            level:             authUser.level,
            total_xp:          authUser.total_xp,
            longest_streak:    focusStats?.longest_streak ?? authUser.streak_days,
            focus_hours:       focusStats?.total_focus_minutes != null
                                 ? Math.round((focusStats.total_focus_minutes / 60) * 10) / 10
                                 : (ownProfile?.focus_hours ?? 0),
            courses_completed: ownProfile?.courses_completed ?? 0,
          }}
          them={{
            name:              p.first_name,
            photo_url:         p.photo_url,
            level:             p.level,
            total_xp:          p.total_xp,
            longest_streak:    p.longest_streak ?? 0,
            focus_hours:       p.focus_hours,
            courses_completed: p.courses_completed,
          }}
        />
      )}

      <ConfirmModal
        visible={showUnfollowConfirm}
        emoji="💔"
        title="Kuzatishni to'xtatish"
        message={`${profileData?.first_name ?? ''} sahifasini kuzatishni to'xtatasiz.`}
        confirmText="To'xtatish"
        cancelText="Yo'q"
        danger
        onConfirm={doUnfollow}
        onCancel={() => setShowUnfollowConfirm(false)}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base, padding: spacing.xl },

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

  identity: {
    paddingHorizontal: 20,
    paddingTop:        16,
    gap:               10,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           14,
  },
  identityText: {
    flex: 1,
    gap:  5,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name:   { fontSize: 20, flexShrink: 1 },
  handle: { fontSize: 13 },
  bio:    { fontSize: 13, lineHeight: 19 },

  countsRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  countText:    { fontSize: 13 },
  countDivider: { width: 1, height: 14 },

  content: {
    paddingHorizontal: spacing.screenMargin,
    paddingTop:        spacing.base,
    paddingBottom:     48,
    gap:               12,
  },

  ctaRow:         { flexDirection: 'row', gap: 10 },
  compareBtn:     {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  compareBtnText: { fontSize: 14 },

  sectionLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  subLabel:     { fontSize: 14 },

  coursesList: { gap: 8 },

  emptyCoursesCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    borderRadius:   radius.md,
    borderWidth:    StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
  },
  emptyCoursesText: { fontSize: typography.size.sm },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },

  coursesCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.base, paddingVertical: 12,
  },
  courseDot:   { width: 8, height: 8, borderRadius: 4 },
  courseTitle: { fontSize: 14 },
  courseMeta:  { fontSize: 12, marginTop: 2 },
  rowDivider:  { height: StyleSheet.hairlineWidth, marginLeft: spacing.base },

  retryBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 20 },
})
