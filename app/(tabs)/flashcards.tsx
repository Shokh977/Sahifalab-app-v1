/**
 * Kartalar — top-level tab. Two clear sections: the user's own decks, and the
 * public deck library. One screen, one tap to switch — no nested "more" buttons.
 * (step-17-flashcard-ui-guide)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, Animated as RNAnimated, FlatList,
  Platform, KeyboardAvoidingView, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Plus, Cards, Check, X, Globe, MagnifyingGlass } from 'phosphor-react-native'

import { useTheme } from '../../hooks/useTheme'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { usePublicDecksStore } from '../../stores/publicDecksStore'
import { flashcards as flashcardsApi } from '../../lib/api'
import { DECK_CATEGORIES } from '../../lib/flashcardCategories'
import { DeckCard } from '../../components/flashcards/DeckCard'
import type { FlashcardDeck, PublicDeckItem, DeckSort, DeckCategory } from '../../lib/types'
import { typography, spacing, radius } from '../../lib/constants'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'

const PRESET_COLORS = [
  '#F5A623', '#FF6B6B', '#4DA6FF', '#34C759', '#AF52DE',
  '#FF9F0A', '#30D158', '#FF375F', '#64D2FF', '#FFD60A',
]

type MainTab = 'mine' | 'public'

// ── Create / Edit Deck bottom sheet ──────────────────────────────────────────

interface DeckSheetProps {
  visible:   boolean
  editing:   FlashcardDeck | null
  onClose:   () => void
  onSaved:   (deck: FlashcardDeck) => void
}

function DeckSheet({ visible, editing, onClose, onSaved }: DeckSheetProps) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()

  const [title,  setTitle]  = useState('')
  const [desc,   setDesc]   = useState('')
  const [color,  setColor]  = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)

  const [rendered, setRendered] = useState(visible)
  const backdropAnim = useRef(new RNAnimated.Value(0)).current
  const sheetAnim    = useRef(new RNAnimated.Value(400)).current

  useEffect(() => {
    if (visible) {
      setRendered(true)
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        RNAnimated.spring(sheetAnim,    { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start()
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        RNAnimated.timing(sheetAnim,    { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => { setRendered(false); sheetAnim.setValue(400) })
    }
  }, [visible])

  useEffect(() => {
    if (visible) {
      setTitle(editing?.title ?? '')
      setDesc(editing?.description ?? '')
      setColor(editing?.color ?? PRESET_COLORS[0])
    }
  }, [visible, editing])

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      let deck: FlashcardDeck
      if (editing) {
        deck = await flashcardsApi.updateDeck(editing.id, { title: title.trim(), description: desc.trim() || undefined, color })
      } else {
        deck = await flashcardsApi.createDeck({ title: title.trim(), description: desc.trim() || undefined, color })
      }
      onSaved(deck)
    } catch (e: any) {
      Alert.alert('Xatolik', e.message ?? 'Saqlashda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  if (!rendered) return null

  return (
    <Modal transparent visible={rendered} onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>

      {/* Sheet with keyboard avoidance */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetKav}>
        <RNAnimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.bgSecondary,
              paddingBottom:   insets.bottom + spacing.base,
              transform:       [{ translateY: sheetAnim }],
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {editing ? "To'plamni tahrirlash" : "Yangi to'plam"}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={22} color={c.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing.base, paddingBottom: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ gap: 6 }}>
              <Text style={[styles.inputLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                To'plam nomi
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Masalan: Inglizcha so'zlar"
                placeholderTextColor={c.textDisabled}
                style={[styles.textInput, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
                maxLength={200}
                autoFocus
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.inputLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Izoh (ixtiyoriy)
              </Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Bu to'plam haqida..."
                placeholderTextColor={c.textDisabled}
                style={[styles.textInput, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular, minHeight: 72 }]}
                multiline
                maxLength={500}
              />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[styles.inputLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Rang
              </Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map(col => {
                  const sel = col === color
                  return (
                    <Pressable
                      key={col}
                      onPress={() => setColor(col)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: col, borderColor: sel ? '#fff' : 'transparent', borderWidth: sel ? 2 : 0 },
                      ]}
                    >
                      {sel && <Check size={12} color="#fff" weight="bold" />}
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <Pressable
              onPress={save}
              disabled={saving || !title.trim()}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: title.trim() ? c.accentPrimary : c.bgTertiary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {saving
                ? <ActivityIndicator color={c.textInverse} size="small" />
                : <Text style={[styles.saveBtnText, { color: title.trim() ? c.textInverse : c.textDisabled, fontFamily: typography.fontFamily.semibold }]}>
                    {editing ? 'Saqlash' : 'Yaratish'}
                  </Text>
              }
            </Pressable>
          </ScrollView>
        </RNAnimated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Overall stats card ────────────────────────────────────────────────────────

function StatsCard({ onPressDue }: { onPressDue: () => void }) {
  const { c }   = useTheme()
  const stats   = useFlashcardStore(s => s.stats)

  if (!stats) return null

  const due = stats.total_due

  return (
    <Pressable
      onPress={due > 0 ? onPressDue : undefined}
      style={({ pressed }) => [
        styles.statsCard,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: due > 0 && pressed ? 0.85 : 1 },
      ]}
    >
      <StatItem label="Jami kartalar" value={stats.total_cards}    color={c.textPrimary} />
      <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
      <StatItem label="O'rganilgan"   value={stats.total_mastered} color={c.success} />
      <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
      {due > 0 ? (
        <StatItem label="Takrorlash kerak" value={due} color={c.accentPrimary} />
      ) : (
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: c.success, fontFamily: typography.fontFamily.bold }]}>✓</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={2}>
            Takrorlash kerak
          </Text>
        </View>
      )}
    </Pressable>
  )
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  const { c } = useTheme()
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color, fontFamily: typography.fontFamily.bold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{label}</Text>
    </View>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate, onBrowsePublic }: { onCreate: () => void; onBrowsePublic: () => void }) {
  const { c } = useTheme()
  return (
    <View style={styles.emptyWrap}>
      <Cards size={64} color={c.textDisabled} weight="thin" />
      <Text style={[styles.emptyTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        Hali to'plam yo'q
      </Text>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [styles.emptyBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.emptyBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
          Birinchi to'plamni yarating
        </Text>
      </Pressable>
      <Pressable onPress={onBrowsePublic} hitSlop={8}>
        <Text style={[styles.emptyLink, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
          yoki ommaviy to'plamlardan tanlang
        </Text>
      </Pressable>
    </View>
  )
}

// ── Public decks tab content ─────────────────────────────────────────────────

const SORT_TABS: { key: DeckSort; label: string }[] = [
  { key: 'popular',   label: 'Mashhur' },
  { key: 'newest',    label: 'Yangi' },
  { key: 'top_rated', label: 'Eng yaxshi' },
]

function PublicDecksTab() {
  const { c }    = useTheme()
  const router   = useRouter()

  const {
    publicDecks: decks, featuredDecks: featured, filters, page, total,
    loading, loadingMore, setFilters, fetchPublicDecks, fetchFeatured,
  } = usePublicDecksStore()
  const { category, sort, search } = filters

  const [refreshing, setRefreshing] = useState(false)
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

  // Category grouping — only when browsing "Barchasi" with no search and decks
  // span more than one category. Section labels are embedded as list rows so
  // the FlatList can virtualise them without switching to SectionList.
  type ListRow =
    | { type: 'section'; id: string; label: string }
    | { type: 'deck'; id: string; deck: PublicDeckItem; deckIndex: number }

  const listData = useMemo((): ListRow[] => {
    const showGroups = category === 'all' && !search.trim()
    if (!showGroups) {
      return decks.map((d, i) => ({ type: 'deck' as const, id: `d-${d.id}`, deck: d, deckIndex: i }))
    }
    const cats = [...new Set(decks.map(d => d.category ?? 'other'))]
    if (cats.length <= 1) {
      return decks.map((d, i) => ({ type: 'deck' as const, id: `d-${d.id}`, deck: d, deckIndex: i }))
    }
    const rows: ListRow[] = []
    let di = 0
    for (const cat of cats) {
      const label = DECK_CATEGORIES.find(cfg => cfg.key === cat)?.label ?? 'Boshqalar'
      rows.push({ type: 'section', id: `s-${cat}`, label })
      for (const d of decks.filter(dk => (dk.category ?? 'other') === cat)) {
        rows.push({ type: 'deck', id: `d-${d.id}`, deck: d, deckIndex: di++ })
      }
    }
    return rows
  }, [decks, category, search])

  const isTrulyEmpty = category === 'all' && !search.trim()

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: c.bgInput, borderColor: c.border }]}>
        <MagnifyingGlass size={16} color={c.textDisabled} />
        <TextInput
          value={search}
          onChangeText={text => setFilters({ search: text })}
          placeholder="To'plam qidirish..."
          placeholderTextColor={c.textDisabled}
          style={[styles.searchInput, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}
        />
        {!!search && (
          <Pressable onPress={() => setFilters({ search: '' })} hitSlop={8}>
            <X size={14} color={c.textDisabled} />
          </Pressable>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScrollOuter}
        contentContainerStyle={styles.chipsScroll}
      >
        {([{ key: 'all', label: 'Barchasi' }, ...DECK_CATEGORIES] as { key: DeckCategory | 'all'; label: string }[]).map(cat => {
          const selected = category === cat.key
          return (
            <Pressable
              key={cat.key}
              onPress={() => setFilters({ category: cat.key })}
              style={[styles.chip, { backgroundColor: selected ? c.accentPrimaryMuted : c.bgTertiary, borderColor: selected ? c.accentPrimary : c.border }]}
            >
              <Text style={[styles.chipText, { color: selected ? c.accentPrimary : c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {cat.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Sort tabs — only shown when there are enough decks to warrant sorting */}
      {total >= 6 && (
        <View style={styles.sortRow}>
          {SORT_TABS.map(s => {
            const active = sort === s.key
            return (
              <Pressable key={s.key} onPress={() => setFilters({ sort: s.key })} style={styles.sortTab}>
                <Text style={[styles.sortText, { color: active ? c.accentPrimary : c.textSecondary, fontFamily: active ? typography.fontFamily.semibold : typography.fontFamily.regular }]}>
                  {s.label}
                </Text>
                {active && <View style={[styles.sortUnderline, { backgroundColor: c.accentPrimary }]} />}
              </Pressable>
            )
          })}
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <Text style={[styles.sectionLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.medium }]}>
                  {item.label}
                </Text>
              )
            }
            return (
              <DeckCard
                variant="public"
                deck={item.deck}
                index={item.deckIndex}
                onPress={() => openDeck(item.deck.id)}
              />
            )
          }}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor={c.accentPrimary} colors={[c.accentPrimary]} />
          }
          ListHeaderComponent={
            showFeatured && featured.length > 0 ? (
              <View style={{ marginBottom: spacing.base }}>
                {/* Small tag — not a big header — so content feels primary */}
                <View style={[styles.featuredTagWrap, { backgroundColor: c.bgTertiary }]}>
                  <Text style={[styles.featuredTag, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    ⭐ Tavsiya etilgan
                  </Text>
                </View>
                <DeckCard
                  variant="public"
                  deck={featured[0]}
                  size="hero"
                  index={0}
                  onPress={() => openDeck(featured[0].id)}
                />
                {featured.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingTop: 10 }}
                  >
                    {featured.slice(1).map((deck, i) => (
                      <View key={deck.id} style={{ width: 220 }}>
                        <DeckCard
                          variant="public"
                          deck={deck}
                          index={i + 1}
                          onPress={() => openDeck(deck.id)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={c.accentPrimary} style={{ marginVertical: spacing.base }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Cards size={56} color={c.textDisabled} weight="thin" />
              <Text style={[styles.emptyTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {isTrulyEmpty
                  ? "Hozircha ommaviy to'plamlar yo'q"
                  : "Bu turkumda hali to'plam yo'q"}
              </Text>
              {isTrulyEmpty ? (
                <Text style={[styles.emptySub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                  Tez orada qo'shiladi!
                </Text>
              ) : (
                <Text style={[styles.emptySub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                  Boshqa turkumni tanlab ko'ring
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FlashcardsScreen() {
  const { c }     = useTheme()
  const insets    = useSafeAreaInsets()
  const router    = useRouter()

  const { decks, loading, fetchDecks, fetchStats, addDeck, updateDeck } = useFlashcardStore()

  const [activeTab,   setActiveTab]   = useState<MainTab>('mine')
  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null)

  useEffect(() => {
    fetchDecks()
    fetchStats()
  }, [])

  const openCreate = () => { setEditingDeck(null); setSheetOpen(true) }

  const onSheetSaved = useCallback((deck: FlashcardDeck) => {
    if (editingDeck) updateDeck(deck)
    else             addDeck(deck)
    setSheetOpen(false)
    fetchStats()
  }, [editingDeck, updateDeck, addDeck, fetchStats])

  const startDueReview = () => {
    const dueDeck = [...decks].sort((a, b) => b.due_count - a.due_count)[0]
    if (dueDeck) router.push(`/(screens)/flashcard-study/${dueDeck.id}` as any)
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Kartalar
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={() => setActiveTab('public')} hitSlop={10}>
            <Globe size={22} color={activeTab === 'public' ? c.accentPrimary : c.textSecondary} />
          </Pressable>
          <Pressable onPress={openCreate} hitSlop={10}>
            <Plus size={24} color={c.accentPrimary} weight="bold" />
          </Pressable>
          <ProfileAvatarButton size={28} />
        </View>
      </View>

      {/* Two clear tabs — no nested "more" buttons */}
      <View style={[styles.segmentWrap, { backgroundColor: c.bgTertiary }]}>
        <Pressable
          onPress={() => setActiveTab('mine')}
          style={[styles.segment, activeTab === 'mine' && { backgroundColor: c.bgSecondary }]}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'mine' ? c.textPrimary : c.textSecondary, fontFamily: activeTab === 'mine' ? typography.fontFamily.semibold : typography.fontFamily.regular }]}>
            Mening kartalarim
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('public')}
          style={[styles.segment, activeTab === 'public' && { backgroundColor: c.bgSecondary }]}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'public' ? c.textPrimary : c.textSecondary, fontFamily: activeTab === 'public' ? typography.fontFamily.semibold : typography.fontFamily.regular }]}>
            Ommaviy to'plamlar
          </Text>
        </Pressable>
      </View>

      {activeTab === 'mine' ? (
        loading && decks.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator color={c.accentPrimary} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
            showsVerticalScrollIndicator={false}
          >
            <StatsCard onPressDue={startDueReview} />

            {decks.length === 0 ? (
              <EmptyState onCreate={openCreate} onBrowsePublic={() => setActiveTab('public')} />
            ) : (
              <>
                {decks.map((deck, i) => (
                  <DeckCard
                    key={deck.id}
                    variant="mine"
                    deck={deck}
                    index={i}
                    onPress={() => router.push(`/(screens)/flashcard-deck/${deck.id}` as any)}
                  />
                ))}
                <Pressable
                  onPress={openCreate}
                  style={({ pressed }) => [styles.newDeckBtn, { borderColor: c.border, opacity: pressed ? 0.75 : 1 }]}
                >
                  <Plus size={16} color={c.accentPrimary} weight="bold" />
                  <Text style={[styles.newDeckBtnText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                    Yangi to'plam
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        )
      ) : (
        <PublicDecksTab />
      )}

      <DeckSheet
        visible={sheetOpen}
        editing={editingDeck}
        onClose={() => setSheetOpen(false)}
        onSaved={onSheetSaved}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    height:            52,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenMargin,
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: typography.size.lg },

  segmentWrap: {
    flexDirection: 'row', gap: 4,
    marginHorizontal: spacing.screenMargin, marginTop: spacing.base, marginBottom: spacing.sm,
    borderRadius: radius.button, padding: 4,
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: radius.button - 2, alignItems: 'center' },
  segmentText: { fontSize: typography.size.sm },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.screenMargin, gap: 10 },

  // Stats card
  statsCard: {
    flexDirection:  'row',
    borderRadius:   radius.cardLg,
    borderWidth:    1,
    padding:        spacing.base,
    marginBottom:   2,
  },
  statItem:  { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: typography.size.xs, textAlign: 'center' },
  statsDivider: { width: 1, marginVertical: 4 },

  // Empty state
  emptyWrap: { alignItems: 'center', gap: 10, paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontSize: typography.size.base, marginTop: 8 },
  emptySub:   { fontSize: typography.size.sm },
  emptyBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   12,
    borderRadius:      radius.button,
    marginTop:         4,
  },
  emptyBtnText: { fontSize: typography.size.base },
  emptyLink:    { fontSize: typography.size.sm, marginTop: 2 },

  newDeckBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    paddingVertical:   14,
    borderRadius:      radius.button,
    borderWidth:       1,
    marginTop:         4,
  },
  newDeckBtnText: { fontSize: typography.size.sm },

  // Public decks search / chips / sort
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.screenMargin, marginBottom: spacing.sm,
    borderRadius: radius.input, borderWidth: 1,
    paddingHorizontal: spacing.base, height: 42,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm },

  // flexGrow:0 keeps the horizontal ScrollView at its natural content height —
  // without it, it can stretch to absorb the column's remaining vertical space.
  chipsScrollOuter: { flexGrow: 0, flexShrink: 0 },
  chipsScroll: { gap: 8, paddingHorizontal: spacing.screenMargin, paddingBottom: spacing.sm },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.button, borderWidth: 1 },
  chipText: { fontSize: typography.size.sm },

  sortRow: { flexDirection: 'row', paddingHorizontal: spacing.screenMargin, gap: spacing.lg, marginBottom: spacing.sm },
  sortTab: { paddingBottom: 8 },
  sortText: { fontSize: typography.size.sm },
  sortUnderline: { height: 2, borderRadius: 1, marginTop: 6 },

  list: { padding: spacing.screenMargin, paddingTop: spacing.xs, gap: 10 },

  // Featured hero tag — small chip above the hero card, not a big section header
  featuredTagWrap: {
    alignSelf:         'flex-start',
    paddingHorizontal:  10,
    paddingVertical:    5,
    borderRadius:       20,
    marginBottom:       spacing.sm,
  },
  featuredTag: { fontSize: typography.size.xs },

  // Category section label inside the grouped FlatList
  sectionLabel: {
    fontSize:      typography.size.xs,
    textTransform: 'uppercase' as const,
    letterSpacing:  0.8,
    marginTop:      spacing.base,
    marginBottom:   4,
  },

  // Sheet (create/edit deck)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheetKav: {
    flex:           1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              spacing.screenMargin,
    paddingTop:           12,
    gap:                  spacing.base,
    maxHeight:            '88%',
    elevation:            20,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -3 },
    shadowOpacity:        0.12,
    shadowRadius:         14,
  },
  sheetHandle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   4,
  },
  sheetTitle: { fontSize: typography.size.xl },
  inputLabel: { fontSize: typography.size.sm },
  textInput: {
    borderWidth:  1,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    paddingVertical:   12,
    fontSize:     typography.size.base,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    height:         52,
    borderRadius:   radius.button,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      8,
  },
  saveBtnText: { fontSize: typography.size.base },
})
