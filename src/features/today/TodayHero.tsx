/**
 * Bugun hero: tree, streak, stage, week strip, today's focus progress and
 * the single primary action (getPrimaryAction).
 *
 * Streak tick (spec section 5): once per day, when Home first shows the
 * goal met today — flame 1 → 1.35 → 1, the number rolls up (700 ms), the
 * tree pops with springs.pop after 380 ms, success haptic. Under reduce
 * motion only the final state shows (the haptic stays).
 */
import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { Flame } from 'lucide-react-native'
import type { StreakCalendarDay, StreakState } from '../../../lib/api'
import { MagicTree } from '../../../components/streak/MagicTree'
import { TREE_STAGES, stageFromStreak, type TreeState } from '../../../lib/treeTheme'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing, springs, streakTick } from '../../design/motion'
import { iconSize, iconStroke, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { haptics } from '../../lib/haptics'
import { Button, Card, Pressable, ProgressBar } from '../../components/ui'
import type { PrimaryAction } from './primaryAction'
import { localDateKey, uzText } from './today'
import { WeekStrip } from './WeekStrip'

const TICK_KEY = 'sahifalab_streak_tick_date'
const FLAME = iconSize.md + space.xs

export interface TodayHeroProps {
  streak: number
  streakState?: StreakState
  todayMinutes: number
  goalMinutes: number
  weekCalendar?: StreakCalendarDay[]
  action: PrimaryAction
  onAction: () => void
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

export function TodayHero({
  streak, streakState, todayMinutes, goalMinutes, weekCalendar, action, onAction, onTreePress, fresh,
}: TodayHeroProps) {
  const { colors } = useTheme()
  const reduceMotion = useReducedMotion()
  const goal = goalMinutes > 0 ? goalMinutes : 20
  const goalMet = todayMinutes >= goal
  const stage = stageFromStreak(streak)
  const stageName = uzText(TREE_STAGES.find(s => s.id === stage)?.name ?? '')
  const atRisk = streakState === 'at_risk'
  const frozen = streakState === 'frozen_today'
  const lost = streakState === 'lost'
  const treeState: TreeState = atRisk ? 'at_risk' : frozen ? 'frozen' : lost ? 'dead' : 'alive'
  const flameColor = lost ? colors.textFaint : frozen ? colors.freeze : colors.accent

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
  const rollStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -roll.get() * typeScale.display.lineHeight }] }))

  const numberText = [typeScale.display, tabular, { color: colors.text }]

  return (
    <Card variant="hero">
      <View style={styles.top}>
        <Pressable onPress={onTreePress} accessibilityLabel={`Daraxt: ${stageName}`}>
          <Animated.View style={treeStyle}>
            <MagicTree stage={stage} state={treeState} size="thumb" uid="today" animate={false} />
          </Animated.View>
        </Pressable>

        <View style={styles.right}>
          <View style={styles.streakRow} accessible accessibilityLabel={`${streak} kunlik seriya`}>
            <Animated.View style={flameStyle}>
              <Flame size={FLAME} color={flameColor} fill={flameColor} strokeWidth={iconStroke} />
            </Animated.View>
            <View style={styles.rollClip}>
              {rolling ? (
                <Animated.View style={rollStyle}>
                  <Text style={numberText}>{Math.max(0, streak - 1)}</Text>
                  <Text style={numberText}>{streak}</Text>
                </Animated.View>
              ) : (
                <Text style={numberText}>{streak}</Text>
              )}
            </View>
          </View>
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>kunlik seriya</Text>
          {stageName ? (
            <Text style={[typeScale.callout, { color: colors.successText }]} numberOfLines={1}>
              {stageName} · {stage}-bosqich
            </Text>
          ) : null}
        </View>
      </View>

      <WeekStrip days={weekCalendar} />

      <View style={styles.focus}>
        <View style={styles.focusRow}>
          <Text style={[typeScale.callout, { color: colors.text }]}>Bugungi fokus</Text>
          <Text style={[typeScale.callout, tabular, { color: goalMet ? colors.successText : colors.textMuted }]}>
            {Math.max(0, todayMinutes)} / {goal} daq
          </Text>
        </View>
        <ProgressBar
          value={todayMinutes / goal}
          thickness="thick"
          color={goalMet ? colors.success : undefined}
          accessibilityLabel="Bugungi fokus"
        />
      </View>

      <View style={styles.action}>
        {action.label ? <Button label={action.label} size="lg" fullWidth onPress={onAction} /> : null}
        <Text
          style={[
            typeScale.callout,
            styles.caption,
            { color: action.tone === 'success' ? colors.successText : action.tone === 'warning' ? colors.accentText : colors.textMuted },
          ]}
        >
          {action.caption}
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  right: { flex: 1, gap: space.xxs },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rollClip: { height: typeScale.display.lineHeight, overflow: 'hidden' },
  focus: { gap: space.xs, marginTop: space.lg },
  focusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
  action: { gap: space.xs, marginTop: space.lg },
  caption: { textAlign: 'center' },
})
