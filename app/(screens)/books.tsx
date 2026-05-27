import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, Image, Pressable,
  ActivityIndicator, TextInput, ScrollView, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { ChevronLeft, Search, X, Star, Download, BookOpen } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { request } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

interface Book {
  id:            number
  title:         string
  author:        string
  description:   string | null
  category:      string | null
  is_paid:       boolean
  price:         number | null
  thumbnail_url: string | null
  rating:        number
  downloads:     number
  is_available:  boolean
}

const CATEGORIES = ['Barchasi', 'Biznes', 'Psixologiya', 'Texnologiya', 'Til', 'Tarix', 'Ilm-fan']

const CATEGORY_COLORS: Record<string, string> = {
  'Biznes':      '#3b82f6',
  'Psixologiya': '#a855f7',
  'Texnologiya': '#06b6d4',
  'Til':         '#22c55e',
  'Tarix':       '#f59e0b',
  'Ilm-fan':     '#ef4444',
}

function BookCard({ book }: { book: Book }) {
  const { c }  = useTheme()
  const router = useRouter()
  const color  = CATEGORY_COLORS[book.category ?? ''] ?? c.brand

  return (
    <Pressable
      onPress={() => router.push(`/(screens)/book/${book.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* Cover */}
      {book.thumbnail_url ? (
        <Image source={{ uri: book.thumbnail_url }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, { backgroundColor: `${color}33`, alignItems: 'center', justifyContent: 'center' }]}>
          <BookOpen size={32} color={color} />
        </View>
      )}

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.cardAuthor, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
          {book.author}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Star size={11} color="#fbbf24" fill="#fbbf24" />
            <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {book.rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Download size={11} color={c.textMuted} />
            <Text style={[styles.metaText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {book.downloads.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {book.is_paid && book.price ? (
            <Text style={[styles.price, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
              {book.price.toLocaleString('uz-UZ')} so'm
            </Text>
          ) : (
            <View style={[styles.freeBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Text style={[styles.freeText, { color: '#22c55e', fontFamily: typography.fontFamily.semibold }]}>Bepul</Text>
            </View>
          )}
          {book.category && (
            <View style={[styles.catBadge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.catText, { color, fontFamily: typography.fontFamily.regular }]}>
                {book.category}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

export default function BooksScreen() {
  const { c }  = useTheme()
  const router = useRouter()

  const [books,      setBooks]      = useState<Book[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('Barchasi')
  const [freeOnly,   setFreeOnly]   = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback(async (opts: { q?: string; cat?: string; free?: boolean; refresh?: boolean } = {}) => {
    const { q = search, cat = category, free = freeOnly, refresh = false } = opts
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (cat && cat !== 'Barchasi') params.set('category', cat)
      if (free) params.set('is_paid', 'false')
      params.set('limit', '100')
      const qs = `?${params}`
      const data = await request<Book[]>(`/api/books${qs}`, { auth: true })
      let result = Array.isArray(data) ? data : []
      if (q.trim()) {
        const lq = q.trim().toLowerCase()
        result = result.filter(b =>
          b.title.toLowerCase().includes(lq) || b.author.toLowerCase().includes(lq)
        )
      }
      setBooks(result)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [search, category, freeOnly])

  useEffect(() => { load() }, [])

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load({ q: search }), 300)
    return () => clearTimeout(debounce.current)
  }, [search])

  function selectCategory(cat: string) {
    setCategory(cat)
    load({ cat })
  }

  function toggleFree() {
    const next = !freeOnly
    setFreeOnly(next)
    load({ free: next })
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Kitoblar
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: c.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
          <Search size={15} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Kitob yoki muallif..."
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color={c.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={toggleFree}
          style={[styles.freeBtn, {
            backgroundColor: freeOnly ? 'rgba(34,197,94,0.15)' : c.bgTertiary,
            borderColor:     freeOnly ? '#22c55e' : c.border,
          }]}
        >
          <Text style={[styles.freeBtnText, {
            color:      freeOnly ? '#22c55e' : c.textMuted,
            fontFamily: typography.fontFamily.medium,
          }]}>Bepul</Text>
        </Pressable>
      </View>

      {/* Category chips */}
      <View style={[styles.categoryBar, { borderBottomColor: c.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              onPress={() => selectCategory(cat)}
              style={[styles.catChip, {
                backgroundColor: category === cat ? c.brand : c.bgTertiary,
                borderColor:     category === cat ? c.brand : c.border,
              }]}
            >
              <Text style={[styles.catChipText, {
                color:      category === cat ? '#fff' : c.textMuted,
                fontFamily: category === cat ? typography.fontFamily.semibold : typography.fontFamily.regular,
              }]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Books list */}
      {loading ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing['2xl'] }} />
      ) : (
        <FlatList
          data={books}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <BookCard book={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={c.brand}
              colors={[c.brand]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <BookOpen size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                Kitoblar topilmadi
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    gap:               spacing.sm,
  },
  title: {
    flex:      1,
    fontSize:  typography.size.lg,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
  },
  searchWrap: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.xl,
    borderWidth:       1,
  },
  searchInput: {
    flex:     1,
    fontSize: typography.size.sm,
    padding:  0,
  },
  freeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  freeBtnText: {
    fontSize: typography.size.xs,
  },
  categoryBar: {
    borderBottomWidth: 1,
    paddingVertical:   spacing.sm + 2,
  },
  categoryScroll: {
    paddingHorizontal: spacing.base,
    gap:               spacing.sm,
    alignItems:        'center',
  },
  catChip: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs + 4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  catChipText: {
    fontSize: typography.size.sm,
  },
  list: {
    padding:       spacing.base,
    paddingBottom: 120,
    gap:           spacing.sm + 2,
  },
  card: {
    flexDirection: 'row',
    borderRadius:  radius['2xl'],
    borderWidth:   1,
    overflow:      'hidden',
    gap:           spacing.sm,
  },
  cover: {
    width:  110,
    height: 140,
  },
  cardInfo: {
    flex:            1,
    paddingVertical: spacing.base,
    paddingRight:    spacing.base,
    gap:             6,
    justifyContent:  'space-between',
  },
  cardTitle: {
    fontSize:   typography.size.sm,
    lineHeight: 20,
  },
  cardAuthor: {
    fontSize: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  metaText: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs + 2,
    flexWrap:      'wrap',
  },
  price: {
    fontSize: typography.size.sm,
  },
  freeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radius.full,
  },
  freeText: {
    fontSize: typography.size.xs,
  },
  catBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radius.full,
  },
  catText: {
    fontSize: typography.size.xs,
  },
  empty: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap:             spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.sm,
  },
})
