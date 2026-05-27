import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  View, Text, StyleSheet, TextInput, FlatList,
  Pressable, ActivityIndicator, Image, Animated, ScrollView, LayoutChangeEvent,
} from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import ReAnimated, { runOnJS } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Search as SearchIcon, X, BadgeCheck, BookOpen, FileText, Frown, Clock } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { search, type SearchPerson, type SearchCourse, type SearchResults } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

type Filter = 'all' | 'people' | 'courses' | 'posts'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'Hammasi'   },
  { key: 'people',  label: 'Odamlar'   },
  { key: 'courses', label: 'Kurslar'   },
  { key: 'posts',   label: 'Postlar'   },
]

function FilterTabBar({
  filter, onSelect, borderColor,
}: {
  filter:      Filter
  onSelect:    (f: Filter) => void
  borderColor: string
}) {
  const { c }      = useTheme()
  const scrollRef  = useRef<ScrollView>(null)
  const indicatorX = useRef(new Animated.Value(0)).current
  const indicatorW = useRef(new Animated.Value(0)).current
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({})

  const moveIndicator = useCallback((key: string) => {
    const layout = tabLayouts.current[key]
    if (!layout) return
    Animated.parallel([
      Animated.spring(indicatorX, { toValue: layout.x,     useNativeDriver: false, speed: 22, bounciness: 3 }),
      Animated.spring(indicatorW, { toValue: layout.width, useNativeDriver: false, speed: 22, bounciness: 3 }),
    ]).start()
  }, [indicatorX, indicatorW])

  useEffect(() => {
    moveIndicator(filter)
  }, [filter, moveIndicator])

  return (
    <View style={[styles.filterRow, { borderBottomColor: borderColor, overflow: 'hidden' }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => {
          const active = filter === f.key
          return (
            <Pressable
              key={f.key}
              onLayout={(e: LayoutChangeEvent) => {
                const { x, width } = e.nativeEvent.layout
                tabLayouts.current[f.key] = { x, width }
                if (f.key === filter) moveIndicator(f.key)
              }}
              onPress={() => onSelect(f.key)}
              style={styles.filterTab}
            >
              <Text style={[styles.filterLabel, {
                color:      active ? c.brand : c.textMuted,
                fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular,
              }]}>
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { backgroundColor: c.brand, left: indicatorX, width: indicatorW }]}
      />
    </View>
  )
}

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 15

function Avatar({ uri, name, size = 44 }: { uri?: string | null; name?: string | null; size?: number }) {
  const { c } = useTheme()
  const [failed, setFailed] = useState(false)
  const initials = (name ?? '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const fallback = (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: c.brandSubtle, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: c.brand, fontSize: size * 0.36, fontFamily: typography.fontFamily.bold }}>
        {initials}
      </Text>
    </View>
  )
  if (!uri || failed) return fallback
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setFailed(true)}
    />
  )
}

export default function SearchScreen() {
  const { c } = useTheme()
  const router = useRouter()

  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<Filter>('all')
  const [results, setResults] = useState<SearchResults>({})
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (raw) setHistory(JSON.parse(raw))
    })
  }, [])

  const saveToHistory = useCallback((q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, MAX_HISTORY)
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeHistoryItem = useCallback((item: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h !== item)
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    AsyncStorage.removeItem(HISTORY_KEY)
  }, [])

  const doSearch = useCallback((q: string, f: Filter) => {
    if (!q.trim()) { setResults({}); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        let data: SearchResults
        if (f === 'people') data = await search.people(q)
        else                data = await search.all(q)
        setResults(data)
      } catch {}
      finally { setLoading(false) }
    }, 350)
  }, [])

  function handleQueryChange(text: string) {
    setQuery(text)
    doSearch(text, filter)
  }

  function handleSubmit() {
    if (query.trim()) saveToHistory(query)
  }

  function handleFilterChange(f: Filter) {
    setFilter(f)
    doSearch(query, f)
  }

  const pan = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-15, 15])
      .failOffsetY([-10, 10])
      .onEnd(e => {
        'worklet'
        const idx = FILTERS.findIndex(f => f.key === filter)
        if ((e.velocityX < -400 || e.translationX < -60) && idx < FILTERS.length - 1) {
          runOnJS(handleFilterChange)(FILTERS[idx + 1].key)
        } else if ((e.velocityX > 400 || e.translationX > 60) && idx > 0) {
          runOnJS(handleFilterChange)(FILTERS[idx - 1].key)
        }
      }),
  [filter])

  function applyHistory(q: string) {
    setQuery(q)
    doSearch(q, filter)
  }

  // ── Section renderers ────────────────────────────────────────────────────────

  function renderPerson(item: SearchPerson) {
    return (
      <Pressable
        key={item.id}
        style={[styles.resultRow, { borderBottomColor: c.border }]}
        onPress={() => { saveToHistory(query); router.push(`/profile/${item.id}` as any) }}
      >
        <Avatar uri={item.avatar_url} name={item.name} />
        <View style={styles.resultInfo}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.resultName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              {item.name}
            </Text>
            {item.is_verified && (
              <BadgeCheck size={14} color={c.brand} />
            )}
          </View>
          {item.headline && (
            <Text numberOfLines={1} style={[styles.resultSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {item.headline}
            </Text>
          )}
        </View>
        {item.is_connected && (
          <Text style={[styles.badge, { color: c.success, borderColor: c.success }]}>Bog'liq</Text>
        )}
      </Pressable>
    )
  }

  function renderCourse(item: SearchCourse) {
    const isFree = !item.is_paid
    return (
      <Pressable
        key={item.id}
        style={[styles.resultRow, { borderBottomColor: c.border }]}
        onPress={() => { saveToHistory(query); router.push(`/course/${item.id}` as any) }}
      >
        {item.thumbnail_url
          ? <Image source={{ uri: item.thumbnail_url }} style={styles.courseCover} />
          : (
            <View style={[styles.courseCover, { backgroundColor: c.bgTertiary, alignItems: 'center', justifyContent: 'center' }]}>
              <BookOpen size={22} color={c.textMuted} />
            </View>
          )
        }
        <View style={styles.resultInfo}>
          <Text numberOfLines={2} style={[styles.resultName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[styles.resultSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {item.teacher_name}
          </Text>
          <Text style={[styles.price, { color: isFree ? c.success : c.brand, fontFamily: typography.fontFamily.bold }]}>
            {isFree ? 'Bepul' : `${item.price.toLocaleString()} so'm`}
          </Text>
        </View>
      </Pressable>
    )
  }

  function renderPost(item: { id: number; content: string; author: any; created_at: string }) {
    const authorName = typeof item.author === 'string'
      ? item.author
      : item.author?.name ?? item.author?.username ?? ''
    return (
      <View key={item.id} style={[styles.resultRow, { borderBottomColor: c.border }]}>
        <View style={styles.postIcon}>
          <FileText size={20} color={c.textMuted} />
        </View>
        <View style={styles.resultInfo}>
          <Text numberOfLines={3} style={[styles.resultName, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
            {item.content}
          </Text>
          {!!authorName && (
            <Text numberOfLines={1} style={[styles.resultSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {authorName}
            </Text>
          )}
        </View>
      </View>
    )
  }

  // ── Flat list data ───────────────────────────────────────────────────────────

  type FlatItem =
    | { type: 'section'; title: string; key: string }
    | { type: 'person';  data: SearchPerson }
    | { type: 'course';  data: SearchCourse }
    | { type: 'post';    data: { id: number; content: string; author: string; created_at: string } }
    | { type: 'empty';   message: string; key: string }

  const flatData: FlatItem[] = []

  const showPeople  = filter === 'all' || filter === 'people'
  const showCourses = filter === 'all' || filter === 'courses'
  const showPosts   = filter === 'all' || filter === 'posts'

  if (query.trim()) {
    if (showPeople && results.people) {
      flatData.push({ type: 'section', title: 'Odamlar', key: 's-people' })
      if (results.people.length === 0)
        flatData.push({ type: 'empty', message: 'Topilmadi', key: 'e-people' })
      else
        results.people.forEach(p => flatData.push({ type: 'person', data: p }))
    }
    if (showCourses && results.courses) {
      flatData.push({ type: 'section', title: 'Kurslar', key: 's-courses' })
      if (results.courses.length === 0)
        flatData.push({ type: 'empty', message: 'Topilmadi', key: 'e-courses' })
      else
        results.courses.forEach(c => flatData.push({ type: 'course', data: c }))
    }
    if (showPosts && results.posts) {
      flatData.push({ type: 'section', title: 'Postlar', key: 's-posts' })
      if (results.posts.length === 0)
        flatData.push({ type: 'empty', message: 'Topilmadi', key: 'e-posts' })
      else
        results.posts.forEach(p => flatData.push({ type: 'post', data: p as any }))
    }
  }

  const showHistory = !query.trim() && history.length > 0

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      {/* Search bar */}
      <View style={[styles.searchBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={c.brand} />
        </Pressable>
        <View style={[styles.inputWrap, { backgroundColor: c.bgTertiary }]}>
          <SearchIcon size={15} color={c.textMuted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            placeholder="Qidirish..."
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
            style={[styles.input, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults({}) }} hitSlop={8}>
              <X size={16} color={c.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter tab bar */}
      <FilterTabBar filter={filter} onSelect={handleFilterChange} borderColor={c.border} />

      {/* Body — swipeable to change filter */}
      <GestureDetector gesture={pan}>
        <ReAnimated.View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing.xl }} />
      ) : showHistory ? (
        <FlatList
          data={history}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={[styles.historyHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.historyTitle, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                So'nggi qidiruvlar
              </Text>
              <Pressable onPress={clearHistory} hitSlop={8}>
                <Text style={[styles.clearAll, { color: c.brand, fontFamily: typography.fontFamily.medium }]}>
                  Hammasini tozalash
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.historyRow, { borderBottomColor: c.border }]}
              onPress={() => applyHistory(item)}
            >
              <Clock size={16} color={c.textMuted} style={{ flexShrink: 0 }} />
              <Text numberOfLines={1} style={[styles.historyText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                {item}
              </Text>
              <Pressable onPress={() => removeHistoryItem(item)} hitSlop={10} style={styles.historyRemove}>
                <X size={14} color={c.textMuted} />
              </Pressable>
            </Pressable>
          )}
        />
      ) : !query.trim() ? (
        <View style={styles.emptyState}>
          <SearchIcon size={48} color={c.textMuted} style={{ marginBottom: spacing.sm }} />
          <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Odamlar, kurslar yoki postlarni qidiring
          </Text>
        </View>
      ) : flatData.length === 0 ? (
        <View style={styles.emptyState}>
          <Frown size={48} color={c.textMuted} style={{ marginBottom: spacing.sm }} />
          <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            "{query}" bo'yicha hech narsa topilmadi
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => {
            if (item.type === 'section' || item.type === 'empty') return item.key
            if (item.type === 'person')  return `person-${item.data.id}`
            if (item.type === 'course')  return `course-${item.data.id}`
            return `post-${item.data.id}`
          }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.type === 'section') return (
              <Text style={[styles.sectionTitle, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                {item.title}
              </Text>
            )
            if (item.type === 'empty') return (
              <Text style={[styles.emptySection, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {item.message}
              </Text>
            )
            if (item.type === 'person')  return renderPerson(item.data)
            if (item.type === 'course')  return renderCourse(item.data)
            return renderPost(item.data)
          }}
        />
      )}
        </ReAnimated.View>
      </GestureDetector>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.sm,
    gap:               spacing.xs,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs },
  inputWrap: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
    gap:               spacing.xs,
  },
  input: {
    flex:     1,
    fontSize: typography.size.md,
    padding:  0,
  },
  filterRow: {
    borderBottomWidth: 1,
  },
  filterContent: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.xs,
    paddingBottom:     spacing.sm,
    flexDirection:     'row',
  },
  filterTab: {
    paddingHorizontal: spacing.sm + 4,
    paddingBottom:     4,
  },
  filterLabel: {
    fontSize: typography.size.sm,
  },
  indicator: {
    position:     'absolute',
    bottom:       0,
    height:       2,
    borderRadius: 1,
  },

  // ── History ──────────────────────────────────────────────────────────────────
  historyHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  historyTitle: {
    fontSize:      typography.size.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clearAll: {
    fontSize: typography.size.sm,
  },
  historyRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm + 2,
    gap:               spacing.sm,
    borderBottomWidth: 1,
  },
  historyText: {
    flex:     1,
    fontSize: typography.size.md,
  },
  historyRemove: {
    padding: 2,
  },

  // ── Results ──────────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize:          typography.size.xs,
    letterSpacing:     0.5,
    textTransform:     'uppercase',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.base,
    paddingBottom:     spacing.xs,
  },
  emptySection: {
    fontSize:          typography.size.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    fontStyle:         'italic',
  },
  resultRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    gap:               spacing.sm,
    borderBottomWidth: 1,
  },
  resultInfo: { flex: 1, gap: 2 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resultName: { fontSize: typography.size.md },
  resultSub:  { fontSize: typography.size.sm },
  badge: {
    fontSize:          typography.size.xs,
    borderWidth:       1,
    borderRadius:      radius.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  courseCover: {
    width:        56,
    height:       56,
    borderRadius: radius.sm,
  },
  price:    { fontSize: typography.size.sm },
  postIcon: {
    width:          44,
    height:         44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize:   typography.size.md,
    textAlign:  'center',
    lineHeight: 22,
  },
})
