/**
 * Competition detail header: the colour the admin picked for the
 * competition (dashboard colour picker), as a soft gradient band — not the
 * cover image, which is a square thumbnail made for the Bellashuv list and
 * was cut and blown up here. Text is white or near-black, whichever reads
 * on that colour (challengeDetail.textOnBand). Status, title, participants;
 * back button on a small chip inside the top safe area.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Trophy, Users } from 'lucide-react-native'
import { iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { uzText } from '../today/today'
import { bandColor, textOnBand } from './challengeDetail'

const TROPHY = 44

export function ChallengeHeader({ title, color, status, participants, onBack }: {
  title: string
  /** The admin's band colour (#RRGGBB); the default orange when unset. */
  color: string | null
  status: string
  participants: number
  onBack: () => void
}) {
  const insets = useSafeAreaInsets()
  const band = bandColor(color)
  const ink = textOnBand(band)

  return (
    <LinearGradient
      colors={[band, `${band}B3`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.band, { paddingTop: insets.top + space.xxs }]}
    >
      <View style={styles.top}>
        <Pressable
          onPress={onBack}
          hitSlop={space.xxs}
          accessibilityLabel="Orqaga"
          style={[styles.back, { backgroundColor: ink.chip }]}
        >
          <ChevronLeft size={iconSize.md} color={ink.text} strokeWidth={iconStroke} />
        </Pressable>
        <Trophy size={TROPHY} color={ink.muted} strokeWidth={iconStroke} />
      </View>

      <View style={styles.text}>
        <Text style={[typeScale.overline, { color: ink.muted }]}>{status}</Text>
        <Text style={[typeScale.title1, { color: ink.text }]} numberOfLines={3} accessibilityRole="header">
          {uzText(title)}
        </Text>
        <View style={styles.people}>
          <Users size={iconSize.sm - 4} color={ink.muted} strokeWidth={iconStroke} />
          <Text style={[typeScale.callout, tabular, { color: ink.muted }]}>{participants} kishi qatnashmoqda</Text>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  band: { width: '100%', paddingBottom: space.lg, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingLeft: space.xs, paddingRight: layout.gutter },
  back: {
    width: layout.minTouch - space.xs,
    height: layout.minTouch - space.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { paddingHorizontal: layout.gutter, gap: space.xxs },
  people: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, marginTop: space.xxs },
})
