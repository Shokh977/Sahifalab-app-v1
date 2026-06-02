import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  Pressable, Image, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Bell } from 'phosphor-react-native'
import { ArrowRight, X } from 'lucide-react-native'

import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius, getLevelTier } from '../../lib/constants'
import { hero, type HeroContent } from '../../lib/api'
import { SkeletonBlock } from '../../components/dashboard/SkeletonBlock'
import { UnifiedBanner } from '../../components/dashboard/UnifiedBanner'
import { ContextualActionRow } from '../../components/dashboard/ContextualActionRow'
import { CourseHCard } from '../../components/dashboard/CourseHCard'
import { CourseVCard } from '../../components/dashboard/CourseVCard'
import { LeaderboardCard } from '../../components/dashboard/LeaderboardCard'

// ── Top bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  const { c }       = useTheme()
  const router      = useRouter()
  const insets      = useSafeAreaInsets()
  const user        = useAuthStore(s => s.user)
  const unreadCount = useNotificationStore(s => s.unreadCount)
  const level       = user?.level ?? 1
  const tier        = getLevelTier(level)

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: 'transparent' }]}>
      {/* Left: brand name */}
      <Text style={[styles.brandName, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
        SAHIFALAB
      </Text>

      {/* Right: bell + avatar */}
      <View style={styles.topRight}>
        <Pressable onPress={() => router.push('/(tabs)/notifications' as any)} style={styles.bellBtn}>
          <View style={{ position: 'relative' }}>
            <Bell size={24} color={c.textPrimary} weight="regular" />
            {unreadCount > 0 && (
              <View style={[bellBadgeStyle.badge, { backgroundColor: '#FF453A' }]}>
                {unreadCount < 10 && (
                  <Text style={bellBadgeStyle.text}>{unreadCount}</Text>
                )}
              </View>
            )}
          </View>
        </Pressable>

        <Pressable onPress={() => router.push('/(tabs)/profile' as any)}>
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={[styles.avatar, { borderColor: tier.border }]} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.accentPrimary }]}>
              <Text style={[styles.avatarInitials, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>
                {user?.first_name?.slice(0, 1).toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  )
}

// ── Hero card (streak + level + XP + daily goal) ─────────────────────────────

function BannerSection() {
  const user    = useAuthStore(s => s.user)
  const loading = useDashboardStore(s => s.loading)
  const data    = useDashboardStore(s => s.data)

  if (loading && !data) {
    return (
      <View style={{ paddingHorizontal: spacing.screenMargin }}>
        <SkeletonBlock height={190} borderRadius={20} />
      </View>
    )
  }
  if (!data) return null

  // focusStats.streak_days may be 0 from stale cache while authStore has the real value.
  // Prefer focusStats when > 0 (it's the live source), fall back to user.streak_days.
  const mergedStats = {
    ...data.focusStats,
    streak_days: data.focusStats.streak_days > 0
      ? data.focusStats.streak_days
      : (user?.streak_days ?? 0),
    daily_goal: data.focusStats.daily_goal > 0
      ? data.focusStats.daily_goal
      : (user?.daily_goal_minutes ?? 20),
  }

  return (
    <UnifiedBanner
      stats={mergedStats}
      level={user?.level    ?? 1}
      totalXP={user?.total_xp ?? 0}
    />
  )
}

// ── Skeleton screens for each section ────────────────────────────────────────

function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <View style={{ paddingHorizontal: spacing.screenMargin, gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={16} width={i === 0 ? '60%' : '100%'} />
      ))}
    </View>
  )
}

// ── Hero announcement banner (admin-managed) ──────────────────────────────────

function HeroBanner() {
  const { c }  = useTheme()
  const [content,   setContent]   = useState<HeroContent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => { hero.get().then(setContent) }, [])

  if (!content || dismissed) return null

  const handlePress = () => {
    if (content.cta_link) Linking.openURL(content.cta_link).catch(() => {})
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        heroBannerStyles.card,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      {content.image_url && (
        <Image source={{ uri: content.image_url }} style={heroBannerStyles.image} />
      )}
      <View style={heroBannerStyles.body}>
        <Text style={[heroBannerStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={2}>
          {content.title}
        </Text>
        {content.subtitle && (
          <Text style={[heroBannerStyles.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
            {content.subtitle}
          </Text>
        )}
        {content.cta_text && (
          <View style={heroBannerStyles.ctaRow}>
            <Text style={[heroBannerStyles.cta, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
              {content.cta_text}
            </Text>
            <ArrowRight size={12} color={c.accentPrimary} strokeWidth={2} />
          </View>
        )}
      </View>
      <Pressable onPress={() => setDismissed(true)} hitSlop={10} style={heroBannerStyles.dismiss}>
        <X size={14} color={c.textDisabled} strokeWidth={2} />
      </Pressable>
    </Pressable>
  )
}

const heroBannerStyles = StyleSheet.create({
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   14,
    borderWidth:    StyleSheet.hairlineWidth,
    overflow:       'hidden',
    gap:            12,
    paddingVertical:   12,
    paddingHorizontal: 14,
  },
  image: {
    width:        44,
    height:       44,
    borderRadius: 10,
    flexShrink:   0,
  },
  body:   { flex: 1, gap: 3 },
  title:  { fontSize: 13, lineHeight: 18 },
  sub:    { fontSize: 11 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cta:    { fontSize: 11 },
  dismiss: {
    padding:  4,
    flexShrink: 0,
  },
})

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function HomeTab() {
  const { c }      = useTheme()
  const router     = useRouter()
  const { fetch, refresh, data, loading, refreshing } = useDashboardStore()

  useEffect(() => { fetch() }, [])

  const onRefresh = useCallback(() => { refresh() }, [])

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <TopBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accentPrimary}
            colors={[c.accentPrimary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Unified streak + level banner */}
        <BannerSection />

        <View style={styles.gap} />

        {/* Contextual action chips */}
        {data && <ContextualActionRow data={data} />}

        {/* Hero announcement (admin-managed, dismissible) */}
        <View style={{ paddingHorizontal: spacing.screenMargin }}>
          <HeroBanner />
        </View>

        <View style={styles.gap} />

        {/* My Courses */}
        {(() => {
          const enrolled = data?.enrolled ?? []
          if (loading && !data) {
            return (
              <>
                <SectionHeader title="Mening kurslarim" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                  {[0, 1].map(i => <SkeletonBlock key={i} width={200} height={170} borderRadius={radius.card} style={{ flexShrink: 0 }} />)}
                </ScrollView>
              </>
            )
          }
          if (!data || enrolled.length === 0) return null
          return (
            <>
              <SectionHeader
                title="Mening kurslarim"
                actionLabel="Barchasi"
                onAction={() => router.push('/(tabs)/courses' as any)}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
                snapToInterval={212}
                decelerationRate="fast"
              >
                {enrolled.map(e => e.courses && (
                  <CourseHCard key={e.course_id} course={e.courses} progress={e.progress} />
                ))}
              </ScrollView>
            </>
          )
        })()}

        {data?.enrolled.length ? <View style={styles.gap} /> : null}

        {/* Recommended */}
        {(() => {
          const rec = data?.recommended ?? []
          if (loading && !data) {
            return (
              <>
                <SectionHeader title="Tavsiya etilgan" />
                <SectionSkeleton rows={3} />
              </>
            )
          }
          if (!data || rec.length === 0) return null
          return (
            <>
              <SectionHeader
                title="Tavsiya etilgan"
                actionLabel="Ko'proq"
                onAction={() => router.push('/(tabs)/courses' as any)}
              />
              <View style={[styles.vList, { paddingHorizontal: spacing.screenMargin }]}>
                {rec.map(course => <CourseVCard key={course.id} course={course} />)}
              </View>
            </>
          )
        })()}

        <View style={styles.gap} />

        {/* Leaderboard */}
        {(() => {
          if (loading && !data) {
            return (
              <View style={{ paddingHorizontal: spacing.screenMargin }}>
                <SkeletonBlock height={220} borderRadius={radius.cardLg} />
              </View>
            )
          }
          if (!data) return null
          return (
            <View style={{ paddingHorizontal: spacing.screenMargin }}>
              <LeaderboardCard entries={data.leaderboard} myRank={data.myLeaderRank} />
            </View>
          )
        })()}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </View>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title:        string
  actionLabel?: string
  onAction?:   () => void
}) {
  const { c } = useTheme()
  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: spacing.screenMargin }]}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {title}
      </Text>
      {actionLabel && (
        <Pressable onPress={onAction}>
          <Text style={[styles.sectionAction, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:        { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenMargin,
    paddingBottom:     spacing.sm,
    gap:               spacing.sm,
  },
  brandName: { fontSize: 20, letterSpacing: 0.5 },
  topRight:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  avatar: {
    width:        40,
    height:       40,
    borderRadius: 20,
    borderWidth:  2,
    overflow:     'hidden',
  },
  avatarFallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 15, color: '#fff' },
  bellBtn:        { padding: 4 },

  section: { gap: 8 },
  gap:     { height: spacing.lg },

  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
  },
  sectionTitle:  { fontSize: typography.size.base },
  sectionAction: { fontSize: typography.size.sm },

  hScroll: { paddingHorizontal: spacing.screenMargin, gap: spacing.sm },
  vList:   { gap: spacing.sm },
})

const bellBadgeStyle = StyleSheet.create({
  badge: {
    position:     'absolute',
    top:          -4,
    right:        -4,
    minWidth:     8,
    height:       8,
    borderRadius: 4,
    alignItems:   'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  text: {
    color:      '#fff',
    fontSize:   8,
    fontWeight: '700',
    lineHeight: 8,
  },
})
