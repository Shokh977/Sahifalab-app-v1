/**
 * Kartalar — top-level tab. Two clear sections: the user's own decks, and the
 * public deck library. One screen, one tap to switch — no nested "more" buttons.
 * (step-17-flashcard-ui-guide)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, Animated as RNAnimated, FlatList,
  Platform, KeyboardAvoidingView, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring,
} from 'react-native-reanimated'
import { Plus, Cards, Check, CaretRight, X, Globe, MagnifyingGlass, SealCheck } from 'phosphor-react-native'

import { useTheme } from '../../hooks/useTheme'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { usePublicDecksStore } from '../../stores/publicDecksStore'
import { flashcards as flashcardsApi } from '../../lib/api'
import { DECK_CATEGORIES } from '../../lib/flashcardCategories'
import { Avatar } from '../../components/ui/Avatar'
import type { FlashcardDeck, PublicDeckItem, DeckSort, DeckCategory } from '../../lib/types'
import { typography, spacing, radius } from '../../lib/constants'

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

// ── My deck card ──────────────────────────────────────────────────────────────

function DeckCard({ deck, onPress }: { deck: FlashcardDeck; onPress: () => void }) {
  const { c } = useTheme()
  const pulse = useSharedValue(1)

  useEffect(() => {
    if (deck.due_count > 0) {
      pulse.value = withRepeat(
        withSequence(withTiming(0.75, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
      )
    }
  }, [deck.due_count])

  const badgeStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))

  const mastery = deck.card_count > 0 ? deck.mastered_count / deck.card_count : 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.deckCard, { backgroundColor: c.bgSecondary, opacity: pressed ? 0.88 : 1 }]}
    >
      {/* Left color stripe — the deck's identity color, consistent everywhere it appears */}
      <View style={[styles.deckStripe, { backgroundColor: deck.color }]} />

      {/* Content */}
      <View style={styles.deckContent}>
        <Text style={[styles.deckTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {deck.title}
        </Text>
        <Text style={[styles.deckMeta, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {deck.card_count} ta karta · {deck.mastered_count} ta o'rganildi
        </Text>
        {/* Mastery bar */}
        <View style={[styles.masteryTrack, { backgroundColor: c.bgTertiary }]}>
          <View style={[styles.masteryFill, { backgroundColor: c.success, width: `${Math.round(mastery * 100)}%` as any }]} />
        </View>
      </View>

      {/* Right: due badge or checkmark */}
      {deck.due_count > 0 ? (
        <Animated.View style={[styles.dueBadge, { backgroundColor: c.accentPrimary }, badgeStyle]}>
          <Text style={[styles.dueBadgeText, { color: c.textInverse, fontFamily: typography.fontFamily.bold }]}>
            {deck.due_count > 99 ? '99+' : deck.due_count}
          </Text>
        </Animated.View>
      ) : deck.card_count > 0 ? (
        <Check size={16} color={c.success} weight="bold" />
      ) : null}

      <CaretRight size={12} color={c.textDisabled} style={{ marginLeft: 4 }} />
    </Pressable>
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

// ── Public deck card ──────────────────────────────────────────────────────────

const SORT_TABS: { key: DeckSort; label: string }[] = [
  { key: 'popular',   label: 'Mashhur' },
  { key: 'newest',    label: 'Yangi' },
  { key: 'top_rated', label: 'Eng yaxshi' },
]

function PublicDeckCard({ deck, featured, onPress }: { deck: PublicDeckItem; featured?: boolean; onPress: () => void }) {
  const { c } = useTheme()
  const isOfficial  = deck.badge_type === 'official'
  const creatorName = isOfficial ? 'Sahifalab' : deck.creator ? deck.creator.name : 'Anonim foydalanuvchi'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.deckCard,
        featured && styles.deckCardFeatured,
        { backgroundColor: c.bgSecondary, opacity: pressed ? 0.88 : 1, height: undefined, paddingVertical: 14 },
      ]}
    >
      <View style={[styles.deckStripe, { backgroundColor: deck.color }]} />
      <View style={[styles.deckContent, { gap: 5 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.deckTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
            {deck.title}
          </Text>
          {isOfficial && (
            <View style={[styles.officialBadge, { backgroundColor: c.accentPrimaryMuted }]}>
              <SealCheck size={11} color={c.accentPrimary} weight="fill" />
              <Text style={[styles.officialBadgeText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sahifalab
              </Text>
            </View>
          )}
        </View>

        <View style={styles.creatorRow}>
          {!isOfficial && <Avatar uri={deck.creator?.avatar_url} name={deck.creator?.name} size={20} />}
          <Text
            style={[
              styles.creatorLine,
              { color: deck.creator || isOfficial ? c.textSecondary : c.textDisabled, fontFamily: typography.fontFamily.regular },
            ]}
            numberOfLines={1}
          >
            {creatorName}
          </Text>
        </View>

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
      </View>
    </Pressable>
  )
}

// ── Public decks tab content ─────────────────────────────────────────────────

function PublicDecksTab() {
  const { c }    = useTheme()
  const router   = useRouter()

  const {
    publicDecks: decks, featuredDecks: featured, filters, page, total, loading, loadingMore,
    setFilters, fetchPublicDecks, fetchFeatured,
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

      {/* Sort tabs */}
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

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PublicDeckCard deck={item} onPress={() => openDeck(item.id)} />}
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
                {decks.map(deck => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
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

  // Deck card (shared shape for own decks + public decks)
  // The color stripe is positioned absolutely rather than via alignSelf:'stretch'
  // — stretch is unreliable for a height-less child in a row with dynamic
  // (content-driven) height, so it could end up shorter than the card.
  deckCard: {
    position:      'relative',
    minHeight:     80,
    borderRadius:  14,
    flexDirection: 'row',
    alignItems:    'center',
    overflow:      'hidden',
    paddingLeft:   18,
  },
  deckCardFeatured: { minHeight: 110 },
  deckStripe:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  deckContent: { flex: 1, gap: 3, paddingRight: 8 },
  deckTitle:   { fontSize: typography.size.base, flexShrink: 1 },
  deckMeta:    { fontSize: typography.size.xs, lineHeight: 16 },
  masteryTrack: { height: 4, borderRadius: 2, width: 120, overflow: 'hidden', marginTop: 2 },
  masteryFill:  { height: 4, borderRadius: 2 },
  dueBadge: {
    width:          28,
    height:         28,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    4,
  },
  dueBadgeText: { fontSize: 12 },

  // Public deck card extras
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.button },
  officialBadgeText: { fontSize: 10 },
  creatorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creatorLine: { fontSize: 13, flexShrink: 1 },
  statsLine:   { fontSize: 11 },
  clonedTag:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.button, marginTop: 2 },
  clonedTagText: { fontSize: 11 },

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
  featuredLabel: { fontSize: typography.size.base, marginBottom: spacing.sm },

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
