import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ScrollView, Modal, TouchableWithoutFeedback,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Search as SearchIcon, X, SlidersHorizontal, Check } from 'lucide-react-native'
import { MotiView } from 'moti'
import { useTheme } from '../../hooks/useTheme'
import { useCourseStore } from '../../stores/courseStore'
import { courses as coursesApi } from '../../lib/api'
import { CourseCard } from '../../components/courses/CourseCard'
import { typography, spacing, radius } from '../../lib/constants'
import type { Course, Category } from '../../lib/api'

type PriceFilter = '' | 'free' | 'paid'
type LevelFilter = '' | 'beginner' | 'intermediate' | 'advanced'

const LEVELS: { key: LevelFilter; label: string }[] = [
  { key: 'beginner',     label: "Boshlang'ich" },
  { key: 'intermediate', label: "O'rta"         },
  { key: 'advanced',     label: 'Murakkab'      },
]

const KEYWORDS = [
  'Dasturlash', 'Python', 'Ingliz tili', 'Matematika', 'Dizayn',
  'Biznes', 'Marketing', 'Excel', 'Web sayt', 'Fotografiya',
  'Muhandislik', 'Grafika', 'Rus tili', 'Animatsiya', 'SMM',
]

const PULSE = {
  from:       { opacity: 0.35 },
  animate:    { opacity: 0.8  },
  transition: { loop: true, type: 'timing' as const, duration: 780 },
}

function SkeletonCard() {
  const { c } = useTheme()
  const bg = { backgroundColor: c.bgTertiary }
  return (
    <View style={[styles.skCard, { backgroundColor: c.bgSecondary }]}>
      <MotiView {...PULSE} style={[styles.skThumb, bg]} />
      <View style={styles.skBody}>
        <MotiView {...PULSE} style={[styles.skLine, bg, { width: '80%' }]} />
        <MotiView {...PULSE} style={[styles.skLine, bg, { width: '55%', height: 11 }]} />
        <View style={styles.skStats}>
          <MotiView {...PULSE} style={[styles.skPill, bg, { width: 56 }]} />
          <MotiView {...PULSE} style={[styles.skPill, bg, { width: 74 }]} />
          <MotiView {...PULSE} style={[styles.skPill, bg, { width: 64 }]} />
        </View>
      </View>
    </View>
  )
}

export default function CourseCatalogScreen() {
  const { c }   = useTheme()
  const router  = useRouter()
  const insets  = useSafeAreaInsets()

  const { loadCategories, categories } = useCourseStore()

  const [query,        setQuery]        = useState('')
  const [priceFilter,  setPriceFilter]  = useState<PriceFilter>('')
  const [levelFilter,  setLevelFilter]  = useState<LevelFilter>('')
  const [activeCat,    setActiveCat]    = useState('')
  const [results,      setResults]      = useState<Course[]>([])
  const [total,        setTotal]        = useState(0)
  const [offset,       setOffset]       = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [filterOpen,   setFilterOpen]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pending state inside the filter sheet (applied only on "Qo'llash")
  const [pendingPrice, setPendingPrice] = useState<PriceFilter>('')
  const [pendingLevel, setPendingLevel] = useState<LevelFilter>('')

  useEffect(() => { loadCategories() }, [])

  const fetchCourses = useCallback(async (opts: {
    q?: string; price?: PriceFilter; level?: LevelFilter
    cat?: string; off?: number; append?: boolean
  }) => {
    const {
      q = query, price = priceFilter, level = levelFilter,
      cat = activeCat, off = 0, append = false,
    } = opts
    if (!append) setLoading(true)
    else         setLoadingMore(true)
    try {
      const res = await coursesApi.list({
        search:   q || undefined,
        is_paid:  price === 'paid' ? true : price === 'free' ? false : undefined,
        level:    level || undefined,
        category: cat || undefined,
        limit:    20,
        offset:   off,
      })
      // client-side fallback in case backend ignores is_paid
      if (price === 'free')  res.courses = res.courses.filter(c => !c.is_paid)
      if (price === 'paid')  res.courses = res.courses.filter(c =>  c.is_paid)
      setResults(prev => {
        if (!append) return res.courses
        const existingIds = new Set(prev.map(c => c.id))
        return [...prev, ...res.courses.filter(c => !existingIds.has(c.id))]
      })
      setTotal(res.total)
      setOffset(off + res.courses.length)
    } catch {}
    finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [query, priceFilter, levelFilter, activeCat])

  useEffect(() => { fetchCourses({ off: 0 }) }, [])

  function handleQueryChange(text: string) {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCourses({ q: text, off: 0 }), 350)
  }

  function handleKeyword(kw: string) {
    setQuery(kw)
    setFilterOpen(false)
    fetchCourses({ q: kw, off: 0 })
  }

  function handleCategory(slug: string) {
    const next = activeCat === slug ? '' : slug
    setActiveCat(next)
    fetchCourses({ cat: next, off: 0 })
  }

  function openFilter() {
    setPendingPrice(priceFilter)
    setPendingLevel(levelFilter)
    setFilterOpen(true)
  }

  function applyFilter() {
    setPriceFilter(pendingPrice)
    setLevelFilter(pendingLevel)
    setFilterOpen(false)
    fetchCourses({ price: pendingPrice, level: pendingLevel, off: 0 })
  }

  function clearAll() {
    setQuery('')
    setPriceFilter('')
    setLevelFilter('')
    setActiveCat('')
    fetchCourses({ q: '', price: '', level: '', cat: '', off: 0 })
  }

  function handleEndReached() {
    if (!loading && !loadingMore && results.length < total && results.length > 0) {
      fetchCourses({ off: offset, append: true })
    }
  }

  const activeFilterCount = (priceFilter ? 1 : 0) + (levelFilter ? 1 : 0)
  const hasActive = activeFilterCount > 0 || activeCat !== '' || query !== ''

  const listHeader = (
    <View>
      {/* Category chips */}
      {categories.length > 0 && (
        <View style={styles.chipsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <Pressable
              onPress={() => handleCategory('')}
              style={[styles.chip, activeCat === '' && { backgroundColor: c.brand }]}
            >
              <Text style={[styles.chipText, {
                color:      activeCat === '' ? '#fff' : c.textSecondary,
                fontFamily: activeCat === '' ? typography.fontFamily.semibold : typography.fontFamily.regular,
              }]}>Hammasi</Text>
            </Pressable>
            {categories.map((cat: Category) => {
              const active = activeCat === cat.slug
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategory(cat.slug)}
                  style={[styles.chip, active
                    ? { backgroundColor: c.brand }
                    : { backgroundColor: c.bgTertiary },
                  ]}
                >
                  <Text style={[styles.chipText, {
                    color:      active ? '#fff' : c.textSecondary,
                    fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
                  }]}>{cat.name}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Count + clear row */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {loading ? '' : `${total} ta kurs topildi`}
        </Text>
        {hasActive && (
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={[styles.clearText, { color: c.brand, fontFamily: typography.fontFamily.semibold }]}>
              Tozalash
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>

      {/* Header row */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>

        <View style={[styles.searchWrap, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
          <SearchIcon size={14} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Kurs qidirish..."
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); fetchCourses({ q: '', off: 0 }) }} hitSlop={8}>
              <X size={14} color={c.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter button */}
        <Pressable onPress={openFilter} style={[styles.filterBtn, { backgroundColor: c.bgTertiary }]}>
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? c.brand : c.textSecondary} />
          {activeFilterCount > 0 && (
            <View style={[styles.badge, { backgroundColor: c.brand }]}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Course list */}
      {loading ? (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={listHeader}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 280, delay: Math.min(index * 50, 300) }}
            >
              <CourseCard
                course={item}
                onPress={() => router.push(`/(screens)/course/${item.id}` as any)}
                delayPressIn={150}
              />
            </MotiView>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80, flexGrow: 1 }]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.1}
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          ListFooterComponent={
            loadingMore ? (
              <SkeletonCard />
            ) : results.length > 0 && results.length >= total ? (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 400 }}
                style={styles.endWrap}
              >
                <View style={[styles.endLine, { backgroundColor: c.border }]} />
                <Text style={[styles.endText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  Barchasi ko'rsatildi
                </Text>
                <View style={[styles.endLine, { backgroundColor: c.border }]} />
              </MotiView>
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Kurs topilmadi
            </Text>
          }
        />
      )}

      {/* Filter bottom sheet */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterOpen(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <MotiView
          from={{ translateY: 400 }}
          animate={{ translateY: 0 }}
          transition={{ type: 'timing', duration: 260 }}
          style={[styles.sheet, { backgroundColor: c.bgSecondary, paddingBottom: insets.bottom + 16 }]}
        >
          {/* Sheet handle */}
          <View style={[styles.handle, { backgroundColor: c.bgTertiary }]} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Price */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
              Narx
            </Text>
            <View style={styles.optionRow}>
              {([['', 'Barchasi'], ['free', 'Bepul'], ['paid', 'Pullik']] as [PriceFilter, string][]).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setPendingPrice(key)}
                  style={[styles.optionChip, {
                    backgroundColor: pendingPrice === key ? c.brand : c.bgTertiary,
                  }]}
                >
                  <Text style={[styles.optionText, {
                    color:      pendingPrice === key ? '#fff' : c.textSecondary,
                    fontFamily: pendingPrice === key ? typography.fontFamily.semibold : typography.fontFamily.regular,
                  }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Level */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
              Daraja
            </Text>
            <View style={styles.optionRow}>
              <Pressable
                onPress={() => setPendingLevel('')}
                style={[styles.optionChip, { backgroundColor: pendingLevel === '' ? c.brand : c.bgTertiary }]}
              >
                <Text style={[styles.optionText, {
                  color:      pendingLevel === '' ? '#fff' : c.textSecondary,
                  fontFamily: pendingLevel === '' ? typography.fontFamily.semibold : typography.fontFamily.regular,
                }]}>Barchasi</Text>
              </Pressable>
              {LEVELS.map(lv => (
                <Pressable
                  key={lv.key}
                  onPress={() => setPendingLevel(lv.key)}
                  style={[styles.optionChip, {
                    backgroundColor: pendingLevel === lv.key ? c.brand : c.bgTertiary,
                  }]}
                >
                  <Text style={[styles.optionText, {
                    color:      pendingLevel === lv.key ? '#fff' : c.textSecondary,
                    fontFamily: pendingLevel === lv.key ? typography.fontFamily.semibold : typography.fontFamily.regular,
                  }]}>{lv.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Suggested keywords */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
              Mavzular
            </Text>
            <View style={styles.keywordsWrap}>
              {KEYWORDS.map(kw => (
                <Pressable
                  key={kw}
                  onPress={() => handleKeyword(kw)}
                  style={[styles.keywordChip, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
                >
                  <Text style={[styles.keywordText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {kw}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Apply button */}
          <Pressable
            onPress={applyFilter}
            style={[styles.applyBtn, { backgroundColor: c.brand }]}
          >
            <Text style={[styles.applyText, { fontFamily: typography.fontFamily.bold }]}>
              Qo'llash
            </Text>
          </Pressable>
        </MotiView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
    gap:               spacing.xs,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    gap:               spacing.sm,
    borderWidth:       1,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm, padding: 0 },
  filterBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },

  chipsBar: {
    paddingVertical: spacing.sm,
  },
  chipsRow: {
    paddingHorizontal: spacing.base,
    gap:               spacing.sm,
    alignItems:        'center',
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs + 4,
    borderRadius:      radius.full,
    backgroundColor:   'rgba(128,128,128,0.12)',
  },
  chipText: { fontSize: typography.size.sm },

  countRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop:        spacing.xs,
    paddingBottom:     spacing.xs,
  },
  countText: { fontSize: typography.size.xs },
  clearText: { fontSize: typography.size.xs },

  list:  { paddingHorizontal: spacing.sm },
  endWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  endLine: { flex: 1, height: 1 },
  endText: { fontSize: typography.size.xs },
  empty: {
    textAlign: 'center', paddingVertical: spacing.xl,
    fontSize: typography.size.sm, fontStyle: 'italic',
  },

  // Filter sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position:          'absolute',
    bottom:            0, left: 0, right: 0,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    maxHeight:         '80%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize:    typography.size.xs,
    marginBottom: spacing.xs,
    marginTop:    spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      radius.full,
  },
  optionText: { fontSize: typography.size.sm },

  keywordsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    marginBottom:  spacing.sm,
  },
  keywordChip: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs + 4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  keywordText: { fontSize: typography.size.sm },

  applyBtn: {
    marginTop:     spacing.sm,
    paddingVertical: 14,
    borderRadius:  radius.full,
    alignItems:    'center',
  },
  applyText: { color: '#fff', fontSize: typography.size.base },

  // Skeleton
  skCard:  { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm },
  skThumb: { width: '100%', height: 180 },
  skBody:  { padding: spacing.sm, gap: spacing.xs },
  skLine:  { height: 14, borderRadius: 4 },
  skStats: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  skPill:  { height: 18, borderRadius: radius.full },
})
