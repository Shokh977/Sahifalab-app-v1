/**
 * Kartalar — top-level tab. Header + Mine/Public segmented control live
 * here; each tab's body is fully owned by MyDecksTab / PublicSetsTab
 * (components/flashcards). Redesign: gradient-banner deck cards, the old
 * passive 3-column stats bar, and the public tab's 3rd-level sort-tab row
 * are all gone — see components/flashcards/{DeckRow,PublicSetRow,
 * ReviewDueCard}.tsx and the removed DeckCard.tsx.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, Animated as RNAnimated, Platform, KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Check, X } from 'phosphor-react-native'

import { useTheme } from '../../hooks/useTheme'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { flashcards as flashcardsApi } from '../../lib/api'
import { MyDecksTab } from '../../components/flashcards/MyDecksTab'
import { PublicSetsTab } from '../../components/flashcards/PublicSetsTab'
import type { FlashcardDeck } from '../../lib/types'
import { typography, spacing, radius } from '../../lib/constants'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import { deckColors } from '../../src/design/tokens'
import { useTheme as useDesignTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { IconButton, SegmentedControl } from '../../src/components/ui'
import { EXTRA_NEW } from '../../src/features/flashcards/queueMath'
import { Plus as PlusIcon, Search } from 'lucide-react-native'
import { moveSpring, moveTiming } from '../../src/design/rnMotion'

// Eight distinct deck colours (the old list had two oranges and two greens).
// Decks saved with an older colour keep it.
const PRESET_COLORS: readonly string[] = deckColors

type MainTab = 'mine' | 'public'

// ── Create / Edit Deck bottom sheet (unchanged — data/creation flow, not the redesign's concern) ──

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
        moveSpring(sheetAnim,    { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      ]).start()
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        moveTiming(sheetAnim,    { toValue: 400, duration: 200, useNativeDriver: true }),
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
      <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Yopish" style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>

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
            <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={onClose} hitSlop={12}>
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
                    <Pressable accessibilityRole="radio" accessibilityLabel="Rang" accessibilityState={{ selected: sel }}
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FlashcardsScreen() {
  const { colors } = useDesignTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const { addDeck, updateDeck, fetchStats } = useFlashcardStore()

  const [activeTab,   setActiveTab]   = useState<MainTab>('mine')
  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null)

  const openCreate = () => { setEditingDeck(null); setSheetOpen(true) }
  const openEdit   = (deck: FlashcardDeck) => { setEditingDeck(deck); setSheetOpen(true) }

  const onSheetSaved = useCallback((deck: FlashcardDeck) => {
    if (editingDeck) updateDeck(deck)
    else             addDeck(deck)
    setSheetOpen(false)
    fetchStats()
  }, [editingDeck, updateDeck, addDeck, fetchStats])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={[typeScale.title1, styles.flex, { color: colors.text }]} accessibilityRole="header">Kartalar</Text>
        <IconButton icon={Search} accessibilityLabel="Ommaviy toʻplamlarda qidirish" onPress={() => setActiveTab('public')} />
        <IconButton icon={PlusIcon} accessibilityLabel="Yangi toʻplam" onPress={openCreate} />
        <ProfileAvatarButton size={26} />
      </View>

      <SegmentedControl
        segments={['Mening kartalarim', 'Ommaviy toʻplamlar']}
        index={activeTab === 'mine' ? 0 : 1}
        onChange={i => setActiveTab(i === 0 ? 'mine' : 'public')}
        style={styles.segments}
      />

      {activeTab === 'mine' ? (
        <MyDecksTab
          onOpenDeck={id => router.push(`/(screens)/flashcard-deck/${id}` as any)}
          onCreateDeck={openCreate}
          onEditDeck={openEdit}
          onBrowsePublic={() => setActiveTab('public')}
          onStartReview={id => router.push(`/(screens)/flashcard-study/${id}` as any)}
          onMoreNew={id => router.push(`/(screens)/flashcard-study/${id}?extraNew=${EXTRA_NEW}` as any)}
          onOpenAi={() => router.push('/(screens)/ai-flashcard-generate' as any)}
        />
      ) : (
        <PublicSetsTab />
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
    flexDirection:     'row',
    alignItems:        'center',
    paddingLeft:       layout.gutter,
    paddingRight:      space.md,
    paddingVertical:   space.xxs,
  },
  flex:     { flex: 1 },
  segments: { marginHorizontal: layout.gutter, marginTop: space.xs, marginBottom: space.xs },

  // Sheet (create/edit deck) — unchanged
  backdrop: {
    ...StyleSheet.absoluteFill,
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
