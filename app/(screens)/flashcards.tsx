/**
 * Flashcards — Deck List screen.
 * Accessed from O'qish tab flashcard mode or dashboard smart action.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, Animated as RNAnimated,
  Platform, KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring,
} from 'react-native-reanimated'
import { Plus, Cards, Check, CaretRight, X } from 'phosphor-react-native'

import { useTheme } from '../../hooks/useTheme'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { flashcards as flashcardsApi } from '../../lib/api'
import type { FlashcardDeck } from '../../lib/types'
import { typography, spacing, radius } from '../../lib/constants'

const PRESET_COLORS = [
  '#F5A623', '#FF6B6B', '#4DA6FF', '#34C759', '#AF52DE',
  '#FF9F0A', '#30D158', '#FF375F', '#64D2FF', '#FFD60A',
]

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

// ── Deck card ─────────────────────────────────────────────────────────────────

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
      {/* Left color stripe */}
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

function StatsCard() {
  const { c }   = useTheme()
  const stats   = useFlashcardStore(s => s.stats)

  if (!stats) return null

  return (
    <View style={[styles.statsCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <StatItem label="Jami kartalar"  value={stats.total_cards}    color={c.textPrimary} />
      <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
      <StatItem label="O'rganilgan"    value={stats.total_mastered} color={c.success} />
      <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
      <StatItem label="Bugun ko'rildi" value={stats.today_reviewed} color={c.accentPrimary} />
    </View>
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { c } = useTheme()
  return (
    <View style={styles.emptyWrap}>
      <Cards size={64} color={c.textDisabled} weight="thin" />
      <Text style={[styles.emptyTitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        Hali kartochka yo'q
      </Text>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [styles.emptyBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.emptyBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
          Birinchi to'plamni yarating
        </Text>
      </Pressable>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FlashcardsScreen() {
  const { c }     = useTheme()
  const insets    = useSafeAreaInsets()
  const router    = useRouter()

  const { decks, loading, fetchDecks, fetchStats, addDeck, updateDeck } = useFlashcardStore()

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
  }, [editingDeck])

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Kartochkalar
        </Text>
        <Pressable onPress={openCreate} hitSlop={10}>
          <Plus size={24} color={c.accentPrimary} weight="bold" />
        </Pressable>
      </View>

      {loading && decks.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <StatsCard />

          {decks.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            decks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onPress={() => router.push(`/(screens)/flashcard-deck/${deck.id}` as any)}
              />
            ))
          )}
        </ScrollView>
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

  // Deck card
  deckCard: {
    height:        80,
    borderRadius:  14,
    flexDirection: 'row',
    alignItems:    'center',
    overflow:      'hidden',
  },
  deckStripe:  { width: 4, alignSelf: 'stretch', marginRight: 14 },
  deckContent: { flex: 1, gap: 3, paddingRight: 8 },
  deckTitle:   { fontSize: typography.size.base },
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

  // Empty state
  emptyWrap: { alignItems: 'center', gap: 12, paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontSize: typography.size.base, marginTop: 8 },
  emptyBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   12,
    borderRadius:      radius.button,
    marginTop:         4,
  },
  emptyBtnText: { fontSize: typography.size.base },

  // Sheet
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
