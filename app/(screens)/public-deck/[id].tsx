/**
 * Public Deck Preview — sample cards, creator info, ratings; clone to get the full deck.
 */
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { ArrowLeft, SealCheck, Star, ShareNetwork, Flag } from 'phosphor-react-native'

import { useTheme } from '../../../hooks/useTheme'
import { flashcards as flashcardsApi, apiErrorDetails } from '../../../lib/api'
import { shareFlashcardDeck } from '../../../lib/share'
import { categoryLabel } from '../../../lib/flashcardCategories'
import { useFlashcardStore } from '../../../stores/flashcardStore'
import type { PublicDeckDetail } from '../../../lib/types'
import { typography, spacing, radius } from '../../../lib/constants'
import { ReportSheet } from '../../../components/flashcards/ReportSheet'

export default function PublicDeckPreviewScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const deckId  = Number(id)
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const router  = useRouter()
  const { addDeck } = useFlashcardStore()

  const [deck,       setDeck]       = useState<PublicDeckDetail | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [cloning,    setCloning]    = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const d = await flashcardsApi.getPublicDeck(deckId)
      setDeck(d)
    } catch (e: any) {
      Alert.alert('Xatolik', e.message ?? "To'plam topilmadi")
      router.back()
    } finally {
      setLoading(false)
    }
  }, [deckId])

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  async function handleClone() {
    if (!deck || cloning) return
    if (deck.already_cloned) {
      // The clone already exists — find it via the user's own decks and navigate.
      router.push(`/(screens)/flashcards` as any)
      return
    }
    setCloning(true)
    try {
      const cloned = await flashcardsApi.cloneDeck(deckId)
      addDeck(cloned)
      setDeck(prev => prev ? { ...prev, already_cloned: true, clone_count: prev.clone_count + 1 } : prev)
      router.replace(`/(screens)/flashcard-deck/${cloned.id}` as any)
    } catch (e: any) {
      Alert.alert('Xatolik', apiErrorDetails(e))
    } finally {
      setCloning(false)
    }
  }

  if (loading || !deck) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        <View style={styles.loader}><ActivityIndicator color={c.accentPrimary} size="large" /></View>
      </View>
    )
  }

  const isOfficial = deck.badge_type === 'official'

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={c.textPrimary} />
        </Pressable>
        <Pressable onPress={() => shareFlashcardDeck({ id: deck.id, title: deck.title })} hitSlop={12}>
          <ShareNetwork size={22} color={c.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.deckTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {deck.title}
          </Text>
          {isOfficial && (
            <View style={[styles.officialBadge, { backgroundColor: c.accentPrimaryMuted }]}>
              <SealCheck size={12} color={c.accentPrimary} weight="fill" />
              <Text style={[styles.officialBadgeText, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sahifalab
              </Text>
            </View>
          )}
        </View>
        {!!deck.category && (
          <Text style={[styles.categoryLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {categoryLabel(deck.category)}
          </Text>
        )}
        {!!deck.description && (
          <Text style={[styles.description, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {deck.description}
          </Text>
        )}

        {/* Creator block */}
        <View style={[styles.creatorBlock, { backgroundColor: c.bgSecondary }]}>
          {isOfficial ? (
            <>
              <Text style={[styles.creatorName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sahifalab tomonidan tasdiqlangan
              </Text>
              <Text style={[styles.creatorSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Sifati tekshirilgan rasmiy to'plam.
              </Text>
            </>
          ) : deck.creator ? (
            <Pressable
              onPress={() => router.push(`/(screens)/profile/${deck.creator!.id}` as any)}
              style={styles.creatorTappable}
            >
              <Text style={[styles.creatorName, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                {deck.creator.name}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.creatorName, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Anonim foydalanuvchi
            </Text>
          )}
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
          <StatItem label="Kartalar" value={String(deck.card_count)} />
          <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
          <StatItem label="Nusxalar" value={String(deck.clone_count)} />
          <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
          <StatItem label="Baho" value={deck.rating_count > 0 ? `⭐ ${deck.rating_avg.toFixed(1)}` : '—'} />
        </View>

        {/* Card preview */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Namuna kartalar
          </Text>
          <View style={{ gap: 8 }}>
            {deck.preview_cards.map((card, i) => (
              <View key={i} style={[styles.previewCard, { backgroundColor: c.bgSecondary }]}>
                <Text style={[styles.previewFront, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
                  {card.front_text}
                </Text>
                <Text style={[styles.previewBack, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
                  {card.back_text}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.previewNote, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            To'liq to'plam uchun nusxa oling.
          </Text>
        </View>

        {/* Ratings */}
        <View style={{ gap: spacing.sm }}>
          <View style={styles.ratingsHeader}>
            <Star size={18} color="#FFB830" weight="fill" />
            <Text style={[styles.ratingsBig, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {deck.rating_count > 0 ? deck.rating_avg.toFixed(1) : '—'}
            </Text>
            <Text style={[styles.ratingsCount, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              ({deck.rating_count} ta baho)
            </Text>
          </View>
          {deck.recent_ratings.length === 0 ? (
            <Text style={[styles.noRatings, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
              Hali baholanmagan
            </Text>
          ) : (
            deck.recent_ratings.map((r, i) => (
              <View key={i} style={[styles.reviewRow, { backgroundColor: c.bgSecondary }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewName, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                    {r.rater.name || 'Foydalanuvchi'}
                  </Text>
                  <Text style={{ color: '#FFB830', fontSize: 12 }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </Text>
                </View>
                {!!r.comment && (
                  <Text style={[styles.reviewComment, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {r.comment}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Report link */}
        <Pressable onPress={() => setReportOpen(true)} style={styles.reportLink}>
          <Flag size={13} color={c.textDisabled} />
          <Text style={[styles.reportText, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
            Shikoyat qilish
          </Text>
        </Pressable>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: c.bgPrimary, borderTopColor: c.borderSubtle, paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          onPress={handleClone}
          disabled={cloning}
          style={[styles.cloneBtn, { backgroundColor: c.accentPrimary }]}
        >
          {cloning
            ? <ActivityIndicator color={c.textInverse} size="small" />
            : <Text style={[styles.cloneBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                {deck.already_cloned ? 'Mening nusxamga o\'tish' : 'Nusxa olish'}
              </Text>
          }
        </Pressable>
        <Pressable
          onPress={() => shareFlashcardDeck({ id: deck.id, title: deck.title })}
          style={[styles.shareBtn, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
        >
          <ShareNetwork size={20} color={c.textPrimary} />
        </Pressable>
      </View>

      <ReportSheet visible={reportOpen} deckId={deckId} onClose={() => setReportOpen(false)} />
    </View>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  const { c } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={[styles.statValue, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin, borderBottomWidth: 1,
  },

  scroll: { padding: spacing.screenMargin, gap: spacing.lg },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deckTitle: { flex: 1, fontSize: 22 },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.button },
  officialBadgeText: { fontSize: 11 },
  categoryLabel: { fontSize: typography.size.sm, marginTop: -8 },
  description: { fontSize: typography.size.sm, lineHeight: 20 },

  creatorBlock: { borderRadius: radius.lg, padding: spacing.base, gap: 2 },
  creatorTappable: {},
  creatorName: { fontSize: typography.size.base },
  creatorSub:  { fontSize: typography.size.xs },

  statsRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, paddingVertical: spacing.base },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: typography.size.xs },
  statsDivider: { width: 1, marginVertical: 2 },

  sectionTitle: { fontSize: typography.size.base },
  previewCard: { borderRadius: 12, padding: spacing.base, gap: 2 },
  previewFront: { fontSize: typography.size.sm },
  previewBack:  { fontSize: typography.size.xs },
  previewNote:  { fontSize: typography.size.xs, textAlign: 'center' },

  ratingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingsBig:    { fontSize: 22 },
  ratingsCount:  { fontSize: typography.size.sm },
  noRatings:     { fontSize: typography.size.sm },
  reviewRow:     { borderRadius: 12, padding: spacing.base, gap: 4 },
  reviewHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName:    { fontSize: typography.size.sm },
  reviewComment: { fontSize: typography.size.sm, lineHeight: 18 },

  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: spacing.sm },
  reportText: { fontSize: typography.size.xs },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: spacing.screenMargin, paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  cloneBtn: { flex: 1, height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  cloneBtnText: { fontSize: typography.size.base },
  shareBtn: { width: 52, height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
})
