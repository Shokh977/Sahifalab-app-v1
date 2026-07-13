import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Image, ActivityIndicator, ScrollView, RefreshControl,
  TextInput, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import {
  MagnifyingGlass, Star, Clock, Users, BookOpen, X, Heart,
} from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useCourseStore, getCachedCourseList, setCachedCourseList } from '../../stores/courseStore'
import { courses as coursesApi, type Course, type Category } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'

const { width: SCREEN_W } = Dimensions.get('window')
const HERO_H    = 210
const PAGE_SIZE = 10

// ── Types ──────────────────────────────────────────────────────────────────────

type SortKey = 'popular' | 'newest' | 'free' | 'top'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Ommabop' },
  { key: 'newest',  label: 'Yangi'   },
  { key: 'free',    label: 'Bepul'   },
  { key: 'top',     label: 'Top'     },
]

function sortToParams(key: SortKey): { ordering?: string; is_paid?: boolean } {
  switch (key) {
    case 'popular': return { ordering: '-enrolled_count' }
    case 'newest':  return { ordering: '-created_at'     }
    case 'free':    return { is_paid: false               }
    case 'top':     return { ordering: '-rating'          }
  }
}

function makeQueryKey(sort: SortKey, cat: string | null, search: string) {
  return `${sort}|${cat ?? ''}|${search}`
}

// Featured slides cache — persists for the app session, populated once
let _featuredCache: Course[] = []

// Skeleton placeholder items — defined once outside component (stable reference)
const SKELETON_DATA = [1, 2, 3, 4, 5].map(id => ({ __skeleton: true as const, id }))
type ListItem = Course | typeof SKELETON_DATA[0]

// ── Featured Hero (dumb — state lifted to parent) ─────────────────────────────

function FeaturedHero({
  slides, active, onSlideChange, onCoursePress, c,
}: {
  slides:        Course[]
  active:        number
  onSlideChange: (i: number) => void
  onCoursePress: (id: number) => void
  c:             any
}) {
  if (slides.length === 0) return null

  return (
    <View style={heroS.root}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={e =>
          onSlideChange(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
      >
        {slides.map(co => (
          <Pressable
            key={co.id}
            onPress={() => onCoursePress(co.id)}
            style={heroS.slide}
          >
            <Image
              source={{ uri: co.thumbnail_url! }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.82)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={heroS.info}>
              {co.categories?.name && (
                <View style={[heroS.badge, { backgroundColor: c.accentPrimary }]}>
                  <Text style={[heroS.badgeText, { fontFamily: typography.fontFamily.semibold }]}>
                    {co.categories.name}
                  </Text>
                </View>
              )}
              <Text
                numberOfLines={2}
                style={[heroS.title, { fontFamily: typography.fontFamily.extrabold }]}
              >
                {co.title}
              </Text>
              <View style={heroS.metaRow}>
                {(co.rating ?? 0) > 0 && (
                  <Text style={[heroS.rating, { fontFamily: typography.fontFamily.bold }]}>
                    ★ {co.rating!.toFixed(1)}
                  </Text>
                )}
                {co.enrolled_count > 0 && (
                  <Text style={heroS.students}>
                    {co.enrolled_count.toLocaleString()} o'quvchi
                  </Text>
                )}
                <Text style={[heroS.price, {
                  color:      co.is_paid ? '#FFB840' : '#4ade80',
                  fontFamily: typography.fontFamily.bold,
                }]}>
                  {co.is_paid ? `${co.price.toLocaleString()} so'm` : 'Bepul'}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {slides.length > 1 && (
        <View style={heroS.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                heroS.dot,
                {
                  width:           i === active ? 20 : 6,
                  backgroundColor: i === active ? c.accentPrimary : c.border,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const heroS = StyleSheet.create({
  root:     { backgroundColor: '#111' },
  slide:    { width: SCREEN_W, height: HERO_H },
  info:     {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.base,
    paddingVertical:   14,
    gap:               6,
  },
  badge:    {
    alignSelf:         'flex-start',
    borderRadius:      4,
    paddingHorizontal: 6,
    paddingVertical:   2,
    marginBottom:      2,
  },
  badgeText: { color: '#fff', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  title:     { color: '#fff', fontSize: 17, lineHeight: 22 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  rating:    { color: '#fbbf24', fontSize: 12 },
  students:  { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  price:     { marginLeft: 'auto' as any, fontSize: 13 },
  dotsRow:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingTop: 8, paddingBottom: 4,
  },
  dot: { height: 6, borderRadius: 3 },
})

// ── Filter Header (top-level component so FlatList reconciles correctly) ───────

interface FilterHeaderProps {
  selectedCat:      string | null
  setSelectedCat:   (v: string | null) => void
  sortKey:          SortKey
  setSortKey:       (k: SortKey) => void
  categories:       Category[]
  total:            number
  loading:          boolean
  featuredSlides:   Course[]
  featuredActive:   number
  onSlideChange:    (i: number) => void
  onCoursePress:    (id: number) => void
  c:                any
}

function FilterHeader({
  selectedCat, setSelectedCat,
  sortKey, setSortKey,
  categories, total, loading,
  featuredSlides, featuredActive, onSlideChange,
  onCoursePress, c,
}: FilterHeaderProps) {
  return (
    <View>
      {/* Featured hero carousel */}
      <FeaturedHero
        slides={featuredSlides}
        active={featuredActive}
        onSlideChange={onSlideChange}
        onCoursePress={onCoursePress}
        c={c}
      />

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Pressable
          onPress={() => setSelectedCat(null)}
          style={[styles.chip, { backgroundColor: selectedCat === null ? c.accentPrimary : c.bgTertiary }]}
        >
          <Text style={[styles.chipText, {
            color:      selectedCat === null ? '#fff' : c.textSecondary,
            fontFamily: selectedCat === null ? typography.fontFamily.semibold : typography.fontFamily.regular,
          }]}>
            Hammasi
          </Text>
        </Pressable>
        {categories.map(cat => {
          const active = selectedCat === cat.slug
          return (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(active ? null : cat.slug)}
              style={[styles.chip, { backgroundColor: active ? c.accentPrimary : c.bgTertiary }]}
            >
              <Text style={[styles.chipText, {
                color:      active ? '#fff' : c.textSecondary,
                fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
              }]}>
                {cat.name}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Sort tabs */}
      <View style={[styles.sortRow, { borderBottomColor: c.border }]}>
        {SORTS.map(s => {
          const active = sortKey === s.key
          return (
            <Pressable
              key={s.key}
              onPress={() => setSortKey(s.key)}
              style={[
                styles.sortTab,
                active && { borderBottomColor: c.accentPrimary, borderBottomWidth: 2 },
              ]}
            >
              <Text style={[styles.sortLabel, {
                color:      active ? c.accentPrimary : c.textSecondary,
                fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
              }]}>
                {s.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {!loading && total > 0 && (
        <Text style={[styles.countText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          {total.toLocaleString()} ta kurs
        </Text>
      )}
    </View>
  )
}

// ── Course Card ────────────────────────────────────────────────────────────────

function CourseCard({ course, onPress, c }: { course: Course; onPress: () => void; c: any }) {
  const isFree    = !course.is_paid
  const hasRating = (course.rating ?? 0) > 0
  const durationH = (course.total_duration_minutes ?? 0) > 0
    ? Math.floor(course.total_duration_minutes / 60)
    : 0

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
    >
      {course.thumbnail_url
        ? <Image source={{ uri: course.thumbnail_url }} style={styles.cardThumb} resizeMode="cover" />
        : <View style={[styles.cardThumb, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
            <BookOpen size={28} color={c.textDisabled} />
          </View>
      }
      <View style={styles.cardBody}>
        {course.categories?.name && (
          <Text numberOfLines={1} style={[styles.cardCat, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
            {course.categories.name}
          </Text>
        )}
        <Text numberOfLines={2} style={[styles.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {course.title}
        </Text>
        {course.teacher?.first_name && (
          <Text numberOfLines={1} style={[styles.cardTeacher, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {course.teacher.first_name}
          </Text>
        )}
        <View style={styles.cardMeta}>
          {hasRating && (
            <View style={styles.metaItem}>
              <Star size={11} color="#f59e0b" weight="fill" />
              <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                {course.rating!.toFixed(1)}
              </Text>
            </View>
          )}
          {course.enrolled_count > 0 && (
            <View style={styles.metaItem}>
              <Users size={11} color={c.textDisabled} />
              <Text style={[styles.metaText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                {course.enrolled_count.toLocaleString()}
              </Text>
            </View>
          )}
          {durationH > 0 && (
            <View style={styles.metaItem}>
              <Clock size={11} color={c.textDisabled} />
              <Text style={[styles.metaText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                {durationH} soat
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardPrice, { color: isFree ? c.success : c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
          {isFree ? 'Bepul' : `${course.price.toLocaleString()} so'm`}
        </Text>
      </View>
    </Pressable>
  )
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────

function SkeletonCard({ c }: { c: any }) {
  return (
    <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <View style={[styles.cardThumb, { backgroundColor: c.bgTertiary }]} />
      <View style={[styles.cardBody, { gap: 8 }]}>
        <View style={{ height: 10, width: 64,    backgroundColor: c.bgTertiary, borderRadius: 4 }} />
        <View style={{ height: 14, width: '90%', backgroundColor: c.bgTertiary, borderRadius: 4 }} />
        <View style={{ height: 14, width: '65%', backgroundColor: c.bgTertiary, borderRadius: 4 }} />
        <View style={{ height: 11, width: 80,    backgroundColor: c.bgTertiary, borderRadius: 4 }} />
        <View style={{ height: 16, width: 96,    backgroundColor: c.bgTertiary, borderRadius: 4 }} />
      </View>
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function CoursesTab() {
  const { c }  = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { categories, loadCategories } = useCourseStore()

  const [selectedCat,     setSelectedCat]     = useState<string | null>(null)
  const [sortKey,         setSortKey]         = useState<SortKey>('popular')
  const [searchQuery,     setSearchQuery]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Initialize from cache so returning to the tab shows data instantly
  const [courseList,      setCourseList]      = useState<Course[]>(() => getCachedCourseList(makeQueryKey('popular', null, ''))?.courses ?? [])
  const [total,           setTotal]           = useState<number>(() => getCachedCourseList(makeQueryKey('popular', null, ''))?.total ?? 0)
  const [loading,         setLoading]         = useState(() => getCachedCourseList(makeQueryKey('popular', null, '')) === null)
  const [loadingMore,     setLoadingMore]     = useState(false)
  const [refreshing,      setRefreshing]      = useState(false)

  // Featured hero — populated from main list result (no separate API call)
  const [featuredSlides,  setFeaturedSlides]  = useState<Course[]>(_featuredCache)
  const [featuredActive,  setFeaturedActive]  = useState(0)

  const pageRef     = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadCategories() }, [])

  // Derive featured slides from the popular list (eliminates a separate API call)
  useEffect(() => {
    if (_featuredCache.length > 0 || sortKey !== 'popular' || selectedCat || debouncedSearch) return
    if (courseList.length === 0) return
    const slides = courseList.filter(co => !!co.thumbnail_url).slice(0, 5)
    if (slides.length > 0) { _featuredCache = slides; setFeaturedSlides(slides) }
  }, [courseList, sortKey, selectedCat, debouncedSearch])

  // Debounced search input handler
  function handleSearchChange(text: string) {
    setSearchQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 350)
  }

  function clearSearch() {
    setSearchQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setDebouncedSearch('')
  }

  // Main fetch — cache-aware: instant on cache hit, skeleton only on cache miss
  useEffect(() => {
    const key = makeQueryKey(sortKey, selectedCat, debouncedSearch)
    const cached = getCachedCourseList(key)
    if (cached) {
      setCourseList(cached.courses)
      setTotal(cached.total)
      setLoading(false)
      pageRef.current = 1
      return
    }

    let cancelled = false
    setLoading(true)
    pageRef.current = 0
    coursesApi.list({
      ...sortToParams(sortKey),
      ...(selectedCat     ? { category: selectedCat }     : {}),
      ...(debouncedSearch ? { search:   debouncedSearch }  : {}),
      limit:  PAGE_SIZE,
      offset: 0,
    }).then(res => {
      if (cancelled) return
      let list = res.courses
      if (sortKey === 'free') list = list.filter(c => !c.is_paid)
      setCourseList(list)
      setTotal(res.total)
      setCachedCourseList(key, list, res.total)
      pageRef.current = 1
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedCat, sortKey, debouncedSearch])

  const fetchMore = useCallback(async () => {
    if (loadingMore || courseList.length >= total) return
    setLoadingMore(true)
    try {
      const res = await coursesApi.list({
        ...sortToParams(sortKey),
        ...(selectedCat     ? { category: selectedCat }     : {}),
        ...(debouncedSearch ? { search:   debouncedSearch }  : {}),
        limit:  PAGE_SIZE,
        offset: pageRef.current * PAGE_SIZE,
      })
      setCourseList(prev => [...prev, ...res.courses])
      setTotal(res.total)
      pageRef.current += 1
    } catch {}
    finally { setLoadingMore(false) }
  }, [loadingMore, courseList.length, total, selectedCat, sortKey, debouncedSearch])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    pageRef.current = 0
    try {
      const res = await coursesApi.list({
        ...sortToParams(sortKey),
        ...(selectedCat     ? { category: selectedCat }     : {}),
        ...(debouncedSearch ? { search:   debouncedSearch }  : {}),
        limit:  PAGE_SIZE,
        offset: 0,
      })
      let list = res.courses
      if (sortKey === 'free') list = list.filter(c => !c.is_paid)
      setCourseList(list)
      setTotal(res.total)
      setCachedCourseList(makeQueryKey(sortKey, selectedCat, debouncedSearch), list, res.total)
      pageRef.current = 1
    } catch {}
    finally { setRefreshing(false) }
  }, [selectedCat, sortKey, debouncedSearch])

  const handleCoursePress = useCallback((id: number) => {
    router.push(`/(screens)/course/${id}` as any)
  }, [router])

  // Build the header element once per render — FilterHeader is a stable top-level
  // component type so FlatList reconciles (updates props) rather than remounting it.
  const listHeader = (
    <FilterHeader
      selectedCat={selectedCat}
      setSelectedCat={setSelectedCat}
      sortKey={sortKey}
      setSortKey={setSortKey}
      categories={categories}
      total={total}
      loading={loading}
      featuredSlides={featuredSlides}
      featuredActive={featuredActive}
      onSlideChange={setFeaturedActive}
      onCoursePress={handleCoursePress}
      c={c}
    />
  )

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>

      {/* ── Fixed top bar ─────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs, borderBottomColor: c.border }]}>
        <View style={styles.topTitleRow}>
          <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Kurslar
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push('/(screens)/saved' as any)}
              hitSlop={8}
              style={[styles.heartBtn, { backgroundColor: c.bgTertiary }]}
            >
              <Heart size={18} color={c.textSecondary} />
            </Pressable>
            <ProfileAvatarButton size={30} />
          </View>
        </View>
        <View style={[styles.searchWrap, { backgroundColor: c.bgTertiary }]}>
          <MagnifyingGlass size={16} color={c.textDisabled} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Kurslarni qidiring..."
            placeholderTextColor={c.textDisabled}
            returnKeyType="search"
            style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={14} color={c.textDisabled} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── List — single FlatList avoids unmount/remount on loading toggle ── */}
      <FlatList<ListItem>
        data={loading ? SKELETON_DATA : courseList}
        keyExtractor={item => '__skeleton' in item ? `sk-${item.id}` : String(item.id)}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) =>
          '__skeleton' in item
            ? <SkeletonCard c={c} />
            : <CourseCard course={item} onPress={() => handleCoursePress(item.id)} c={c} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        onEndReached={loading ? undefined : fetchMore}
        onEndReachedThreshold={0.3}
        removeClippedSubviews
        windowSize={10}
        maxToRenderPerBatch={10}
        ListFooterComponent={loadingMore
          ? <ActivityIndicator color={c.accentPrimary} style={{ marginTop: spacing.base }} />
          : null
        }
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <BookOpen size={48} color={c.textDisabled} />
            <Text style={[styles.emptyText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              {debouncedSearch
                ? `"${debouncedSearch}" bo'yicha kurs topilmadi`
                : 'Kurslar topilmadi'
              }
            </Text>
          </View>
        ) : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accentPrimary}
          />
        }
      />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    gap:               spacing.sm,
  },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontSize: typography.size.xl },
  heartBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    borderRadius:      radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
  },
  searchInput: {
    flex:     1,
    fontSize: typography.size.sm,
    padding:  0,
  },

  chipsRow: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.sm,
    gap:               spacing.xs,
    flexDirection:     'row',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   5,
    borderRadius:      radius.full,
  },
  chipText: { fontSize: typography.size.sm },

  sortRow: {
    flexDirection:     'row',
    borderBottomWidth: 1,
  },
  sortTab: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm,
  },
  sortLabel: { fontSize: typography.size.sm },

  countText: {
    fontSize:          typography.size.xs,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.xs,
  },

  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
  },

  card: {
    flexDirection: 'row',
    borderRadius:  radius.card,
    borderWidth:   1,
    overflow:      'hidden',
  },
  cardThumb: { width: 100, height: 90 },
  cardBody: {
    flex:    1,
    padding: spacing.sm,
    gap:     3,
  },
  cardCat:     { fontSize: typography.size.xs },
  cardTitle:   { fontSize: typography.size.sm, lineHeight: 18 },
  cardTeacher: { fontSize: typography.size.xs },
  cardMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:  { fontSize: typography.size.xs },
  cardPrice: { fontSize: typography.size.sm, marginTop: 2 },

  empty:     { marginTop: 80, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: typography.size.base, textAlign: 'center' },
})
