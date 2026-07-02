/**
 * Study Session screen — flashcard flip, SM-2 rating, XP, session complete.
 * Full-screen immersive experience. No tab bar. Swipe gestures + rating buttons.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, Alert, Dimensions, Platform, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  runOnJS, Easing, interpolate,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { X, ArrowLeft } from 'phosphor-react-native'

import { useTheme } from '../../../hooks/useTheme'
import { flashcards as flashcardsApi } from '../../../lib/api'
import { useFlashcardStore } from '../../../stores/flashcardStore'
import { useAuthStore } from '../../../stores/authStore'
import type { Flashcard, FlashcardDeck } from '../../../lib/types'
import { typography, spacing, radius } from '../../../lib/constants'
import { MilestoneModal } from '../../../components/streak/MilestoneModal'

const { width: SW } = Dimensions.get('window')
const CARD_W = SW - 32
const FLIP_DURATION = 300
const SWIPE_THRESHOLD = SW * 0.35

// ── Adaptive font size by text length ────────────────────────────────────────

function cardFontSize(text: string): number {
  const len = text.length
  if (len <= 20)  return 28
  if (len <= 50)  return 22
  if (len <= 100) return 18
  return 15
}

// ── XP Float ─────────────────────────────────────────────────────────────────

interface XPFloatItem { id: number; xp: number; color: string }

function XPFloats({ items }: { items: XPFloatItem[] }) {
  const { c } = useTheme()
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map(item => (
        <XPFloat key={item.id} xp={item.xp} color={item.color} />
      ))}
    </View>
  )
}

function XPFloat({ xp, color }: { xp: number; color: string }) {
  const opacity = useSharedValue(1)
  const y       = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) })
    y.value       = withTiming(-60, { duration: 600, easing: Easing.out(Easing.quad) })
  }, [])

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: y.value }],
  }))

  return (
    <Animated.View style={[styles.xpFloat, style]}>
      <Text style={[styles.xpFloatText, { color, fontFamily: typography.fontFamily.bold }]}>
        +{xp} XP
      </Text>
    </Animated.View>
  )
}

// ── Session complete screen ───────────────────────────────────────────────────

interface CompleteProps {
  deck:          FlashcardDeck
  totalReviewed: number
  correctCount:  number
  sessionSec:    number
  xpEarned:      number
  masteryBefore: number
  masteryAfter:  number
  onHome:        () => void
  onOther:       () => void
}

function SessionComplete(props: CompleteProps) {
  const { deck, totalReviewed, correctCount, sessionSec, xpEarned, masteryBefore, masteryAfter, onHome, onOther } = props
  const { c }  = useTheme()
  const insets = useSafeAreaInsets()

  const accuracy   = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0
  const mins       = Math.floor(sessionSec / 60)
  const secs       = sessionSec % 60
  const timeStr    = mins > 0 ? `${mins} daqiqa ${secs} soniya` : `${secs} soniya`

  const xpScale = useSharedValue(0.5)
  const xpOpacity = useSharedValue(0)

  useEffect(() => {
    xpScale.value   = withSpring(1, { damping: 10, stiffness: 150 })
    xpOpacity.value = withTiming(1, { duration: 400 })
  }, [])

  const xpStyle = useAnimatedStyle(() => ({
    opacity:   xpOpacity.value,
    transform: [{ scale: xpScale.value }],
  }))

  return (
    <View style={[styles.completeWrap, { backgroundColor: c.bgPrimary, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <ScrollView contentContainerStyle={styles.completeContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.completeCelebration}>🎉</Text>
        <Text style={[styles.completeTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Ajoyib! To'plam yakunlandi
        </Text>

        {/* Stats card */}
        <View style={[styles.completeStats, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <CompleteRow label="Ko'rilgan kartalar" value={`${totalReviewed} ta`} c={c} />
          <CompleteRow label="To'g'ri javoblar"   value={`${accuracy}%`}        c={c} accent={c.success} />
          <CompleteRow label="Sarflangan vaqt"    value={timeStr}               c={c} />
        </View>

        {/* XP earned */}
        <Animated.View style={[styles.xpEarnedWrap, xpStyle]}>
          <Text style={[styles.xpEarned, { color: c.accentPrimary, fontFamily: typography.fontFamily.bold }]}>
            +{xpEarned} XP
          </Text>
        </Animated.View>

        {/* Mastery update */}
        {deck.card_count > 0 && (
          <View style={{ gap: 6, width: '100%' }}>
            <View style={[styles.masteryHeader]}>
              <Text style={[styles.masteryLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                To'plam: {Math.round(masteryAfter * 100)}% o'rganildi
              </Text>
            </View>
            <View style={[styles.masteryTrack, { backgroundColor: c.bgTertiary }]}>
              <View style={[styles.masteryFillBefore, { backgroundColor: c.success + '60', width: `${Math.round(masteryBefore * 100)}%` as any }]} />
              <View style={[styles.masteryFillAfter,  { backgroundColor: c.success, width: `${Math.round(masteryAfter * 100)}%` as any }]} />
            </View>
          </View>
        )}

        {/* Buttons */}
        <Pressable
          onPress={onHome}
          style={({ pressed }) => [styles.completeBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.completeBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
            Bosh sahifaga
          </Text>
        </Pressable>

        <Pressable
          onPress={onOther}
          style={({ pressed }) => [styles.completeOutlineBtn, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.completeOutlineBtnText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            Boshqa to'plam
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

function CompleteRow({ label, value, c, accent }: { label: string; value: string; c: any; accent?: string }) {
  return (
    <View style={styles.completeRow}>
      <Text style={[styles.completeRowLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>{label}</Text>
      <Text style={[styles.completeRowValue, { color: accent ?? c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>{value}</Text>
    </View>
  )
}

// ── Main study screen ─────────────────────────────────────────────────────────

export default function FlashcardStudyScreen() {
  const { id, practice } = useLocalSearchParams<{ id: string; practice?: string }>()
  const deckId   = Number(id)
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()
  const router   = useRouter()

  const { patchDeckCard, fetchDecks } = useFlashcardStore()
  const patchUser         = useAuthStore(s => s.patchUser)

  // ── Session state ──────────────────────────────────────────────────────────
  const [deck,         setDeck]         = useState<FlashcardDeck | null>(null)
  const [queue,        setQueue]        = useState<Flashcard[]>([])
  const [cardIndex,    setCardIndex]    = useState(0)
  const [reviewed,     setReviewed]     = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalXP,      setTotalXP]      = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [flipped,      setFlipped]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [done,         setDone]         = useState(false)
  const [masteryBefore, setMasteryBefore] = useState(0)
  const [masteryAfter,  setMasteryAfter]  = useState(0)
  const [milestoneVisible,  setMilestoneVisible]  = useState(false)
  const [milestoneDays,     setMilestoneDays]     = useState(0)
  const [milestoneBonusXp,  setMilestoneBonusXp]  = useState(0)

  const startTimeRef      = useRef(Date.now())
  const cardStartRef      = useRef(Date.now())
  const sessionSecRef     = useRef(0)
  const sessionTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const submitRatingRef   = useRef<(rating: number) => void>(() => {})
  const initialQueueRef   = useRef(0)   // unique card count (excludes re-queued retries)
  const [sessionSec,    setSessionSec]  = useState(0)
  const [xpFloats,      setXpFloats]    = useState<XPFloatItem[]>([])
  const xpFloatIdRef    = useRef(0)
  const [showHint,      setShowHint]    = useState(true)

  // ── Card flip animation ────────────────────────────────────────────────────
  const rotate   = useSharedValue(0)
  const slideX   = useSharedValue(0)
  const cardScale = useSharedValue(1)

  const frontStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(rotate.value, [0, 90, 180], [1, 0, 0]),
    transform: [{ rotateY: `${rotate.value}deg` }],
  }))

  const backStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(rotate.value, [0, 90, 180], [0, 0, 1]),
    transform: [{ rotateY: `${rotate.value - 180}deg` }],
  }))

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }))
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }))

  // ── Load session ───────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const [d, session] = await Promise.all([
          flashcardsApi.getDeck(deckId),
          flashcardsApi.getStudySession(deckId, practice === '1'),
        ])
        setDeck(d)
        const before = d.card_count > 0 ? d.mastered_count / d.card_count : 0
        setMasteryBefore(before)
        setMasteryAfter(before)

        if (session.cards.length === 0) {
          setDone(true)
        } else {
          initialQueueRef.current = session.cards.length
          setQueue(session.cards)
        }
      } catch (e: any) {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current)
          sessionTimerRef.current = null
        }
        Alert.alert('Xatolik', e.message)
        if (router.canGoBack()) router.back()
        else router.replace(`/(screens)/flashcard-deck/${deckId}` as any)
      } finally {
        setLoading(false)
      }
    })()

    // Session timer
    sessionTimerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setSessionSec(sec)
      sessionSecRef.current = sec
    }, 1000)
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current) }
  }, [deckId])

  const currentCard = queue[cardIndex] ?? null

  // ── Flip card ──────────────────────────────────────────────────────────────
  const flipCard = useCallback(() => {
    if (flipped) {
      // Flip back to front
      rotate.value = withTiming(0, { duration: FLIP_DURATION, easing: Easing.inOut(Easing.quad) })
      setFlipped(false)
      return
    }
    setShowHint(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    rotate.value = withTiming(180, { duration: FLIP_DURATION, easing: Easing.inOut(Easing.quad) }, () => {
      runOnJS(setFlipped)(true)
    })
  }, [flipped])

  // ── Advance to next card ───────────────────────────────────────────────────
  const _afterSlide = useCallback((nextQueue: Flashcard[]) => {
    setQueue(nextQueue)
    setCardIndex(0)
    setFlipped(false)
    rotate.value = 0
    slideX.value = SW
    slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) })
    cardStartRef.current = Date.now()
  }, [])

  const advanceCard = useCallback((nextQueue: Flashcard[], direction: 'left' | 'right' | 'up' = 'left') => {
    const exitX = direction === 'left' ? -SW : direction === 'right' ? SW : 0

    slideX.value = withTiming(exitX, { duration: 200, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(_afterSlide)(nextQueue)
    })
  }, [_afterSlide])

  // ── Submit rating ──────────────────────────────────────────────────────────
  const submitRating = useCallback(async (rating: number) => {
    if (!currentCard || !deck) return

    const timeMs = Date.now() - cardStartRef.current
    setReviewed(r => r + 1)
    if (rating >= 3) setCorrectCount(n => n + 1)

    // Press animation
    cardScale.value = withSpring(0.96, { damping: 8, stiffness: 400 }, () => {
      cardScale.value = withSpring(1, { damping: 12, stiffness: 200 })
    })

    // Fire review in background (don't block UI)
    flashcardsApi.reviewCard(currentCard.id, { rating, time_spent_ms: timeMs })
      .then(result => {
        const xpGained = result.xp_awarded
        if (xpGained > 0) {
          const floatId = ++xpFloatIdRef.current
          setXpFloats(prev => [...prev, { id: floatId, xp: xpGained, color: c.accentPrimary }])
          setTimeout(() => setXpFloats(prev => prev.filter(f => f.id !== floatId)), 700)
          setTotalXP(t => t + xpGained)
          if (result.deck_bonus_xp > 0) setTotalXP(t => t + result.deck_bonus_xp)
        }
        if (result.newly_mastered && deck) {
          setMasteryAfter(prev => Math.min(1, prev + (1 / deck.card_count)))
        }
      })
      .catch(() => {})

    // Build next queue
    const remaining = queue.slice(cardIndex + 1)

    if (rating === 1) {
      // Re-insert 3-5 cards from now
      const insertAt = Math.min(3, remaining.length)
      const next = [...remaining]
      next.splice(insertAt, 0, currentCard)
      advanceCard(next, 'left')
    } else if (remaining.length === 0) {
      // Session done — award session XP + goal
      const totalMs = Date.now() - startTimeRef.current
      flashcardsApi.completeSession(deckId, {
        total_time_ms: totalMs,
        cards_reviewed: initialQueueRef.current || reviewed + 1,
      }).then(result => {
        setTotalXP(t => t + result.xp_awarded)
        patchUser({ streak_days: result.streak_days })
        fetchDecks()
        if (result.challenges_completed?.length > 0) {
          const ch = result.challenges_completed[0]
          const days = parseInt(ch.key.replace('streak_', ''), 10)
          if (!isNaN(days)) {
            setMilestoneDays(days)
            setMilestoneBonusXp(ch.bonus_xp)
            setMilestoneVisible(true)
          }
        }
      }).catch(() => {})

      // Stop timer
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
      setDone(true)
    } else {
      advanceCard(remaining, 'left')
    }
  }, [currentCard, deck, queue, cardIndex, reviewed, deckId, c.accentPrimary])

  // Keep ref in sync so the gesture handler always calls the latest version
  useEffect(() => { submitRatingRef.current = submitRating }, [submitRating])

  // ── Swipe gesture ──────────────────────────────────────────────────────────
  const swipeGesture = Gesture.Pan()
    .onEnd(e => {
      if (!flipped) return
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(submitRatingRef.current)(1)  // forgot
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(submitRatingRef.current)(3)  // good
      } else if (e.translationY < -SWIPE_THRESHOLD * 0.7) {
        runOnJS(submitRatingRef.current)(2)  // hard
      }
    })

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(flipCard)()
  })

  const composed = Gesture.Race(swipeGesture, tapGesture)

  // ── Session complete ───────────────────────────────────────────────────────
  if (!loading && done && deck) {
    return (
      <>
        <SessionComplete
          deck={deck}
          totalReviewed={reviewed}
          correctCount={correctCount}
          sessionSec={sessionSecRef.current}
          xpEarned={totalXP}
          masteryBefore={masteryBefore}
          masteryAfter={masteryAfter}
          onHome={() => router.push('/(tabs)' as any)}
          onOther={() => router.push('/(tabs)/flashcards' as any)}
        />
        <MilestoneModal
          visible={milestoneVisible}
          days={milestoneDays}
          bonusXp={milestoneBonusXp}
          onClose={() => setMilestoneVisible(false)}
        />
      </>
    )
  }

  if (loading || !currentCard || !deck) {
    return (
      <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
        <View style={styles.loader}>
          <ActivityIndicator color={c.accentPrimary} size="large" />
        </View>
      </View>
    )
  }

  const total    = queue.length
  const progress = reviewed / Math.max(1, reviewed + queue.length - cardIndex)
  const mins     = Math.floor(sessionSec / 60)
  const secs     = sessionSec % 60
  const timeStr  = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => setShowConfirm(true)} hitSlop={12}>
          <X size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.progressText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {reviewed} / {reviewed + queue.length - cardIndex}
        </Text>
        <Text style={[styles.timer, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {timeStr}
        </Text>
      </View>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <View style={[styles.progressBar, { backgroundColor: c.bgTertiary }]}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: c.accentPrimary, width: `${Math.round(progress * 100)}%` as any }]}
        />
      </View>

      {/* ── Card area ──────────────────────────────────────────────────────── */}
      <View style={styles.cardArea}>
        <Animated.View style={[scaleStyle, slideStyle]}>
          <GestureDetector gesture={composed}>
            <View style={[styles.card, { backgroundColor: c.bgSecondary, borderColor: c.border, shadowColor: '#000' }]}>
              {/* Deck colour accent bar */}
              <View style={[styles.cardAccentBar, { backgroundColor: deck.color }]} />
              {/* Front face */}
              <Animated.View style={[StyleSheet.absoluteFill, styles.cardFace, frontStyle]}>
                <Text style={[styles.cardSideLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                  OLD TOMON
                </Text>
                <ScrollView contentContainerStyle={styles.cardTextWrap} showsVerticalScrollIndicator={false}>
                  <Text style={[
                    styles.cardText,
                    { color: c.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: cardFontSize(currentCard.front_text) },
                  ]}>
                    {currentCard.front_text}
                  </Text>
                </ScrollView>
                {showHint && (
                  <Text style={[styles.tapHint, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                    Kartani bosing ☝️
                  </Text>
                )}
              </Animated.View>

              {/* Back face */}
              <Animated.View style={[StyleSheet.absoluteFill, styles.cardFace, backStyle]}>
                <Text style={[styles.cardSideLabel, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                  ORQA TOMON
                </Text>
                <ScrollView contentContainerStyle={styles.cardTextWrap} showsVerticalScrollIndicator={false}>
                  <Text style={[
                    styles.cardText,
                    { color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: cardFontSize(currentCard.back_text) },
                  ]}>
                    {currentCard.back_text}
                  </Text>
                </ScrollView>
              </Animated.View>
            </View>
          </GestureDetector>
        </Animated.View>

        {/* XP floats */}
        <XPFloats items={xpFloats} />
      </View>

      {/* ── Rating buttons (shown only after flip) ─────────────────────────── */}
      <View style={[styles.ratingArea, { paddingBottom: insets.bottom + spacing.lg }]}>
        {flipped ? (
          <View style={styles.ratingRow}>
            <RatingBtn
              label="Bilmayman"
              icon="✗"
              bg={c.errorMuted}
              textColor={c.error}
              onPress={() => submitRating(1)}
            />
            <RatingBtn
              label="Qiyin"
              icon="~"
              bg={c.warningMuted}
              textColor={c.warning}
              onPress={() => submitRating(2)}
            />
            <RatingBtn
              label="Bilaman"
              icon="✓"
              bg={c.successMuted}
              textColor={c.success}
              onPress={() => submitRating(3)}
            />
          </View>
        ) : (
          <View style={styles.ratingPlaceholder} />
        )}
      </View>

      {/* ── Close confirm ──────────────────────────────────────────────────── */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={[styles.confirmOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.confirmCard, { backgroundColor: c.bgSecondary }]}>
            <Text style={[styles.confirmTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Sessiyani tugatish
            </Text>
            <Text style={[styles.confirmSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Natijalar saqlanadi.
            </Text>
            <Pressable
              onPress={() => {
                setShowConfirm(false)
                if (router.canGoBack()) router.back()
                else router.replace(`/(screens)/flashcard-deck/${deckId}` as any)
              }}
              style={({ pressed }) => [styles.confirmBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.confirmBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Yakunlash
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowConfirm(false)} style={styles.confirmLink}>
              <Text style={[styles.confirmLinkText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Davom ettirish
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ── Rating button ─────────────────────────────────────────────────────────────

function RatingBtn({ label, icon, bg, textColor, onPress }: {
  label: string; icon: string; bg: string; textColor: string; onPress: () => void
}) {
  const { c }   = useTheme()
  const scale   = useSharedValue(1)
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    scale.value = withSpring(0.94, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 })
    })
    onPress()
  }

  return (
    <Animated.View style={[styles.ratingBtnWrap, btnStyle]}>
      <Pressable onPress={handlePress} style={[styles.ratingBtn, { backgroundColor: bg }]}>
        <Text style={[styles.ratingIcon, { color: textColor }]}>{icon}</Text>
        <Text style={[styles.ratingLabel, { color: textColor, fontFamily: typography.fontFamily.semibold }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
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
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenMargin,
  },
  progressText: { fontSize: typography.size.base },
  timer:        { fontSize: typography.size.xs, fontVariant: ['tabular-nums'] },

  progressBar: { height: 3, width: '100%' },
  progressFill: { height: 3 },

  cardArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  card: {
    width:         CARD_W,
    height:        Math.round(Dimensions.get('window').height * 0.52),
    borderRadius:  20,
    borderWidth:   StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 3 },
    elevation:     4,
    overflow:      'hidden',
  },
  cardAccentBar: {
    position:     'absolute',
    top:          0,
    left:         0,
    right:        0,
    height:       4,
    zIndex:       1,
  },
  cardFace: {
    padding:        24,
    alignItems:     'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardSideLabel: {
    fontSize:      11,
    letterSpacing: 1,
    position:      'absolute',
    top:           16,
  },
  cardTextWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    flexGrow:       1,
    paddingVertical: 32,
  },
  cardText: { textAlign: 'center', lineHeight: 36 },
  tapHint: {
    fontSize:  12,
    position:  'absolute',
    bottom:    16,
  },

  // XP float
  xpFloat: {
    position:  'absolute',
    bottom:    80,
    alignSelf: 'center',
  },
  xpFloatText: { fontSize: 13 },

  // Rating
  ratingArea: { paddingHorizontal: spacing.screenMargin },
  ratingRow:  { flexDirection: 'row', gap: 10 },
  ratingPlaceholder: { height: 52 },
  ratingBtnWrap: { flex: 1 },
  ratingBtn: {
    height:         52,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  ratingIcon:  { fontSize: 14, fontWeight: '700' },
  ratingLabel: { fontSize: 12 },

  // Confirm modal
  confirmOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  confirmCard: {
    width: '100%', borderRadius: radius.modal, padding: spacing.xl,
    gap: spacing.sm, alignItems: 'center',
  },
  confirmTitle:   { fontSize: typography.size.lg, textAlign: 'center' },
  confirmSub:     { fontSize: typography.size.sm, textAlign: 'center' },
  confirmBtn: {
    width: '100%', height: 52, borderRadius: radius['2xl'],
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  confirmBtnText: { fontSize: typography.size.base },
  confirmLink:    { paddingVertical: spacing.sm },
  confirmLinkText: { fontSize: typography.size.sm },

  // Session complete
  completeWrap:    { flex: 1 },
  completeContent: { padding: spacing.screenMargin, alignItems: 'center', gap: spacing.lg },
  completeCelebration: { fontSize: 56, textAlign: 'center' },
  completeTitle:   { fontSize: 22, textAlign: 'center' },
  completeStats: {
    width: '100%', borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.base, gap: spacing.sm,
  },
  completeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  completeRowLabel: { fontSize: typography.size.sm },
  completeRowValue: { fontSize: typography.size.sm },
  xpEarnedWrap: { alignItems: 'center' },
  xpEarned:     { fontSize: 24 },
  masteryHeader:  { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  masteryLabel:   { fontSize: typography.size.sm },
  masteryTrack:   { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden', position: 'relative' },
  masteryFillBefore: { height: 8, borderRadius: 4, position: 'absolute', left: 0, top: 0 },
  masteryFillAfter:  { height: 8, borderRadius: 4, position: 'absolute', left: 0, top: 0 },
  completeBtn: {
    width: '100%', height: 52, borderRadius: radius['2xl'],
    alignItems: 'center', justifyContent: 'center',
  },
  completeBtnText: { fontSize: typography.size.base },
  completeOutlineBtn: {
    width: '100%', height: 48, borderRadius: radius['2xl'], borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  completeOutlineBtnText: { fontSize: typography.size.base },
})
