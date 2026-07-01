/**
 * Deck Detail screen — shows hero study card, mastery progress, and card list.
 */
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import {
  ArrowLeft, DotsThreeVertical, Plus, PencilSimple, Trash,
  Check, X, Globe, ShareNetwork, Star,
} from 'phosphor-react-native'

import { useTheme } from '../../../hooks/useTheme'
import { flashcards as flashcardsApi } from '../../../lib/api'
import { useFlashcardStore } from '../../../stores/flashcardStore'
import { usePublicDecksStore } from '../../../stores/publicDecksStore'
import type { FlashcardDeck, Flashcard } from '../../../lib/types'
import { typography, spacing, radius } from '../../../lib/constants'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { PublishSheet } from '../../../components/flashcards/PublishSheet'
import { RatingSheet } from '../../../components/flashcards/RatingSheet'
import { shareFlashcardDeck } from '../../../lib/share'

const PRESET_COLORS = [
  '#F5A623', '#FF6B6B', '#4DA6FF', '#34C759', '#AF52DE',
  '#FF9F0A', '#30D158', '#FF375F', '#64D2FF', '#FFD60A',
]

// ── Add / Edit Card sheet ─────────────────────────────────────────────────────

interface CardSheetProps {
  visible:    boolean
  deckId:     number
  deckColor:  string
  editing:    Flashcard | null
  onClose:    () => void
  onSaved:    (card: Flashcard, isNew: boolean) => void
}

function CardSheet({ visible, deckId, deckColor, editing, onClose, onSaved }: CardSheetProps) {
  const { c } = useTheme()
  const [front,      setFront]      = useState('')
  const [back,       setBack]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [quickAdd,   setQuickAdd]   = useState(false)
  const [addedCount, setAddedCount] = useState(0)

  useEffect(() => {
    if (visible) {
      setFront(editing?.front_text ?? '')
      setBack(editing?.back_text ?? '')
      if (!editing) setAddedCount(0)
    }
  }, [visible, editing])

  const save = async () => {
    if (!front.trim() || !back.trim()) return
    setSaving(true)
    try {
      let card: Flashcard
      if (editing) {
        card = await flashcardsApi.updateCard(editing.id, { front_text: front.trim(), back_text: back.trim() })
        onSaved(card, false)
      } else {
        card = await flashcardsApi.addCard(deckId, { front_text: front.trim(), back_text: back.trim() })
        onSaved(card, true)
        if (quickAdd) {
          setAddedCount(n => n + 1)
          setFront('')
          setBack('')
        }
      }
      if (!quickAdd || editing) onClose()
    } catch (e: any) {
      Alert.alert('Xatolik', e.message ?? 'Saqlashda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: c.bgSecondary }]}>
        <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            {editing ? 'Kartani tahrirlash' : quickAdd && addedCount > 0 ? `${addedCount} ta qo'shildi` : 'Yangi karta'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color={c.textSecondary} />
          </Pressable>
        </View>

        <View style={{ gap: spacing.base }}>
          {/* Front */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.inputLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Old tomon
            </Text>
            <TextInput
              value={front}
              onChangeText={setFront}
              placeholder="So'z yoki savol"
              placeholderTextColor={c.textDisabled}
              style={[styles.cardInput, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular }]}
              autoFocus
            />
            <View style={[styles.colorBar, { backgroundColor: deckColor }]} />
          </View>

          {/* Back */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.inputLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Orqa tomon
            </Text>
            <TextInput
              value={back}
              onChangeText={setBack}
              placeholder="Tarjima yoki javob"
              placeholderTextColor={c.textDisabled}
              style={[styles.cardInput, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular, minHeight: 80 }]}
              multiline
            />
          </View>

          {/* Quick add toggle */}
          {!editing && (
            <Pressable
              onPress={() => setQuickAdd(q => !q)}
              style={[styles.quickAddRow, { backgroundColor: quickAdd ? c.accentPrimaryMuted : c.bgInput, borderColor: quickAdd ? c.accentPrimary : c.border }]}
            >
              <View style={[styles.quickAddDot, { backgroundColor: quickAdd ? c.accentPrimary : c.textDisabled }]} />
              <Text style={[styles.quickAddLabel, { color: quickAdd ? c.accentPrimary : c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Ketma-ket qo'shish
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={save}
            disabled={saving || !front.trim() || !back.trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: (front.trim() && back.trim()) ? c.accentPrimary : c.bgTertiary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {saving
              ? <ActivityIndicator color={c.textInverse} size="small" />
              : <Text style={[styles.saveBtnText, { color: (front.trim() && back.trim()) ? c.textInverse : c.textDisabled, fontFamily: typography.fontFamily.semibold }]}>
                  {editing ? 'Saqlash' : "Qo'shish"}
                </Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ── Card row ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:       '#636369',
  learning:  '#FFB830',
  reviewing: '#F5A623',
  mastered:  '#34C759',
}

interface CardRowProps {
  card:     Flashcard
  onEdit:   () => void
  onDelete: () => void
}

function CardRow({ card, onEdit, onDelete }: CardRowProps) {
  const { c } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <View style={[styles.cardRow, { backgroundColor: c.bgSecondary }]}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[card.status] ?? c.textDisabled }]} />
      <View style={styles.cardTexts}>
        <Text style={[styles.cardFront, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {card.front_text}
        </Text>
        <Text style={[styles.cardBack, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
          {card.back_text}
        </Text>
      </View>
      <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}>
        <DotsThreeVertical size={18} color={c.textDisabled} />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
            <Pressable onPress={() => { setMenuOpen(false); onEdit() }} style={styles.menuItem}>
              <PencilSimple size={16} color={c.textPrimary} />
              <Text style={[styles.menuText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Tahrirlash</Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: c.border }]} />
            <Pressable onPress={() => { setMenuOpen(false); onDelete() }} style={styles.menuItem}>
              <Trash size={16} color={c.error} />
              <Text style={[styles.menuText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>O'chirish</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DeckDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const deckId   = Number(id)
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()
  const router   = useRouter()

  const { updateDeck, removeDeck } = useFlashcardStore()

  const [deck,      setDeck]      = useState<FlashcardDeck | null>(null)
  const [cards,     setCards]     = useState<Flashcard[]>([])
  const [loading,   setLoading]   = useState(true)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editCard,  setEditCard]  = useState<Flashcard | null>(null)
  const [publishSheetOpen, setPublishSheetOpen] = useState(false)
  const [ratingSheetOpen,  setRatingSheetOpen]  = useState(false)
  const [myRating,         setMyRating]         = useState<number | null>(null)
  const [confirm, setConfirm] = useState<{ visible: boolean; title: string; message?: string; danger?: boolean; emoji?: string; confirmText?: string; onConfirm: () => void }>({ visible: false, title: '', onConfirm: () => {} })

  const refresh = useCallback(async () => {
    try {
      const [d, c2] = await Promise.all([
        flashcardsApi.getDeck(deckId),
        flashcardsApi.listCards(deckId),
      ])
      setDeck(d)
      setCards(c2)
    } catch (e: any) {
      Alert.alert('Xatolik', e.message)
    } finally {
      setLoading(false)
    }
  }, [deckId])

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  const handleDeleteDeck = () => {
    setConfirm({
      visible:  true,
      title:    "To'plamni o'chirish",
      message:  "Barcha kartalar ham yo'qoladi. 😢",
      danger:   true,
      onConfirm: async () => {
        setConfirm(s => ({ ...s, visible: false }))
        try {
          await flashcardsApi.deleteDeck(deckId)
          removeDeck(deckId)
          if (router.canGoBack()) router.back()
          else router.replace('/(tabs)/flashcards' as any)
        } catch (e: any) {
          Alert.alert('Xatolik', e.message)
        }
      },
    })
  }

  const handleUnpublish = () => {
    setConfirm({
      visible:     true,
      title:       "Ommadan olib tashlaysizmi?",
      message:     "Boshqalar endi topa olmaydi, lekin avval nusxa olganlar saqlanib qoladi.",
      emoji:       '🌐',
      confirmText: 'Olib tashlash',
      onConfirm: async () => {
        setConfirm(s => ({ ...s, visible: false }))
        try {
          const updated = await usePublicDecksStore.getState().unpublishDeck(deckId)
          setDeck(updated)
          updateDeck(updated)
        } catch (e: any) {
          Alert.alert('Xatolik', e.message)
        }
      },
    })
  }

  const handleDeleteCard = (cardId: number) => {
    setConfirm({
      visible:  true,
      title:    "Kartani o'chirish",
      message:  "Bu amalni bekor qilib bo'lmaydi.",
      onConfirm: async () => {
        setConfirm(s => ({ ...s, visible: false }))
        try {
          await flashcardsApi.deleteCard(cardId)
          setCards(prev => prev.filter(c => c.id !== cardId))
          setDeck(prev => prev ? { ...prev, card_count: prev.card_count - 1 } : prev)
        } catch (e: any) {
          Alert.alert('Xatolik', e.message)
        }
      },
    })
  }

  const onCardSaved = (card: Flashcard, isNew: boolean) => {
    if (isNew) {
      setCards(prev => [...prev, card])
      setDeck(prev => prev ? { ...prev, card_count: prev.card_count + 1 } : prev)
    } else {
      setCards(prev => prev.map(c => c.id === card.id ? card : c))
    }
  }

  const openAddCard = () => { setEditCard(null); setSheetOpen(true) }
  const openEditCard = (card: Flashcard) => { setEditCard(card); setSheetOpen(true) }

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <View style={styles.loader}><ActivityIndicator color={c.accentPrimary} size="large" /></View>
      </View>
    )
  }

  if (!deck) return null

  const newCount      = cards.filter(c => c.status === 'new').length
  const learningCount = cards.filter(c => c.status === 'learning').length
  const masteredCount = cards.filter(c => c.status === 'mastered').length
  const reviewedCount = cards.filter(c => c.status !== 'new').length
  const mastery = deck.card_count > 0 ? reviewedCount / deck.card_count : 0

  // Count studyable cards: new (never reviewed) + non-mastered cards whose review is due
  const studyableCount = cards.filter(c =>
    c.status === 'new' ||
    (c.status !== 'mastered' && c.next_review != null && new Date(c.next_review).getTime() <= Date.now())
  ).length
  const hasDue = studyableCount > 0

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/flashcards' as any)} hitSlop={12}>
          <ArrowLeft size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
          {deck.title}
        </Text>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
          <DotsThreeVertical size={24} color={c.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Public badge + rate-the-source-deck (if this is a clone) */}
        {(deck.is_public || deck.cloned_from_deck_id) && (
          <View style={styles.badgeRow}>
            {deck.is_public && (
              <View style={[styles.publicBadge, { backgroundColor: c.accentPrimaryMuted, borderColor: c.accentPrimary }]}>
                <Globe size={13} color={c.accentPrimary} weight="bold" />
                <Text style={[styles.publicBadgeText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                  Ommaviy
                </Text>
              </View>
            )}
            {deck.cloned_from_deck_id && (
              <Pressable
                onPress={() => setRatingSheetOpen(true)}
                style={[styles.rateBadge, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
              >
                <Star size={13} color={myRating ? '#FFB830' : c.textSecondary} weight={myRating ? 'fill' : 'regular'} />
                <Text style={[styles.rateBadgeText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                  {myRating ? `Bahoyingiz: ${myRating}` : "To'plamni baholash"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Hero study card */}
        <View style={[
          styles.heroCard,
          { backgroundColor: deck.color + '1A', borderColor: deck.color + '4D' },
        ]}>
          {hasDue ? (
            <>
              <Text style={[styles.heroCount, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                {studyableCount} ta karta kutmoqda
              </Text>
              <Pressable
                onPress={() => router.push(`/(screens)/flashcard-study/${deck.id}` as any)}
                style={[styles.heroBtn, { backgroundColor: deck.color }]}
              >
                <Text style={[styles.heroBtnText, { color: '#fff', fontFamily: typography.fontFamily.semibold }]}>
                  O'rganishni boshlash
                </Text>
              </Pressable>
            </>
          ) : deck.card_count > 0 ? (
            <>
              <Text style={[styles.heroCount, { color: c.success, fontFamily: typography.fontFamily.bold }]}>
                Hammasi o'rganildi! ✓
              </Text>
              <Text style={[styles.heroSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Ertaga yana kartalar keladi
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: `/(screens)/flashcard-study/${deck.id}`, params: { practice: '1' } } as any)}
                style={styles.practiceLink}
              >
                <Text style={[styles.practiceLinkText, { color: c.accentPrimary, fontFamily: typography.fontFamily.medium }]}>
                  Baribir mashq qilish
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.heroCount, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Hali kartalar yo'q
              </Text>
              <Pressable onPress={openAddCard} style={[styles.heroBtn, { backgroundColor: deck.color }]}>
                <Text style={[styles.heroBtnText, { color: '#fff', fontFamily: typography.fontFamily.semibold }]}>
                  Karta qo'shish
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Mastery progress */}
        {deck.card_count > 0 && (
          <View style={{ gap: 8 }}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                O'rganilganlik darajasi
              </Text>
              <Text style={[styles.progressLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {reviewedCount}/{deck.card_count}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.bgTertiary }]}>
              <View style={[styles.progressFill, { backgroundColor: c.success, width: `${Math.round(mastery * 100)}%` as any }]} />
            </View>
            <Text style={[styles.progressSub, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Yangi: {newCount} · O'rganilmoqda: {learningCount} · O'rganilgan: {masteredCount}
            </Text>
          </View>
        )}

        {/* Card list */}
        <View style={{ gap: 0 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Kartalar
            </Text>
            <Pressable onPress={openAddCard} hitSlop={10}>
              <Text style={[styles.addCardLink, { color: c.accentPrimary, fontFamily: typography.fontFamily.regular }]}>
                + Qo'shish
              </Text>
            </Pressable>
          </View>

          {cards.length === 0 ? (
            <Text style={[styles.emptyCards, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Hali kartalar yo'q. Yuqoridagi tugmani bosing.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {cards.map(card => (
                <CardRow
                  key={card.id}
                  card={card}
                  onEdit={() => openEditCard(card)}
                  onDelete={() => handleDeleteCard(card.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Delete deck */}
        <Pressable
          onPress={handleDeleteDeck}
          style={({ pressed }) => [styles.deleteDeckBtn, { borderColor: c.error, opacity: pressed ? 0.7 : 1 }]}
        >
          <Trash size={16} color={c.error} />
          <Text style={[styles.deleteDeckText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>
            To'plamni o'chirish
          </Text>
        </Pressable>
      </ScrollView>

      {/* Deck options menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuCard, { backgroundColor: c.bgElevated, borderColor: c.border, minWidth: 180 }]}>
            <Pressable
              onPress={() => { setMenuOpen(false); Alert.alert('Tahrirlash', "To'plam tahrirlash sahifasi ochiladi") }}
              style={styles.menuItem}
            >
              <PencilSimple size={16} color={c.textPrimary} />
              <Text style={[styles.menuText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Tahrirlash</Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: c.border }]} />
            {deck.is_public ? (
              <>
                <Pressable onPress={() => { setMenuOpen(false); shareFlashcardDeck({ id: deck.id, title: deck.title }) }} style={styles.menuItem}>
                  <ShareNetwork size={16} color={c.textPrimary} />
                  <Text style={[styles.menuText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Havolani ulashish</Text>
                </Pressable>
                <Pressable onPress={() => { setMenuOpen(false); handleUnpublish() }} style={styles.menuItem}>
                  <Globe size={16} color={c.textPrimary} />
                  <Text style={[styles.menuText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Ommadan olib tashlash</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => { setMenuOpen(false); setPublishSheetOpen(true) }} style={styles.menuItem}>
                <Globe size={16} color={c.textPrimary} />
                <Text style={[styles.menuText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>Ommaga ulashish</Text>
              </Pressable>
            )}
            <View style={[styles.menuDivider, { backgroundColor: c.border }]} />
            <Pressable onPress={() => { setMenuOpen(false); handleDeleteDeck() }} style={styles.menuItem}>
              <Trash size={16} color={c.error} />
              <Text style={[styles.menuText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>O'chirish</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <CardSheet
        visible={sheetOpen}
        deckId={deckId}
        deckColor={deck.color}
        editing={editCard}
        onClose={() => setSheetOpen(false)}
        onSaved={onCardSaved}
      />

      <ConfirmModal
        visible={confirm.visible}
        emoji={confirm.emoji ?? "🗑️"}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText ?? "O'chirish"}
        danger={confirm.danger}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(s => ({ ...s, visible: false }))}
      />

      <PublishSheet
        visible={publishSheetOpen}
        deck={deck}
        cards={cards}
        onClose={() => setPublishSheetOpen(false)}
        onPublished={updated => { setDeck(updated); updateDeck(updated) }}
      />

      {deck.cloned_from_deck_id != null && (
        <RatingSheet
          visible={ratingSheetOpen}
          originalDeckId={deck.cloned_from_deck_id}
          onClose={() => setRatingSheetOpen(false)}
          onRated={rating => setMyRating(rating)}
        />
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    height:            52,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenMargin,
    borderBottomWidth: 1,
    gap:               12,
  },
  topTitle: { flex: 1, fontSize: typography.size.base, textAlign: 'center' },

  scroll: { padding: spacing.screenMargin, gap: spacing.lg },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: -spacing.sm },
  publicBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      radius.button,
    borderWidth:       1,
  },
  publicBadgeText: { fontSize: typography.size.xs },
  rateBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      radius.button,
    borderWidth:       1,
  },
  rateBadgeText: { fontSize: typography.size.xs },

  // Hero card
  heroCard: {
    borderRadius: 20,
    borderWidth:  1,
    padding:      spacing.xl,
    alignItems:   'center',
    gap:          12,
    minHeight:    160,
    justifyContent: 'center',
  },
  heroCount:   { fontSize: 20, textAlign: 'center' },
  heroSub:     { fontSize: typography.size.sm, textAlign: 'center' },
  heroBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   12,
    borderRadius:      radius.button,
  },
  heroBtnText:  { fontSize: typography.size.base },
  practiceLink: { paddingVertical: 4 },
  practiceLinkText: { fontSize: typography.size.sm },

  // Progress
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:  { fontSize: typography.size.sm },
  progressTrack:  { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:   { height: 8, borderRadius: 4 },
  progressSub:    { fontSize: 11 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle:  { fontSize: typography.size.base },
  addCardLink:   { fontSize: typography.size.sm },
  emptyCards:    { fontSize: typography.size.sm, textAlign: 'center', paddingVertical: spacing.lg },

  // Card row
  cardRow: {
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  12,
    padding:       spacing.base,
    gap:           10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardTexts: { flex: 1, gap: 2 },
  cardFront: { fontSize: typography.size.sm },
  cardBack:  { fontSize: typography.size.xs, lineHeight: 16 },

  // Sheet
  sheet: {
    flex: 1,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding: spacing.screenMargin,
    paddingTop: 12,
    gap: spacing.base,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle:  { fontSize: typography.size.lg },
  inputLabel:  { fontSize: typography.size.sm },
  cardInput: {
    borderWidth: 1, borderRadius: radius.input,
    paddingHorizontal: spacing.base, paddingVertical: 12,
    fontSize: typography.size.base,
  },
  colorBar: { height: 2, width: 40, borderRadius: 1, alignSelf: 'center' },
  quickAddRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderWidth:       1,
    borderRadius:      radius.button,
    paddingHorizontal: spacing.base,
    paddingVertical:   10,
  },
  quickAddDot:   { width: 10, height: 10, borderRadius: 5 },
  quickAddLabel: { fontSize: typography.size.sm },
  saveBtn: {
    height: 52, borderRadius: radius.button,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: typography.size.base },

  // Delete deck button
  deleteDeckBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    paddingVertical:   14,
    borderRadius:      radius.button,
    borderWidth:       1,
  },
  deleteDeckText: { fontSize: typography.size.sm },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 90, paddingRight: spacing.screenMargin },
  menuCard: {
    borderRadius: radius.cardLg, borderWidth: 1,
    overflow: 'hidden', minWidth: 160,
  },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.base },
  menuText:    { fontSize: typography.size.base },
  menuDivider: { height: 1 },
})
