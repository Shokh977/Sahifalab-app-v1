import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, RefreshControl, Alert, Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  Users, BookOpen, TrendingUp, Wallet,
  GraduationCap, Eye, EyeOff, ChevronRight,
  Award, Star, CheckCircle, RefreshCw,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { request } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeacherProfile {
  bio: string | null
  specialization: string | null
  experience_years: number | null
  profile_complete: boolean
  website_url: string | null
  youtube_url: string | null
  telegram_channel: string | null
}

interface CoursePerf {
  course_id: number
  title: string
  lesson_count: number
  enrolled_students: number
  completed_lessons: number
  completion_rate: number
  unique_viewers: number
  total_views: number
  conversion_pct: number
}

interface TopStudent {
  student_id: number
  first_name: string
  username: string | null
  total_xp: number
  level: number
  completed_lessons: number
}

interface Analytics {
  courses_count: number
  published_courses: number
  paid_courses: number
  total_students: number
  completed_orders: number
  total_revenue_uzs: number
  course_performance: CoursePerf[]
  top_students: TopStudent[]
}

const PLATFORM_FEE = 0.30

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtUzs(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + ' UZS'
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon, label, value, sub, accent, colors,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent: string
  colors: ReturnType<typeof useTheme>['c']
}) {
  return (
    <View style={[tile.wrap, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
      <View style={[tile.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Icon size={18} color={accent} strokeWidth={1.8} />
      </View>
      <Text style={[tile.value, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {value}
      </Text>
      <Text style={[tile.label, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
      {sub ? (
        <Text style={[tile.sub, { color: accent, fontFamily: typography.fontFamily.medium }]}>
          {sub}
        </Text>
      ) : null}
    </View>
  )
}

// ── Course row ────────────────────────────────────────────────────────────────

function CourseRow({
  item, colors, onPress,
}: {
  item: CoursePerf
  colors: ReturnType<typeof useTheme>['c']
  onPress: () => void
}) {
  const pct = Math.min(100, Math.round(item.completion_rate))
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        row.wrap,
        { backgroundColor: pressed ? colors.bgTertiary : colors.bgSecondary, borderColor: colors.border },
      ]}
    >
      <View style={[row.iconBox, { backgroundColor: `${colors.brand}18` }]}>
        <BookOpen size={16} color={colors.brand} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[row.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[row.meta, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {item.enrolled_students} talaba · {item.lesson_count} dars
        </Text>
        {item.unique_viewers > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Eye size={11} color={colors.textMuted} />
            <Text style={[row.meta, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {item.unique_viewers} kishi ko'rdi · {item.conversion_pct}% xarid qildi
            </Text>
          </View>
        )}
        {/* Progress bar */}
        <View style={[row.barBg, { backgroundColor: colors.bgTertiary, marginTop: 6 }]}>
          <View style={[row.barFill, { width: `${pct}%` as any, backgroundColor: colors.brand }]} />
        </View>
      </View>
      <Text style={[row.pct, { color: colors.brand, fontFamily: typography.fontFamily.bold }]}>
        {pct}%
      </Text>
    </Pressable>
  )
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({
  item, rank, colors,
}: {
  item: TopStudent
  rank: number
  colors: ReturnType<typeof useTheme>['c']
}) {
  const rankColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : colors.textMuted
  const initials  = item.first_name.slice(0, 2).toUpperCase()
  return (
    <View style={[srow.wrap, { borderBottomColor: colors.border }]}>
      <Text style={[srow.rank, { color: rankColor, fontFamily: typography.fontFamily.bold }]}>
        {rank}
      </Text>
      <View style={[srow.avatar, { backgroundColor: colors.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.brand, fontSize: 12, fontFamily: typography.fontFamily.bold }}>
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[srow.name, { color: colors.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {item.first_name}
        </Text>
        <Text style={[srow.meta, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
          Lv.{item.level} · {item.total_xp.toLocaleString()} XP
        </Text>
      </View>
      <View style={srow.badge}>
        <CheckCircle size={11} color={colors.brand} />
        <Text style={[srow.badgeText, { color: colors.brand, fontFamily: typography.fontFamily.medium }]}>
          {item.completed_lessons}
        </Text>
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TeacherDashboardScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const { user } = useAuthStore()
  const insets   = useSafeAreaInsets()

  const [profile,     setProfile]     = useState<TeacherProfile | null>(null)
  const [analytics,   setAnalytics]   = useState<Analytics | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [prof, anal] = await Promise.all([
        request<TeacherProfile>('/api/teacher/profile', { auth: true }),
        request<Analytics>('/api/teacher/analytics',   { auth: true }),
      ])
      setProfile(prof)
      setAnalytics(anal)
    } catch (e: any) {
      setError(e.message ?? 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  const onRefresh = useCallback(() => { setRefreshing(true); load() }, [load])

  const netRevenue  = analytics ? analytics.total_revenue_uzs * (1 - PLATFORM_FEE) : 0
  const profilePct  = profile ? [
    !!user?.first_name, !!profile.bio, !!user?.photo_url,
    !!profile.specialization,
    !!(profile.website_url || profile.youtube_url || profile.telegram_channel),
  ].filter(Boolean).length * 20 : 0

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={c.brand} size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, justifyContent: 'center', alignItems: 'center', gap: spacing.base }]}>
        <Text style={{ color: c.error, fontFamily: typography.fontFamily.regular, textAlign: 'center', paddingHorizontal: spacing.xl }}>
          {error}
        </Text>
        <Pressable
          onPress={() => { setLoading(true); load() }}
          style={[styles.retryBtn, { backgroundColor: c.brand }]}
        >
          <RefreshCw size={14} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }}>
            Qayta urinish
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.bgSecondary }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} colors={[c.brand]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile banner ─────────────────────────────────────────────── */}
      <View style={[styles.banner, { backgroundColor: c.bgSecondary, borderBottomColor: c.border }]}>
        <View style={styles.bannerLeft}>
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: c.brand, fontSize: 20, fontFamily: typography.fontFamily.bold }}>
                {user?.first_name?.slice(0, 2).toUpperCase() ?? 'O'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]} numberOfLines={1}>
                {user?.first_name}
              </Text>
              <View style={[styles.teacherBadge, { backgroundColor: `${c.brand}18` }]}>
                <GraduationCap size={11} color={c.brand} />
                <Text style={[styles.teacherBadgeText, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
                  O'qituvchi
                </Text>
              </View>
            </View>
            {profile?.specialization ? (
              <Text style={[styles.spec, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
                {profile.specialization}
              </Text>
            ) : null}
            {/* Profile strength */}
            <View style={styles.strengthRow}>
              <View style={[styles.strengthBg, { backgroundColor: c.bgTertiary }]}>
                <View style={[styles.strengthFill, { width: `${profilePct}%` as any, backgroundColor: profilePct >= 80 ? c.success : c.brand }]} />
              </View>
              <Text style={[styles.strengthPct, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {profilePct}%
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(screens)/settings' as any)}
          style={({ pressed }) => [styles.settingsBtn, { backgroundColor: c.bgTertiary, opacity: pressed ? 0.7 : 1 }]}
        >
          <ChevronRight size={16} color={c.textMuted} />
        </Pressable>
      </View>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <StatTile
          icon={Users}
          label="Talabalar"
          value={fmt(analytics?.total_students ?? 0)}
          accent="#60a5fa"
          colors={c}
        />
        <StatTile
          icon={BookOpen}
          label="Kurslar"
          value={String(analytics?.courses_count ?? 0)}
          sub={`${analytics?.published_courses ?? 0} nashr`}
          accent={c.brand}
          colors={c}
        />
        <StatTile
          icon={TrendingUp}
          label="To'lovlar"
          value={String(analytics?.completed_orders ?? 0)}
          accent="#4ade80"
          colors={c}
        />
        <Pressable
          onPress={() => router.push('/(screens)/teacher-earnings' as any)}
          style={{ flex: 1 }}
        >
          <StatTile
            icon={Wallet}
            label="Daromad"
            value={netRevenue >= 1000 ? fmtUzs(netRevenue) : '—'}
            sub={netRevenue > 0 ? "Batafsil →" : undefined}
            accent="#f59e0b"
            colors={c}
          />
        </Pressable>
      </View>

      {/* ── Website note ──────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => Linking.openURL('https://sahifalab.uz')}
        style={({ pressed }) => [styles.webNote, { backgroundColor: pressed ? c.bgTertiary : c.bgSecondary, borderColor: c.border }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.webNoteTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            sahifalab.uz — kurs yaratish
          </Text>
          <Text style={[styles.webNoteSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Kurs yaratish, darslar qo'shish, to'liq statistika va daromad boshqaruvi saytda yanada qulay
          </Text>
        </View>
        <ChevronRight size={16} color={c.accentPrimary} />
      </Pressable>

      {/* ── Courses performance ─────────────────────────────────────────── */}
      {(analytics?.course_performance?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Kurslar
          </Text>
          {analytics!.course_performance.slice(0, 5).map(cp => (
            <CourseRow
              key={cp.course_id}
              item={cp}
              colors={c}
              onPress={() => router.push({ pathname: '/(screens)/course/[id]' as any, params: { id: String(cp.course_id) } })}
            />
          ))}
        </View>
      )}

      {/* ── Top students ────────────────────────────────────────────────── */}
      {(analytics?.top_students?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Faol talabalar
          </Text>
          <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            {analytics!.top_students.slice(0, 8).map((s, i) => (
              <StudentRow key={s.student_id} item={s} rank={i + 1} colors={c} />
            ))}
          </View>
        </View>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {(analytics?.courses_count ?? 0) === 0 && (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: `${c.brand}15` }]}>
            <GraduationCap size={32} color={c.brand} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Birinchi kursingizni yarating
          </Text>
          <Text style={[styles.emptyBody, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Kurslar va darslar yaratib, talabalar bilan ulashing
          </Text>
          <Pressable
            onPress={() => router.push('/(screens)/courses' as any)}
            style={[styles.ctaBtn, { backgroundColor: c.brand }]}
          >
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }}>
              Kurslarni ko'rish
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  bannerLeft: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    minWidth:      0,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, flexShrink: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    flexWrap:      'wrap',
  },
  name: {
    fontSize: typography.size.md,
  },
  teacherBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.full,
  },
  teacherBadgeText: {
    fontSize: 10,
  },
  spec: {
    fontSize:  typography.size.sm,
    marginTop: 2,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    marginTop:     6,
  },
  strengthBg: {
    flex: 1, height: 3, borderRadius: 2, overflow: 'hidden',
  },
  strengthFill: {
    height: 3, borderRadius: 2,
  },
  strengthPct: {
    fontSize: 10,
  },
  settingsBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  statsGrid: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
    gap:               spacing.sm,
  },

  section: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.lg,
    gap:               spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.base,
  },
  card: {
    borderRadius: radius['2xl'],
    borderWidth:  1,
    overflow:     'hidden',
  },

  retryBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.full,
  },

  emptyWrap: {
    alignItems:    'center',
    paddingTop:    spacing['3xl'],
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    gap:           spacing.base,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: {
    fontSize:  typography.size.lg,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize:   typography.size.sm,
    textAlign:  'center',
    lineHeight: 20,
  },
  ctaBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm + 2,
    borderRadius:      radius.full,
    marginTop:         spacing.sm,
  },

  webNote: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  spacing.base,
    marginTop:         spacing.base,
    padding:           spacing.base,
    borderRadius:      radius['2xl'],
    borderWidth:       1,
    gap:               spacing.sm,
  },
  webNoteTitle: { fontSize: typography.size.sm },
  webNoteSub:   { fontSize: typography.size.xs, lineHeight: 17, marginTop: 2 },
})

const tile = StyleSheet.create({
  wrap: {
    width:          '47.5%',
    borderRadius:   radius['2xl'],
    borderWidth:    1,
    padding:        spacing.base,
    gap:            4,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: typography.size.xl,
  },
  label: {
    fontSize: typography.size.xs,
  },
  sub: {
    fontSize: 10,
  },
})

const row = StyleSheet.create({
  wrap: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    padding:        spacing.sm + 2,
    borderRadius:   radius.xl,
    borderWidth:    1,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: {
    fontSize: typography.size.sm,
  },
  meta: {
    fontSize:  10,
    marginTop: 2,
  },
  barBg: {
    height: 3, borderRadius: 2, overflow: 'hidden',
  },
  barFill: {
    height: 3, borderRadius: 2,
  },
  pct: {
    fontSize:  typography.size.sm,
    flexShrink: 0,
  },
})

const srow = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    width:     20,
    fontSize:  typography.size.sm,
    textAlign: 'center',
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16, flexShrink: 0,
  },
  name: {
    fontSize: typography.size.sm,
    flex:     1,
  },
  meta: {
    fontSize:  10,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  badgeText: {
    fontSize: 11,
  },
})
