/**
 * ProfileScreenContent — full scrollable body of a profile (own or public).
 *
 * Layout (top → bottom):
 *   optional back bar  →  hero card  →  info card  →  mini stats  →
 *   level bar  →  tab bar (5 tabs)  →  tab content
 */
import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, RefreshControl,
  ActivityIndicator, StyleSheet, Pressable, Image,
  Animated, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Briefcase, GraduationCap } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { ProfileHeroCard }  from './ProfileHeader'
import { UserInfoCard }     from './UserInfoCard'
import { ProfileMiniStats } from './ProfileMiniStats'
import { SkillsSection }    from './SkillsSection'
import { CertificatesSection } from './CertificatesSection'
import { ActivityHeatmap }  from './ActivityHeatmap'
import { ActivityFeed }     from './ActivityFeed'
import { PostCard }         from '../feed/PostCard'
import { profile as profileApi, messenger } from '../../lib/api'
import { useProfileStore }  from '../../stores/profileStore'
import { typography, spacing, radius } from '../../lib/constants'
import { LEVEL_TITLES, getLevelEmoji, getLevelInfo } from '../../lib/levelTitles'
import type { ProfileData } from '../../lib/types'
import type { Post } from '../../lib/types'

type TabKey = 'umumiy' | 'postlar' | 'faollik' | 'kurslar' | 'yutuqlar'
type ConnTab = 'connections' | 'followers' | 'following'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'umumiy',   label: 'Umumiy'   },
  { key: 'postlar',  label: 'Postlar'  },
  { key: 'faollik',  label: 'Faollik'  },
  { key: 'kurslar',  label: 'Kurslar'  },
  { key: 'yutuqlar', label: 'Yutuqlar' },
]

const SCREEN_W = Dimensions.get('window').width

// Uzbek month abbreviations
const UZ_MONTHS = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
function fmtYM(ym: string | null | undefined): string {
  if (!ym) return ''
  const parts = ym.split('-')
  if (parts.length >= 2) {
    const m = parseInt(parts[1], 10) - 1
    return `${UZ_MONTHS[m] ?? ''} ${parts[0]}`
  }
  return parts[0]
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  data:             ProfileData
  isOwnProfile:     boolean
  onRefresh:        () => Promise<void>
  refreshing:       boolean
  onEditPress?:     () => void
  onBack?:          () => void
  backTitle?:       string
  onScroll?:        (e: NativeSyntheticEvent<NativeScrollEvent>) => void
  contentInsetTop?: number
  reveal?:          () => void
}

// ── Experience card ───────────────────────────────────────────────────────────

function ExperienceEntry({ exp }: { exp: any }) {
  const { c } = useTheme()
  const initial = (exp.company ?? '?').slice(0, 1).toUpperCase()
  const dateFrom = fmtYM(exp.start_date)
  const dateTo   = exp.end_date ? fmtYM(exp.end_date) : 'Hozir'
  return (
    <View style={entryStyles.row}>
      <View style={[entryStyles.icon, { backgroundColor: c.bgTertiary }]}>
        <Briefcase size={14} color={c.brand} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[entryStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {exp.title ?? ''}
        </Text>
        <Text style={[entryStyles.sub, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
          {exp.company ?? ''}
        </Text>
        {(dateFrom || dateTo) && (
          <Text style={[entryStyles.dates, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {dateFrom} — {dateTo}
          </Text>
        )}
        {exp.description ? (
          <Text style={[entryStyles.desc, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {exp.description}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function EducationEntry({ edu }: { edu: any }) {
  const { c } = useTheme()
  const yearFrom = edu.start_year ?? ''
  const yearTo   = edu.end_year   ?? 'Hozir'
  const degField = [edu.degree, edu.field_of_study].filter(Boolean).join(' · ')
  return (
    <View style={entryStyles.row}>
      <View style={[entryStyles.icon, { backgroundColor: c.bgTertiary }]}>
        <GraduationCap size={14} color="#60a5fa" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[entryStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {edu.school ?? ''}
        </Text>
        {degField ? (
          <Text style={[entryStyles.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            {degField}
          </Text>
        ) : null}
        {(yearFrom || yearTo) && (
          <Text style={[entryStyles.dates, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {yearFrom} — {yearTo}
          </Text>
        )}
      </View>
    </View>
  )
}

const entryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap:           spacing.sm,
    paddingVertical: spacing.sm,
  },
  icon: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  title: { fontSize: typography.size.base },
  sub:   { fontSize: typography.size.sm  },
  dates: { fontSize: typography.size.xs  },
  desc:  { fontSize: typography.size.sm, lineHeight: 18, marginTop: 2 },
})

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <View style={secStyles.row}>
      <Text style={[secStyles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {title}
      </Text>
      {action}
    </View>
  )
}
const secStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  title: { fontSize: typography.size.base },
})

// ── Main component ─────────────────────────────────────────────────────────────

export function ProfileScreenContent({
  data, isOwnProfile, onRefresh, refreshing, onEditPress,
  onBack, backTitle,
  onScroll, contentInsetTop = 0, reveal,
}: Props) {
  const { c }  = useTheme()
  const router = useRouter()
  const { ownProfile } = useProfileStore()

  // Level of the logged-in viewer (for cross-profile comparison)
  const myLevel = isOwnProfile ? data.level : (ownProfile?.level ?? 0)

  const [activeTab,    setActiveTab]    = useState<TabKey>('umumiy')
  const [posts,        setPosts]        = useState<Post[]>([])
  const [postsPage,    setPostsPage]    = useState(0)
  const [postsMore,    setPostsMore]    = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsLoaded,  setPostsLoaded]  = useState(false)

  // Tab indicator animation
  const tabWidth     = SCREEN_W / TABS.length
  const indicatorX   = useRef(new Animated.Value(0)).current
  const activeTabIdx = TABS.findIndex(t => t.key === activeTab)

  useEffect(() => {
    Animated.timing(indicatorX, {
      toValue:         activeTabIdx * tabWidth,
      duration:        220,
      useNativeDriver: true,
    }).start()
  }, [activeTabIdx])

  // Swipe to switch tabs
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-20, 20])
    .onEnd(e => {
      'worklet'
      if (e.translationX < -40 && activeTabIdx < TABS.length - 1)
        runOnJS(handleTabPress)(TABS[activeTabIdx + 1].key)
      else if (e.translationX > 40 && activeTabIdx > 0)
        runOnJS(handleTabPress)(TABS[activeTabIdx - 1].key)
    })

  async function loadPosts(page = 1) {
    if (postsLoading) return
    setPostsLoading(true)
    try {
      const res   = await profileApi.getUserPosts(data.telegram_id, page)
      const items = res.items ?? (res as any).posts ?? []
      if (page === 1) setPosts(items)
      else            setPosts(prev => [...prev, ...items])
      setPostsPage(page)
      setPostsMore(res.has_more ?? false)
      setPostsLoaded(true)
    } catch {}
    finally { setPostsLoading(false) }
  }

  function handleTabPress(key: TabKey) {
    setActiveTab(key)
    if (key === 'postlar' && !postsLoaded) loadPosts(1)
  }

  function openConnectionsPage(tab: ConnTab) {
    router.push({
      pathname: '/(screens)/connections',
      params: {
        targetId:     String(data.telegram_id),
        initialTab:   tab,
        isOwnProfile: String(isOwnProfile),
        name:         data.first_name ?? data.username ?? '',
      },
    } as any)
  }

  // ── Umumiy tab ──────────────────────────────────────────────────────────────
  const experiences: any[] = data.experiences ?? []
  const education:   any[] = data.education   ?? []

  const UmumiyContent = (
    <View style={styles.tabContent}>
      {/* Experience */}
      {experiences.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <SectionHeader title="Tajriba" />
          {experiences.map((exp, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
              <ExperienceEntry exp={exp} />
            </View>
          ))}
        </View>
      )}

      {/* Education */}
      {education.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <SectionHeader title="Ta'lim" />
          {education.map((edu, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
              <EducationEntry edu={edu} />
            </View>
          ))}
        </View>
      )}

      {/* Become teacher banner — own student profile */}
      {isOwnProfile && data.account_type === 'student' && (
        <Pressable
          onPress={() => router.push('/(screens)/settings' as any)}
          style={[styles.teacherBanner, { borderColor: 'rgba(232,121,47,0.2)' }]}
        >
          <Text style={styles.teacherEmoji}>🎓</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.teacherTitle, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
              Bilimingizni ulashmoqchimisiz?
            </Text>
            <Text style={[styles.teacherSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              O'qituvchi bo'ling · 70% komissiya
            </Text>
          </View>
          <ChevronRight size={16} color={c.brand} style={{ opacity: 0.6 }} />
        </Pressable>
      )}

      {/* Skills — SkillsSection renders its own "Ko'nikmalar" title internally */}
      {((data.skills ?? []).length > 0 || isOwnProfile) && (
        <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <SkillsSection skills={data.skills ?? []} isOwnProfile={isOwnProfile} />
        </View>
      )}

      {/* Certificates — CertificatesSection renders its own "Sertifikatlar" title internally */}
      {(data.certificates ?? []).length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <CertificatesSection certificates={data.certificates} />
        </View>
      )}

      {/* Empty state if nothing at all */}
      {experiences.length === 0 && education.length === 0 &&
       (data.skills ?? []).length === 0 && (data.certificates ?? []).length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Ma'lumot qo'shilmagan
          </Text>
        </View>
      )}
    </View>
  )

  // ── Postlar tab ─────────────────────────────────────────────────────────────
  const PostlarContent = (
    <View style={{ paddingTop: spacing.sm }}>
      {postsLoading && posts.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.brand} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Hali postlar yo'q
          </Text>
        </View>
      ) : (
        <View>
          {posts.map(post => <PostCard key={post.id} post={post} />)}
          {postsMore && (
            <Pressable
              onPress={() => loadPosts(postsPage + 1)}
              disabled={postsLoading}
              style={[styles.loadMoreBtn, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
            >
              {postsLoading
                ? <ActivityIndicator color={c.brand} size="small" />
                : <Text style={[styles.loadMoreText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                    Ko'proq yuklash
                  </Text>
              }
            </Pressable>
          )}
        </View>
      )}
    </View>
  )

  // ── Faollik tab — heatmap + paginated activity feed ──────────────────────────
  const FaollikContent = (
    <View style={styles.tabContent}>
      {/* GitHub-style heatmap */}
      <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <ActivityHeatmap telegramId={data.telegram_id} profileFocusHours={data.focus_hours} />
      </View>

      {/* Activity feed card — own profile fetches paginated, public uses recent_activity */}
      <View style={[styles.sectionCard, styles.feedCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={{ paddingHorizontal: spacing.base }}>
          <SectionHeader title="Faollik tarixi" />
        </View>
        <ActivityFeed
          isOwnProfile={isOwnProfile}
          initialItems={data.recent_activity ?? []}
        />
      </View>
    </View>
  )

  // ── Kurslar tab ─────────────────────────────────────────────────────────────
  const KurslarContent = (
    <View style={styles.tabContent}>
      {(data.active_courses ?? []).length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          {data.active_courses.map((ac: any, i: number) => {
            const course = ac.courses ?? ac
            return (
              <Pressable
                key={i}
                onPress={() => router.push(`/(screens)/course/${course.id}` as any)}
                style={[styles.courseRow, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
              >
                {course.thumbnail_url ? (
                  <Image source={{ uri: course.thumbnail_url }} style={styles.courseThumbnail} resizeMode="cover" />
                ) : (
                  <View style={[styles.courseThumbnail, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 20 }}>📚</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={[styles.courseTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                    {course.title}
                  </Text>
                  <Text style={[styles.courseMeta, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    {course.is_paid ? `${course.price ?? ''} so'm` : 'Bepul'}
                  </Text>
                </View>
                <ChevronRight size={16} color={c.textMuted} />
              </Pressable>
            )
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {isOwnProfile ? "Hali kurs yo'q" : "Faol kurslar yo'q"}
          </Text>
        </View>
      )}
    </View>
  )

  // ── Yutuqlar tab — 29-level badge grid ─────────────────────────────────────
  const nextLevel = LEVEL_TITLES.find(l => l.level === data.level + 1)
  const YutuqlarContent = (
    <View style={styles.tabContent}>
      {/* Current level card */}
      <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={styles.currentLevelRow}>
          <Text style={styles.currentLevelEmoji}>{getLevelEmoji(data.level)}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.currentLevelTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Daraja {data.level} — {getLevelInfo(data.level).title}
            </Text>
            <Text style={[styles.currentLevelXP, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {data.total_xp.toLocaleString()} XP
            </Text>
            <View style={[styles.xpTrack, { backgroundColor: c.bgTertiary }]}>
              <View style={[styles.xpFill, { width: `${Math.min(100, data.xp_percent)}%` as any }]} />
            </View>
            {nextLevel && (
              <Text style={[styles.xpHint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Keyingi: {nextLevel.title} · {(data.next_level_xp - data.total_xp).toLocaleString()} XP qoldi
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 29-level badge grid (3 columns) */}
      <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <SectionHeader title="Darajalar" />
        <View style={styles.badgeGrid}>
          {LEVEL_TITLES.map(lvl => {
            const isProfileLevel = lvl.level === data.level
            const isMyLevel      = !isOwnProfile && lvl.level === myLevel
            const isUnlocked     = lvl.level < data.level
            const isLocked       = lvl.level > data.level
            const emoji          = getLevelEmoji(lvl.level)
            return (
              <View
                key={lvl.level}
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: isProfileLevel
                      ? c.brandSubtle
                      : isMyLevel
                        ? 'rgba(96,165,250,0.12)'
                        : isUnlocked
                          ? c.bgTertiary
                          : c.bgPrimary,
                    borderColor: isProfileLevel
                      ? 'rgba(232,121,47,0.4)'
                      : isMyLevel
                        ? 'rgba(96,165,250,0.4)'
                        : c.border,
                    opacity: isLocked && !isMyLevel ? 0.4 : 1,
                  },
                ]}
              >
                {/* Profile owner's current level marker */}
                {isProfileLevel && (
                  <View style={[styles.badgeCurrent, { backgroundColor: c.brand }]}>
                    <Text style={styles.badgeCurrentText}>{isOwnProfile ? 'SIZ' : 'U'}</Text>
                  </View>
                )}
                {/* Viewer's level marker (cross-profile comparison) */}
                {isMyLevel && !isProfileLevel && (
                  <View style={[styles.badgeCurrent, { backgroundColor: '#60a5fa' }]}>
                    <Text style={styles.badgeCurrentText}>SIZ</Text>
                  </View>
                )}
                {isUnlocked && !isMyLevel && (
                  <View style={[styles.badgeDone, { backgroundColor: c.bgElevated }]}>
                    <Text style={{ fontSize: 8 }}>✓</Text>
                  </View>
                )}
                <Text style={[styles.badgeEmoji, isLocked && !isMyLevel && styles.badgeEmojiGray]}>
                  {emoji}
                </Text>
                <Text style={[styles.badgeLevel, {
                  color:      isProfileLevel ? c.brand : isMyLevel ? '#60a5fa' : c.textMuted,
                  fontFamily: typography.fontFamily.bold,
                }]}>
                  {lvl.level}
                </Text>
                <Text style={[styles.badgeTitle, {
                  color:      (isLocked && !isMyLevel) ? c.textMuted : c.textPrimary,
                  fontFamily: typography.fontFamily.medium,
                }]} numberOfLines={1}>
                  {lvl.title}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )

  const tabContent: Record<TabKey, React.ReactNode> = {
    umumiy:   UmumiyContent,
    postlar:  PostlarContent,
    faollik:  FaollikContent,
    kurslar:  KurslarContent,
    yutuqlar: YutuqlarContent,
  }

  // ── Tab bar ─────────────────────────────────────────────────────────────────
  const TabBar = (
    <View style={[styles.tabBar, { borderBottomColor: c.border, backgroundColor: c.bgPrimary }]}>
      {TABS.map(t => {
        const active = activeTab === t.key
        return (
          <Pressable key={t.key} onPress={() => handleTabPress(t.key)} style={styles.tabBtn}>
            <Text style={[
              styles.tabLabel,
              { color: active ? c.brand : c.textMuted, fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular },
            ]}>
              {t.label}
            </Text>
          </Pressable>
        )
      })}
      <Animated.View style={[styles.tabIndicator, { width: tabWidth, backgroundColor: c.brand, transform: [{ translateX: indicatorX }] }]} />
    </View>
  )

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => {
          onScroll?.(e)
          if (e.nativeEvent.contentOffset.y <= 8) reveal?.()
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.brand}
            colors={[c.brand]}
            progressViewOffset={contentInsetTop}
          />
        }
        contentContainerStyle={{ paddingTop: contentInsetTop, paddingBottom: 100 }}
      >
        {/* Optional transparent back bar (public profile) */}
        {onBack && (
          <Pressable onPress={onBack} style={styles.backBar} hitSlop={8}>
            <ChevronLeft size={22} color={c.brand} />
            {backTitle && (
              <Text style={[styles.backTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
                {backTitle}
              </Text>
            )}
          </Pressable>
        )}

        {/* Hero card */}
        <ProfileHeroCard data={data} />

        {/* Info card */}
        <UserInfoCard
          data={data}
          isOwnProfile={isOwnProfile}
          onEditPress={onEditPress}
          onMessagePress={async () => {
            try {
              const conv = await messenger.getOrCreate(data.telegram_id)
              router.push({
                pathname: '/(screens)/conversation/[id]',
                params: {
                  id:        String(conv.id),
                  name:      data.first_name ?? '',
                  photo_url: data.photo_url ?? '',
                  other_id:  String(data.telegram_id),
                },
              })
            } catch { /* not connected — button is disabled in that state */ }
          }}
          onConnectionsPress={openConnectionsPage}
        />

        {/* Mini stats + level bar */}
        <ProfileMiniStats data={data} />

        {/* Tab bar */}
        <View style={{ marginTop: spacing.md }}>
          {TabBar}
        </View>

        {/* Tab content */}
        <GestureDetector gesture={swipeGesture}>
          <View style={styles.tabContentWrap}>
            {tabContent[activeTab]}
          </View>
        </GestureDetector>
      </ScrollView>

    </>
  )
}

const styles = StyleSheet.create({
  // Back bar
  backBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs,
    gap:               2,
  },
  backTitle: {
    fontSize: typography.size.md,
    flex:     1,
  },

  // Tab bar
  tabBar: {
    flexDirection:     'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    position:          'relative',
  },
  tabBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 11,
  },
  tabLabel: {
    fontSize: typography.size.xs,
  },
  tabIndicator: {
    position:     'absolute',
    bottom:       0,
    left:         0,
    height:       2,
    borderRadius: 1,
  },

  // Tab content wrapper
  tabContentWrap: {
    minHeight: 300,
  },
  tabContent: {
    gap:           spacing.sm,
    paddingTop:    spacing.sm,
    paddingBottom: spacing.sm,
  },

  // Section card
  sectionCard: {
    marginHorizontal:  spacing.base,
    borderRadius:      14,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
  },
  // Feed card overrides horizontal padding so rows manage their own spacing
  feedCard: {
    paddingHorizontal: 0,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.sm,
    overflow:          'hidden',
  },
  divider: {
    height:           StyleSheet.hairlineWidth,
    marginVertical:   2,
  },

  // Become teacher banner
  teacherBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    marginHorizontal:  spacing.base,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.xl,
    borderWidth:       1,
    backgroundColor:   'rgba(232,121,47,0.05)',
  },
  teacherEmoji:  { fontSize: 20 },
  teacherTitle:  { fontSize: typography.size.sm },
  teacherSub:    { fontSize: 11, marginTop: 2 },

  // Empty states
  emptyState: {
    alignItems:      'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize:  typography.size.sm,
    textAlign: 'center',
  },
  emptyMini: {
    paddingVertical: spacing.sm,
  },
  emptyMiniText: {
    fontSize: typography.size.sm,
  },

  // Loading
  loadingWrap: {
    alignItems:      'center',
    paddingVertical: spacing['2xl'],
  },

  // Load more
  loadMoreBtn: {
    marginHorizontal: spacing.base,
    marginVertical:   spacing.sm,
    paddingVertical:  spacing.md,
    borderRadius:     radius['2xl'],
    borderWidth:      1,
    alignItems:       'center',
    justifyContent:   'center',
  },
  loadMoreText: {
    fontSize: typography.size.base,
  },

  // Course row
  courseRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    marginHorizontal:  spacing.base,
    padding:           spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
  },
  courseThumbnail: {
    width:        52,
    height:       52,
    borderRadius: radius.lg,
    flexShrink:   0,
  },
  courseTitle: {
    fontSize:   typography.size.sm,
    lineHeight: 18,
  },
  courseMeta: {
    fontSize:  11,
    marginTop: 2,
  },

  // Yutuqlar XP card
  xpCardRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-around',
    marginBottom:   spacing.sm,
  },
  xpStatGroup: {
    alignItems: 'center',
    gap:        2,
  },
  xpDivider: {
    width:  1,
    height: 32,
  },
  xpBig: {
    fontSize: typography.size.xl,
  },
  xpBigLabel: {
    fontSize: 11,
  },
  xpTrack: {
    height:       6,
    borderRadius: 3,
    overflow:     'hidden',
  },
  xpFill: {
    height:          6,
    borderRadius:    3,
    backgroundColor: '#e8792f',
  },
  xpHint: {
    fontSize:  11,
    marginTop: spacing.xs,
  },

  // Yutuqlar — current level card
  currentLevelRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  currentLevelEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  currentLevelTitle: {
    fontSize: typography.size.base,
  },
  currentLevelXP: {
    fontSize: typography.size.sm,
  },

  // Badge grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    marginTop:     spacing.xs,
  },
  badgeCard: {
    width:             '30%',
    flexGrow:          1,
    alignItems:        'center',
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius:      radius.xl,
    borderWidth:       1,
    gap:               2,
    position:          'relative',
    overflow:          'hidden',
  },
  badgeCurrent: {
    position:          'absolute',
    top:               0,
    right:             0,
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderBottomLeftRadius: 8,
  },
  badgeCurrentText: {
    color:      '#fff',
    fontSize:   8,
    fontWeight: '700',
  },
  badgeDone: {
    position:   'absolute',
    top:        4,
    right:      4,
    width:      14,
    height:     14,
    borderRadius: 7,
    alignItems:     'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize:   20,
    lineHeight: 28,
  },
  badgeEmojiGray: {
    opacity: 0.4,
  },
  badgeLevel: {
    fontSize: 11,
  },
  badgeTitle: {
    fontSize:  10,
    textAlign: 'center',
  },
})
