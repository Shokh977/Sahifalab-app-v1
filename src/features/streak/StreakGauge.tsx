/**
 * The streak number as today's gauge (streakMood.ts), shared by the Bugun
 * hero and Seriya: the flame (dim until fed, flickering when at risk), the
 * digits that fill from the bottom in orange with today's progress and turn
 * green at the goal, and the status line under them.
 */
import React, { useEffect, useId } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import Animated, {
  cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { Check, Hourglass, Snowflake, Sprout, TriangleAlert } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing } from '../../design/motion'
import { iconSize, space } from '../../design/spacing'
import { streakFlame } from '../../design/tokens'
import { fonts, tabular } from '../../design/typography'
import { MOOD_TEXT, digitFill, type StreakMood } from './streakMood'

const MOOD_ICON: Record<StreakMood, typeof Check> = {
  done: Check, pending: Hourglass, frozen: Snowflake, at_risk: TriangleAlert, lost: Sprout,
}
/** The at-risk flame dims to this and back, like it's about to go out. */
const FLICKER_LOW = 0.55

/** Unfilled-digit colour per mood; the fill is always the flame's orange. */
export function useMoodColors() {
  const { colors } = useTheme()
  const digits: Record<StreakMood, string> = {
    done: colors.successText, pending: colors.textFaint, frozen: colors.freeze, at_risk: colors.dangerText, lost: colors.textFaint,
  }
  const status = (m: StreakMood) => (m === 'pending' || m === 'lost' ? colors.textMuted : digits[m])
  const flameFlat = (m: StreakMood) => (m === 'lost' ? colors.textFaint : m === 'frozen' ? colors.freeze : undefined)
  return { digits, status, flameFlat, fill: colors.accentText }
}

/** The v2 flame: orange gradient body with a gold core (flat when frozen/lost). */
export function StreakFlame({ flat, width = 28, height = 34 }: { flat?: string; width?: number; height?: number }) {
  const id = `flame${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <Svg width={width} height={height} viewBox="0 0 22 26">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={streakFlame.body[0]} />
          <Stop offset="1" stopColor={streakFlame.body[1]} />
        </LinearGradient>
      </Defs>
      <Path d="M11 1c1 4 7 7 7 14a7 7 0 0 1-14 0c0-3 1.5-5 3-6 0 2.5 1 4 2.5 4C9 9 9 5 11 1z" fill={flat ?? `url(#${id})`} />
      {!flat && (
        <Path d="M11 13c.6 2 3 3 3 6a3 3 0 0 1-6 0c0-1.6.8-2.6 1.6-3 .1 1.2.6 1.8 1.2 1.8C10.6 16 10.6 14.5 11 13z" fill={streakFlame.core} />
      )}
    </Svg>
  )
}

/** Flame opacity (a shared value, 0–1): dim until fed, flickering when at risk. */
export function useFlameOpacity(mood: StreakMood, progress: number): SharedValue<number> {
  const reduceMotion = useReducedMotion()
  const base = mood === 'pending' || mood === 'at_risk' ? 0.4 + 0.6 * Math.min(1, progress) : 1
  const opacity = useSharedValue(base)
  useEffect(() => {
    cancelAnimation(opacity)
    if (mood !== 'at_risk' || reduceMotion) { opacity.set(base); return }
    opacity.set(base)
    opacity.set(withRepeat(withTiming(base * FLICKER_LOW, { duration: durations.celebrate, easing: easing.standard }), -1, true))
    return () => cancelAnimation(opacity)
  }, [mood, base, reduceMotion, opacity])
  return opacity
}

/**
 * The number, filled from the bottom with today's progress. `textStyle` must
 * carry fontSize and lineHeight; the fill is measured against lineHeight.
 */
export function GaugeDigits({ value, mood, progress, textStyle }: {
  value: number
  mood: StreakMood
  progress: number
  textStyle: TextStyle
}) {
  const reduceMotion = useReducedMotion()
  const c = useMoodColors()
  const lineHeight = textStyle.lineHeight ?? 50
  const target = digitFill(progress) * lineHeight
  const fillH = useSharedValue(target)
  useEffect(() => {
    fillH.set(reduceMotion ? target : withTiming(target, { duration: durations.slow, easing: easing.standard }))
  }, [target, reduceMotion, fillH])
  const fillStyle = useAnimatedStyle(() => ({ height: fillH.get() }))

  return (
    <View>
      <Text style={[textStyle, tabular, { color: c.digits[mood] }]} maxFontSizeMultiplier={1}>{value}</Text>
      {mood !== 'done' && (
        <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]}>
          <Text style={[textStyle, tabular, styles.fillText, { color: c.fill }]} numberOfLines={1} maxFontSizeMultiplier={1}>
            {value}
          </Text>
        </Animated.View>
      )}
    </View>
  )
}

/** "✓ Bugun saqlandi", "⏳ Bugun hali yonmadi", … in the mood's colour. */
export function MoodStatus({ mood, textStyle, size = iconSize.sm - 4 }: {
  mood: StreakMood
  textStyle: StyleProp<TextStyle>
  size?: number
}) {
  const c = useMoodColors()
  const color = c.status(mood)
  const Icon = MOOD_ICON[mood]
  return (
    <View style={styles.status}>
      <Icon size={size} color={color} strokeWidth={2.75} />
      <Text style={[textStyle, styles.bold, { color }]} numberOfLines={1}>{MOOD_TEXT[mood]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // The orange part of the digits: a bottom-anchored clip over the base number.
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  fillText: { position: 'absolute', left: 0, bottom: 0 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 1 },
  bold: { fontFamily: fonts.bold },
})
