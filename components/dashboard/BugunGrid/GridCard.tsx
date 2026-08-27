import React, { useEffect, useRef } from 'react'
import { Pressable, Animated, StyleSheet, ViewStyle } from 'react-native'
import { radius } from '../../../lib/constants'
import { useReduceMotion } from '../../../hooks/useReduceMotion'

const STAGGER_MS = 40

// All four cards share this exact height — row-level flex `stretch` alone
// only equalizes each row's own pair (5 savol/reyting vs ai/haftalik), not
// all four against each other, and each card's content block naturally
// wants a different height. RankGridCard uses this same constant for its
// own (differently-styled) shell so all four stay pixel-identical.
export const GRID_CARD_HEIGHT = 150

/**
 * Shared shell for every "Bugun" grid cell — one reusable card component,
 * four thin content wrappers on top (FiveSavolGridCard, RankGridCard,
 * AiFlashcardGridCard, WeeklyReviewGridCard). Owns: press feedback,
 * first-paint stagger-in, minimum touch height, and the combined
 * accessibility label — none of that should be re-implemented per card.
 */
export function GridCard({
  onPress, accessibilityLabel, staggerIndex = 0, bg, borderColor, shadow = true, children, style,
}: {
  onPress: () => void
  accessibilityLabel: string
  staggerIndex?: number
  bg: string
  borderColor: string
  shadow?: boolean
  children: React.ReactNode
  style?: ViewStyle
}) {
  const reduceMotion = useReduceMotion()
  const pressScale = useRef(new Animated.Value(1)).current
  const enterOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current
  const enterY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current

  useEffect(() => {
    if (reduceMotion) return
    const delay = staggerIndex * STAGGER_MS
    Animated.parallel([
      Animated.timing(enterOpacity, { toValue: 1, duration: 220, delay, useNativeDriver: true }),
      Animated.spring(enterY, { toValue: 0, delay, useNativeDriver: true, damping: 16, stiffness: 200 }),
    ]).start()
    // Intentionally mount-only — this animates the first paint of the
    // screen, not every rebuild (BugunSection's children never remount on
    // data refresh, only on real navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onPressIn() {
    if (reduceMotion) return
    Animated.spring(pressScale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
  }
  function onPressOut() {
    if (reduceMotion) return
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: enterOpacity,
        transform: [{ translateY: enterY }, { scale: pressScale }],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.card,
          shadow && styles.shadow,
          { backgroundColor: bg, borderColor },
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.cardXl,
    borderWidth: 1,
    padding: 13,
    height: GRID_CARD_HEIGHT,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
})
