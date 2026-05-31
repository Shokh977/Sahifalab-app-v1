import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Modal, FlatList,
  Share, Image, Animated, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Settings, Share2, ChevronRight, X, GraduationCap } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useProfileStore } from '../../stores/profileStore'
import { useAuthStore } from '../../stores/authStore'
import {
  focusStats,
  profile as profileApi,
  leaderboard,
  type SocialUser,
} from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { HeroLevelCard } from '../../components/profile/HeroLevelCard'
import { typography, spacing, radius, getLevelTier } from '../../lib/constants'
import { LEVEL_TITLES, getLevelInfo, getLevelEmoji } from '../../lib/levelTitles'
import type { ProfileData } from '../../lib/types'

const { width: SCREEN_W } = Dimensions.get('window')
const GRID_COLS = 5
const GRID_GAP  = 6
const CELL_W    = Math.floor((SCREEN_W - 40 - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS)

// ── Level Cell ────────────────────────────────────────────────────────────────

function LevelCell({ level, state }: { level: typeof LEVEL_TITLES[0]; state: 'unlocked' | 'current' | 'locked' }) {
  const { c } = useTheme()
  const emoji     = getLevelEmoji(level.level)
  const tier      = getLevelTier(level.level)
  const isLocked  = state === 'locked'
  const isCurrent = state === 'current'

  // Pulse animation for current cell
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!isCurrent) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 750, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [isCurrent])

  const cellBg     = isLocked ? c.bgSecondary : tier.bg
  const cellBorder = isLocked
    ? c.border
    : isCurrent ? c.accentPrimary : tier.border + 'AA'

  return (
    <Animated.View
      style={[
        styles.cell,
        {
          width:           CELL_W,
          backgroundColor: cellBg,
          borderColor:     cellBorder,
          borderWidth:     isCurrent ? 2 : StyleSheet.hairlineWidth,
          transform:       [{ scale: pulse }],
        },
      ]}
    >
      {/* Top-right badge */}
      {isLocked ? (
        <Text style={styles.cellLock}>🔒</Text>
      ) : (
        <View style={[styles.cellNumBadge, { backgroundColor: isCurrent ? c.accentPrimary : tier.border + 'CC' }]}>
          <Text style={[styles.cellNumText, { fontFamily: typography.fontFamily.bold }]}>
            {level.level}
          </Text>
        </View>
      )}

      {/* Emoji */}
      <Text style={[styles.cellEmoji, isLocked && styles.cellLocked]}>
        {emoji}
      </Text>

      {/* Title */}
      <Text
        style={[
          styles.cellTitle,
          {
            color:      isLocked ? c.textDisabled : c.textPrimary,
            fontFamily: typography.fontFamily.bold,
          },
        ]}
        numberOfLines={1}
      >
        {level.title}
      </Text>
    </Animated.View>
  )
}

// ── NavRow ────────────────────────────────────────────────────────────────────

function NavRow({
  emoji, title, sub, onPress, showDivider,
}: {
  emoji: string; title: string; sub: string; onPress: () => void; showDivider?: boolean
}) {
  const { c } = useTheme()
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.navRow, pressed && { backgroundColor: c.bgTertiary }]}
      >
        {/* Icon tile */}
        <View style={[styles.navIcon, { backgroundColor: c.brandSubtle, borderColor: c.accentPrimary + '44' }]}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        {/* Text */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {title}
          </Text>
          <Text style={[styles.navSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {sub}
          </Text>
        </View>
        <ChevronRight size={16} color={c.textDisabled} />
      </Pressable>
      {showDivider && <View style={[styles.navDivider, { backgroundColor: c.border }]} />}
    </>
  )
}

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
              {type === 'followers' ? "Hali kuzatuvchi yo'q" : "Hali hech kimni kuzatmayapsiz"}
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

// ── Teacher Banner ────────────────────────────────────────────────────────────

function TeacherBanner({
  role, router, c,
}: {
  role: string
  router: ReturnType<typeof useRouter>
  c: any
}) {
  const isTeacher = role === 'teacher' || role === 'admin'

  return (
    <Pressable
      onPress={() => router.push(
        isTeacher ? '/(screens)/teacher-dashboard' : '/(screens)/become-teacher' as any
      )}
      style={({ pressed }) => [
        teacherS.card,
        {
          backgroundColor: c.bgSecondary,
          borderColor:     isTeacher ? '#4ade8040' : 'rgba(232,121,47,0.35)',
          opacity:         pressed ? 0.88 : 1,
        },
      ]}
    >
      {/* Left: icon tile */}
      <View style={[
        teacherS.iconTile,
        { backgroundColor: isTeacher ? 'rgba(74,222,128,0.12)' : 'rgba(232,121,47,0.12)' },
      ]}>
        <GraduationCap size={22} color={isTeacher ? '#4ade80' : '#e8792f'} />
      </View>

      {/* Text */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[teacherS.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {isTeacher ? "O'qituvchi paneli" : "O'qituvchi bo'lish"}
        </Text>
        <Text style={[teacherS.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {isTeacher ? 'Dashboard · Kurslar · Hamyon' : '70% komissiya · Ariza topshiring'}
        </Text>
      </View>

      <ChevronRight size={16} color={isTeacher ? '#4ade80' : '#e8792f'} />
    </Pressable>
  )
}

const teacherS = StyleSheet.create({
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    borderRadius:   14,
    borderWidth:    1,
    paddingHorizontal: 14,
    paddingVertical:   13,
  },
  iconTile: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15 },
  sub:   { fontSize: 12 },
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileTab() {
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()
  const router   = useRouter()
  const { ownProfile, loadOwnProfile } = useProfileStore()
  const authUser = useAuthStore(s => s.user)

  const [streak,             setStreak]             = useState(0)
  const [totalFocusMinutes,  setTotalFocusMinutes]  = useState(0)
  const [rank,               setRank]               = useState<number | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [followModal, setFollowModal] = useState<{ type: 'followers' | 'following'; visible: boolean }>({
    type: 'followers', visible: false,
  })

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      await Promise.all([
        loadOwnProfile(),
        focusStats.get().then(s => {
          setStreak(s.streak_days ?? 0)
          setTotalFocusMinutes(s.total_focus_minutes ?? 0)
        }),
        leaderboard.weekly('week').then(r => setRank(r.my_rank ?? null)).catch(() => {}),
      ])
    } catch {}
    setLoading(false)
  }, [loadOwnProfile])

  useEffect(() => { load() }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }, [load])

  const handleShare = useCallback(async () => {
    const handle = (ownProfile as ProfileData)?.username ?? String(authUser?.telegram_id ?? '')
    await Share.share({
      message: `SAHIFALAB platformasidagi mening profilim: https://sahifalab.uz/u/${handle}`,
      url: `https://sahifalab.uz/u/${handle}`,
    })
  }, [ownProfile, authUser])

  if (loading && !ownProfile) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <ActivityIndicator color={c.accentPrimary} size="large" style={{ marginTop: 80 }} />
      </View>
    )
  }

  const p = ownProfile as ProfileData

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.accentPrimary} />
        }
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>

          {/* Top bar: Share + Settings */}
          <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleShare} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}>
              <Share2 size={18} color={c.textSecondary} />
            </Pressable>
            <Pressable onPress={() => router.push('/(screens)/settings' as any)} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.bgTertiary }]}>
              <Settings size={18} color={c.textSecondary} />
            </Pressable>
          </View>

          {/* Identity row */}
          <View style={styles.identityRow}>
            <Avatar uri={p?.photo_url} name={p?.first_name} size={64} borderWidth={0} />
            <View style={styles.identityRight}>
              <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                {p?.first_name ?? ''}
              </Text>
              {p?.username && (
                <Text style={[styles.handle, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                  @{p.username}
                </Text>
              )}
              {/* Follower / following counts */}
              <View style={styles.countsRow}>
                <Pressable onPress={() => setFollowModal({ type: 'followers', visible: true })}>
                  <Text style={[styles.countText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                    <Text style={{ fontFamily: typography.fontFamily.semibold }}>{p?.followers_count ?? 0}</Text>
                    {' '}kuzatuvchi
                  </Text>
                </Pressable>
                <View style={[styles.countDivider, { backgroundColor: c.border }]} />
                <Pressable onPress={() => setFollowModal({ type: 'following', visible: true })}>
                  <Text style={[styles.countText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                    <Text style={{ fontFamily: typography.fontFamily.semibold }}>{p?.following_count ?? 0}</Text>
                    {' '}kuzatilmoqda
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Edit button */}
          <Pressable
            onPress={() => router.push('/(screens)/edit-profile' as any)}
            style={[styles.editBtn, { borderColor: c.border }]}
          >
            <Text style={[styles.editBtnText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Profilni tahrirlash
            </Text>
          </Pressable>

          {/* Hero level card */}
          <HeroLevelCard
            variant="private"
            level={p?.level ?? 1}
            xp={p?.total_xp ?? 0}
            nextXp={p?.next_level_xp ?? 100}
            xpPercent={p?.xp_percent ?? 0}
            rank={rank}
            totalFocusMinutes={totalFocusMinutes}
          />

          {/* Navigation card */}
          <View style={[styles.navCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <NavRow
              emoji="📊"
              title="Statistika va faollik"
              sub="O'qish vaqti, kunlar, tendensiya"
              onPress={() => router.push('/(screens)/streak-detail' as any)}
              showDivider
            />
            <NavRow
              emoji="🔥"
              title="Seriya va inventar"
              sub={`Joriy: ${streak} kun seriya`}
              onPress={() => router.push('/(screens)/streak-detail' as any)}
            />
          </View>

          {/* Teacher banner */}
          <TeacherBanner role={authUser?.role ?? ''} router={router} c={c} />

          {/* Achievements section header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.bold }]}>
              YUTUQLAR
            </Text>
            <Pressable hitSlop={8}>
              <Text style={[styles.sectionAll, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                Hammasi →
              </Text>
            </Pressable>
          </View>

          {/* 29-level grid */}
          <View style={styles.levelGrid}>
            {LEVEL_TITLES.map(lvl => {
              const userLevel = p?.level ?? 1
              const state: 'unlocked' | 'current' | 'locked' =
                lvl.level < userLevel  ? 'unlocked' :
                lvl.level === userLevel ? 'current'  : 'locked'
              return <LevelCell key={lvl.level} level={lvl} state={state} />
            })}
          </View>
        </View>
      </ScrollView>

      <FollowListModal
        visible={followModal.visible}
        type={followModal.type}
        userId={authUser?.telegram_id ?? 0}
        onClose={() => setFollowModal(m => ({ ...m, visible: false }))}
        router={router}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

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

  // Identity row
  identityRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               14,
    paddingHorizontal: spacing.screenMargin,
    paddingTop:        12,
  },
  identityRight: { flex: 1, gap: 4 },
  name:          { fontSize: 20 },
  handle:        { fontSize: 13 },
  countsRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  countText:     { fontSize: 13 },
  countDivider:  { width: 1, height: 14 },

  // Content area
  content: {
    paddingHorizontal: spacing.screenMargin,
    paddingTop:        spacing.base,
    paddingBottom:     48,
    gap:               12,
  },

  // Edit button
  editBtn: {
    paddingVertical: 10,
    borderRadius:    10,
    borderWidth:     1,
    alignItems:      'center',
  },
  editBtnText: { fontSize: 14 },

  // Nav card
  navCard: {
    borderRadius: 16,
    borderWidth:  StyleSheet.hairlineWidth,
    overflow:     'hidden',
  },
  navRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   12,
    gap:               12,
  },
  navIcon: {
    width: 44, height: 44, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle:   { fontSize: 15 },
  navSub:     { fontSize: 11 },
  navDivider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },

  // Section header
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      4,
  },
  sectionLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  sectionAll:   { fontSize: 12 },

  // Level grid
  levelGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           GRID_GAP,
  },
  cell: {
    borderRadius:   10,
    paddingTop:     10,
    paddingBottom:  8,
    paddingHorizontal: 4,
    alignItems:     'center',
    gap:            4,
    position:       'relative',
    minHeight:      76,
    justifyContent: 'center',
  },
  cellLock:     { position: 'absolute', top: 4, right: 4, fontSize: 10 },
  cellNumBadge: {
    position: 'absolute', top: -1, right: -1,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6,
  },
  cellNumText: { fontSize: 8, color: '#fff' },
  cellEmoji:   { fontSize: 18 },
  cellLocked:  { opacity: 0.4 },
  cellTitle:   { fontSize: 9, textAlign: 'center' },
})
