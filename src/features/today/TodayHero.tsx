/**
 * Bugun hero (Phase 7.5 C2): the streak only — no button (the one action
 * lives in the plan grid). The tree in a glowing tile, the gradient flame
 * with the streak number, "kunlik seriya" and the stage chip; the week as
 * 3D day tiles; today's focus with its bar and a meta line.
 *
 * Streak tick (spec section 5): once per day, when Home first shows the
 * goal met today — flame 1 → 1.35 → 1, the number rolls up (700 ms), the
 * tree pops with springs.pop after 380 ms, success haptic. Under reduce
 * motion only the final state shows (the haptic stays).
 */
import React, { useEffect, useId, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { Check } from 'lucide-react-native'
import type { StreakCalendarDay, StreakState } from '../../../lib/api'
import { MagicTree } from '../../../components/streak/MagicTree'
import { TREE_STAGES, stageFromStreak, type TreeState } from '../../../lib/treeTheme'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing, springs, streakTick } from '../../design/motion'
import { iconSize, radius, space } from '../../design/spacing'
import { streakFlame, treeGlow } from '../../design/tokens'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { haptics } from '../../lib/haptics'
import { Pressable, ProgressBar } from '../../components/ui'
import { localDateKey, uzText } from './today'
import { WeekStrip } from './WeekStrip'
import { focusLabel } from './focusLabel'

const TICK_KEY = 'sahifalab_streak_tick_date'
const TREE_TILE = 112
const TREE_RADIUS = 28
const FLAME_W = 28
const FLAME_H = 34
const CARD_RADIUS = 28

export interface TodayHeroProps {
  streak: number
  streakState?: StreakState
  todayMinutes: number
  goalMinutes: number
  weekCalendar?: StreakCalendarDay[]
  /** Under the focus bar while the goal isn't met ("Seriyani saqlash uchun yana 8 daqiqa"). */
  hint?: { text: string; tone: 'default' | 'warning' | 'success' }
  onTreePress: () => void
  /** Data was fetched today (not yesterday's cache) — gate for the tick. */
  fresh: boolean
}

/** Returns true once per local day, the first time `ready` is true. */
function useDailyTick(ready: boolean): boolean {
  const [fire, setFire] = useState(false)
  const checked = useRef<string | null>(null)
  useEffect(() => {
    if (!ready) return
    const today = localDateKey(new Date())
    if (checked.current === today) return
    checked.current = today
    AsyncStorage.getItem(TICK_KEY).then(last => {
      if (last === today) return
      AsyncStorage.setItem(TICK_KEY, today).catch(() => {})
      setFire(true)
    }).catch(() => {})
  }, [ready])
  return fire
}

/** The v2 flame: orange gradient body with a gold core (flat when frozen/lost). */
function StreakFlame({ flat }: { flat?: string }) {
  const id = `flame${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <Svg width={FLAME_W} height={FLAME_H} viewBox="0 0 22 26">
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

/** The tree tile's soft green glow (a radial gradient, both themes). */
function TreeGlow() {
  const { scheme } = useTheme()
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [inner, outer] = treeGlow[scheme]
  return (
    <Svg width={TREE_TILE} height={TREE_TILE} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="45%" r="70%">
          <Stop offset="0" stopColor={inner} />
          <Stop offset="1" stopColor={outer} />
        </RadialGradient>
      </Defs>
      <Rect width={TREE_TILE} height={TREE_TILE} rx={TREE_RADIUS} fill={`url(#${id})`} />
    </Svg>
  )
}

export function TodayHero({
  streak, streakState, todayMinutes, goalMinutes, weekCalendar, hint, onTreePress, fresh,
}: TodayHeroProps) {
  const { colors, elevation } = useTheme()
  const reduceMotion = useReducedMotion()
  const focus = focusLabel(todayMinutes, goalMinutes)
  const goalMet = focus.done
  const stage = stageFromStreak(streak)
  const stageName = uzText(TREE_STAGES.find(s => s.id === stage)?.name ?? '')
  const atRisk = streakState === 'at_risk'
  const frozen = streakState === 'frozen_today'
  const lost = streakState === 'lost'
  const treeState: TreeState = atRisk ? 'at_risk' : frozen ? 'frozen' : lost ? 'dead' : 'alive'
  const flameFlat = lost ? colors.textFaint : frozen ? colors.freeze : undefined

  // ── Streak tick ──────────────────────────────────────────────────────────
  const tick = useDailyTick(fresh && goalMet && streak > 0)
  const [rollDone, setRollDone] = useState(false)
  const rolling = tick && !reduceMotion && !rollDone
  const flameScale = useSharedValue(1)
  const treeScale = useSharedValue(1)
  const roll = useSharedValue(0)   // 0 → shows n−1, 1 → shows n

  useEffect(() => {
    if (!tick) return
    haptics.success()
    if (reduceMotion) return
    flameScale.set(withSequence(
      withTiming(streakTick.flamePeak, { duration: durations.slow, easing: easing.standard }),
      withSpring(1, springs.ui),
    ))
    treeScale.set(withDelay(streakTick.treeDelay, withSequence(
      withTiming(streakTick.treePeak, { duration: durations.fast, easing: easing.standard }),
      withSpring(1, springs.pop),
    )))
    roll.set(0)
    roll.set(withTiming(1, { duration: durations.celebrate, easing: easing.standard }, finished => {
      if (finished) scheduleOnRN(setRollDone, true)
    }))
  }, [tick, reduceMotion, flameScale, treeScale, roll])

  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flameScale.get() }] }))
  const treeStyle = useAnimatedStyle(() => ({ transform: [{ scale: treeScale.get() }] }))
  const rollStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -roll.get() * typeScale.streak.lineHeight }] }))

  const numberText = [typeScale.streak, tabular, { color: colors.text }]
  const hintColor = hint?.tone === 'warning' ? colors.accentText : hint?.tone === 'success' ? colors.successText : colors.textMuted

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
      <View style={styles.top}>
        <Pressable onPress={onTreePress} accessibilityLabel={`Daraxt: ${stageName}, ${stage}-bosqich`} style={styles.treeTile}>
          <TreeGlow />
          <Animated.View style={treeStyle}>
            <MagicTree stage={stage} state={treeState} size="thumb" uid="today" animate={false} />
          </Animated.View>
        </Pressable>

        <View style={styles.right}>
          <View style={styles.streakRow} accessible accessibilityLabel={`${streak} kunlik seriya`}>
            <Animated.View style={flameStyle}>
              <StreakFlame flat={flameFlat} />
            </Animated.View>
            <View style={styles.rollClip}>
              {rolling ? (
                <Animated.View style={rollStyle}>
                  <Text style={numberText} maxFontSizeMultiplier={1}>{Math.max(0, streak - 1)}</Text>
                  <Text style={numberText} maxFontSizeMultiplier={1}>{streak}</Text>
                </Animated.View>
              ) : (
                <Text style={numberText} maxFontSizeMultiplier={1}>{streak}</Text>
              )}
            </View>
          </View>
          <Text style={[typeScale.body, styles.lift, { color: colors.textMuted }]}>kunlik seriya</Text>
          {stageName ? (
            <View style={[styles.chip, { backgroundColor: colors.greenSoft }]}>
              <Text style={[typeScale.callout, styles.bold, { color: colors.successText }]} numberOfLines={1}>
                {stageName} · {stage}-bosqich
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <WeekStrip days={weekCalendar} todayDone={goalMet} />

      <View style={[styles.focus, { backgroundColor: colors.surfaceRaised }]}>
        <View style={styles.row}>
          <Text style={[typeScale.label, { color: colors.text }]}>Bugungi fokus</Text>
          {focus.done ? (
            <View style={styles.done}>
              <Check size={iconSize.sm - 4} color={colors.successText} strokeWidth={3} />
              <Text style={[typeScale.callout, styles.bold, { color: colors.successText }]}>Maqsad bajarildi</Text>
            </View>
          ) : (
            <Text style={[typeScale.callout, tabular, styles.bold, { color: colors.textMuted }]}>{focus.right}</Text>
          )}
        </View>
        <ProgressBar value={focus.progress} thickness="hero" accessibilityLabel="Bugungi fokus" />
        {focus.done ? (
          <View style={styles.row}>
            <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>
              <Text style={[styles.bold, { color: colors.text }]}>{focus.value}</Text> bugun
            </Text>
            <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>{focus.sub}</Text>
          </View>
        ) : hint ? (
          <Text style={[typeScale.callout, { color: hintColor }]}>{hint.text}</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS, borderWidth: 1, padding: space.lg, gap: space.md + 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  treeTile: { width: TREE_TILE, height: TREE_TILE, borderRadius: TREE_RADIUS, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  right: { flex: 1, gap: space.xxs + 2, minWidth: 0 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rollClip: { height: typeScale.streak.lineHeight, overflow: 'hidden' },
  lift: { marginTop: -space.xxs },
  chip: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: radius.full, paddingHorizontal: space.sm - 2, paddingVertical: space.xxs + 1 },
  bold: { fontFamily: fonts.bold },
  focus: { borderRadius: radius.md + 2, paddingVertical: space.sm, paddingHorizontal: space.sm + 2, gap: space.sm - 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2 },
})
