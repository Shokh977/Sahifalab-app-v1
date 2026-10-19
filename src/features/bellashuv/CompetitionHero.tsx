/**
 * CompetitionHero (Phase 7.5 B5, used by D1) — the live (or next)
 * competition's cover band: the cover image blurred and slightly saturated
 * behind a dark scrim (15 % → 72 %), and on top the SHARP thumbnail with a
 * status chip ("● FAOL · 5 KUN QOLDI") and the title — so the existing
 * low-resolution covers still look crisp. The body (stats, progress, the
 * action) is a slot. The live dot pulses: the one allowed loop, off under
 * reduce motion.
 */
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { Trophy } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { easing, livePulse } from '../../design/motion'
import { avatarSize, photoShadow, radius, space } from '../../design/spacing'
import { coverBandFallback, coverScrim, liveDot, onImage, onImageBorder, onImageChip } from '../../design/tokens'
import { type as typeScale } from '../../design/typography'
import { uzText } from '../today/today'

export const COVER_BAND = 168
const THUMB = 92
const THUMB_RADIUS = 20
const BLUR = 18
const BLEED = 30
const DOT = 7
const HERO_RADIUS = 28

function LiveDot() {
  const reduceMotion = useReducedMotion()
  const o = useSharedValue(1)
  useEffect(() => {
    if (reduceMotion) { o.set(1); return }
    o.set(withRepeat(withTiming(livePulse.minOpacity, { duration: livePulse.duration, easing: easing.standard }), -1, true))
    return () => cancelAnimation(o)
  }, [reduceMotion, o])
  const style = useAnimatedStyle(() => ({ opacity: o.get() }))
  return <Animated.View style={[styles.dot, { backgroundColor: liveDot }, style]} />
}

export function CompetitionHero({ title, coverUrl, status, live, children }: {
  title: string
  coverUrl: string | null
  /** "FAOL · 5 KUN QOLDI", "2 KUNDAN KEYIN" — shown in capitals. */
  status: string
  /** Running now: the pulsing green dot. */
  live?: boolean
  children?: React.ReactNode
}) {
  const { colors, elevation } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
      <View style={[styles.band, { backgroundColor: coverBandFallback }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} blurRadius={BLUR} contentFit="cover" style={styles.blur} cachePolicy="memory-disk" />
        ) : null}
        <LinearGradient colors={coverScrim} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bandRow}>
          <View style={[styles.thumb, { borderColor: onImageBorder }]}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} contentFit="cover" style={StyleSheet.absoluteFill} cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
            ) : (
              <View style={styles.thumbIcon}><Trophy size={avatarSize.md} color={onImage} /></View>
            )}
          </View>
          <View style={styles.bandText}>
            <View style={[styles.chip, { backgroundColor: onImageChip }]}>
              {live && <LiveDot />}
              <Text style={[typeScale.overline, { color: onImage }]} numberOfLines={1}>{status}</Text>
            </View>
            <Text style={[typeScale.heroTitle, { color: onImage }]} numberOfLines={2} accessibilityRole="header">{uzText(title)}</Text>
          </View>
        </View>
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: HERO_RADIUS, borderWidth: 1, overflow: 'hidden' },
  band: { height: COVER_BAND, overflow: 'hidden' },
  blur: { position: 'absolute', top: -BLEED, left: -BLEED, right: -BLEED, bottom: -BLEED, opacity: 0.9 },
  bandRow: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, flexDirection: 'row', alignItems: 'flex-end', gap: space.sm + 2 },
  thumb: {
    width: THUMB, height: THUMB, borderRadius: THUMB_RADIUS, borderWidth: 2, overflow: 'hidden',
    ...photoShadow,
  },
  thumbIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bandText: { flex: 1, gap: space.xs, minWidth: 0 },
  chip: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2,
    paddingHorizontal: space.xs + 1, paddingVertical: space.xxs + 1, borderRadius: radius.full,
  },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  body: { padding: space.md, gap: space.sm + 2 },
})
