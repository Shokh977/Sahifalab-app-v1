import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../hooks/useTheme'
import { typography, radius } from '../../lib/constants'
import { getBadgeEmoji, getTierColor, isStageBadge, stageNum } from '../../lib/badges'
import { darkenHex } from '../flashcards/DeckCard'
import { MagicTree } from '../streak/MagicTree'
import type { StageNumber } from '../../lib/treeTheme'
import type { Badge } from '../../lib/api'

const TILE_SIZE = 104

interface Props {
  badge:   Badge
  onPress: () => void
}

/**
 * One badge tile in the Trofey Xonasi grid. Challenge badges (badge.group
 * === 'challenges') get a visibly premium treatment when earned — a
 * metallic color ring, optional blurred cover-image backdrop, and a
 * stronger glow — reserved ONLY for challenge badges (step-23 Part 5):
 * giving ordinary achievements the same look would spend all its value.
 * Locked tiles reuse the exact same opacity+padlock language as the
 * existing Unvonlar rank grid, for visual consistency across the profile.
 */
export function BadgeTile({ badge, onPress }: Props) {
  const { c } = useTheme()
  const locked = !badge.earned
  const isChallenge = badge.group === 'challenges'
  const isStage = badge.group === 'stages' && isStageBadge(badge.key)
  const emoji = getBadgeEmoji(badge.key)
  const tierColor = isChallenge ? (badge.challenge_color || '#F5A623') : getTierColor(badge.tier)

  const premium = isChallenge && !locked

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View
        style={[
          styles.tile,
          {
            backgroundColor: c.bgSecondary,
            borderColor: premium ? tierColor : c.border,
            borderWidth: premium ? 1.5 : StyleSheet.hairlineWidth,
            opacity: locked ? 0.4 : 1,
          },
          premium && styles.premiumShadow,
          premium && { shadowColor: tierColor },
        ]}
      >
        {/* Premium backdrop — cover-image crop or color gradient, challenge badges only */}
        {premium && (
          badge.challenge_cover_url ? (
            <Image
              source={{ uri: badge.challenge_cover_url }}
              style={[StyleSheet.absoluteFill, { opacity: 0.35, borderRadius: radius.lg }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              blurRadius={6}
            />
          ) : (
            <LinearGradient
              colors={[tierColor + '33', darkenHex(tierColor, 15) + '22']}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
            />
          )
        )}

        {locked && <Text style={styles.lockIcon}>🔒</Text>}

        {isStage ? (
          <MagicTree stage={stageNum(badge.key) as StageNumber} state="alive" size="badge" simplified animate={false} />
        ) : (
          <Text style={[styles.emoji, premium && styles.emojiPremium]}>{emoji}</Text>
        )}

        <Text
          numberOfLines={2}
          style={[
            styles.name,
            { color: locked ? c.textDisabled : c.textPrimary, fontFamily: typography.fontFamily.semibold },
          ]}
        >
          {badge.name}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE, height: TILE_SIZE, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, paddingVertical: 8, gap: 4,
    overflow: 'hidden',
  },
  premiumShadow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  lockIcon: { position: 'absolute', top: 6, right: 6, fontSize: 11 },
  emoji: { fontSize: 32 },
  emojiPremium: { fontSize: 36 },
  name: { fontSize: 11, textAlign: 'center', lineHeight: 13 },
})
