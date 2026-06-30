import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, Pressable, StyleSheet,
  Animated, Easing, ActivityIndicator, ScrollView, Switch,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, X } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { flashcards as flashcardsApi, apiErrorDetails } from '../../lib/api'
import { shareFlashcardDeck } from '../../lib/share'
import { DECK_CATEGORIES } from '../../lib/flashcardCategories'
import type { FlashcardDeck, Flashcard } from '../../lib/types'

interface Props {
  visible:     boolean
  deck:        FlashcardDeck
  cards:       Flashcard[]
  onClose:     () => void
  onPublished: (deck: FlashcardDeck) => void
}

const MIN_CARDS = 10

export function PublishSheet({ visible, deck, cards, onClose, onPublished }: Props) {
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()
  const slideAnim   = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const [category,      setCategory]      = useState<string | null>(null)
  const [shareWithName, setShareWithName] = useState(true)
  const [loading,        setLoading]      = useState(false)
  const [error,          setError]        = useState<string | null>(null)
  const [published,      setPublished]    = useState(false)

  useEffect(() => {
    if (visible) {
      setCategory(deck.category ?? null)
      setShareWithName(!deck.is_anonymous)
      setError(null)
      setPublished(false)
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 0,   duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 500, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, deck.category, deck.is_anonymous])

  const cardCount   = deck.card_count
  const hasMinCards = cardCount >= MIN_CARDS
  const hasTitle    = !!(deck.title && deck.title.trim().length >= 3)
  const allFilled   = cards.every(card => card.front_text.trim().length > 0 && card.back_text.trim().length > 0)
  const canPublish  = hasMinCards && hasTitle && allFilled && !!category

  async function handlePublish() {
    if (!canPublish || loading) return
    setLoading(true)
    setError(null)
    try {
      const updated = await flashcardsApi.publishDeck(deck.id, {
        is_anonymous: !shareWithName,
        category:     category!,
      })
      onPublished(updated)
      setPublished(true)
    } catch (e: any) {
      setError(apiErrorDetails(e))
    } finally {
      setLoading(false)
    }
  }

  const sheetPaddingBottom = Math.max(insets.bottom, spacing.md) + spacing.sm

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.overlay}>
        <Animated.View style={[
          styles.sheet,
          { backgroundColor: c.bgSecondary, borderColor: c.border, paddingBottom: sheetPaddingBottom, maxHeight: '65%', transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {published ? (
            <View style={styles.successWrap}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={[styles.successTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                To'plamingiz ommaga ulashildi!
              </Text>
              <Pressable
                style={[styles.publishBtn, { backgroundColor: c.accentPrimary }]}
                onPress={() => shareFlashcardDeck({ id: deck.id, title: deck.title })}
              >
                <Text style={[styles.publishBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                  Havolani ulashish
                </Text>
              </Pressable>
              <Pressable style={styles.closeLink} onPress={onClose}>
                <Text style={[styles.closeLinkText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  Yopish
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                Ommaga ulashish
              </Text>
              <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                To'plamingizni boshqa foydalanuvchilar topib, nusxa olishlari mumkin
              </Text>

              {/* Validation checklist */}
              <View style={styles.checklist}>
                <ChecklistItem ok={hasMinCards} okText={`Kamida 10 ta karta (${cardCount}/${MIN_CARDS})`} c={c} />
                <ChecklistItem ok={hasTitle} okText="Sarlavha mavjud" c={c} />
                <ChecklistItem ok={allFilled} okText="Barcha kartalar to'ldirilgan" c={c} />
              </View>

              {/* Category selector */}
              <Text style={[styles.sectionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                Turkum
              </Text>
              <View style={styles.chipsRow}>
                {DECK_CATEGORIES.map(cat => {
                  const selected = category === cat.key
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => setCategory(cat.key)}
                      style={[
                        styles.chip,
                        { backgroundColor: selected ? c.accentPrimaryMuted : c.bgTertiary, borderColor: selected ? c.accentPrimary : c.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? c.accentPrimary : c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Anonymous toggle */}
              <View style={[styles.toggleRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.toggleLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                    Ismim bilan ulashish
                  </Text>
                  <Text style={[styles.toggleSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {shareWithName
                      ? 'Sizning ismingiz va profilingiz ko\'rsatiladi.'
                      : 'Anonim ulashasiz — ismingiz ko\'rsatilmaydi.'}
                  </Text>
                </View>
                <Switch
                  value={shareWithName}
                  onValueChange={setShareWithName}
                  trackColor={{ false: '#767577', true: `${c.accentPrimary}55` }}
                  thumbColor={shareWithName ? c.accentPrimary : '#f4f3f4'}
                  ios_backgroundColor="#767577"
                />
              </View>

              {error && (
                <Text style={[styles.errorText, { color: c.error, fontFamily: typography.fontFamily.regular }]}>
                  {error}
                </Text>
              )}

              <Pressable
                onPress={handlePublish}
                disabled={!canPublish || loading}
                style={[styles.publishBtn, { backgroundColor: canPublish ? c.accentPrimary : c.bgTertiary }]}
              >
                {loading
                  ? <ActivityIndicator color={c.textInverse} size="small" />
                  : <Text style={[styles.publishBtnText, { color: canPublish ? c.textInverse : c.textDisabled, fontFamily: typography.fontFamily.semibold }]}>
                      Ommaga ulashish
                    </Text>
                }
              </Pressable>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

function ChecklistItem({ ok, okText, c }: { ok: boolean; okText: string; c: any }) {
  return (
    <View style={styles.checklistRow}>
      {ok
        ? <Check size={16} color={c.success} weight="bold" />
        : <X size={16} color={c.error} weight="bold" />}
      <Text style={[styles.checklistText, { color: ok ? c.textSecondary : c.error, fontFamily: typography.fontFamily.regular }]}>
        {okText}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth:          StyleSheet.hairlineWidth,
    paddingHorizontal:    spacing.base,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },

  title:    { fontSize: 20, marginBottom: 4 },
  subtitle: { fontSize: typography.size.sm, marginBottom: spacing.base, lineHeight: 18 },

  checklist: { gap: 8, marginBottom: spacing.base },
  checklistRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistText: { fontSize: typography.size.sm },

  sectionLabel: { fontSize: typography.size.sm, marginBottom: 8 },
  chipsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.base },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.button, borderWidth: 1 },
  chipText:     { fontSize: typography.size.sm },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.base, marginBottom: spacing.base,
  },
  toggleLabel: { fontSize: typography.size.sm },
  toggleSub:   { fontSize: typography.size.xs, lineHeight: 16 },

  errorText: { fontSize: typography.size.xs, textAlign: 'center', marginBottom: spacing.sm },

  publishBtn: {
    height: 52, borderRadius: radius.button,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
  },
  publishBtnText: { fontSize: typography.size.base },

  successWrap:  { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  successEmoji: { fontSize: 40 },
  successTitle: { fontSize: 18, textAlign: 'center', marginBottom: spacing.sm },
  closeLink:      { paddingVertical: spacing.sm },
  closeLinkText:  { fontSize: typography.size.sm },
})
