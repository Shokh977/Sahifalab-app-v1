/**
 * PlanTile (Phase 7.5 B5, reworked in Phase 8) — one item of "Bugungi
 * reja". Every variant has the same layout and height, so the grid is
 * even: a 32 px tinted icon and a status on top, a 24 px value ("48 ta",
 * "180 daq", "5/5", "#14"), a 14 px title, and a 12 px sub-line (or a thin
 * bar) on one row with the play button.
 *   next    — the one action: the deep orange gradient (white text passes
 *             AA at any size there), a white "KEYINGI" pill and a white
 *             play circle beside the sub-line.
 *   default — surface card.
 *   done    — surface card with a green check badge.
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
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { AccentFill, Pressable, ProgressBar } from '../../components/ui'

export type PlanTileVariant = 'next' | 'default' | 'done'

export const PLAN_TILE_MIN_HEIGHT = 140
const TILE_RADIUS = 22
const ICON_TILE = 32
const CHECK = 22
const PLAY = 28

export interface PlanTileProps {
  variant: PlanTileVariant
  icon: LucideIcon
  tint: TintName
  value: string
  title: string
  sub?: string
  /** 0–1: a thin bar instead of the sub-line (the course tile). */
  progress?: number
  /** Top-right on a default tile: "30%", "Yangi"… */
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
  const ink = next ? colors.onAccent : colors.text
  const muted = next ? colors.onAccent : colors.textMuted

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
        <AccentFill radius={TILE_RADIUS} deep />
      </Animated.View>

      <View style={styles.top}>
        <View style={[styles.iconTile, { backgroundColor: next ? onAccentTile : t.soft }]}>
          <Icon size={iconSize.sm - 2} color={next ? colors.onAccent : t.ink} strokeWidth={iconStroke + 0.1} />
        </View>
        {next ? (
          <View style={[styles.pill, { backgroundColor: colors.onAccent }]}>
            <Text style={[typeScale.overline, { color: colors.accentText }]}>Keyingi</Text>
          </View>
        ) : variant === 'done' ? (
          <View style={[styles.check, { backgroundColor: colors.green }]}>
            <Check size={iconSize.sm - 8} color={colors.onAccent} strokeWidth={3.2} />
          </View>
        ) : status}
      </View>

      <View style={styles.text}>
        <Text style={[typeScale.statValue, tabular, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
          {value}
        </Text>
        <Text style={[typeScale.label, styles.bold, { color: ink }]} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.bottom}>
        {progress != null ? (
          <ProgressBar value={progress} color={t.ink} accessibilityLabel={title} style={styles.flex} />
        ) : (
          <Text style={[typeScale.small, styles.flex, { color: muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {sub ?? ''}
          </Text>
        )}
        {next && (
          <View style={[styles.play, { backgroundColor: colors.onAccent }]}>
            <Play size={iconSize.sm - 8} color={colors.accent} fill={colors.accent} strokeWidth={iconStroke} />
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
    paddingHorizontal: space.md,
    paddingVertical: space.md - 2,
    gap: space.sm,
    justifyContent: 'space-between',
  },
  fill: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: ICON_TILE },
  iconTile: { width: ICON_TILE, height: ICON_TILE, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.full, paddingHorizontal: space.xs, paddingVertical: space.xxs / 2 },
  check: { width: CHECK, height: CHECK, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  text: { gap: space.xxs / 2 },
  bold: { fontFamily: fonts.bold },
  // Same height on every tile (the play circle's), so sub-lines and bars line up across the grid.
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: PLAY },
  flex: { flex: 1, minWidth: 0 },
  play: { width: PLAY, height: PLAY, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
})
