/**
 * PlanTile (Phase 7.5 B5, used by C3) — one item of "Bugungi reja" in the
 * 2×2 grid: a tinted 40 px icon tile and a status on top, a big value
 * ("48 ta", "180 daq", "5/5", "3-dars"), then a title and a sub-line or a
 * thin bar.
 *   next    — the one action: orange gradient, accent shadow, a white
 *             "KEYINGI" pill and a white play circle. White text is 18 px+
 *             extra bold only; the sub-line sits in a white pill.
 *   default — surface card.
 *   done    — surface card at full opacity with a green check badge.
 * When "next" moves to another tile the orange layer crossfades (220 ms;
 * instant under reduce motion).
 */
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { Check, Play, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing } from '../../design/motion'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { onAccentTile, type TintName } from '../../design/tokens'
import { tabular, type as typeScale } from '../../design/typography'
import { AccentFill, Pressable, ProgressBar } from '../../components/ui'

export type PlanTileVariant = 'next' | 'default' | 'done'

export const PLAN_TILE_MIN_HEIGHT = 150
const TILE_RADIUS = 24
const ICON_TILE = 40
const CHECK = 26
const PLAY = 34

export interface PlanTileProps {
  variant: PlanTileVariant
  icon: LucideIcon
  tint: TintName
  value: string
  title: string
  sub?: string
  /** 0–1: a thin bar instead of the sub-line (the course tile). */
  progress?: number
  /** Top-right on a default tile: "30%", a chip… */
  status?: React.ReactNode
  onPress?: () => void
}

export function PlanTile({ variant, icon: Icon, tint, value, title, sub, progress, status, onPress }: PlanTileProps) {
  const { colors, elevation, accentShadow, tint: tintOf } = useTheme()
  const next = variant === 'next'
  const t = tintOf(tint)
  const reduceMotion = useReducedMotion()
  const fill = useSharedValue(next ? 1 : 0)
  useEffect(() => {
    fill.set(reduceMotion ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: durations.fade, easing: easing.standard }))
  }, [next, reduceMotion, fill])
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.get() }))
  const a11y = `${title}: ${value}${sub ? `, ${sub}` : ''}${next ? ', keyingi' : variant === 'done' ? ', bajarildi' : ''}`

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={a11y}
      style={[
        styles.tile,
        { backgroundColor: colors.surface, borderColor: next ? 'transparent' : colors.border },
        next ? accentShadow : elevation,
      ]}
    >
      {/* Over the 1 px border too, so the orange reaches the edge. */}
      <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none">
        <AccentFill radius={TILE_RADIUS} />
      </Animated.View>

      <View style={styles.top}>
        <View style={[styles.iconTile, { backgroundColor: next ? onAccentTile : t.soft }]}>
          <Icon size={iconSize.sm + 2} color={next ? colors.onAccent : t.ink} strokeWidth={iconStroke + 0.1} />
        </View>
        {next ? (
          <View style={[styles.pill, { backgroundColor: colors.onAccent }]}>
            <Text style={[typeScale.overline, { color: colors.accentText }]}>Keyingi</Text>
          </View>
        ) : variant === 'done' ? (
          <View style={[styles.check, { backgroundColor: colors.green }]}>
            <Check size={iconSize.sm - 6} color={colors.onAccent} strokeWidth={3.2} />
          </View>
        ) : status}
      </View>

      <Text style={[typeScale.tileValue, tabular, { color: next ? colors.onAccent : colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1.15}>
        {value}
      </Text>

      <View style={styles.bottom}>
        <View style={styles.flex}>
          <Text
            style={[next ? typeScale.onAccent : typeScale.tileTitle, { color: next ? colors.onAccent : colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {progress != null ? (
            <ProgressBar value={progress} color={t.ink} accessibilityLabel={title} style={styles.bar} />
          ) : sub ? (
            next ? (
              <View style={[styles.pill, styles.subPill, styles.pillClear, { backgroundColor: colors.onAccent }]}>
                <Text style={[typeScale.callout, tabular, { color: colors.accentText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{sub}</Text>
              </View>
            ) : (
              <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{sub}</Text>
            )
          ) : null}
        </View>
        {next && (
          // Bottom-right corner, so the title can use the full width.
          <View style={[styles.play, { backgroundColor: colors.onAccent }]}>
            <Play size={iconSize.sm - 4} color={colors.accent} fill={colors.accent} strokeWidth={iconStroke} />
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: {
    minHeight: PLAN_TILE_MIN_HEIGHT,
    borderRadius: TILE_RADIUS,
    borderWidth: 1,
    padding: space.md,
    gap: space.sm - 2,
    justifyContent: 'space-between',
  },
  fill: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: ICON_TILE },
  iconTile: { width: ICON_TILE, height: ICON_TILE, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.full, paddingHorizontal: space.xs, paddingVertical: space.xxs, alignSelf: 'flex-start' },
  subPill: { marginTop: space.xxs },
  pillClear: { maxWidth: '75%' },
  check: { width: CHECK, height: CHECK, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  flex: { flex: 1, gap: 2 },
  bar: { marginTop: space.xs },
  play: { position: 'absolute', right: 0, bottom: 0, width: PLAY, height: PLAY, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
})
