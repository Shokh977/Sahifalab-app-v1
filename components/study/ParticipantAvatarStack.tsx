import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

const SIZE = 24
const OVERLAP = 8

interface Props {
  avatars:          string[]
  participantCount: number
  cardBg:           string
}

/**
 * Overlapping avatar stack + count for the Ochiq card — a face is more
 * persuasive than a bare number. Zero participants is framed as an
 * invitation ("Birinchi bo'ling!"), never shown as "0 kishi".
 */
export function ParticipantAvatarStack({ avatars, participantCount, cardBg }: Props) {
  const { c } = useTheme()

  if (participantCount === 0) {
    return (
      <Text style={[styles.text, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
        Birinchi bo'ling! 🚀
      </Text>
    )
  }

  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {avatars.slice(0, 4).map((uri, i) => (
          <View
            key={i}
            style={[
              styles.avatarWrap,
              { marginLeft: i === 0 ? 0 : -OVERLAP, borderColor: cardBg, zIndex: 4 - i },
            ]}
          >
            <Image source={{ uri }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
          </View>
        ))}
      </View>
      <Text style={[styles.text, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {participantCount.toLocaleString()} kishi qatnashmoqda
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    borderWidth: 2, overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  text:   { fontSize: 14 },
})
