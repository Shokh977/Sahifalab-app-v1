/**
 * PublicSetsTab — Ommaviy to'plamlar tab body (Kartalar redesign). Header
 * and the Mine/Public segmented control live one level up in
 * app/(tabs)/flashcards.tsx.
 *
 * The old three-level filter stack (search, category chips, Mashhur/Yangi/
 * Eng yaxshi tab row) is replaced by two levels: search+sort row, then
 * category chips. Sorting now lives only in the "Mashhur ⌄" button's sheet.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, TextInput, FlatList,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MagnifyingGlass, X, CaretDown, Cards, SealCheck } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { kartalarColorsFor, kartalarCardShadow } from './subjectTheme'
import { usePublicDecksStore } from '../../stores/publicDecksStore'
import { DECK_CATEGORIES } from '../../lib/flashcardCategories'
import { FilterChips } from './FilterChips'
import { PublicSetRow } from './PublicSetRow'
import { Avatar } from '../ui/Avatar'
import type { PublicDeckItem, DeckSort, DeckCategory } from '../../lib/types'

const SORT_OPTIONS: { key: DeckSort; label: string }[] = [
  { key: 'popular',   label: 'Mashhur' },
  { key: 'newest',    label: 'Yangi' },
  { key: 'top_rated', label: 'Eng yaxshi' },
]

export function PublicSetsTab() {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const {
    publicDecks: decks, featuredDecks: featured, filters, page, total,
    loading, loadingMore, setFilters, fetchPublicDecks, fetchFeatured, cloneDeck,
  } = usePublicDecksStore()
  const { category, sort, search } = filters

  const [refreshing, setRefreshing] = useState(false)
  const [sortSheet, setSortSheet]   = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showFeatured = category === 'all' && !search.trim()

  const load = useCallback(async (opts: { refresh?: boolean } = {}) => {
    if (opts.refresh) setRefreshing(true)
    await fetchPublicDecks(1)
    setRefreshing(false)
  }, [fetchPublicDecks])

  useEffect(() => { load() }, [category, sort])

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(), 300)
    return () => clearTimeout(debounce.current)
  }, [search])

  useEffect(() => {
    if (!showFeatured) return
    fetchFeatured()
  }, [showFeatured, fetchFeatured])

  const loadMore = useCallback(() => {
    if (loadingMore || loading || decks.length >= total) return
    fetchPublicDecks(page + 1)
  }, [loadingMore, loading, decks.length, total, page, fetchPublicDecks])

  const openDeck = (id: number) => router.push(`/(screens)/public-deck/${id}` as any)
  const acquire  = async (id: number) => { await cloneDeck(id) }

  const categoryOptions = useMemo(
    () => [{ key: 'all' as const, label: 'Barchasi' }, ...DECK_CATEGORIES],
    [],
  )

  const isTrulyEmpty = category === 'all' && !search.trim()
  const activeSortLabel = SORT_OPTIONS.find(s => s.key === sort)?.label ?? 'Mashhur'

  // Category section headers — only when browsing "Barchasi" with no search
  // and results actually span more than one category. Embedded as list rows
  // (not a SectionList) so the FlatList keeps virtualising + pagination as-is.
  type ListRow =
    | { type: 'section'; id: string; label: string }
    | { type: 'deck'; id: string; deck: PublicDeckItem }

  const listData = useMemo((): ListRow[] => {
    const showGroups = category === 'all' && !search.trim()
    if (!showGroups) return decks.map(d => ({ type: 'deck' as const, id: `d-${d.id}`, deck: d }))
    const cats = [...new Set(decks.map(d => d.category ?? 'other'))]
    if (cats.length <= 1) return decks.map(d => ({ type: 'deck' as const, id: `d-${d.id}`, deck: d }))
    const rows: ListRow[] = []
    for (const cat of cats) {
      const label = DECK_CATEGORIES.find(cfg => cfg.key === cat)?.label ?? 'Boshqalar'
      rows.push({ type: 'section', id: `s-${cat}`, label })
      for (const d of decks.filter(dk => (dk.category ?? 'other') === cat)) {
        rows.push({ type: 'deck', id: `d-${d.id}`, deck: d })
      }
    }
    return rows
  }, [decks, category, search])

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchSortRow}>
        <View style={[styles.searchWrap, { backgroundColor: kc.surface, borderColor: kc.hairline }]}>
          <MagnifyingGlass size={16} color={kc.textMuted} />
          <TextInput
            value={search}
            onChangeText={text => setFilters({ search: text })}
            placeholder="To'plam qidirish"
            placeholderTextColor={kc.textMuted}
            style={[styles.searchInput, { color: kc.textPrimary, fontFamily: typography.fontFamily.medium }]}
          />
          {!!search && (
            <Pressable onPress={() => setFilters({ search: '' })} hitSlop={8}>
              <X size={14} color={kc.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setSortSheet(true)} style={[styles.sortBtn, { borderColor: kc.hairline }]}>
          <Text style={[styles.sortBtnLabel, { color: kc.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
            {activeSortLabel}
          </Text>
          <CaretDown size={12} color={kc.textMuted} weight="bold" />
        </Pressable>
      </View>

      <FilterChips
        options={categoryOptions.map(c => ({ key: c.key as DeckCategory | 'all', label: c.label }))}
        active={category}
        onChange={key => setFilters({ category: key })}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={kc.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <Text style={[styles.sectionLabel, { color: kc.textMutedStrong }]} numberOfLines={1}>
                  {item.label}
                </Text>
              )
            }
            return (
              <PublicSetRow deck={item.deck} onPress={() => openDeck(item.deck.id)} onAcquire={() => acquire(item.deck.id)} />
            )
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor={kc.accent} colors={[kc.accent]} />
          }
          ListHeaderComponent={
            showFeatured && featured.length > 0 ? (
              <View style={{ marginBottom: spacing.base }}>
                <FeaturedCard deck={featured[0]} onPress={() => openDeck(featured[0].id)} onAcquire={() => acquire(featured[0].id)} />
              </View>
            ) : null
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={kc.accent} style={{ marginVertical: spacing.base }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Cards size={48} color={kc.textMuted} weight="thin" />
              <Text style={[styles.emptyTitle, { color: kc.textMuted, fontFamily: typography.fontFamily.semibold }]}>
                Hech narsa topilmadi
              </Text>
              {!isTrulyEmpty && (
                <Pressable onPress={() => setFilters({ category: 'all', search: '' })} hitSlop={8}>
                  <Text style={[styles.clearLink, { color: kc.accent, fontFamily: typography.fontFamily.bold }]}>
                    Filtrlarni tozalash
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <SortSheet
        visible={sortSheet}
        active={sort}
        onSelect={s => { setFilters({ sort: s }); setSortSheet(false) }}
        onClose={() => setSortSheet(false)}
      />
    </View>
  )
}

// ── Featured card ─────────────────────────────────────────────────────────────

function FeaturedCard({ deck, onPress, onAcquire }: {
  deck: PublicDeckItem; onPress: () => void; onAcquire: () => Promise<void>
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const [acquiring, setAcquiring] = useState(false)
  const [owned, setOwned] = useState(deck.already_cloned)
  const isOfficial = deck.badge_type === 'official'

  async function handleAcquire() {
    if (owned || acquiring) return
    setAcquiring(true)
    try { await onAcquire(); setOwned(true) } catch {} finally { setAcquiring(false) }
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.featured,
        theme === 'dark'
          ? { backgroundColor: '#191C22', borderWidth: 1, borderColor: 'rgba(240,163,43,.26)' }
          : { backgroundColor: '#1A1815' },
      ]}
    >
      {/* Decorative background numeral — card_count stands in for the spec's
          "level numeral" (no level/difficulty field exists on a public deck). */}
      <Text style={[styles.featuredNumeral, { color: 'rgba(240,163,43,.13)' }]} numberOfLines={1}>
        {deck.card_count}
      </Text>

      <Text style={[styles.featuredOverline, { color: kc.accent }]}>TAHRIRIYAT TANLOVI</Text>
      <Text style={[styles.featuredTitle, { color: '#F2F3F5', fontFamily: typography.fontFamily.extrabold }]} numberOfLines={2}>
        {deck.title}
      </Text>

      <View style={styles.featuredAuthorRow}>
        <Avatar uri={deck.creator?.avatar_url} name={deck.creator?.name} size={20} />
        <Text style={styles.featuredAuthorName} numberOfLines={1}>
          {isOfficial ? 'Sahifalab' : (deck.creator?.name ?? 'Anonim')}
        </Text>
        {isOfficial && (
          <View style={styles.officialPill}>
            <SealCheck size={10} color={kc.green} weight="fill" />
            <Text style={[styles.officialPillText, { color: kc.green }]}>Rasmiy</Text>
          </View>
        )}
      </View>

      <View style={styles.featuredActionRow}>
        <Pressable
          onPress={handleAcquire}
          disabled={owned || acquiring}
          style={[styles.featuredBtn, { backgroundColor: kc.accent, opacity: owned ? 0.6 : 1 }]}
        >
          {acquiring
            ? <ActivityIndicator size="small" color={kc.onAccent} />
            : <Text style={[styles.featuredBtnText, { color: kc.onAccent, fontFamily: typography.fontFamily.bold }]}>
                {owned ? 'Olindi' : 'Bepul olish'}
              </Text>
          }
        </Pressable>
        <Text style={styles.featuredMeta} numberOfLines={1}>
          {deck.card_count} karta · {deck.clone_count} yuklab olish
        </Text>
      </View>
    </Pressable>
  )
}

// ── Sort sheet ────────────────────────────────────────────────────────────────

function SortSheet({ visible, active, onSelect, onClose }: {
  visible: boolean; active: DeckSort; onSelect: (key: DeckSort) => void; onClose: () => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const insets = useSafeAreaInsets()
  if (!visible) return null
  return (
    <Modal transparent visible={visible} onRequestClose={onClose} statusBarTranslucent animationType="fade">
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: kc.surface, paddingBottom: insets.bottom + spacing.base }]}>
        <View style={[styles.sheetHandle, { backgroundColor: kc.hairline }]} />
        {SORT_OPTIONS.map(opt => (
          <Pressable key={opt.key} onPress={() => onSelect(opt.key)} style={styles.sheetRow}>
            <Text style={[
              styles.sheetRowLabel,
              { color: opt.key === active ? kc.accent : kc.textPrimary, fontFamily: opt.key === active ? typography.fontFamily.bold : typography.fontFamily.medium },
            ]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  searchSortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius['2xl'], borderWidth: 1,
    paddingHorizontal: spacing.base, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 13 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius['2xl'], borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 11,
  },
  sortBtnLabel: { fontSize: 12, maxWidth: 78 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.base, paddingTop: spacing.sm },
  sectionLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase',
    marginTop: spacing.base, marginBottom: 6,
  },

  emptyWrap: { alignItems: 'center', gap: 10, paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontSize: 14 },
  clearLink:  { fontSize: 13 },

  // Featured
  featured: { borderRadius: radius['4xl'], padding: 15, overflow: 'hidden', gap: 10 },
  featuredNumeral: {
    position: 'absolute', right: -10, bottom: -22,
    fontSize: 92, fontWeight: '800',
  },
  featuredOverline: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  featuredTitle: { fontSize: 17, lineHeight: 22 },
  featuredAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredAuthorName: { fontSize: 11, color: '#C9CBD1', fontWeight: '600', flexShrink: 1 },
  officialPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(55,180,87,0.16)', borderRadius: radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  officialPillText: { fontSize: 9, fontWeight: '700' },
  featuredActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  featuredBtn: { borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 11, minWidth: 110, alignItems: 'center' },
  featuredBtnText: { fontSize: 12.5 },
  featuredMeta: { fontSize: 10.5, color: '#9AA0A6', fontWeight: '600', flexShrink: 1 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: spacing.base,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetRow: { paddingVertical: 14 },
  sheetRowLabel: { fontSize: 14, textAlign: 'center' },
})
