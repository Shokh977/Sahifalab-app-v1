import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  AppState, Modal, TextInput, ActivityIndicator,
  Animated as RNAnimated, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, Easing, runOnJS,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'

import { useTimerStore } from '../../stores/timerStore'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useFlashcardStore } from '../../stores/flashcardStore'
import { focus, profile, focusStats, focusChallenges } from '../../lib/api'
import type { FocusStats } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

import { playFocusSound, playBreakSound } from '../../lib/timerSounds'
import { TimerCircle, TIMER_DIAMETER } from '../../components/study/TimerCircle'
import { DigitDisplay } from '../../components/study/DigitDisplay'
import { XPFloat, XPFloatHandle } from '../../components/study/XPFloat'
import { CompletionSheet } from '../../components/study/CompletionSheet'
import { LevelUpOverlay } from '../../components/study/LevelUpOverlay'
import { AchievementOverlay, Achievement } from '../../components/study/AchievementOverlay'
import { WeeklyChart } from '../../components/study/WeeklyChart'
import { MonthlyHeatmap } from '../../components/study/MonthlyHeatmap'
import { AmbientPlayer } from '../../components/study/AmbientPlayer'
import type { WeeklyStudyDay, HeatmapDay } from '../../lib/api'
import { GoalCompleteModal } from '../../components/streak/GoalCompleteModal'
import { MilestoneModal } from '../../components/streak/MilestoneModal'
import { FileBarChart2, ChevronRight } from 'lucide-react-native'
import {
  setupTimerNotifications, saveTimerState, clearTimerState, loadTimerState,
  scheduleTimerEndNotification, cancelTimerEndNotification,
} from '../../lib/timerBackground'

// ── Sub-tab bar ───────────────────────────────────────────────────────────────

type SubTab = 'timer' | 'stats' | 'flashcards'

const SCREEN_W = Dimensions.get('window').width
const SUBTABS: { id: SubTab; label: string }[] = [
  { id: 'timer',      label: '⏱ Taymer' },
  { id: 'flashcards', label: 'Kartalar' },
  { id: 'stats',      label: 'Statistika' },
]

function SubTabBar({
  scrollX, activeIndex, onTabPress,
}: {
  scrollX:     RNAnimated.Value
  activeIndex: number
  onTabPress:  (i: number) => void
}) {
  const { c }  = useTheme()
  const tabW   = SCREEN_W / SUBTABS.length
  const indW   = tabW * 0.55

  const indicatorX = scrollX.interpolate({
    inputRange:  SUBTABS.map((_, i) => i * SCREEN_W),
    outputRange: SUBTABS.map((_, i) => i * tabW + (tabW - indW) / 2),
    extrapolate: 'clamp',
  })

  return (
    <View style={[styles.subTabBar, { borderBottomColor: c.borderSubtle }]}>
      {SUBTABS.map((tab, i) => {
        const on = activeIndex === i
        return (
          <Pressable key={tab.id} onPress={() => onTabPress(i)} style={styles.subTab}>
            <Text style={[
              styles.subTabText,
              {
                color:      on ? c.textPrimary : c.textSecondary,
                fontFamily: on ? typography.fontFamily.semibold : typography.fontFamily.regular,
              },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
      {/* Sliding indicator — moves in real time with the finger */}
      <RNAnimated.View
        style={[
          styles.subTabIndicator,
          { backgroundColor: c.accentPrimary, width: indW, transform: [{ translateX: indicatorX }] },
        ]}
      />
    </View>
  )
}

// ── Active user badge ─────────────────────────────────────────────────────────

function ActiveUsersBadge() {
  const { c } = useTheme()
  const [count, setCount] = useState<number | null>(null)
  const pulse = useSharedValue(1)

  useEffect(() => {
    const fetch = () => focusChallenges.activeCount().then(r => setCount(r.count))
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!count) return
    pulse.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
    )
  }, [!!count])

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))

  if (count === null || count === 0) return null

  return (
    <View style={[styles.activeBadge, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <Animated.View style={[styles.activeDot, { backgroundColor: c.success }, dotStyle]} />
      <Text style={[styles.activeText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {count} kishi hozir o'qimoqda
      </Text>
    </View>
  )
}

// ── Sessions selector pill row ────────────────────────────────────────────────

function SessionsPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const { c } = useTheme()
  return (
    <View style={styles.sessionRow}>
      <Text style={[styles.sessionLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        Sessiya:
      </Text>
      {[1, 2, 3, 4].map(n => {
        const sel = n === value
        return (
          <Pressable
            key={n}
            onPress={() => !disabled && onChange(n)}
            style={[
              styles.sessionPill,
              { backgroundColor: sel ? c.accentPrimary : c.bgTertiary, borderColor: sel ? c.accentPrimary : c.border },
            ]}
          >
            <Text style={[
              styles.sessionPillText,
              { color: sel ? c.textInverse : c.textSecondary, fontFamily: typography.fontFamily.semibold },
            ]}>
              {n}×
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ── Round dots indicator ──────────────────────────────────────────────────────

function RoundDots({ total, current }: { total: number; current: number }) {
  const { c } = useTheme()
  if (total <= 1) return null
  return (
    <View style={styles.roundDots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.roundDot,
            { backgroundColor: i < current ? c.accentPrimary : (i === current - 1 ? c.accentPrimary : c.bgTertiary) },
          ]}
        />
      ))}
    </View>
  )
}

// ── Small info row ────────────────────────────────────────────────────────────

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { c } = useTheme()
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
      <Text style={[
        styles.infoValue,
        { color: accent ? c.accentPrimary : c.textPrimary, fontFamily: typography.fontFamily.semibold },
      ]}>
        {value}
      </Text>
    </View>
  )
}

// ── Timer screen ──────────────────────────────────────────────────────────────

const PRESETS       = [15, 25, 45, 60]
const PRESET_LABELS = ['15 daq', '25 daq', '45 daq', '60 daq']

const FOCUS_COLOR = '#f97316'   // orange for active focus
const BREAK_COLOR = '#22c55e'   // green for break

function TimerScreen() {
  const { c } = useTheme()

  const {
    plannedMinutes, totalSessions, currentSession, status, phase,
    getRemainingMs, startBreak, nextRound, breakSeconds,
    selectMinutes, selectSessions, start, pause, resume, stop, reset, completeSession,
  } = useTimerStore()

  // ── Display state ─────────────────────────────────────────────────────────
  const [remainingMs,    setRemainingMs]    = useState(() => getRemainingMs())
  const [strokeColor,    setStrokeColor]    = useState(FOCUS_COLOR)
  const [circleComplete, setCircleComplete] = useState(false)

  // ── Overlay state ─────────────────────────────────────────────────────────
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [showCustom,      setShowCustom]      = useState(false)
  const [customInput,     setCustomInput]     = useState('')
  const [showSheet,       setShowSheet]       = useState(false)
  const [sheetMin,        setSheetMin]        = useState(0)
  const [sheetXP,         setSheetXP]        = useState(0)
  const [sheetSaving,     setSheetSaving]     = useState(false)
  const [showLevelUp,     setShowLevelUp]     = useState(false)
  const [levelUpNum,      setLevelUpNum]      = useState(1)
  const [achQueue,        setAchQueue]        = useState<Achievement[]>([])
  const [showAch,         setShowAch]         = useState(false)

  // Goal complete & milestone modals
  const [showGoalModal,    setShowGoalModal]    = useState(false)
  const [goalModalStreak,  setGoalModalStreak]  = useState(0)
  const [goalModalXp,      setGoalModalXp]      = useState(0)
  const [showMilestone,    setShowMilestone]    = useState(false)
  const [milestoneDay,     setMilestoneDay]     = useState(0)
  const [milestoneBonusXp, setMilestoneBonusXp] = useState(0)

  const pendingGoalModal    = useRef(false)
  const pendingMilestoneRef = useRef<{ days: number; bonusXp: number } | null>(null)
  const dailyGoalRef        = useRef(20)
  const prevTodayMinRef     = useRef(0)
  const streakDaysRef       = useRef(0)

  // Keep a ref to the current phase so tick-loop closures always see the latest value
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Background timer: permissions + restore on mount ─────────────────────
  useEffect(() => {
    setupTimerNotifications()

    // If the app was restarted while a timer was running, restore it
    loadTimerState().then(saved => {
      if (!saved) return
      if (saved.targetEnd > Date.now()) {
        // Timer still has time left — restore live state
        useTimerStore.setState({
          status:         'active',
          phase:          saved.phase,
          plannedMinutes: saved.plannedMinutes,
          secondsLeft:    Math.ceil((saved.targetEnd - Date.now()) / 1000),
          _targetEnd:     saved.targetEnd,
          _pauseLeft:     0,
        })
        setRemainingMs(saved.targetEnd - Date.now())
      } else {
        // Timer ended while app was closed — clear stale state
        clearTimerState()
      }
    })
  }, [])

  // ── Persist & notify whenever the running timer changes ───────────────────
  useEffect(() => {
    const store = useTimerStore.getState()
    if (status === 'active' && store._targetEnd) {
      saveTimerState({
        targetEnd:      store._targetEnd,
        plannedMinutes: store.plannedMinutes,
        phase:          store.phase,
      })
      scheduleTimerEndNotification(store._targetEnd, store.phase)
    } else if (status === 'paused') {
      // Cancel the scheduled notification (timer paused, won't end at targetEnd)
      cancelTimerEndNotification()
    } else if (status === 'idle') {
      clearTimerState()
      cancelTimerEndNotification()
    }
  }, [status, phase])

  // Today's cumulative stats
  const [todayMinutes,  setTodayMinutes]  = useState(0)
  const [todayXP,       setTodayXP]       = useState(0)
  const [todaySessions, setTodaySessions] = useState(0)

  const refreshStats = useCallback(() => {
    focusStats.get().then(s => {
      setTodayMinutes(s.today_minutes ?? 0)
      setTodayXP(Math.round((s.today_minutes ?? 0) * 1.66))
      setTodaySessions(s.today_sessions ?? 0)
      dailyGoalRef.current    = s.daily_goal  ?? 20
      prevTodayMinRef.current = s.today_minutes ?? 0
      streakDaysRef.current   = s.streak_days  ?? 0
      useDashboardStore.getState().patchFocusStats(s)
    }).catch(() => {})
  }, [])

  // Initial load
  useEffect(() => { refreshStats() }, [])

  // Re-fetch when app comes back to foreground (picks up sessions done on website)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && status === 'idle') refreshStats()
    })
    return () => sub.remove()
  }, [status, refreshStats])

  const xpFloatRef    = useRef<XPFloatHandle>(null)
  const pendingResult = useRef<Awaited<ReturnType<typeof completeSession>> | null>(null)
  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalMinRef   = useRef(0)

  // Heartbeat while studying (focus phase only)
  useEffect(() => {
    if (status === 'active' && phase === 'focus') {
      heartbeatRef.current = setInterval(() => focusChallenges.heartbeat(), 30_000)
      focusChallenges.heartbeat()
    } else {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [status, phase])

  const completionHandlerRef = useRef<() => void>(() => {})

  // Called when the BREAK timer hits 0 → auto-start next focus round
  const handleBreakComplete = () => {
    playFocusSound().catch(() => {})
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setStrokeColor(FOCUS_COLOR)
    const allDone = nextRound()  // starts next focus session (or returns true if all done)
    if (allDone) {
      // Shouldn't normally happen if called from break, but handle gracefully
      reset()
    }
  }

  // Called when the FOCUS timer hits 0 → award XP + auto-start break (or show sheet)
  const handleRoundComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    playBreakSound().catch(() => {})
    const roundMin = plannedMinutes
    totalMinRef.current += roundMin
    setTimeout(() => xpFloatRef.current?.show(roundMin), 300)

    const allDone = currentSession >= totalSessions

    if (!allDone) {
      // More rounds remain → auto-start break timer
      startBreak()
    } else {
      // All rounds done → show completion sheet
      setCircleComplete(true)
      const totalMin = totalMinRef.current
      setTimeout(async () => {
        setSheetMin(totalMin)
        setSheetXP(totalMin)
        setShowSheet(true)
        try {
          const result = await completeSession(totalMin)
          pendingResult.current = result
          setSheetXP(result.xpAwarded)
          if (result.fromServer) {
            useAuthStore.getState().patchUser({ level: result.newLevel, total_xp: result.totalXp })
          }
        } catch {}
      }, 800)
    }
  }

  // Updated on every render so the tick loop always calls the right handler
  completionHandlerRef.current = phaseRef.current === 'break'
    ? handleBreakComplete
    : handleRoundComplete

  // ── Tick loop (re-runs when status OR phase changes) ──────────────────────
  useEffect(() => {
    if (status !== 'active') {
      setRemainingMs(getRemainingMs())
      return
    }
    let fired = false
    const id = setInterval(() => {
      const ms      = getRemainingMs()
      const curPhase = phaseRef.current
      setRemainingMs(ms)

      if (curPhase === 'break') {
        setStrokeColor(BREAK_COLOR)
      } else {
        if      (ms <= 0)           setStrokeColor(c.success)
        else if (ms <= 5 * 60_000)  setStrokeColor(c.warning)
        else                        setStrokeColor(FOCUS_COLOR)
      }

      if (ms <= 0 && !fired) {
        fired = true
        clearInterval(id)
        completionHandlerRef.current()
      }
    }, 500)
    return () => clearInterval(id)
  }, [status, phase])   // re-run when phase changes (focus→break or break→focus)

  // ── App backgrounding ─────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && useTimerStore.getState().status === 'active') {
        const ms = useTimerStore.getState().getRemainingMs()
        setRemainingMs(ms)
        if (ms <= 0) completionHandlerRef.current()
      }
    })
    return () => sub.remove()
  }, [])

  // ── Overlay queue: goal complete → milestone (shown after level-up/ach) ───
  const showNextOverlay = useCallback(() => {
    if (pendingGoalModal.current) {
      pendingGoalModal.current = false
      setShowGoalModal(true)
      return
    }
    if (pendingMilestoneRef.current) {
      const m = pendingMilestoneRef.current
      pendingMilestoneRef.current = null
      setMilestoneDay(m.days)
      setMilestoneBonusXp(m.bonusXp)
      setShowMilestone(true)
    }
  }, [])

  // ── Sheet dismiss ─────────────────────────────────────────────────────────
  const onSheetDone = async (_note: string) => {
    setSheetSaving(true)
    await new Promise(r => setTimeout(r, 200))
    setSheetSaving(false)
    setShowSheet(false)
    setCircleComplete(false)
    setStrokeColor(FOCUS_COLOR)
    totalMinRef.current = 0
    reset()

    const result = pendingResult.current
    pendingResult.current = null

    // Refresh today's stats and sync to all stores
    focusStats.get().then(s => {
      const newMin    = s.today_minutes ?? 0
      const goal      = s.daily_goal    ?? dailyGoalRef.current
      const newStreak = s.streak_days   ?? streakDaysRef.current
      setTodayMinutes(newMin)
      setTodayXP(Math.round(newMin * 1.66))
      setTodaySessions(s.today_sessions ?? 0)

      // Propagate fresh stats to dashboard + auth stores
      useDashboardStore.getState().patchFocusStats(s)

      // Goal complete: was below goal before, now at or above
      if (prevTodayMinRef.current < goal && newMin >= goal) {
        pendingGoalModal.current = true
        setGoalModalStreak(newStreak)
        setGoalModalXp(result?.xpAwarded ?? 0)
      }
      prevTodayMinRef.current = newMin
      dailyGoalRef.current    = goal
      streakDaysRef.current   = newStreak
    }).catch(() => {})

    // Queue any milestone from this session
    if (result?.challengesCompleted && result.challengesCompleted.length > 0) {
      const ch = result.challengesCompleted[0]
      const days = parseInt(ch.key.replace('streak_', ''), 10)
      if (!isNaN(days)) {
        pendingMilestoneRef.current = { days, bonusXp: ch.bonus_xp }
      }
    }

    if (result?.levelUp) {
      setLevelUpNum(result.newLevel)
      setShowLevelUp(true)
    } else if (result && result.achievements.length > 0) {
      setAchQueue(result.achievements)
      setShowAch(true)
    } else {
      // No level-up or achievements — show goal/milestone directly after stats load
      setTimeout(showNextOverlay, 600)
    }
  }

  const onLevelUpDismiss = () => {
    setShowLevelUp(false)
    const result = pendingResult.current
    if (result && result.achievements.length > 0) {
      setAchQueue(result.achievements)
      setShowAch(true)
    } else {
      showNextOverlay()
    }
  }

  const onAchDismiss = () => {
    setAchQueue(prev => {
      const next = prev.slice(1)
      if (next.length === 0) {
        setShowAch(false)
        showNextOverlay()
      }
      return next
    })
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  const playScale = useSharedValue(1)
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playScale.value }] }))

  const onPlayPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    playScale.value = withSpring(0.92, { damping: 8, stiffness: 400 }, () => {
      playScale.value = withSpring(1, { damping: 10, stiffness: 200 })
    })
    totalMinRef.current = 0
    setCircleComplete(false)
    setStrokeColor(FOCUS_COLOR)
    start()
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const plannedMs  = plannedMinutes * 60_000
  const phaseTotalMs = phase === 'break' ? breakSeconds() * 1000 : plannedMs
  const progress   = status === 'idle' ? 1 : Math.max(0, Math.min(1, remainingMs / phaseTotalMs))
  const displaySec = Math.ceil(Math.max(0, remainingMs) / 1000)
  // elapsedMin = completed rounds + current focus round elapsed (0 during break/idle)
  const focusElapsed = phase === 'focus' && status !== 'idle'
    ? Math.floor((plannedMs - Math.max(0, remainingMs)) / 60_000)
    : 0
  const elapsedMin = totalMinRef.current + focusElapsed

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.timerContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Active users badge ────────────────────────────────────────────── */}
      <ActiveUsersBadge />

      {/* ── Round dots (multi-session) ────────────────────────────────────── */}
      <RoundDots total={totalSessions} current={currentSession} />

      {/* ── Circle + overlay ──────────────────────────────────────────────── */}
      <View style={styles.circleWrap}>
        <TimerCircle
          progress={circleComplete ? 1 : progress}
          strokeColor={strokeColor}
        />
        <View style={styles.circleCenter} pointerEvents="none">
          {phase === 'break' ? (
            <>
              <DigitDisplay remainingSeconds={displaySec} color={BREAK_COLOR} />
              <Text style={[styles.modeLabel, { color: BREAK_COLOR, fontFamily: typography.fontFamily.regular }]}>
                Tanaffus
              </Text>
            </>
          ) : circleComplete ? (
            <Text style={[styles.checkmark, { color: c.success }]}>✓</Text>
          ) : (
            <>
              <DigitDisplay remainingSeconds={displaySec} color={status === 'active' ? FOCUS_COLOR : c.textPrimary} />
              {totalSessions > 1 && status !== 'idle' && (
                <Text style={[styles.roundBadge, { color: FOCUS_COLOR, fontFamily: typography.fontFamily.semibold }]}>
                  {currentSession}/{totalSessions}
                </Text>
              )}
              <Text style={[styles.modeLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                {status === 'paused' ? "To'xtatildi" : 'Fokus vaqti'}
              </Text>
            </>
          )}
        </View>
        <View style={styles.xpFloatAnchor} pointerEvents="none">
          <XPFloat ref={xpFloatRef} />
        </View>
      </View>

      {/* ── Presets + sessions (idle only) ───────────────────────────────── */}
      {status === 'idle' && (
        <>
          <View style={styles.presets}>
            {PRESETS.map((min, i) => {
              const sel = min === plannedMinutes
              return (
                <Pressable
                  key={min}
                  onPress={() => selectMinutes(min)}
                  style={({ pressed }) => [
                    styles.presetBtn,
                    { backgroundColor: sel ? c.accentPrimary : c.bgTertiary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[
                    styles.presetText,
                    { color: sel ? c.textInverse : c.textSecondary, fontFamily: typography.fontFamily.medium },
                  ]}>
                    {PRESET_LABELS[i]}
                  </Text>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => setShowCustom(true)}
              style={({ pressed }) => [styles.presetBtn, { backgroundColor: c.bgTertiary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.presetText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                Boshqa
              </Text>
            </Pressable>
          </View>

          <SessionsPicker
            value={totalSessions}
            onChange={selectSessions}
            disabled={status !== 'idle'}
          />
        </>
      )}

      {/* ── Control buttons ───────────────────────────────────────────────── */}
      <View style={styles.controls}>
        {status === 'idle' && (
          <Animated.View style={playStyle}>
            <Pressable
              onPress={onPlayPress}
              style={[styles.playBtn, { backgroundColor: c.accentPrimary, shadowColor: c.accentPrimary }]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M8 5v14l11-7z" fill={c.textInverse} />
              </Svg>
            </Pressable>
          </Animated.View>
        )}

        {(status === 'active' || status === 'paused') && (
          <View style={styles.ctrlRow}>
            {status === 'paused' ? (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); resume() }}
                style={[styles.ctrlBtn, { backgroundColor: c.accentPrimary }]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M8 5v14l11-7z" fill={c.textInverse} />
                </Svg>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); pause() }}
                style={[styles.ctrlBtn, { backgroundColor: c.bgTertiary }]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill={c.textPrimary} />
                </Svg>
              </Pressable>
            )}
            <Pressable
              onPress={() => { pause(); setShowStopConfirm(true) }}
              style={[styles.ctrlBtn, { backgroundColor: c.errorMuted }]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M6 6h12v12H6z" fill={c.error} />
              </Svg>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Session info card ─────────────────────────────────────────────── */}
      <View style={[styles.infoCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <InfoRow
          label="Bugungi sessiyalar"
          value={status !== 'idle'
            ? `${todaySessions + 1} ta`
            : todaySessions > 0 ? `${todaySessions} ta` : '—'}
        />
        <View style={[styles.dividerH, { backgroundColor: c.borderSubtle }]} />
        <InfoRow
          label="Bugungi vaqt"
          value={status !== 'idle'
            ? `${todayMinutes + elapsedMin} daq`
            : todayMinutes > 0 ? `${todayMinutes} daq` : '—'}
        />
        <View style={[styles.dividerH, { backgroundColor: c.borderSubtle }]} />
        <InfoRow
          label="Bugungi XP"
          value={status !== 'idle'
            ? `+${Math.round((todayMinutes + elapsedMin) * 1.66)}`
            : todayXP > 0 ? `+${todayXP}` : '+0'}
          accent
        />
      </View>

      {/* ── Ambient sounds ────────────────────────────────────────────────── */}
      <View style={[styles.ambientCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <AmbientPlayer />
      </View>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={showCustom} statusBarTranslucent>
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: c.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Vaqtni kiriting (daqiqa)
            </Text>
            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              keyboardType="number-pad"
              placeholder="5 – 180"
              placeholderTextColor={c.textDisabled}
              autoFocus
              style={[
                styles.customInput,
                { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, fontFamily: typography.fontFamily.regular },
              ]}
            />
            <Pressable
              onPress={() => {
                const n = parseInt(customInput, 10)
                if (n >= 5 && n <= 180) { selectMinutes(n); setShowCustom(false); setCustomInput('') }
              }}
              style={({ pressed }) => [styles.modalBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.modalBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Tasdiqlash
              </Text>
            </Pressable>
            <Pressable onPress={() => { setShowCustom(false); setCustomInput('') }} style={styles.modalLink}>
              <Text style={[styles.modalLinkText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Bekor qilish
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={showStopConfirm} statusBarTranslucent>
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: c.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Sessiyani tugataysizmi?
            </Text>
            <Text style={[styles.modalSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {elapsedMin} daqiqa o'qidingiz
            </Text>
            <Pressable
              onPress={() => { setShowStopConfirm(false); stop() }}
              style={({ pressed }) => [styles.modalBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.modalBtnText, { color: c.textInverse, fontFamily: typography.fontFamily.semibold }]}>
                Tugatish
              </Text>
            </Pressable>
            <Pressable onPress={() => { setShowStopConfirm(false); resume() }} style={styles.modalLink}>
              <Text style={[styles.modalLinkText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Davom ettirish
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CompletionSheet
        visible={showSheet}
        minutes={sheetMin}
        xpEarned={sheetXP}
        onSave={onSheetDone}
        onSkip={() => onSheetDone('')}
        saving={sheetSaving}
      />

      <LevelUpOverlay visible={showLevelUp} newLevel={levelUpNum} onDismiss={onLevelUpDismiss} />
      <AchievementOverlay visible={showAch} item={achQueue[0] ?? null} onDismiss={onAchDismiss} />

      <GoalCompleteModal
        visible={showGoalModal}
        streakDays={goalModalStreak}
        xpEarned={goalModalXp}
        onClose={() => { setShowGoalModal(false); setTimeout(showNextOverlay, 300) }}
      />
      <MilestoneModal
        visible={showMilestone}
        days={milestoneDay}
        bonusXp={milestoneBonusXp}
        onClose={() => setShowMilestone(false)}
      />
    </ScrollView>
  )
}

// ── Flashcards inline view (deck list within the tab) ────────────────────────

function FlashcardsView() {
  const { c }      = useTheme()
  const router     = useRouter()
  const insets     = useSafeAreaInsets()
  const { decks, loading, fetchDecks, fetchStats, addDeck } = useFlashcardStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showInfo,  setShowInfo]  = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchDecks()
      fetchStats()
    }, [])
  )

  const stats = useFlashcardStore(s => s.stats)

  return (
    <>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.screenMargin, gap: 12, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header row with info button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }]}>
          Mening to'plamlarim
        </Text>
        <Pressable
          onPress={() => setShowInfo(true)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.infoCircleBtn,
            { borderColor: c.border, backgroundColor: pressed ? c.bgTertiary : c.bgSecondary },
          ]}
        >
          <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: 13, lineHeight: 18 }]}>
            i
          </Text>
        </Pressable>
      </View>

      {/* Stats row */}
      {stats && (
        <View style={[styles.fcStatsCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <FCStatItem label="Jami kartalar" value={stats.total_cards} color={c.textPrimary} />
          <View style={[{ width: 1, backgroundColor: c.border, marginVertical: 4 }]} />
          <FCStatItem label="O'rganilgan" value={stats.total_mastered} color={c.success} />
          <View style={[{ width: 1, backgroundColor: c.border, marginVertical: 4 }]} />
          <FCStatItem label="Bugun" value={stats.today_reviewed} color={c.accentPrimary} />
        </View>
      )}

      {/* Deck list or empty */}
      {loading && decks.length === 0 ? (
        <ActivityIndicator color={c.accentPrimary} style={{ marginTop: 40 }} />
      ) : decks.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 40 }}>
          <Text style={[{ color: c.textDisabled, fontFamily: typography.fontFamily.regular, fontSize: 15 }]}>
            Hali kartochka yo'q
          </Text>
          <Pressable
            onPress={() => router.push('/(screens)/flashcards' as any)}
            style={({ pressed }) => [styles.fcCreateBtn, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.semibold, fontSize: 15 }]}>
              To'plam yaratish
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {decks.map(deck => {
            const mastery = deck.card_count > 0 ? deck.mastered_count / deck.card_count : 0
            return (
              <Pressable
                key={deck.id}
                onPress={() => router.push(`/(screens)/flashcard-deck/${deck.id}` as any)}
                style={({ pressed }) => [styles.fcDeckRow, { backgroundColor: c.bgSecondary, opacity: pressed ? 0.88 : 1 }]}
              >
                <View style={[styles.fcStripe, { backgroundColor: deck.color }]} />
                <View style={{ flex: 1, gap: 3, paddingRight: 8 }}>
                  <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: 15 }]} numberOfLines={1}>
                    {deck.title}
                  </Text>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 12 }]}>
                    {deck.card_count} ta karta · {deck.mastered_count} ta o'rganildi
                  </Text>
                  <View style={[{ height: 4, borderRadius: 2, width: 100, backgroundColor: c.bgTertiary, overflow: 'hidden' }]}>
                    <View style={[{ height: 4, borderRadius: 2, backgroundColor: c.success, width: `${Math.round(mastery * 100)}%` as any }]} />
                  </View>
                </View>
                {deck.due_count > 0 && (
                  <View style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accentPrimary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.bold, fontSize: 12 }]}>
                      {deck.due_count > 99 ? '99+' : deck.due_count}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          })}
          <Pressable
            onPress={() => router.push('/(screens)/flashcards' as any)}
            style={({ pressed }) => [styles.fcCreateBtn, { borderColor: c.border, borderWidth: 1, opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 14 }]}>
              Barcha to'plamlar →
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>

    {/* ── Flashcards info modal ─────────────────────────────────────────── */}
    <Modal transparent animationType="slide" visible={showInfo} statusBarTranslucent onRequestClose={() => setShowInfo(false)}>
      <Pressable style={[styles.fcInfoOverlay, { backgroundColor: c.overlay }]} onPress={() => setShowInfo(false)} />
      <View style={[styles.fcInfoSheet, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(spacing.xl, insets.bottom) }]}>
        <View style={[styles.fcInfoHandle, { backgroundColor: c.border }]} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 32 }}>

          <Text style={[styles.fcInfoTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Flashcard nima?
          </Text>
          <Text style={[styles.fcInfoBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Flashcard — bu bir tomonda savol yoki atama, ikkinchi tomonda esa javob yoki tushuntirish yozilgan raqamli karta. Siz kartani ko'rib, javobni o'ylab topsangiz, orqa tomonini ochib tekshirasiz.
          </Text>

          <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

          <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Nima uchun foydali?
          </Text>
          {[
            { icon: '🧠', title: 'Aktiv eslash', desc: "Faqat o'qish emas, balki eslashga urinish — bilimni mustahkamlaydigan eng samarali usul." },
            { icon: '📅', title: "Intervalli takrorlash (SM-2)", desc: "Ilova avtomatik ravishda qaysi kartani qachon ko'rsatishni hisoblaydi. Yaxshi bilganingizni kamroq, qiyinini ko'proq takrorlaysiz." },
            { icon: '⏱', title: "Vaqtni tejaydi", desc: "Kuniga 10–15 daqiqa flashcard bilan ishlash an'anaviy qayta o'qishdan ko'ra 2–4 barobar samaraliroq." },
            { icon: '📈', title: "O'sishni ko'rasiz", desc: "Har bir kartaning holati (yangi, o'rganilmoqda, o'rganilgan) va umumiy statistika saqlanadi." },
          ].map(item => (
            <View key={item.title} style={styles.fcInfoBenefit}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }]}>
                  {item.title}
                </Text>
                <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: 18 }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}

          <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

          <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Qanday ishlatish kerak?
          </Text>
          {[
            { n: '1', text: "\"Barcha to'plamlar\" tugmasini bosib flashcard ekraniga o'ting." },
            { n: '2', text: "Yangi to'plam yarating: mavzu nomi va rang tanlang." },
            { n: '3', text: "To'plamga kartalar qo'shing: savol va javob yozing." },
            { n: '4', text: "\"Takrorlash\" tugmasini bosing — ilova kartalarni ko'rsatadi, javobni ko'ring va qanchalik bilishingizni baholang." },
            { n: '5', text: "Har kuni biroz vaqt ajrating. \"Bugungi\" hisoblagich kundalik takrorlaganingizni ko'rsatadi." },
          ].map(step => (
            <View key={step.n} style={styles.fcInfoStep}>
              <View style={[styles.fcInfoStepBadge, { backgroundColor: c.accentPrimary }]}>
                <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.bold, fontSize: 12 }]}>{step.n}</Text>
              </View>
              <Text style={[{ flex: 1, color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, lineHeight: 20 }]}>
                {step.text}
              </Text>
            </View>
          ))}

        </ScrollView>

        <Pressable
          onPress={() => setShowInfo(false)}
          style={({ pressed }) => [styles.fcInfoClose, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }]}>
            Tushunarli
          </Text>
        </Pressable>
      </View>
    </Modal>
    </>
  )
}

function FCStatItem({ label, value, color }: { label: string; value: number; color: string }) {
  const { c } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Text style={[{ color, fontFamily: typography.fontFamily.bold, fontSize: 20 }]}>{value}</Text>
      <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: 11, textAlign: 'center' }]}>{label}</Text>
    </View>
  )
}

// ── Stats screen ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
        {title}
      </Text>
      {children}
    </View>
  )
}


function StatsScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const user   = useAuthStore(s => s.user)

  const [weeklyDays,  setWeeklyDays]  = useState<WeeklyStudyDay[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([])
  const [heatmapDays, setHeatmapDays] = useState<7 | 30 | 90>(90)
  const [stats,       setStats]       = useState<FocusStats | null>(null)
  const [loading,     setLoading]     = useState(true)

  const heatmapOpacity = useSharedValue(1)
  const heatmapAnimStyle = useAnimatedStyle(() => ({ opacity: heatmapOpacity.value }))

  useEffect(() => {
    ;(async () => {
      const [w, h, s] = await Promise.allSettled([
        focus.weekly(),
        user?.telegram_id ? profile.getHeatmap(user.telegram_id, 90) : Promise.resolve([]),
        focusStats.get(),
      ])
      if (w.status === 'fulfilled') setWeeklyDays(w.value ?? [])
      if (h.status === 'fulfilled') setHeatmapData(h.value ?? [])
      if (s.status === 'fulfilled') setStats(s.value)
      setLoading(false)
    })()
  }, [])

  const handleHeatmapFilter = useCallback((days: 7 | 30 | 90) => {
    if (!user?.telegram_id || days === heatmapDays) return
    const fetchAndSwap = async () => {
      try {
        const data = await profile.getHeatmap(user.telegram_id!, days)
        setHeatmapData(data ?? [])
      } catch {}
      setHeatmapDays(days)
      heatmapOpacity.value = withTiming(1, { duration: 200 })
    }
    heatmapOpacity.value = withTiming(0, { duration: 150 }, () => runOnJS(fetchAndSwap)())
  }, [user?.telegram_id, heatmapDays])

  if (loading) {
    return (
      <View style={styles.statsLoader}>
        <ActivityIndicator color={c.accentPrimary} size="large" />
      </View>
    )
  }

  const totalHours    = ((stats?.total_focus_minutes ?? 0) / 60).toFixed(1)
  const sessionsCount = stats?.sessions_count ?? 0
  const longestStreak = stats?.longest_streak ?? 0
  const currentStreak = stats?.streak_days ?? 0

  return (
    <ScrollView
      contentContainerStyle={styles.statsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Overview stats grid ────────────────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {totalHours}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Jami soatlar
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {sessionsCount}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Jami sessiyalar
          </Text>
        </View>

        <Pressable
          style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
          onPress={() => router.push('/(screens)/streak-detail' as any)}
        >
          <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {longestStreak}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Eng uzun seriya
          </Text>
        </Pressable>

        <Pressable
          style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
          onPress={() => router.push('/(screens)/streak-detail' as any)}
        >
          <View style={styles.streakRow}>
            <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
              {currentStreak}
            </Text>
            <Text style={styles.flameEmoji}>🔥</Text>
          </View>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Hozirgi seriya
          </Text>
        </Pressable>
      </View>

      {/* ── Weekly chart ───────────────────────────────────────────────────── */}
      <SectionCard title="Bu hafta">
        <WeeklyChart days={weeklyDays} />
      </SectionCard>

      {/* ── Heatmap ────────────────────────────────────────────────────────── */}
      <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        {/* Header row: title + filter pills */}
        <View style={styles.heatmapHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Faollik
          </Text>
          <View style={styles.heatmapFilters}>
            {([7, 30, 90] as const).map(d => {
              const active = heatmapDays === d
              const label  = d === 7 ? '1 hafta' : d === 30 ? '1 oy' : '90 kun'
              return (
                <Pressable
                  key={d}
                  onPress={() => handleHeatmapFilter(d)}
                  style={[
                    styles.heatmapFilterPill,
                    { backgroundColor: active ? c.accentPrimary : c.bgTertiary },
                  ]}
                >
                  <Text style={[
                    styles.heatmapFilterText,
                    { color: active ? c.textInverse : c.textSecondary, fontFamily: typography.fontFamily.medium },
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <Animated.View style={heatmapAnimStyle}>
          <MonthlyHeatmap data={heatmapData} days={heatmapDays} />
        </Animated.View>
      </View>

      {/* ── Weekly report link ─────────────────────────────────────────────── */}
      <Pressable
        onPress={() => router.push('/(screens)/weekly-report' as any)}
        style={({ pressed }) => [
          styles.sectionCard,
          styles.reportRow,
          { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.reportLeft}>
          <FileBarChart2 size={18} color={c.textSecondary} strokeWidth={1.8} />
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Haftalik hisobot
          </Text>
        </View>
        <ChevronRight size={16} color={c.textMuted} strokeWidth={1.8} />
      </Pressable>

    </ScrollView>
  )
}

// ── Root tab screen ───────────────────────────────────────────────────────────

export default function StudyTab() {
  const { c }    = useTheme()
  const insets   = useSafeAreaInsets()

  const scrollRef   = useRef<any>(null)
  const scrollX     = useRef(new RNAnimated.Value(0)).current
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [pagerH,        setPagerH]        = useState(0)
  const [showTimerInfo, setShowTimerInfo] = useState(false)

  function goToTab(i: number) {
    scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true })
    setActiveIndex(i)
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          O'qish vaqti
        </Text>
        {activeIndex === 0 && (
          <Pressable
            onPress={() => setShowTimerInfo(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.infoCircleBtn,
              styles.topBarInfoBtn,
              { borderColor: c.border, backgroundColor: pressed ? c.bgTertiary : 'transparent' },
            ]}
          >
            <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: 13, lineHeight: 18 }]}>
              i
            </Text>
          </Pressable>
        )}
      </View>

      <SubTabBar scrollX={scrollX} activeIndex={activeIndex} onTabPress={goToTab} />

      {/* ── Pager: all 3 pages live side-by-side ─────────────────────────── */}
      <View style={{ flex: 1 }} onLayout={e => setPagerH(e.nativeEvent.layout.height)}>
        {pagerH > 0 && (
          <RNAnimated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={{ width: SCREEN_W, height: pagerH }}
            contentContainerStyle={{ height: pagerH }}
            onScroll={RNAnimated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={e => {
              const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
              setActiveIndex(i)
            }}
          >
            <View style={{ width: SCREEN_W, height: pagerH }}><TimerScreen /></View>
            <View style={{ width: SCREEN_W, height: pagerH }}><FlashcardsView /></View>
            <View style={{ width: SCREEN_W, height: pagerH }}><StatsScreen /></View>
          </RNAnimated.ScrollView>
        )}
      </View>

      {/* ── Timer info modal ───────────────────────────────────────────────── */}
      <Modal transparent animationType="slide" visible={showTimerInfo} statusBarTranslucent onRequestClose={() => setShowTimerInfo(false)}>
        <Pressable style={[styles.fcInfoOverlay, { backgroundColor: c.overlay }]} onPress={() => setShowTimerInfo(false)} />
        <View style={[styles.fcInfoSheet, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(spacing.xl, insets.bottom) }]}>
          <View style={[styles.fcInfoHandle, { backgroundColor: c.border }]} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 8 }}>

            <Text style={[styles.fcInfoTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Fokus taymer nima?
            </Text>
            <Text style={[styles.fcInfoBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Fokus taymer — chalg'itmasdan chuqur o'qishga yordam beradigan vaqt boshqaruv usuli. Belgilangan vaqt ichida faqat bir ishga diqqat jamlaysiz, keyin qisqa dam olasiz.
            </Text>

            <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Nima uchun foydali?
            </Text>
            {[
              { icon: '🎯', title: 'Chuqur diqqat', desc: 'Vaqt chegarasi borligi sababli miyangiz faqat bir ishga to\'liq yopishadi va chalg\'ish kamayadi.' },
              { icon: '🔥', title: 'Seriya va odatlar', desc: 'Har kuni o\'qish odatini shakllantiradi. Uzilmagan kunlar seriyasi motivatsiyani oshiradi.' },
              { icon: '⭐', title: 'XP va daraja', desc: 'Har bir tugatilgan sessiya uchun tajriba ballari (XP) olasiz va darajangiz o\'sadi.' },
              { icon: '📊', title: 'Taraqqiyotni ko\'rish', desc: 'Haftalik grafik va issiqlik xaritasida o\'qish odatingizning rivojlanishini kuzatasiz.' },
            ].map(item => (
              <View key={item.title} style={styles.fcInfoBenefit}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }]}>
                    {item.title}
                  </Text>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: 18 }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}

            <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Qanday ishlatish kerak?
            </Text>
            {[
              { n: '1', text: 'Vaqtni tanlang — 15, 25, 45 yoki 60 daqiqa. Yoki "Boshqa" tugmasidan o\'zingiz kiriting (5–180 daqiqa).' },
              { n: '2', text: 'Sessiyalar sonini belgilang (1×, 2×, 3× yoki 4×) — bir o\'tirishda necha marta fokuslanmoqchi ekanligingizga qarab.' },
              { n: '3', text: 'Play tugmasini bosing va faqat o\'qishga e\'tibor bering.' },
              { n: '4', text: 'Sessiya tugagach avtomatik tanaffus boshlanadi. Dam olish vaqtida haqiqatan dam oling.' },
              { n: '5', text: 'Barcha sessiyalar tugagach natijalar ko\'rsatiladi: vaqt, XP va bugungi statistika yangilanadi.' },
            ].map(step => (
              <View key={step.n} style={styles.fcInfoStep}>
                <View style={[styles.fcInfoStepBadge, { backgroundColor: c.accentPrimary }]}>
                  <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.bold, fontSize: 12 }]}>{step.n}</Text>
                </View>
                <Text style={[{ flex: 1, color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, lineHeight: 20 }]}>
                  {step.text}
                </Text>
              </View>
            ))}

            <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Qo'shimcha imkoniyatlar
            </Text>
            {[
              { icon: '🎵', title: "Muhit tovushlari", desc: "Yomg'ir, qahvaxona, tabiat va boshqa ambient tovushlar diqqatni jamlashga yordam beradi." },
              { icon: '👥', title: "Birga o'qish", desc: "Hozir nechi kishi o'qiyotganligi ko'rinadi — bu umumiy motivatsiya hissini beradi." },
            ].map(item => (
              <View key={item.title} style={styles.fcInfoBenefit}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }]}>
                    {item.title}
                  </Text>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: 18 }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}

          </ScrollView>

          <Pressable
            onPress={() => setShowTimerInfo(false)}
            style={({ pressed }) => [styles.fcInfoClose, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }]}>
              Tushunarli
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1 },

  topBar: {
    height:            52,
    alignItems:        'center',
    justifyContent:    'center',
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: typography.size.lg },
  topBarInfoBtn: {
    position: 'absolute',
    right:    spacing.screenMargin,
  },

  subTabBar:       { flexDirection: 'row', borderBottomWidth: 1, position: 'relative' },
  subTab:          { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 4 },
  subTabText:      { fontSize: typography.size.base },
  subTabIndicator: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1 },

  // Active badge
  activeBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingHorizontal: spacing.base,
    paddingVertical:   6,
    borderRadius:   radius.full,
    borderWidth:    1,
    alignSelf:      'center',
  },
  activeDot:  { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: typography.size.xs },

  // Sessions picker
  sessionRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    paddingHorizontal: spacing.screenMargin,
  },
  sessionLabel: { fontSize: typography.size.sm, marginRight: 4 },
  sessionPill: {
    width:         40,
    height:        36,
    borderRadius:  radius.xl,
    borderWidth:   1,
    alignItems:    'center',
    justifyContent: 'center',
  },
  sessionPillText: { fontSize: typography.size.sm },

  // Round dots
  roundDots:  { flexDirection: 'row', gap: 8, alignSelf: 'center' },
  roundDot:   { width: 10, height: 10, borderRadius: 5 },

  // Timer
  timerContent: {
    alignItems:    'center',
    paddingTop:    spacing.base,
    paddingBottom: 80,
    gap:           spacing.lg,
  },
  circleWrap: {
    width:          TIMER_DIAMETER,
    height:         TIMER_DIAMETER,
    alignItems:     'center',
    justifyContent: 'center',
  },
  circleCenter: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
  },
  checkmark:      { fontSize: 72 },
  breakCountdown: { fontSize: typography.size['4xl'] },
  roundBadge:     { fontSize: typography.size.sm, marginTop: 2 },
  modeLabel:      { fontSize: typography.size.sm },
  xpFloatAnchor:  { position: 'absolute', alignItems: 'center', width: '100%' },

  presets: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    justifyContent:    'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.screenMargin,
  },
  presetBtn: {
    height:            36,
    paddingHorizontal: spacing.base,
    borderRadius:      radius.button,
    alignItems:        'center',
    justifyContent:    'center',
  },
  presetText: { fontSize: typography.size.sm },

  controls: { alignItems: 'center' },
  ctrlRow:  { flexDirection: 'row', gap: spacing.base, alignItems: 'center' },
  playBtn: {
    width:          64, height: 64, borderRadius: 32,
    alignItems:     'center', justifyContent: 'center',
    shadowOpacity:  0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation:      8,
  },
  ctrlBtn: {
    width:          52, height: 52, borderRadius: 26,
    alignItems:     'center', justifyContent: 'center',
  },

  infoCard: {
    width:        '90%',
    borderRadius: radius.cardLg,
    borderWidth:  1,
  },
  infoRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        spacing.base,
  },
  infoLabel: { fontSize: typography.size.sm },
  infoValue: { fontSize: typography.size.sm },
  dividerH:  { height: 1, marginHorizontal: spacing.base },

  ambientCard: {
    width:        '90%',
    borderRadius: radius.cardLg,
    borderWidth:  1,
    padding:      spacing.base,
  },

  // Modals
  modalOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  modalCard: {
    width: '100%', borderRadius: radius.modal, padding: spacing.xl, gap: spacing.sm, alignItems: 'center',
  },
  modalTitle:    { fontSize: typography.size.lg, textAlign: 'center' },
  modalSub:      { fontSize: typography.size.sm, textAlign: 'center' },
  customInput: {
    width: '100%', height: 52, borderWidth: 1, borderRadius: radius.input,
    paddingHorizontal: spacing.base, fontSize: typography.size.xl,
    textAlign: 'center', marginVertical: spacing.sm,
  },
  modalBtn: {
    width: '100%', height: 52, borderRadius: radius['2xl'],
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  modalBtnText:  { fontSize: typography.size.base },
  modalLink:     { paddingVertical: spacing.sm },
  modalLinkText: { fontSize: typography.size.sm },

  // Stats
  statsLoader:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsContent: { padding: spacing.screenMargin, gap: spacing.base, paddingBottom: 80 },
  reportRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportLeft:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  sectionCard: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  sectionTitle: { fontSize: typography.size.base },

  heatmapHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.xs,
  },
  heatmapFilters: {
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  heatmapFilterPill: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      radius.full,
  },
  heatmapFilterText: { fontSize: typography.size.xs },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flexBasis: '47%', flexGrow: 1,
    borderRadius: radius.cardLg, borderWidth: 1,
    padding: spacing.base, alignItems: 'center', gap: 4,
  },
  statNum:     { fontSize: typography.size.xl },
  statLabel:   { fontSize: typography.size.xs, textAlign: 'center' },
  streakRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flameEmoji:  { fontSize: 16 },

  // Flashcards inline view
  fcStatsCard: {
    flexDirection: 'row',
    borderRadius:  radius.cardLg,
    borderWidth:   1,
    padding:       spacing.base,
    marginBottom:  2,
  },
  fcDeckRow: {
    height:        80,
    borderRadius:  14,
    flexDirection: 'row',
    alignItems:    'center',
    overflow:      'hidden',
  },
  fcStripe: { width: 4, alignSelf: 'stretch', marginRight: 14 },
  fcCreateBtn: {
    height:         44,
    borderRadius:   radius.button,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Flashcards info button + modal
  infoCircleBtn: {
    width:          26,
    height:         26,
    borderRadius:   13,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  fcInfoOverlay: {
    flex: 1,
  },
  fcInfoSheet: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:         '85%',
    padding:           spacing.xl,
    paddingTop:        12,
  },
  fcInfoHandle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: spacing.base,
  },
  fcInfoTitle: {
    fontSize: typography.size.xl,
  },
  fcInfoBody: {
    fontSize:   typography.size.sm,
    lineHeight: 22,
  },
  fcInfoSection: {
    fontSize: typography.size.base,
  },
  fcInfoDivider: {
    height: 1,
  },
  fcInfoBenefit: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           12,
  },
  fcInfoStep: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
  },
  fcInfoStepBadge: {
    width:          22,
    height:         22,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      1,
  },
  fcInfoClose: {
    height:         52,
    borderRadius:   radius.button,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      spacing.base,
  },

  // XP Info
  xpRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  xpRowLabel: { fontSize: typography.size.sm },
  xpRowValue: { fontSize: typography.size.sm },
  xpRowSub:   { fontSize: typography.size.xs },
  xpInfoNote: {
    borderRadius: radius.lg,
    padding:      spacing.sm,
    marginTop:    spacing.xs,
  },
  xpInfoNoteText: { fontSize: typography.size.xs, lineHeight: 18 },

  // Challenges
  challengesSectionTitle: { fontSize: typography.size.lg },
  challengeCard: {
    borderRadius: radius.cardLg,
    padding:      spacing.base,
    gap:          spacing.sm,
  },
  challengeHeader: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            spacing.sm,
  },
  challengeIcon:  { fontSize: 28 },
  challengeTitle: { fontSize: typography.size.base },
  challengeDesc:  { fontSize: typography.size.xs, marginTop: 2 },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  xpBadgeText:   { fontSize: typography.size.xs },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: typography.size.xs },
  earnedBadge:   { borderRadius: radius.lg, padding: 6, alignItems: 'center' },
  earnedText:    { fontSize: typography.size.sm },
})
