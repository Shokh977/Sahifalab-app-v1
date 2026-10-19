/**
 * Mening kartalarim (redesign Phase 6): the review hero, the AI creation
 * card, then the decks as ListRows with due-count badges (long-press for
 * edit / share / delete), plus one-tap "Yangi toʻplam" and "Ommaviy
 * kutubxona". The Mine/Public switch lives one level up.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Layers, Library, Plus } from 'lucide-react-native'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { flashcards as flashcardsApi } from '../../lib/api'
import { shareFlashcardDeck } from '../../lib/share'
import type { FlashcardDeck } from '../../lib/types'
import { ConfirmModal } from '../ui/ConfirmModal'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { Card, EmptyState, ListRow, SkeletonRow } from '../../src/components/ui'
import { uzText } from '../../src/features/today/today'
import { CardsHero } from '../../src/features/cards/CardsHero'
import { AiCreateCard } from '../../src/features/cards/AiCreateCard'
import { DeckActionsSheet } from '../../src/features/cards/DeckActionsSheet'
import { UpgradeSheet } from '../../src/features/pro/UpgradeSheet'
import { useTodayReviewQueue } from '../../src/features/flashcards/queue'

function deckSubtitle(d: FlashcardDeck): string {
  const pct = d.card_count > 0 ? Math.round((d.mastered_count / d.card_count) * 100) : 0
  return `${d.card_count} ta karta · ${pct}% oʻrganildi`
}

export function MyDecksTab({ onOpenDeck, onCreateDeck, onEditDeck, onBrowsePublic, onStartReview, onMoreNew, onOpenAi }: {
  onOpenDeck:     (id: number) => void
  onCreateDeck:   () => void
  onEditDeck:     (deck: FlashcardDeck) => void
  onBrowsePublic: () => void
  onStartReview:  (deckId: number) => void
  /** "Yana 20 ta yangi karta": a session with 20 new cards past today's limit. */
  onMoreNew:      (deckId: number) => void
  onOpenAi:       () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { decks, stats, loading, fetchDecks, fetchStats, removeDeck } = useFlashcardStore()

  useEffect(() => { fetchDecks(); fetchStats() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [refreshing, setRefreshing] = useState(false)
  const [actionsFor, setActionsFor] = useState<FlashcardDeck | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FlashcardDeck | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [proOpen, setProOpen] = useState(false)

  // Today's queue (Phase 7.5 A1): the same count Bugun shows.
  const queue = useTodayReviewQueue()
  const dueOf = (d: FlashcardDeck) => queue.perDeck[d.id]?.total ?? 0
  // Most due first, then the rest by last change.
  const sorted = useMemo(() => [...decks].sort((a, b) =>
    (queue.perDeck[b.id]?.total ?? 0) - (queue.perDeck[a.id]?.total ?? 0) || (b.updated_at ?? '').localeCompare(a.updated_at ?? '')), [decks, queue.perDeck])

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
      // Best-effort — the row stays if the delete failed; the user can retry.
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const header = (
    <View style={styles.header}>
      <CardsHero
        due={queue.total}
        capped={queue.capped}
        mastered={stats?.total_mastered ?? decks.reduce((s, d) => s + d.mastered_count, 0)}
        total={stats?.total_cards ?? decks.reduce((s, d) => s + d.card_count, 0)}
        onStart={() => { if (queue.top) onStartReview(queue.top.id) }}
        onAdd={onCreateDeck}
        onMoreNew={queue.moreNew != null && queue.newToday === 0 ? () => onMoreNew(queue.moreNew!) : undefined}
      />
      <AiCreateCard onOpen={onOpenAi} onPro={() => setProOpen(true)} />
      {decks.length > 0 && (
        <Text style={[typeScale.overline, { color: colors.textMuted }]} accessibilityRole="header">
          Toʻplamlar · {decks.length}
        </Text>
      )}
    </View>
  )

  if (loading && decks.length === 0) {
    return (
      <View style={styles.content}>
        <Card variant="hero" loading />
        {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={sorted}
        keyExtractor={d => String(d.id)}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.huge }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ListRow
            title={uzText(item.title)}
            subtitle={deckSubtitle(item)}
            leading={{ kind: 'icon', icon: Layers, color: item.color }}
            trailing={dueOf(item) > 0 ? { kind: 'count', count: dueOf(item) } : { kind: 'chevron' }}
            onPress={() => onOpenDeck(item.id)}
            onLongPress={() => setActionsFor(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Layers}
            title="Hali toʻplam yoʻq"
            body="Oʻzingiz yarating yoki ommaviy kutubxonadan nusxa oling."
            action={{ label: 'Yangi toʻplam', onPress: onCreateDeck }}
          />
        }
        ListFooterComponent={
          <Card style={styles.rows}>
            <ListRow title="Yangi toʻplam" leading={{ kind: 'icon', icon: Plus }} trailing={{ kind: 'chevron' }} onPress={onCreateDeck} />
            <ListRow title="Ommaviy kutubxona" subtitle="Tayyor toʻplamlardan nusxa oling" leading={{ kind: 'icon', icon: Library }} trailing={{ kind: 'chevron' }} onPress={onBrowsePublic} />
          </Card>
        }
      />

      <DeckActionsSheet
        deck={actionsFor}
        onClose={() => setActionsFor(null)}
        onEdit={onEditDeck}
        onShare={d => shareFlashcardDeck({ id: d.id, title: d.title })}
        onDelete={setDeleteTarget}
      />
      <UpgradeSheet visible={proOpen} source="kartalar_ai_card" onClose={() => setProOpen(false)} onUpgrade={() => setProOpen(false)} />

      <ConfirmModal
        visible={deleteTarget != null}
        emoji="🗑️"
        title="Toʻplamni oʻchirasizmi?"
        message={deleteTarget ? `"${deleteTarget.title}" va undagi barcha kartalar butunlay oʻchiriladi.` : undefined}
        confirmText={deleting ? 'Oʻchirilmoqda...' : 'Oʻchirish'}
        cancelText="Bekor qilish"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.xxs },
  header: { gap: layout.cardGap, marginBottom: space.xs },
  rows: { paddingVertical: space.xxs, marginTop: layout.sectionGap },
})
