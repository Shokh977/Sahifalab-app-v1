/**
 * Public Decks Library — discover, search, and filter publicly shared flashcard decks.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, FlatList, TextInput,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, MagnifyingGlass, X, SealCheck, Cards } from 'phosphor-react-native'

import { useTheme } from '../../hooks/useTheme'
import { flashcards as flashcardsApi } from '../../lib/api'
import { DECK_CATEGORIES } from '../../lib/flashcardCategories'
import type { PublicDeckItem, DeckSort, DeckCategory } from '../../lib/types'
import { typography, spacing, radius } from '../../lib/constants'

const SORT_TABS: { key: DeckSort; label: string }[] = [
  { key: 'popular',   label: 'Mashhur' },
  { key: 'newest',    label: 'Yangi' },
  { key: 'top_rated', label: 'Eng yaxshi' },
]

// ── Deck card ─────────────────────────────────────────────────────────────────

function PublicDeckCard({ deck, featured, onPress }: { deck: PublicDeckItem; featured?: boolean; onPress: () => void }) {
  const { c } = useTheme()
  const creatorLine = deck.badge_type === 'official'
    ? 'Sahifalab tomonidan'
    : deck.creator
      ? deck.creator.name
      : 'Anonim foydalanuvchi'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.deckCard,
        featured && styles.deckCardFeatured,
        { backgroundColor: c.bgSecondary, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.deckTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {deck.title}
        </Text>
        {deck.badge_type === 'official' && (
          <View style={[styles.officialBadge, { backgroundColor: c.accentPrimaryMuted }]}>
            <SealCheck size={11} color={c.accentPrimary} weight="fill" />
            <Text style={[styles.officialBadgeText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Sahifalab
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.creatorLine,
          { color: deck.creator || deck.badge_type === 'official' ? c.textSecondary : c.textDisabled, fontFamily: typography.fontFamily.regular },
        ]}
        numberOfLines={1}
      >
        {creatorLine}
      </Text>

      <Text style={[styles.statsLine, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
        📇 {deck.card_count} ta karta · ⬇️ {deck.clone_count} nusxa · {deck.rating_count > 0 ? `⭐ ${deck.rating_avg.toFixed(1)} (${deck.rating_count})` : 'Baholanmagan'}
      </Text>

      {deck.already_cloned && (
        <View style={[styles.clonedTag, { backgroundColor: c.successMuted }]}>
          <Text style={[styles.clonedTagText, { color: c.success, fontFamily: typography.fontFamily.medium }]}>
            ✓ Nusxa olingan
          </Text>
        </View>
      )}
    </Pressable>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PublicDecksScreen() {
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()
  const router   = useRouter()

  const [category,    setCategory]    = useState<DeckCategory | 'all'>('all')
  const [sort,         setSort]       = useState<DeckSort>('popular')
  const [search,       setSearch]     = useState('')
  const [decks,        setDecks]      = useState<PublicDeckItem[]>([])
  const [featured,     setFeatured]   = useState<PublicDeckItem[]>([])
  const [page,         setPage]       = useState(1)
  const [total,        setTotal]      = useState(0)
  const [loading,      setLoading]    = useState(true)
  const [loadingMore,  setLoadingMore] = useState(false)
  const [refreshing,   setRefreshing] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showFeatured = category === 'all' && !search.trim()

  const load = useCallback(async (opts: { refresh?: boolean } = {}) => {
    if (opts.refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await flashcardsApi.listPublicDecks({ category, sort, search: search.trim() || undefined, page: 1, limit: 20 })
      setDecks(res.decks)
      setTotal(res.total)
      setPage(1)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [category, sort, search])

  useEffect(() => { load() }, [category, sort])

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(), 300)
    return () => clearTimeout(debounce.current)
  }, [search])

  useEffect(() => {
    if (!showFeatured) return
    flashcardsApi.getFeaturedDecks().then(setFeatured).catch(() => {})
  }, [showFeatured])

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || decks.length >= total) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await flashcardsApi.listPublicDecks({ category, sort, search: search.trim() || undefined, page: nextPage, limit: 20 })
      setDecks(prev => [...prev, ...res.decks])
      setPage(nextPage)
    } catch {}
    finally { setLoadingMore(false) }
  }, [category, sort, search, page, loadingMore, loading, decks.length, total])

  const openDeck = (id: number) => router.push(`/(screens)/public-deck/${id}` as any)

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Ommaviy to'plamlar
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: c.bgInput, borderColor: c.border }]}>
        <MagnifyingGlass size={16} color={c.textDisabled} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="To'plam qidirish..."
          placeholderTextColor={c.textDisabled}
          style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <X size={14} color={c.textDisabled} />
          </Pressable>
        )}
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {([{ key: 'all', label: 'Barchasi' }, ...DECK_CATEGORIES] as { key: DeckCategory | 'all'; label: string }[]).map(cat => {
          const selected = category === cat.key
          return (
            <Pressable
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              style={[styles.chip, { backgroundColor: selected ? c.accentPrimaryMuted : c.bgTertiary, borderColor: selected ? c.accentPrimary : c.border }]}
            >
              <Text style={[styles.chipText, { color: selected ? c.accentPrimary : c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {cat.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Sort tabs */}
      <View style={styles.sortRow}>
        {SORT_TABS.map(s => {
          const active = sort === s.key
          return (
            <Pressable key={s.key} onPress={() => setSort(s.key)} style={styles.sortTab}>
              <Text style={[styles.sortText, { color: active ? c.accentPrimary : c.textSecondary, fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular }]}>
                {s.label}
              </Text>
              {active && <View style={[styles.sortUnderline, { backgroundColor: c.accentPrimary }]} />}
            </Pressable>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PublicDeckCard deck={item} onPress={() => openDeck(item.id)} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor={c.accentPrimary} colors={[c.accentPrimary]} />
          }
          ListHeaderComponent={
            showFeatured && featured.length > 0 ? (
              <View style={{ marginBottom: spacing.base }}>
                <Text style={[styles.featuredLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  ⭐ Tanlangan to'plamlar
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {featured.map(deck => (
                    <View key={deck.id} style={{ width: 240 }}>
                      <PublicDeckCard deck={deck} featured onPress={() => openDeck(deck.id)} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={c.accentPrimary} style={{ marginVertical: spacing.base }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Cards size={56} color={c.textDisabled} weight="thin" />
              <Text style={[styles.emptyTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Bu turkumda hali to'plam yo'q
              </Text>
              <Text style={[styles.emptySub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                Boshqa turkumni tanlab ko'ring
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin, borderBottomWidth: 1,
  },
  topTitle: { fontSize: typography.size.base },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.screenMargin, marginTop: spacing.base,
    borderRadius: radius.input, borderWidth: 1,
    paddingHorizontal: spacing.base, height: 42,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm },

  chipsScroll: { gap: 8, paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.base },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.button, borderWidth: 1 },
  chipText: { fontSize: typography.size.sm },

  sortRow: { flexDirection: 'row', paddingHorizontal: spacing.screenMargin, gap: spacing.lg, marginBottom: spacing.sm },
  sortTab: { paddingBottom: 8 },
  sortText: { fontSize: typography.size.sm },
  sortUnderline: { height: 2, borderRadius: 1, marginTop: 6 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.screenMargin, paddingTop: spacing.sm, gap: 10 },

  featuredLabel: { fontSize: typography.size.base, marginBottom: spacing.sm },

  // Deck card
  deckCard: { borderRadius: 14, padding: 14, gap: 4 },
  deckCardFeatured: { minHeight: 110 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deckTitle: { flex: 1, fontSize: 15 },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.button },
  officialBadgeText: { fontSize: 10 },
  creatorLine: { fontSize: 13 },
  statsLine: { fontSize: 11, marginTop: 2 },
  clonedTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.button, marginTop: 4 },
  clonedTagText: { fontSize: 11 },

  // Empty state
  emptyWrap: { alignItems: 'center', gap: 6, paddingTop: 60 },
  emptyTitle: { fontSize: typography.size.base, marginTop: 8 },
  emptySub: { fontSize: typography.size.sm },
})
