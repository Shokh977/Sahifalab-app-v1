/**
 * Kurslar (redesign Phase 7a): "Davom etish" for enrolled courses, one
 * featured course, category chips (only categories that have courses) and
 * "BARCHA KURSLAR" as list rows. Sort chips and the filter sheet appear only
 * once the catalogue has more than 8 courses; there is no carousel.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react-native'
import { useTheme as useLegacyTheme } from '../../hooks/useTheme'
import { useCourseStore, getCachedCourseList, setCachedCourseList } from '../../stores/courseStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { courses as coursesApi, type Course } from '../../lib/api'
import { getPremiumTheme } from '../../lib/premiumTheme'
import { useWishlist } from '../../hooks/useWishlist'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import {
  FilterSheet, EMPTY_FILTERS, activeFilterCount, courseDurationBucket,
  type CourseFilters,
} from '../../components/kurslar/FilterSheet'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Card, Chip, EmptyState, IconButton, SkeletonRow, showToast, SectionTitle } from '../../src/components/ui'
import { CourseRow } from '../../src/features/courses/CourseRow'
import { FeaturedCourse } from '../../src/features/courses/FeaturedCourse'
import { ContinueRow } from '../../src/features/courses/ContinueRow'
import { categoriesWithCourses, pickFeatured, showBrowseTools } from '../../src/features/courses/courses'
import { usePendingStore } from '../../src/features/courses/purchase'

const PAGE_SIZE = 30

type SortKey = 'popular' | 'newest' | 'free' | 'top'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Ommabop' },
  { key: 'newest',  label: 'Yangi' },
  { key: 'free',    label: 'Bepul' },
  { key: 'top',     label: 'Top' },
]

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

function listParams(sort: SortKey, cat: string | null, filters: CourseFilters) {
  return {
    ...sortToParams(sort),
    ...(cat ? { category: cat } : {}),
    ...(filters.price ? { is_paid: filters.price === 'paid' } : {}),
    ...(filters.level ? { level: filters.level } : {}),
  }
}

function applyClientFilters(list: Course[], sortKey: SortKey, filters: CourseFilters): Course[] {
  let out = list
  if (sortKey === 'free') out = out.filter(c => !c.is_paid)
  if (filters.duration) out = out.filter(c => courseDurationBucket(c.total_duration_minutes ?? 0) === filters.duration)
  if (filters.language) out = out.filter(c => c.language === filters.language)
  return out
}

const BASE_KEY = makeQueryKey('popular', null, EMPTY_FILTERS)

interface Page { key: string; courses: Course[]; total: number }

function fromCache(key: string): Page | null {
  const hit = getCachedCourseList(key)
  return hit ? { key, ...hit } : null
}

export default function CoursesTab() {
  const { colors } = useTheme()
  const { theme } = useLegacyTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { categories, loadCategories } = useCourseStore()
  const { toggle: toggleSaved } = useWishlist()
  const enrolled = useDashboardStore(s => s.data?.enrolled)

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('popular')
  const [filters, setFilters] = useState<CourseFilters>(EMPTY_FILTERS)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // The last page set fetched, tagged with its query; a cached query is read
  // straight from the module cache, so switching chips back is instant.
  const [page, setPage] = useState<Page | null>(() => fromCache(BASE_KEY))
  // The unfiltered catalogue: drives the chips, the featured course and
  // whether sort/filter tools show, so picking a chip never hides the others.
  const [base, setBase] = useState<{ courses: Course[]; total: number }>(() => getCachedCourseList(BASE_KEY) ?? { courses: [], total: 0 })
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadCategories() }, [loadCategories])
  // Bugun usually loaded it already; a no-op while its cache is fresh.
  useEffect(() => { useDashboardStore.getState().fetch() }, [])
  // Open payment requests mark their courses "Tekshirilmoqda".
  useFocusEffect(useCallback(() => { usePendingStore.getState().refresh() }, []))
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'active') usePendingStore.getState().refresh() })
    return () => sub.remove()
  }, [])

  const key = makeQueryKey(sortKey, selectedCat, filters)
  // fromCache is a plain read; every write also goes through setPage.
  const current = useMemo(() => (page?.key === key ? page : fromCache(key)), [page, key])
  const courseList = useMemo(() => current?.courses ?? [], [current])
  const total = current?.total ?? 0
  const loadError = errorKey === key && !current

  const store = useCallback((k: string, res: { courses: Course[]; total: number }) => {
    setCachedCourseList(k, res.courses, res.total)
    setPage({ key: k, courses: res.courses, total: res.total })
    if (k === BASE_KEY) setBase({ courses: res.courses, total: res.total })
  }, [])

  const load = useCallback(async (k: string, params: ReturnType<typeof listParams>) => {
    try {
      store(k, await coursesApi.list({ ...params, limit: PAGE_SIZE, offset: 0 }))
    } catch { setErrorKey(k) }
  }, [store])

  useEffect(() => {
    if (getCachedCourseList(key)) return
    let cancelled = false
    coursesApi.list({ ...listParams(sortKey, selectedCat, filters), limit: PAGE_SIZE, offset: 0 })
      .then(res => { if (!cancelled) store(key, res) })
      .catch(() => { if (!cancelled) setErrorKey(key) })
    return () => { cancelled = true }
  }, [key, sortKey, selectedCat, filters, store])

  const fetchMore = useCallback(async () => {
    if (!current || loadingMore || current.courses.length >= current.total) return
    setLoadingMore(true)
    try {
      const res = await coursesApi.list({
        ...listParams(sortKey, selectedCat, filters), limit: PAGE_SIZE, offset: current.courses.length,
      })
      store(key, { courses: [...current.courses, ...res.courses], total: res.total })
    } catch {}
    finally { setLoadingMore(false) }
  }, [current, loadingMore, key, sortKey, selectedCat, filters, store])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setErrorKey(null)
    await load(key, listParams(sortKey, selectedCat, filters))
    setRefreshing(false)
    useDashboardStore.getState().refresh()
    usePendingStore.getState().refresh()
  }, [key, sortKey, selectedCat, filters, load])

  const openCourse = useCallback((id: number) => router.push(`/(screens)/course/${id}` as any), [router])

  const onSave = useCallback(async (course: Course) => {
    const saved = await toggleSaved(course.id)
    showToast('success', saved ? 'Sevimlilarga qoʻshildi' : 'Sevimlilardan olib tashlandi')
  }, [toggleSaved])

  const enrolledIds = useMemo(() => new Set((enrolled ?? []).map(e => e.course_id)), [enrolled])
  const featured = useMemo(() => pickFeatured(base.courses, enrolledIds), [base.courses, enrolledIds])
  const chipCats = useMemo(
    () => categoriesWithCourses(categories, base.courses, base.total > 0 && base.courses.length >= base.total),
    [categories, base],
  )
  const browseTools = showBrowseTools(base.total)
  const availableLanguages = useMemo(
    () => Array.from(new Set(courseList.map(c => c.language).filter(Boolean))) as string[],
    [courseList],
  )
  const visibleList = useMemo(() => applyClientFilters(courseList, sortKey, filters), [courseList, sortKey, filters])
  const filterCount = activeFilterCount(filters)
  const narrowed = filterCount > 0 || !!selectedCat || sortKey === 'free'

  // Back to the top when the selection changes, without remounting the list.
  const listRef = useRef<FlatList<Course>>(null)
  useEffect(() => { listRef.current?.scrollToOffset({ offset: 0, animated: false }) }, [selectedCat, sortKey, filters])

  const clearAll = () => { setFilters(EMPTY_FILTERS); setSelectedCat(null); setSortKey('popular') }

  const header = (
    <View style={styles.header}>
      {enrolled && <ContinueRow enrolled={enrolled} onOpen={openCourse} />}
      {featured && !narrowed && <FeaturedCourse course={featured} onPress={() => openCourse(featured.id)} />}

      {chipCats.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
          <Chip label="Hammasi" selected={!selectedCat} onPress={() => setSelectedCat(null)} />
          {chipCats.map(cat => (
            <Chip key={cat.slug} label={cat.name} selected={selectedCat === cat.slug} onPress={() => setSelectedCat(cat.slug)} />
          ))}
        </ScrollView>
      )}

      {browseTools && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
          {SORTS.map(o => (
            <Chip key={o.key} variant="choice" label={o.label} selected={sortKey === o.key} onPress={() => setSortKey(o.key)} />
          ))}
        </ScrollView>
      )}

      <View style={styles.listHead}>
        <SectionTitle title="Barcha kurslar" meta={browseTools ? undefined : `${narrowed ? visibleList.length : total} ta`} style={styles.flex} />
        {browseTools && (
          <Chip
            label={filterCount > 0 ? `Filtr (${filterCount})` : 'Filtr'}
            icon={SlidersHorizontal}
            selected={filterCount > 0}
            onPress={() => setFilterSheetOpen(true)}
          />
        )}
      </View>
    </View>
  )

  let body: React.ReactNode
  if (!current && !loadError) {
    body = (
      <View style={styles.content}>
        <Card loading />
        {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
      </View>
    )
  } else if (loadError) {
    body = (
      <View style={styles.content}>
        <EmptyState icon={BookOpen} title="Kurslar yuklanmadi" body="Internetni tekshirib, qayta urinib koʻring." action={{ label: 'Qayta urinish', onPress: onRefresh }} />
      </View>
    )
  } else {
    body = (
      <FlatList
        ref={listRef}
        data={visibleList}
        keyExtractor={c => String(c.id)}
        renderItem={({ item }) => (
          <CourseRow course={item} onPress={() => openCourse(item.id)} onLongPress={() => onSave(item)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon={BookOpen}
            title="Bu yerda hali kurs yoʻq"
            action={narrowed ? { label: 'Filtrlarni tozalash', onPress: clearAll } : undefined}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.huge }]}
        showsVerticalScrollIndicator={false}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      />
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={[typeScale.title1, styles.flex, { color: colors.text }]} accessibilityRole="header">Kurslar</Text>
        <IconButton icon={Search} accessibilityLabel="Kurslarni qidirish" onPress={() => router.push('/(screens)/search' as any)} />
        <ProfileAvatarButton size={26} />
      </View>

      {body}

      {browseTools && (
        <FilterSheet
          visible={filterSheetOpen}
          filters={filters}
          availableLanguages={availableLanguages}
          t={getPremiumTheme(theme)}
          onApply={f => { setFilters(f); setFilterSheetOpen(false) }}
          onClose={() => setFilterSheetOpen(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: layout.gutter,
    paddingRight: space.md,
    paddingVertical: space.xxs,
  },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.xxs },
  header: { gap: layout.cardGap, marginBottom: space.xs },
  bleed: { marginHorizontal: -layout.gutter },
  chips: { paddingHorizontal: layout.gutter, gap: space.xs },
  listHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.xs, minHeight: layout.minTouch },
})
