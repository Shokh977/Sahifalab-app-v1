/**
 * Competition detail header: the cover image (16:9) under a bottom-up dark
 * scrim with the title, status and participants in white; a neutral block
 * with a trophy when there's no image (never the old saturated colour
 * band). Back button on a small dark chip inside the top safe area.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Trophy, Users } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { imageChip, imageScrim, onImage } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { uzText } from '../today/today'

const COVER_RATIO = 16 / 9

export function ChallengeHeader({ title, coverUrl, status, participants, onBack }: {
  title: string
  coverUrl: string | null
  status: string
  participants: number
  onBack: () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.cover, { backgroundColor: colors.surfaceRaised }]}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={styles.placeholder}>
          <Trophy size={avatarSize.lg} color={colors.textFaint} strokeWidth={iconStroke} />
        </View>
      )}
      <LinearGradient colors={imageScrim} style={StyleSheet.absoluteFill} />

      <Pressable
        onPress={onBack}
        hitSlop={space.xxs}
        accessibilityLabel="Orqaga"
        style={[styles.back, { top: insets.top + space.xxs, backgroundColor: imageChip }]}
      >
        <ChevronLeft size={iconSize.md} color={onImage} strokeWidth={iconStroke} />
      </Pressable>

      <View style={styles.text}>
        <Text style={[typeScale.overline, { color: onImage }]}>{status}</Text>
        <Text style={[typeScale.title1, { color: onImage }]} numberOfLines={3} accessibilityRole="header">
          {uzText(title)}
        </Text>
        <View style={styles.people}>
          <Users size={iconSize.sm - 4} color={onImage} strokeWidth={iconStroke} />
          <Text style={[typeScale.callout, tabular, { color: onImage }]}>{participants} kishi qatnashmoqda</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: COVER_RATIO, minHeight: avatarSize.xl * 3, justifyContent: 'flex-end', overflow: 'hidden' },
  placeholder: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  back: {
    position: 'absolute',
    left: space.xs,
    width: layout.minTouch - space.xs,
    height: layout.minTouch - space.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { paddingHorizontal: layout.gutter, paddingBottom: space.lg, gap: space.xxs },
  people: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, marginTop: space.xxs },
})
