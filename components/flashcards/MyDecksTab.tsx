/**
 * MyDecksTab — Mening kartalarim tab body (Kartalar redesign). Header and
 * the Mine/Public segmented control live one level up in
 * app/(tabs)/flashcards.tsx — this component owns everything below that:
 * the review-due card, filters, deck rows, "Yangi to'plam" row, empty and
 * skeleton states.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, FlatList, Animated, RefreshControl, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus, ArrowsDownUp, Cards } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { kartalarColorsFor } from './subjectTheme'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { flashcards as flashcardsApi } from '../../lib/api'
import { shareFlashcardDeck } from '../../lib/share'
import { ConfirmModal } from '../ui/ConfirmModal'
import { ReviewDueCard } from './ReviewDueCard'
import { FilterChips, type FilterChipOption } from './FilterChips'
import { DeckRow } from './DeckRow'
import type { FlashcardDeck } from '../../lib/types'

type FilterKey = 'all' | 'due' | 'new'
type SortKey = 'recent' | 'name' | 'due' | 'progress'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent',   label: "Oxirgi ochilgan" },
  { key: 'name',     label: 'Nomi' },
  { key: 'due',      label: 'Takrorlash soni' },
  { key: 'progress', label: 'Progress' },
]

// A deck with nothing reviewed yet and nothing due — the closest available
// signal to "new/unstarted" without a dedicated backend flag.
function isNewDeck(d: FlashcardDeck): boolean {
  return d.mastered_count === 0 && d.due_count === 0
}

function mastery(d: FlashcardDeck): number {
  return d.card_count > 0 ? d.mastered_count / d.card_count : 0
}

export function MyDecksTab({ onOpenDeck, onCreateDeck, onEditDeck, onBrowsePublic, onStartReview }: {
  onOpenDeck:     (id: number) => void
  onCreateDeck:   () => void
  onEditDeck:     (deck: FlashcardDeck) => void
  onBrowsePublic: () => void
  onStartReview:  (deckId: number) => void
}) {
  const { theme } = useTheme()
  const kc = kartalarColorsFor(theme)
  const insets = useSafeAreaInsets()

  const { decks, stats, loading, fetchDecks, fetchStats, removeDeck } = useFlashcardStore()

  useEffect(() => { fetchDecks(); fetchStats() }, [])

  const [filter, setFilter]       = useState<FilterKey>('all')
  const [sort, setSort]           = useState<SortKey>('recent')
  const [sortSheet, setSortSheet] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FlashcardDeck | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dueDecks = useMemo(() => decks.filter(d => d.due_count > 0), [decks])
  const newDecks = useMemo(() => decks.filter(isNewDeck), [decks])

  const filterOptions: FilterChipOption<FilterKey>[] = [
    { key: 'all', label: 'Barchasi', count: decks.length },
    { key: 'due', label: 'Takrorlash', count: dueDecks.length },
    { key: 'new', label: 'Yangi', count: newDecks.length },
  ]

  const filtered = useMemo(() => {
    const base = filter === 'due' ? dueDecks : filter === 'new' ? newDecks : decks
    const list = [...base]
    switch (sort) {
      case 'name':     list.sort((a, b) => a.title.localeCompare(b.title)); break
      case 'due':      list.sort((a, b) => b.due_count - a.due_count); break
      case 'progress': list.sort((a, b) => mastery(b) - mastery(a)); break
      // 'recent': no dedicated "last opened" field on FlashcardDeck — updated_at
      // is the closest available proxy without a new backend field.
      default:          list.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')); break
    }
    return list
  }, [decks, dueDecks, newDecks, filter, sort])

  const totalDue = stats?.total_due ?? dueDecks.reduce((s, d) => s + d.due_count, 0)

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([fetchDecks(), fetchStats()])
    setRefreshing(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await flashcardsApi.deleteDeck(deleteTarget.id)
      removeDeck(deleteTarget.id)
      fetchStats()
    } catch {
      // Best-effort — the row simply stays if the delete failed; the user can retry.
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (loading && decks.length === 0) {
    return (
      <View style={styles.scroll}>
        {[0, 1, 2].map(i => <SkeletonRow key={i} kc={kc} />)}
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={decks.length === 0 ? [] : filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={kc.accent} colors={[kc.accent]} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: decks.length > 0 ? 14 : 0 }}>
            {decks.length > 0 && (
              <ReviewDueCard
                totalDue={totalDue}
                dueDeckCount={dueDecks.length}
                totalCards={stats?.total_cards ?? decks.reduce((s, d) => s + d.card_count, 0)}
                masteredCount={stats?.total_mastered ?? decks.reduce((s, d) => s + d.mastered_count, 0)}
                onStartReview={() => {
                  const target = [...dueDecks].sort((a, b) => b.due_count - a.due_count)[0] ?? decks[0]
                  if (target) onStartReview(target.id)
                }}
              />
            )}
            {decks.length > 0 && (
              <View style={styles.filterRow}>
                <FilterChips options={filterOptions} active={filter} onChange={setFilter} />
                <Pressable onPress={() => setSortSheet(true)} hitSlop={10} style={styles.sortBtn} accessibilityLabel="Saralash">
                  <ArrowsDownUp size={16} color={kc.textMuted} weight="bold" />
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <DeckRow
            deck={item}
            onPress={() => onOpenDeck(item.id)}
            onEdit={() => onEditDeck(item)}
            onShare={() => shareFlashcardDeck({ id: item.id, title: item.title })}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
        ListEmptyComponent={
          decks.length === 0 ? (
            <EmptyState onCreate={onCreateDeck} onBrowsePublic={onBrowsePublic} kc={kc} />
          ) : null
        }
        ListFooterComponent={
          decks.length > 0 ? <NewDeckRow onPress={onCreateDeck} kc={kc} /> : null
        }
      />

      <SortSheet visible={sortSheet} active={sort} onSelect={s => { setSort(s); setSortSheet(false) }} onClose={() => setSortSheet(false)} />

      <ConfirmModal
        visible={deleteTarget != null}
        emoji="🗑️"
        title="To'plamni o'chirasizmi?"
        message={deleteTarget ? `"${deleteTarget.title}" va undagi barcha kartalar butunlay o'chiriladi.` : undefined}
        confirmText={deleting ? "O'chirilmoqda..." : "O'chirish"}
        cancelText="Bekor qilish"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  )
}

// ── "Yangi to'plam" row — dashed border, no shadow ──────────────────────────

function NewDeckRow({ onPress, kc }: { onPress: () => void; kc: ReturnType<typeof kartalarColorsFor> }) {
  return (
    <Pressable onPress={onPress} style={[styles.newDeckRow, { borderColor: kc.accent + '55' }]} accessibilityRole="button">
      <View style={[styles.newDeckTile, { backgroundColor: kc.accentTint }]}>
        <Plus size={20} color={kc.accent} weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.newDeckTitle, { color: kc.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Yangi to'plam
        </Text>
        <Text style={[styles.newDeckSubtitle, { color: kc.textMuted, fontFamily: typography.fontFamily.medium }]}>
          Qo'lda yoki AI bilan · matn, rasm, PDF
        </Text>
      </View>
    </Pressable>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate, onBrowsePublic, kc }: {
  onCreate: () => void; onBrowsePublic: () => void; kc: ReturnType<typeof kartalarColorsFor>
}) {
  return (
    <View style={{ gap: 14 }}>
      <NewDeckRow onPress={onCreate} kc={kc} />
      <Text style={[styles.emptyLine, { color: kc.textMuted, fontFamily: typography.fontFamily.medium }]}>
        Hali to'plam yo'q.{' '}
        <Text onPress={onBrowsePublic} style={{ color: kc.accent, fontFamily: typography.fontFamily.bold }}>
          Ommaviy to'plamlardan boshlang
        </Text>
      </Text>
    </View>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow({ kc }: { kc: ReturnType<typeof kartalarColorsFor> }) {
  const pulse = React.useRef(new Animated.Value(0.4)).current
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [])
  return (
    <Animated.View style={[styles.skelRow, { backgroundColor: kc.surface, opacity: pulse }]}>
      <View style={[styles.skelTile, { backgroundColor: kc.progressTrack }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skelLine, { backgroundColor: kc.progressTrack, width: '70%' }]} />
        <View style={[styles.skelLine, { backgroundColor: kc.progressTrack, width: '40%', height: 9 }]} />
      </View>
    </Animated.View>
  )
}

// ── Sort sheet ────────────────────────────────────────────────────────────────

function SortSheet({ visible, active, onSelect, onClose }: {
  visible: boolean; active: SortKey; onSelect: (key: SortKey) => void; onClose: () => void
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
        <Text style={[styles.sheetTitle, { color: kc.textPrimary, fontFamily: typography.fontFamily.bold }]}>Saralash</Text>
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
  scroll: { padding: spacing.base, gap: 8 },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sortBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  newDeckRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                12,
    borderRadius:       radius['3xl'] + 2,
    padding:            13,
    borderWidth:        1.5,
    borderStyle:        'dashed',
    marginTop:          8,
  },
  newDeckTile: { width: 44, height: 44, borderRadius: radius['2xl'], alignItems: 'center', justifyContent: 'center' },
  newDeckTitle: { fontSize: 13 },
  newDeckSubtitle: { fontSize: 10.5, marginTop: 2 },

  emptyLine: { fontSize: 12.5, lineHeight: 19, textAlign: 'center', paddingTop: 4 },

  skelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius['3xl'] + 2, padding: 13, minHeight: 96, marginBottom: 8,
  },
  skelTile: { width: 44, height: 44, borderRadius: radius['2xl'] },
  skelLine: { height: 12, borderRadius: 4 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: spacing.base,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 15, marginBottom: 6, textAlign: 'center' },
  sheetRow: { paddingVertical: 14 },
  sheetRowLabel: { fontSize: 14, textAlign: 'center' },
})
