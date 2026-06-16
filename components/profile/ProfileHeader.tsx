/**
 * ProfileHeroCard — the two-tone cover card at the top of every profile.
 * Upper 68%: Sahifalab orange gradient.
 * Lower 32%: bgSecondary (dark/white).
 * Avatar sits exactly at the colour boundary, left-aligned.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing } from '../../lib/constants'
import type { ProfileData } from '../../lib/types'

const CARD_RADIUS  = 16
const AVATAR_SIZE  = 82
const ORANGE_H     = 112   // height of the orange section
const BOTTOM_H     = 46    // height of the card-colour section (avatar overlaps both)

interface Props {
  data: ProfileData
}

export function ProfileHeroCard({ data }: Props) {
  const { c } = useTheme()
  const initials = data.first_name.slice(0, 2).toUpperCase()

  return (
    <View style={styles.wrapper}>
      {/* Two-tone rounded card */}
      <View style={[styles.card, { borderColor: c.border }]}>
        {/* Orange top — fake gradient: bright top, darker overlay at bottom */}
        <View style={styles.orangeSection}>
          <View style={styles.orangeOverlay} />
        </View>
        {/* Card-colour bottom */}
        <View style={[styles.bottomSection, { backgroundColor: c.bgSecondary }]} />
      </View>

      {/* Avatar pinned at colour boundary, left-aligned */}
      <View style={styles.avatarWrap}>
        {data.photo_url ? (
          <Image
            source={{ uri: data.photo_url }}
            style={[styles.avatar, { borderColor: c.bgSecondary }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: c.brandSubtle, borderColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: c.brand, fontSize: 26, fontFamily: typography.fontFamily.bold }}>
              {initials}
            </Text>
          </View>
        )}
        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: c.brand }]}>
          <Text style={[styles.levelText, { fontFamily: typography.fontFamily.bold }]}>
            Lv.{data.level}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.sm,
  },
  card: {
    borderRadius: CARD_RADIUS,
    overflow:     'hidden',
    borderWidth:  StyleSheet.hairlineWidth,
  },
  orangeSection: {
    height:          ORANGE_H,
    backgroundColor: '#e8792f',
    overflow:        'hidden',
  },
  orangeOverlay: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          ORANGE_H * 0.55,
    backgroundColor: 'rgba(180, 60, 10, 0.38)',
  },
  bottomSection: {
    height: BOTTOM_H,
  },
  avatarWrap: {
    position: 'absolute',
    top:      ORANGE_H - AVATAR_SIZE / 2,
    left:     spacing.base,
  },
  avatar: {
    width:        AVATAR_SIZE,
    height:       AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth:  3,
  },
  levelBadge: {
    position:          'absolute',
    bottom:            2,
    right:             -2,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      99,
  },
  levelText: {
    color:    '#fff',
    fontSize: 10,
  },
})
