import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Heart, SlidersHorizontal } from 'lucide-react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { useReduceMotion } from '../../hooks/useReduceMotion'
import { useAuthStore } from '../../stores/authStore'
import { useCourseStore, getCachedCourseList, setCachedCourseList } from '../../stores/courseStore'
import { courses as coursesApi, type Course } from '../../lib/api'
import { typography, spacing } from '../../lib/constants'
import { getPremiumTheme } from '../../lib/premiumTheme'
import { coursesStrings as s } from '../../lib/coursesStrings'
import { useWishlist } from '../../hooks/useWishlist'
import { SearchField } from '../../components/kurslar/SearchField'
import { FeaturedCarousel } from '../../components/kurslar/FeaturedCarousel'
import { CategoryChips } from '../../components/kurslar/CategoryChips'
import { SortTabs, type SortKey } from '../../components/kurslar/SortTabs'
import { CourseCard } from '../../components/kurslar/CourseCard'
import { CoursesSkeleton, CoursesEmptyState, CoursesErrorState } from '../../components/kurslar/States'
import {
  FilterSheet, EMPTY_FILTERS, activeFilterCount, courseDurationBucket,
  type CourseFilters,
} from '../../components/kurslar/FilterSheet'

const PAGE_SIZE = 10

function sortToParams(key: SortKey): { ordering?: string; is_paid?: boolean } {
  switch (key) {
    case 'popular': return { ordering: '-enrolled_count' }
    case 'newest':  return { ordering: '-created_at' }
    case 'free':    return { is_paid: false }
    case 'top':     return { ordering: '-rating' }
  }
}

function makeQueryKey(sort: SortKey, cat: string | null, filters: CourseFilters) {
  return `v2|${sort}|${cat ?? ''}|${filters.price}|${filters.level}`
}

function applyClientFilters(list: Course[], sortKey: SortKey, filters: CourseFilters): Course[] {
  let out = list
  if (sortKey === 'free') out = out.filter(c => !c.is_paid)
  if (filters.duration) out = out.filter(c => courseDurationBucket(c.total_duration_minutes ?? 0) === filters.duration)
  if (filters.language) out = out.filter(c => c.language === filters.language)
  return out
}

// Featured slides — derived client-side from the first 5 thumbnailed items
// of the default "popular, no filters" list (no separate API call).
let _featuredCache: Course[] = []

const SKELETON_MARKER = '__loading__'

export default function CoursesTab() {
  const { theme } = useTheme()
  const t = getPremiumTheme(theme)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const authUser = useAuthStore(st => st.user)
  const reduceMotion = useReduceMotion()
  const { categories, loadCategories } = useCourseStore()
  const { ids: savedIds, toggle: toggleSaved } = useWishlist()

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('popular')
  const [filters, setFilters] = useState<CourseFilters>(EMPTY_FILTERS)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [favoritesMode, setFavoritesMode] = useState(false)

  const [courseList, setCourseList] = useState<Course[]>(() => getCachedCourseList(makeQueryKey('popular', null, EMPTY_FILTERS))?.courses ?? [])
  const [total, setTotal] = useState<number>(() => getCachedCourseList(makeQueryKey('popular', null, EMPTY_FILTERS))?.total ?? 0)
  const [loading, setLoading] = useState(() => getCachedCourseList(makeQueryKey('popular', null, EMPTY_FILTERS)) === null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [favoritesList, setFavoritesList] = useState<Course[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  const [featuredSlides, setFeaturedSlides] = useState<Course[]>(_featuredCache)

  const pageRef = useRef(0)

  useEffect(() => { loadCategories() }, [])

  // Derive featured slides from the default (unfiltered, popular) list.
  useEffect(() => {
    if (_featuredCache.length > 0 || sortKey !== 'popular' || selectedCat || activeFilterCount(filters) > 0) return
    if (courseList.length === 0) return
    const slides = courseList.filter(co => !!co.thumbnail_url).slice(0, 5)
    if (slides.length > 0) { _featuredCache = slides; setFeaturedSlides(slides) }
  }, [courseList, sortKey, selectedCat, filters])

  // Main fetch — cache-aware (server-side facets only: sort/category/price/level).
  useEffect(() => {
    if (favoritesMode) return
    const key = makeQueryKey(sortKey, selectedCat, filters)
    const cached = getCachedCourseList(key)
    if (cached) {
      setCourseList(cached.courses)
      setTotal(cached.total)
      setLoading(false)
      setLoadError(false)
      pageRef.current = 1
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(false)
    pageRef.current = 0
    coursesApi.list({
      ...sortToParams(sortKey),
      ...(selectedCat ? { category: selectedCat } : {}),
      ...(filters.price ? { is_paid: filters.price === 'paid' } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      limit: PAGE_SIZE,
      offset: 0,
    }).then(res => {
      if (cancelled) return
      setCourseList(res.courses)
      setTotal(res.total)
      setCachedCourseList(key, res.courses, res.total)
      pageRef.current = 1
    }).catch(() => { if (!cancelled) setLoadError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedCat, sortKey, filters, favoritesMode])

  const fetchMore = useCallback(async () => {
    if (favoritesMode || loadingMore || courseList.length >= total) return
    setLoadingMore(true)
    try {
      const res = await coursesApi.list({
        ...sortToParams(sortKey),
        ...(selectedCat ? { category: selectedCat } : {}),
        ...(filters.price ? { is_paid: filters.price === 'paid' } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        limit: PAGE_SIZE,
        offset: pageRef.current * PAGE_SIZE,
      })
      setCourseList(prev => [...prev, ...res.courses])
      setTotal(res.total)
      pageRef.current += 1
    } catch {}
    finally { setLoadingMore(false) }
  }, [favoritesMode, loadingMore, courseList.length, total, selectedCat, sortKey, filters])

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true)
    try {
      const ids = Array.from(savedIds)
      const results = await Promise.allSettled(ids.map(id => coursesApi.get(id)))
      setFavoritesList(results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<Course>).value))
    } catch {}
    setFavoritesLoading(false)
  }, [savedIds])

  useEffect(() => { if (favoritesMode) loadFavorites() }, [favoritesMode, loadFavorites])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (favoritesMode) {
      await loadFavorites()
      setRefreshing(false)
      return
    }
    pageRef.current = 0
    try {
      const res = await coursesApi.list({
        ...sortToParams(sortKey),
        ...(selectedCat ? { category: selectedCat } : {}),
        ...(filters.price ? { is_paid: filters.price === 'paid' } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        limit: PAGE_SIZE,
        offset: 0,
      })
      setCourseList(res.courses)
      setTotal(res.total)
      setCachedCourseList(makeQueryKey(sortKey, selectedCat, filters), res.courses, res.total)
      pageRef.current = 1
      setLoadError(false)
    } catch { setLoadError(true) }
    finally { setRefreshing(false) }
  }, [favoritesMode, loadFavorites, selectedCat, sortKey, filters])

  const handleCoursePress = useCallback((id: number) => {
    router.push(`/(screens)/course/${id}` as any)
  }, [router])

  const availableLanguages = useMemo(
    () => Array.from(new Set(courseList.map(c => c.language).filter(Boolean))) as string[],
    [courseList],
  )

  const visibleList = useMemo(
    () => favoritesMode ? favoritesList : applyClientFilters(courseList, sortKey, filters),
    [favoritesMode, favoritesList, courseList, sortKey, filters],
  )

  const isLoadingCurrent = favoritesMode ? favoritesLoading : loading
  const filterCount = activeFilterCount(filters)
  const listKey = `${favoritesMode ? 'fav' : `${sortKey}-${selectedCat}-${filters.price}-${filters.duration}-${filters.level}-${filters.language}`}`

  // Scroll back to top when the filter/sort/category selection changes —
  // WITHOUT remounting the FlatList (that used to be done via a `key` on
  // the wrapping view, which also remounted ListHeaderComponent — the
  // carousel restarting/refading on every filter tap was that remount,
  // not an intentional "reload the whole page" behavior).
  const flatListRef = useRef<FlatList<Course>>(null)
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [listKey])

  const renderItem = useCallback(({ item }: { item: Course }) => (
    <Animated.View layout={reduceMotion ? undefined : LinearTransition.duration(250)} style={{ paddingHorizontal: 16 }}>
      <CourseCard
        course={item}
        t={t}
        isSaved={savedIds.has(item.id)}
        onPress={() => handleCoursePress(item.id)}
        onToggleSave={() => toggleSaved(item.id)}
      />
    </Animated.View>
  ), [t, savedIds, handleCoursePress, toggleSaved, reduceMotion])

  let body: React.ReactNode
  if (isLoadingCurrent) {
    body = <CoursesSkeleton t={t} reduceMotion={reduceMotion} />
  } else if (loadError && !favoritesMode) {
    body = <CoursesErrorState t={t} onRetry={onRefresh} />
  } else if (visibleList.length === 0) {
    body = favoritesMode
      ? <CoursesEmptyState t={t} title={s.emptyFavoritesTitle} hint={s.emptyFavoritesHint} />
      : <CoursesEmptyState
          t={t}
          title={s.emptyTitle}
          ctaLabel={filterCount > 0 || selectedCat ? s.emptyClearFilters : undefined}
          onCta={() => { setFilters(EMPTY_FILTERS); setSelectedCat(null) }}
        />
  } else {
    body = (
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={visibleList}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          !favoritesMode ? (
            <>
              {/* Carousel/chips/sort-tabs live HERE (inside the FlatList's
                  own scrollable content), not as fixed siblings above it —
                  otherwise they never scroll away and permanently eat
                  vertical space, leaving only 1-2 course cards visible. */}
              <View style={{ marginTop: 14 }}>
                <FeaturedCarousel slides={featuredSlides} t={t} themeKey={theme} onPress={handleCoursePress} reduceMotion={reduceMotion} />
              </View>
              <View style={{ marginTop: 14 }}>
                <CategoryChips categories={categories} active={selectedCat} onChange={setSelectedCat} t={t} />
              </View>
              <View style={{ marginTop: 10 }}>
                <SortTabs active={sortKey} onChange={setSortKey} t={t} reduceMotion={reduceMotion} />
              </View>
              <View style={[styles.resultRow, { marginTop: 8 }]}>
                <Text style={[styles.resultEyebrow, { color: t.eyebrow }]}>{s.coursesCount(total)}</Text>
                <Pressable onPress={() => setFilterSheetOpen(true)} style={styles.sortBtn} hitSlop={8}>
                  <SlidersHorizontal size={13} color={t.accentText} strokeWidth={2.2} />
                  <Text style={[styles.sortCta, { color: t.accentText }]}>
                    {s.sortCta}{filterCount > 0 ? ` (${filterCount})` : ''}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null
        }
        contentContainerStyle={{ paddingTop: favoritesMode ? 14 : 0, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        onEndReached={favoritesMode ? undefined : fetchMore}
        onEndReachedThreshold={0.3}
        removeClippedSubviews
        windowSize={10}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />
        }
      />
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Header — scrolls away with content, not fixed/collapsing */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.brandEyebrow, { color: t.eyebrow }]}>{s.brandEyebrow}</Text>
            <Text style={[styles.screenTitle, { color: t.textPrimary }]}>{s.screenTitle}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setFavoritesMode(v => !v)}
              style={[
                styles.favBtn,
                { borderColor: favoritesMode ? t.accent : t.hairline, backgroundColor: favoritesMode ? t.accentSoft : 'transparent' },
              ]}
              hitSlop={4}
            >
              <Heart size={17} color={favoritesMode ? t.accentText : t.textSecondary} fill={favoritesMode ? t.accentText : 'transparent'} strokeWidth={1.8} />
            </Pressable>
            <HeaderAvatar t={t} themeKey={theme} onPress={() => router.push('/(tabs)/profile' as any)} name={authUser?.first_name} photoUrl={authUser?.photo_url} />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <SearchField t={t} onPress={() => router.push('/(screens)/search' as any)} />
        </View>
      </View>

      {favoritesMode && (
        <View style={styles.favModeBar}>
          <Text style={[styles.favModeTitle, { color: t.textPrimary }]}>{s.favoritesTitle}</Text>
          <Pressable onPress={() => setFavoritesMode(false)} hitSlop={8}>
            <Text style={[styles.favModeExit, { color: t.accentText }]}>{s.exitFavorites}</Text>
          </Pressable>
        </View>
      )}

      <View style={{ flex: 1, marginTop: favoritesMode ? 0 : 8 }}>
        {body}
      </View>

      <FilterSheet
        visible={filterSheetOpen}
        filters={filters}
        availableLanguages={availableLanguages}
        t={t}
        onApply={(f) => { setFilters(f); setFilterSheetOpen(false) }}
        onClose={() => setFilterSheetOpen(false)}
      />
    </View>
  )
}

// ── Header avatar (spec-specific — light: solid disc; dark: gold ring) ──────

function HeaderAvatar({ t, themeKey, onPress, name, photoUrl }: {
  t: any; themeKey: 'light' | 'dark'; onPress: () => void; name?: string; photoUrl?: string | null
}) {
  const initial = (name ?? '?').slice(0, 1).toUpperCase()
  if (themeKey === 'dark') {
    return (
      <Pressable onPress={onPress} hitSlop={4}>
        <LinearGradient colors={t.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
          <View style={styles.avatarDiscDark}>
            <Text style={styles.avatarInitialDark}>{initial}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    )
  }
  return (
    <Pressable onPress={onPress} hitSlop={4} style={styles.avatarDiscLight}>
      <Text style={styles.avatarInitialLight}>{initial}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingHorizontal: 16, paddingBottom: 2 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandEyebrow: { fontSize: 10, fontFamily: typography.fontFamily.extrabold, letterSpacing: 1.3, textTransform: 'uppercase' },
  screenTitle: { fontSize: 27, fontFamily: typography.fontFamily.extrabold, letterSpacing: -0.6, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  favBtn: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },

  avatarRing: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', padding: 1.5,
  },
  avatarDiscDark: {
    width: '100%', height: '100%', borderRadius: 17,
    backgroundColor: '#0F0D0B', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitialDark: { color: '#F9C97A', fontSize: 15, fontFamily: typography.fontFamily.bold },
  avatarDiscLight: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1C1917', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitialLight: { color: '#FBBF5C', fontSize: 15, fontFamily: typography.fontFamily.bold },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  resultEyebrow: { fontSize: 10, fontFamily: typography.fontFamily.extrabold, letterSpacing: 1.3, textTransform: 'uppercase' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingLeft: 8 },
  sortCta: { fontSize: 13, fontFamily: typography.fontFamily.bold },

  favModeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  favModeTitle: { fontSize: 15, fontFamily: typography.fontFamily.extrabold },
  favModeExit: { fontSize: 13, fontFamily: typography.fontFamily.bold },
})
