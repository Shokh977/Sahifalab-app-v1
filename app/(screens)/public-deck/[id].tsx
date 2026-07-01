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
import { ArrowLeft, SealCheck, Star, ShareNetwork, Flag, CaretRight } from 'phosphor-react-native'

import { useTheme } from '../../../hooks/useTheme'
import { useOnline } from '../../../hooks/useOnline'
import { apiErrorDetails } from '../../../lib/api'
import { shareFlashcardDeck } from '../../../lib/share'
import { useFlashcardStore } from '../../../stores/flashcardStore'
import { usePublicDecksStore } from '../../../stores/publicDecksStore'
import { typography, spacing, radius } from '../../../lib/constants'
import { ReportSheet } from '../../../components/flashcards/ReportSheet'
import { Avatar } from '../../../components/ui/Avatar'

export default function PublicDeckPreviewScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const deckId  = Number(id)
  const { c }   = useTheme()
  const insets  = useSafeAreaInsets()
  const router  = useRouter()
  const isOnline = useOnline()
  const { addDeck } = useFlashcardStore()
  const { previewDeck: deck, fetchDeckPreview } = usePublicDecksStore()

  const [loading,    setLoading]    = useState(true)
  const [cloning,    setCloning]    = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchDeckPreview(deckId)
    setLoading(false)
  }, [deckId, fetchDeckPreview])

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  useEffect(() => {
    if (!loading && !deck) {
      Alert.alert('Xatolik', "To'plam topilmadi")
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)/flashcards' as any)
    }
  }, [loading, deck])

  async function handleClone() {
    if (!deck || cloning || !isOnline) return
    if (deck.already_cloned) {
      // The clone already exists — find it via the user's own decks and navigate.
      router.push(`/(tabs)/flashcards` as any)
      return
    }
    setCloning(true)
    try {
      const cloned = await usePublicDecksStore.getState().cloneDeck(deckId)
      addDeck(cloned)
      await fetchDeckPreview(deckId)
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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/flashcards' as any)} hitSlop={12}>
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
        {/* Header — deck color shows up here as a subtle accent, and as the
            stripe on every list card, so the deck has one consistent identity. */}
        <View style={[styles.colorAccent, { backgroundColor: deck.color }]} />
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
        {!!deck.description && (
          <Text style={[styles.description, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {deck.description}
          </Text>
        )}

        {/* Creator card — author always reads as a person: avatar + role label + name */}
        {isOfficial ? (
          <View style={[styles.creatorCard, { backgroundColor: c.bgSecondary, borderColor: c.accentPrimary + '33' }]}>
            <View style={[styles.officialAvatar, { backgroundColor: c.accentPrimaryMuted }]}>
              <SealCheck size={20} color={c.accentPrimary} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.creatorLabel, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                RASMIY TO'PLAM
              </Text>
              <Text style={[styles.creatorName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Sahifalab
              </Text>
              <Text style={[styles.creatorSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Sifati tekshirilgan rasmiy to'plam.
              </Text>
            </View>
          </View>
        ) : deck.creator ? (
          <Pressable
            onPress={() => router.push(`/(screens)/profile/${deck.creator!.id}` as any)}
            style={({ pressed }) => [styles.creatorCard, { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}
          >
            <Avatar uri={deck.creator.avatar_url} name={deck.creator.name} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.creatorLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                MUALLIF
              </Text>
              <Text style={[styles.creatorName, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                {deck.creator.name}
              </Text>
            </View>
            <CaretRight size={16} color={c.textDisabled} />
          </Pressable>
        ) : (
          <View style={[styles.creatorCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Avatar uri={null} name={null} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.creatorLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
                MUALLIF
              </Text>
              <Text style={[styles.creatorName, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                Anonim foydalanuvchi
              </Text>
            </View>
          </View>
        )}

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: c.bgTertiary, borderColor: c.border }]}>
          <StatItem label="Kartalar" value={String(deck.card_count)} />
          <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
          <StatItem label="Nusxalar" value={String(deck.clone_count)} />
          <View style={[styles.statsDivider, { backgroundColor: c.border }]} />
          <StatItem label="Baho" value={deck.rating_count > 0 ? `⭐ ${deck.rating_avg.toFixed(1)}` : '—'} />
        </View>

        {/* Card preview — one cohesive group, not separate floating boxes */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Namuna kartalar
          </Text>
          <View style={[styles.previewGroup, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            {deck.preview_cards.map((card, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.previewCardDivider, { backgroundColor: c.borderSubtle }]} />}
                <View style={styles.previewCard}>
                  <Text style={[styles.previewFront, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]} numberOfLines={1}>
                    {card.front_text}
                  </Text>
                  <Text style={[styles.previewBack, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
                    {card.back_text}
                  </Text>
                </View>
              </React.Fragment>
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
                <Avatar uri={r.rater.avatar_url} name={r.rater.name} size={28} />
                <View style={{ flex: 1, gap: 4 }}>
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
          disabled={cloning || (!isOnline && !deck.already_cloned)}
          style={[styles.cloneBtn, { backgroundColor: (!isOnline && !deck.already_cloned) ? c.bgTertiary : c.accentPrimary }]}
        >
          {cloning
            ? <ActivityIndicator color={c.textInverse} size="small" />
            : <Text style={[styles.cloneBtnText, { color: (!isOnline && !deck.already_cloned) ? c.textDisabled : c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                {!isOnline && !deck.already_cloned ? 'Internet aloqasi kerak' : deck.already_cloned ? 'Mening nusxamga o\'tish' : 'Nusxa olish'}
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

  colorAccent: { width: 36, height: 4, borderRadius: 2, marginBottom: -4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deckTitle: { flex: 1, fontSize: 22 },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.button },
  officialBadgeText: { fontSize: 11 },
  description: { fontSize: typography.size.sm, lineHeight: 20 },

  // Creator card — set apart with a border so it doesn't blend into the
  // "wall of white boxes" the rest of the screen is built from.
  creatorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.base,
  },
  officialAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  creatorLabel: { fontSize: 11, letterSpacing: 0.5, marginBottom: 1 },
  creatorName: { fontSize: typography.size.base },
  creatorSub:  { fontSize: typography.size.xs, marginTop: 1 },

  statsRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, paddingVertical: spacing.base },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: typography.size.xs },
  statsDivider: { width: 1, marginVertical: 2 },

  sectionTitle: { fontSize: typography.size.base },
  previewGroup: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  previewCard: { padding: spacing.base, gap: 2 },
  previewCardDivider: { height: 1 },
  previewFront: { fontSize: typography.size.sm },
  previewBack:  { fontSize: typography.size.xs },
  previewNote:  { fontSize: typography.size.xs, textAlign: 'center' },

  ratingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingsBig:    { fontSize: 22 },
  ratingsCount:  { fontSize: typography.size.sm },
  noRatings:     { fontSize: typography.size.sm },
  reviewRow:     { flexDirection: 'row', gap: 10, borderRadius: 12, padding: spacing.base },
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
