import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, Timer, Flame } from 'phosphor-react-native'
import { typography } from '../../lib/constants'
import { darkenHex } from '../flashcards/DeckCard'

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; weight?: any }>> = {
  trophy: Trophy, timer: Timer, flame: Flame,
}

function WatermarkIcon({ icon }: { icon: string }) {
  const Icon = ICON_MAP[icon] ?? Trophy
  return <Icon size={64} color="rgba(255,255,255,0.15)" weight="fill" />
}

interface Props {
  coverImageUrl: string | null
  color:         string
  icon:          string
  statusPill?:   { text: string; color?: string } | null
  countdownPill?: string | null
  title:         string
  height?:       number
}

/**
 * The 16:9 cover band shared by all challenge card variants (step-23). Both
 * gradient scrims are unconditional — an admin will eventually upload a
 * bright/busy photo, and skipping the scrim "because this image looks fine"
 * is exactly how overlaid white text becomes unreadable later.
 */
export function ChallengeCoverImage({
  coverImageUrl, color, icon, statusPill, countdownPill, title, height = 140,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const gradDark = darkenHex(color, 22)

  return (
    <View style={[styles.root, { height }]}>
      {coverImageUrl ? (
        <>
          <Image
            source={{ uri: coverImageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(false)}
          />
          {!loaded && (
            <View style={[StyleSheet.absoluteFill, styles.skeleton]} />
          )}
        </>
      ) : (
        <LinearGradient
          colors={[color, gradDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.watermark}>
            <WatermarkIcon icon={icon} />
          </View>
        </LinearGradient>
      )}

      {/* Top scrim — for the status/countdown pills */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />
      {/* Bottom scrim — for the title */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.80)']}
        locations={[0.35, 0.6, 1]}
        style={[StyleSheet.absoluteFill, { top: '35%' }]}
      />

      <View style={styles.topRow}>
        {statusPill ? (
          <View style={[styles.pill, statusPill.color ? { backgroundColor: statusPill.color } : null]}>
            <Text style={styles.pillText}>{statusPill.text}</Text>
          </View>
        ) : <View />}
        {countdownPill ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{countdownPill}</Text>
          </View>
        ) : <View />}
      </View>

      <Text
        numberOfLines={2}
        style={[styles.title, { fontFamily: typography.fontFamily.bold }]}
      >
        {title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { width: '100%', justifyContent: 'space-between', overflow: 'hidden' },
  skeleton: { backgroundColor: 'rgba(120,120,120,0.25)' },
  watermark: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 10, paddingTop: 10,
  },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  title: {
    color: '#fff', fontSize: 20, lineHeight: 24,
    paddingHorizontal: 12, paddingBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
})
