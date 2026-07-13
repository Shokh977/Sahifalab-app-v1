import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withRepeat, withSequence,
} from 'react-native-reanimated'
import {
  Globe, GraduationCap, Briefcase, BookOpen, Code, Heart,
  Cards, Check, SealCheck, Download, Star,
} from 'phosphor-react-native'

import { useTheme } from '../../hooks/useTheme'
import { Avatar } from '../ui/Avatar'
import { TopBadgeIndicator } from '../profile/TopBadgeIndicator'
import { typography, spacing, radius } from '../../lib/constants'
import type { FlashcardDeck, PublicDeckItem } from '../../lib/types'

// ── Color utility ─────────────────────────────────────────────────────────────

export function darkenHex(hex: string, amount = 20): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else                h = ((r - g) / d + 4) / 6
    }
    l = Math.max(0, l - amount / 100)
    if (s === 0) {
      const v = Math.round(l * 255).toString(16).padStart(2, '0')
      return `#${v}${v}${v}`
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (pp: number, qq: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return pp + (qq - pp) * 6 * t
      if (t < 1 / 2) return qq
      if (t < 2 / 3) return pp + (qq - pp) * (2 / 3 - t) * 6
      return pp
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
    return '#' + toHex(hue2rgb(p, q, h + 1 / 3)) + toHex(hue2rgb(p, q, h)) + toHex(hue2rgb(p, q, h - 1 / 3))
  } catch { return hex }
}

// ── Category icon ─────────────────────────────────────────────────────────────

export function CategoryIcon({ category, size = 28 }: { category: string | null; size?: number }) {
  const color = 'rgba(255,255,255,0.90)'
  switch (category) {
    case 'english':     return <Globe size={size} color={color} />
    case 'ielts':       return <GraduationCap size={size} color={color} />
    case 'business':    return <Briefcase size={size} color={color} />
    case 'arabic':      return <BookOpen size={size} color={color} />
    case 'programming': return <Code size={size} color={color} />
    case 'medical':     return <Heart size={size} color={color} />
    default:            return <Cards size={size} color={color} />
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

type MineDeckCardProps = {
  variant: 'mine'
  deck: FlashcardDeck
  size?: 'normal'
  index?: number
  onPress: () => void
}

type PublicDeckCardProps = {
  variant: 'public'
  deck: PublicDeckItem
  size?: 'normal' | 'hero'
  index?: number
  onPress: () => void
}

export type DeckCardProps = MineDeckCardProps | PublicDeckCardProps

// ── Component ─────────────────────────────────────────────────────────────────

export function DeckCard(props: DeckCardProps) {
  const { c } = useTheme()
  const { deck, index = 0, onPress, size = 'normal' } = props

  const isOfficial = deck.badge_type === 'official'
  const deckColor  = deck.color || '#F5A623'
  const gradDark   = darkenHex(deckColor, 22)
  const bandHeight = size === 'hero' ? 90 : 64

  // Derived values extracted before JSX for clean TypeScript narrowing
  const mastered      = props.variant === 'mine' ? props.deck.mastered_count : 0
  const dueCount      = props.variant === 'mine' ? props.deck.due_count : 0
  const mastery       = deck.card_count > 0 ? mastered / deck.card_count : 0
  const isMastered    = deck.card_count > 0 && mastered === deck.card_count

  const creator       = props.variant === 'public' ? props.deck.creator : null
  const cloneCount    = props.variant === 'public' ? props.deck.clone_count : 0
  const ratingAvg     = props.variant === 'public' ? props.deck.rating_avg : 0
  const ratingCount   = props.variant === 'public' ? props.deck.rating_count : 0
  const alreadyCloned = props.variant === 'public' ? props.deck.already_cloned : false
  const creatorName   = isOfficial ? 'Sahifalab'
    : creator ? creator.name : 'Anonim foydalanuvchi'

  // Entrance: staggered fade + slide-up, capped at 8 items
  const ty      = useSharedValue(14)
  const opacity = useSharedValue(0)
  useEffect(() => {
    const delay = Math.min(index, 7) * 55
    ty.value      = withDelay(delay, withTiming(0,  { duration: 280 }))
    opacity.value = withDelay(delay, withTiming(1,  { duration: 280 }))
  }, [])

  // Due-badge pulse (mine only)
  const pulseDue = useSharedValue(1)
  const hasDue   = dueCount > 0
  useEffect(() => {
    if (hasDue) {
      pulseDue.value = withRepeat(
        withSequence(withTiming(0.55, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
      )
    } else {
      pulseDue.value = 1
    }
  }, [hasDue])

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity:   opacity.value,
  }))
  const duePulseStyle = useAnimatedStyle(() => ({ opacity: pulseDue.value }))

  return (
    <Animated.View style={[styles.shadow, { backgroundColor: c.bgSecondary }, entranceStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.bgSecondary, opacity: pressed ? 0.90 : 1 },
        ]}
      >
        {/* Color gradient band */}
        <LinearGradient
          colors={[deckColor, gradDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.band, { height: bandHeight }]}
        >
          <CategoryIcon category={deck.category} size={size === 'hero' ? 34 : 28} />

          {/* Inner highlight — white-to-transparent top-to-bottom */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Official badge pill */}
          {isOfficial && (
            <View style={styles.officialPill}>
              <SealCheck size={10} color="#fff" weight="fill" />
              <Text style={styles.officialPillText}>Sahifalab</Text>
            </View>
          )}
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          {/* Title + due badge / checkmark */}
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: c.textPrimary, fontFamily: typography.fontFamily.semibold },
                size === 'hero' && { fontSize: 17 },
              ]}
              numberOfLines={2}
            >
              {deck.title}
            </Text>

            {props.variant === 'mine' && (
              dueCount > 0 ? (
                <Animated.View style={[styles.dueBadge, { backgroundColor: c.accentPrimary }, duePulseStyle]}>
                  <Text style={[styles.dueBadgeText, { color: c.textInverse, fontFamily: typography.fontFamily.bold }]}>
                    {dueCount > 99 ? '99+' : dueCount}
                  </Text>
                </Animated.View>
              ) : isMastered ? (
                <Check size={16} color={c.success} weight="bold" />
              ) : null
            )}
          </View>

          {/* Creator row (public only) */}
          {props.variant === 'public' && (
            <View style={styles.creatorRow}>
              {isOfficial ? (
                <View style={[styles.officialDot, { backgroundColor: c.accentPrimaryMuted }]}>
                  <SealCheck size={11} color={c.accentPrimary} weight="fill" />
                </View>
              ) : (
                <Avatar uri={creator?.avatar_url} name={creator?.name} size={20} />
              )}
              <Text
                style={[styles.creatorName, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}
                numberOfLines={1}
              >
                {creatorName}
              </Text>
              {!isOfficial && <TopBadgeIndicator topBadge={creator?.top_badge} />}
            </View>
          )}

          {/* Stats row */}
          {props.variant === 'mine' ? (
            <View style={styles.statsRow}>
              <Cards size={13} color={c.textDisabled} />
              <Text style={[styles.statsText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {deck.card_count} ta karta
              </Text>
              <Text style={[styles.statsDot, { color: c.textDisabled }]}>·</Text>
              <Text style={[styles.statsText, { color: c.success, fontFamily: typography.fontFamily.regular }]}>
                {mastered} ta o'rganildi
              </Text>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <Cards size={13} color={c.textDisabled} />
              <Text style={[styles.statsText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {deck.card_count}
              </Text>
              <Text style={[styles.statsDot, { color: c.textDisabled }]}>·</Text>
              <Download size={13} color={c.textDisabled} />
              <Text style={[styles.statsText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {cloneCount}
              </Text>
              <Text style={[styles.statsDot, { color: c.textDisabled }]}>·</Text>
              <Star
                size={13}
                color={ratingCount > 0 ? '#FFB830' : c.textDisabled}
                weight={ratingCount > 0 ? 'fill' : 'regular'}
              />
              <Text style={[styles.statsText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : '—'}
              </Text>
            </View>
          )}

          {/* Mastery bar (mine only) */}
          {props.variant === 'mine' && deck.card_count > 0 && (
            <View style={[styles.masteryTrack, { backgroundColor: c.bgTertiary }]}>
              <View
                style={[
                  styles.masteryFill,
                  { backgroundColor: c.success, width: `${Math.round(mastery * 100)}%` as any },
                ]}
              />
            </View>
          )}

          {/* Already-cloned tag (public only) */}
          {props.variant === 'public' && alreadyCloned && (
            <View style={[styles.clonedTag, { backgroundColor: c.successMuted }]}>
              <Check size={11} color={c.success} weight="bold" />
              <Text style={[styles.clonedTagText, { color: c.success, fontFamily: typography.fontFamily.medium }]}>
                Nusxa olingan
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Outer wrapper carries the shadow (overflow:hidden on the inner card clips it on iOS)
  shadow: {
    borderRadius:  16,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius:  10,
    elevation:     4,
  },
  card: {
    borderRadius: 16,
    overflow:     'hidden',
  },

  band: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 14,
  },

  officialPill: {
    position:          'absolute',
    top:                9,
    right:              10,
    flexDirection:      'row',
    alignItems:         'center',
    gap:                4,
    backgroundColor:   'rgba(255,255,255,0.22)',
    paddingHorizontal:  8,
    paddingVertical:    4,
    borderRadius:       12,
  },
  officialPillText: {
    color:    '#fff',
    fontSize: 10,
  },

  content: {
    paddingHorizontal: 14,
    paddingTop:        10,
    paddingBottom:     12,
    gap:               6,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  title: {
    flex:       1,
    fontSize:   typography.size.base,
    lineHeight: 20,
  },

  dueBadge: {
    minWidth:          26,
    height:            26,
    borderRadius:      13,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 6,
  },
  dueBadgeText: { fontSize: 12 },

  creatorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  officialDot: {
    width:          20,
    height:         20,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  creatorName: { fontSize: 12, flexShrink: 1 },

  statsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           5,
  },
  statsText: { fontSize: 11 },
  statsDot:  { fontSize: 11 },

  masteryTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  masteryFill:  { height: 4, borderRadius: 2 },

  clonedTag: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    alignSelf:         'flex-start',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.button,
    marginTop:         2,
  },
  clonedTagText: { fontSize: 11 },
})
