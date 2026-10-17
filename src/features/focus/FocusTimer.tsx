/**
 * Fokus timer — redesign Phase 3b. Moved out of app/(tabs)/study.tsx.
 *
 * Timing: the store keeps an absolute end time; the ring animates to it on
 * the UI thread, TimerText re-renders itself once a second, and one timeout
 * fires the phase end. Nothing re-renders this screen while the clock runs.
 *
 * The completion flow (XP via completeSession, the completion sheet, level
 * up, achievements, goal / stage / challenge overlays, the reward check)
 * and restore-after-restart are unchanged from the old TimerScreen.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { Maximize2, Play } from 'lucide-react-native'

import { useTimerStore } from '../../../stores/timerStore'
import { useAuthStore } from '../../../stores/authStore'
import { useDashboardStore } from '../../../stores/dashboardStore'
import { useRewardStore } from '../../../stores/rewardStore'
import { useOfflineQueueStore } from '../../../stores/offlineQueueStore'
import { focus, focusStats, focusStages } from '../../../lib/api'
import { playFocusSound, playBreakSound } from '../../../lib/timerSounds'
import {
  setupTimerNotifications, saveTimerState, clearTimerState, loadTimerState,
  scheduleTimerEndNotification, cancelTimerEndNotification,
} from '../../../lib/timerBackground'
import { CompletionSheet } from '../../../components/study/CompletionSheet'
import { LevelUpOverlay } from '../../../components/study/LevelUpOverlay'
import { AchievementOverlay, type Achievement } from '../../../components/study/AchievementOverlay'
import { GoalCompleteModal } from '../../../components/streak/GoalCompleteModal'
import { EvolutionModal } from '../../../components/streak/EvolutionModal'
import { ChallengeChip } from '../../../components/study/ChallengeChip'
import { ChallengeCompletionModal, type CompletedChallenge } from '../../../components/study/ChallengeCompletionModal'
import type { StageNumber } from '../../../lib/treeTheme'

import { useTheme } from '../../design/ThemeProvider'
import { layout, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { haptics } from '../../lib/haptics'
import { useRepeatingTimeout } from '../../lib/useRepeatingTimeout'
import { Badge, Button, Card, ListRow, Sheet, Stepper } from '../../components/ui'
import { AmbientSheet } from './AmbientSheet'
import { DurationPicker } from './DurationPicker'
import { FocusRing } from './FocusRing'
import { RunningMode } from './RunningMode'
import { TimerText } from './TimerText'
import { XpFly } from './XpFly'
import { WARNING_MS, displayXp, statValue, strokeTone } from './timerMath'

const HEARTBEAT_MS = 30_000
const ACTIVE_COUNT_MS = 120_000
/** Idle ring diameter. */
const RING_SIZE = 240
/** Completion: wait for the ring pulse before the sheet rises. */
const SHEET_DELAY_MS = 800
/** Overlay queue spacing (unchanged from the old screen). */
const OVERLAY_GAP_MS = 300

// ── "N kishi hozir oʻqimoqda" ────────────────────────────────────────────────
function ActiveUsersBadge() {
  const [count, setCount] = useState<number | null>(null)
  useRepeatingTimeout(() => {
    focusStages.activeCount().then(r => setCount(r.count)).catch(() => {})
  }, ACTIVE_COUNT_MS)
  if (!count) return null
  return <Badge kind="status" status="success" label={`${count} kishi hozir oʻqimoqda`} style={styles.selfCenter} />
}

export function FocusTimer({ onXpTargetDistance }: {
  /** Distance from the ring centre up to the header XP counter. */
  onXpTargetDistance?: number
}) {
  const { colors } = useTheme()

  const {
    plannedMinutes, totalSessions, currentSession, status, phase,
    getRemainingMs, startBreak, nextRound, breakSeconds,
    selectMinutes, selectSessions, start, pause, resume, stop, reset, completeSession,
  } = useTimerStore()

  // ── Display state ─────────────────────────────────────────────────────────
  const [circleComplete, setCircleComplete] = useState(false)
  const [warn, setWarn] = useState(false)
  const [resumeTick, setResumeTick] = useState(0)       // re-sync ring/text with the clock
  const [minimized, setMinimized] = useState(false)
  const [xpFly, setXpFly] = useState({ amount: 0, n: 0 })
  const [ringCenterY, setRingCenterY] = useState(0)

  // ── Overlay state ─────────────────────────────────────────────────────────
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [stopMinutes, setStopMinutes] = useState(0)
  const [showSheet, setShowSheet] = useState(false)
  const [sheetMin, setSheetMin] = useState(0)
  const [sheetXP, setSheetXP] = useState(0)
  const [sheetSaving, setSheetSaving] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpNum, setLevelUpNum] = useState(1)
  const [achQueue, setAchQueue] = useState<Achievement[]>([])
  const [showAch, setShowAch] = useState(false)

  // Goal complete & milestone modals
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalModalStreak, setGoalModalStreak] = useState(0)
  const [goalModalXp, setGoalModalXp] = useState(0)
  const [goalModalTanga, setGoalModalTanga] = useState(0)
  // Reaching a tree stage is the same event streak-detail.tsx celebrates with
  // the full EvolutionModal.
  const [showMilestone, setShowMilestone] = useState(false)
  const [milestoneStage, setMilestoneStage] = useState<StageNumber>(1)
  const [milestoneBonusXp, setMilestoneBonusXp] = useState(0)
  const [milestoneBonusTanga, setMilestoneBonusTanga] = useState(0)
  const [showChallengeComplete, setShowChallengeComplete] = useState(false)
  const [completedChallenge, setCompletedChallenge] = useState<CompletedChallenge | null>(null)

  const pendingGoalModal = useRef(false)
  const pendingMilestoneRef = useRef<{ stage: StageNumber; bonusXp: number; bonusTanga: number } | null>(null)
  const pendingChallengeRef = useRef<CompletedChallenge | null>(null)
  const dailyGoalRef = useRef(20)
  const prevTodayMinRef = useRef(0)
  const streakDaysRef = useRef(0)

  // Keep a ref to the current phase so timer closures always see the latest value
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Background timer: permissions + restore on mount ─────────────────────
  useEffect(() => {
    setupTimerNotifications()

    // If the app was restarted while a timer was running, restore it
    loadTimerState().then(async saved => {
      if (!saved) return
      if (saved.targetEnd > Date.now()) {
        // Timer still has time left — restore live state
        useTimerStore.setState({
          status:         'active',
          phase:          saved.phase,
          plannedMinutes: saved.plannedMinutes,
          currentSession: saved.currentSession ?? 1,
          totalSessions:  saved.totalSessions  ?? 1,
          secondsLeft:    Math.ceil((saved.targetEnd - Date.now()) / 1000),
          _targetEnd:     saved.targetEnd,
          _pauseLeft:     0,
        })
        setResumeTick(t => t + 1)
      } else {
        // Timer ended while app was closed — credit the completed focus session
        clearTimerState()
        if (saved.phase === 'focus') {
          try {
            await focus.complete(saved.plannedMinutes)
          } catch {
            useOfflineQueueStore.getState().enqueue(saved.plannedMinutes)
          }
        }
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
        currentSession: store.currentSession,
        totalSessions:  store.totalSessions,
        // focus-timer.tsx restores from this same key and reads it.
        completedSessions: store.phase === 'focus' ? store.currentSession - 1 : store.currentSession,
      })
      scheduleTimerEndNotification(store._targetEnd, store.phase)
    } else if (status === 'paused') {
      cancelTimerEndNotification()
    } else if (status === 'idle') {
      clearTimerState()
      cancelTimerEndNotification()
    }
  }, [status, phase])

  // Today's cumulative stats
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [todaySessions, setTodaySessions] = useState(0)

  const refreshStats = useCallback(() => {
    focusStats.get().then(s => {
      setTodayMinutes(s.today_minutes ?? 0)
      setTodaySessions(s.today_sessions ?? 0)
      dailyGoalRef.current    = s.daily_goal  ?? 20
      prevTodayMinRef.current = s.today_minutes ?? 0
      streakDaysRef.current   = s.streak_days  ?? 0
      useDashboardStore.getState().patchFocusStats(s)
    }).catch(() => {})
  }, [])

  useEffect(() => { refreshStats() }, [refreshStats])

  // Re-fetch when the app returns (picks up sessions done on the website),
  // and re-sync the ring/text with the wall clock.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return
      if (useTimerStore.getState().status === 'idle') refreshStats()
      setResumeTick(t => t + 1)
    })
    return () => sub.remove()
  }, [refreshStats])

  const pendingResult = useRef<Awaited<ReturnType<typeof completeSession>> | null>(null)
  const totalMinRef = useRef(0)
  // Shared guard: the end timeout and the AppState foreground path must
  // never both fire the same expiry.
  const completionFiredRef = useRef(false)

  // Heartbeat while studying (focus phase only)
  useRepeatingTimeout(() => { focusStages.heartbeat() }, HEARTBEAT_MS, status === 'active' && phase === 'focus')

  const completionHandlerRef = useRef<() => void>(() => {})

  // Called when the BREAK timer hits 0 → auto-start next focus round
  const handleBreakComplete = () => {
    playFocusSound().catch(() => {})
    haptics.light()
    const allDone = nextRound()  // starts next focus session (or returns true if all done)
    if (allDone) reset()
  }

  // Called when the FOCUS timer hits 0 → award XP + auto-start break (or show sheet)
  const handleRoundComplete = () => {
    haptics.success()
    playBreakSound().catch(() => {})
    const roundMin = plannedMinutes
    totalMinRef.current += roundMin
    setXpFly(f => ({ amount: displayXp(roundMin), n: f.n + 1 }))

    const allDone = currentSession >= totalSessions
    if (!allDone) {
      startBreak()
    } else {
      // Focus complete: the ring finishes and pulses, XP flies, then the sheet.
      setCircleComplete(true)
      setMinimized(false)
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
      }, SHEET_DELAY_MS)
    }
  }

  // Refreshed after every render so the end timeout always calls the right handler
  useEffect(() => {
    completionHandlerRef.current = phaseRef.current === 'break' ? handleBreakComplete : handleRoundComplete
  })

  // ── Phase end + warning: timeouts, not a tick loop ────────────────────────
  useEffect(() => {
    // Each new phase/status cycle starts fresh — reset the shared guard so the
    // upcoming expiry fires exactly once across this and the AppState path.
    completionFiredRef.current = false
    if (status !== 'active') return

    const remaining = getRemainingMs()
    const fire = () => {
      if (completionFiredRef.current) return
      completionFiredRef.current = true
      completionHandlerRef.current()
    }
    const end = setTimeout(fire, Math.max(0, remaining) + 50)
    const warnIn = remaining - WARNING_MS
    const w = phase === 'focus' && warnIn > 0 ? setTimeout(() => setWarn(true), warnIn) : undefined
    const nowWarn = setTimeout(() => setWarn(phase === 'focus' && warnIn <= 0), 0)
    return () => { clearTimeout(end); if (w) clearTimeout(w); clearTimeout(nowWarn) }
  }, [status, phase, currentSession, resumeTick, getRemainingMs])

  // ── App foregrounding: an expiry that passed in the background ───────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active' || useTimerStore.getState().status !== 'active') return
      const ms = useTimerStore.getState().getRemainingMs()
      if (ms <= 0 && !completionFiredRef.current) {
        completionFiredRef.current = true
        completionHandlerRef.current()
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
      setMilestoneStage(m.stage)
      setMilestoneBonusXp(m.bonusXp)
      setMilestoneBonusTanga(m.bonusTanga)
      setShowMilestone(true)
      return
    }
    if (pendingChallengeRef.current) {
      const ch = pendingChallengeRef.current
      pendingChallengeRef.current = null
      setCompletedChallenge(ch)
      setShowChallengeComplete(true)
      return
    }
    // tanga-economy-rework (092) Part 5: only once every other celebration
    // overlay from THIS session has been shown.
    useRewardStore.getState().check()
  }, [])

  // ── Sheet dismiss ─────────────────────────────────────────────────────────
  const onSheetDone = async (_note: string) => {
    setSheetSaving(true)
    await new Promise(r => setTimeout(r, 200))
    setSheetSaving(false)
    setShowSheet(false)
    setCircleComplete(false)
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
      setTodaySessions(s.today_sessions ?? 0)
      useDashboardStore.getState().patchFocusStats(s)

      // Goal complete: was below goal before, now at or above
      if (prevTodayMinRef.current < goal && newMin >= goal) {
        pendingGoalModal.current = true
        setGoalModalStreak(newStreak)
        setGoalModalXp(result?.xpAwarded ?? 0)
        const tangaEvent = result?.tangaEvents?.find(e => e.reason === 'daily_goal_met')
        setGoalModalTanga(tangaEvent?.amount ?? 0)
      }
      prevTodayMinRef.current = newMin
      dailyGoalRef.current    = goal
      streakDaysRef.current   = newStreak
    }).catch(() => {})

    if (result?.stagesCompleted && result.stagesCompleted.length > 0) {
      const stage = result.stagesCompleted[0]
      pendingMilestoneRef.current = { stage: stage.stage_number as StageNumber, bonusXp: stage.bonus_xp, bonusTanga: stage.bonus_tanga }
    }
    if (result?.challengesCompleted && result.challengesCompleted.length > 0) {
      const ch = result.challengesCompleted[0]
      pendingChallengeRef.current = { slug: ch.slug, title: ch.title, reward_xp: ch.reward_xp, badge_key: ch.badge_key }
    }

    if (result?.levelUp) {
      setLevelUpNum(result.newLevel)
      setShowLevelUp(true)
    } else if (result && result.achievements.length > 0) {
      setAchQueue(result.achievements)
      setShowAch(true)
    } else {
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
  const onStart = () => {
    totalMinRef.current = 0
    setCircleComplete(false)
    setMinimized(false)
    start()
  }

  const askStop = () => {
    const plannedMs = plannedMinutes * 60_000
    const focusElapsed = phase === 'focus' ? Math.floor((plannedMs - Math.max(0, getRemainingMs())) / 60_000) : 0
    setStopMinutes(totalMinRef.current + focusElapsed)
    pause()
    setShowStopConfirm(true)
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const running = status === 'active' || status === 'paused'
  const totalMs = phase === 'break' ? breakSeconds() * 1000 : plannedMinutes * 60_000
  // `warn` is set by a timeout at end − 5 min; feed strokeTone a value on
  // the right side of that threshold instead of reading the clock here.
  const tone = strokeTone(phase, warn ? 1 : WARNING_MS + 1, circleComplete)
  const syncKey = `${status}-${phase}-${currentSession}-${plannedMinutes}-${resumeTick}`
  const flyDistance = onXpTargetDistance ?? ringCenterY + space.huge

  const onRingLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout
    setRingCenterY(y + height / 2)
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ActiveUsersBadge />
      <ChallengeChip />

      <View style={styles.ringWrap} onLayout={onRingLayout}>
        <FocusRing
          size={RING_SIZE}
          status={status}
          getRemainingMs={getRemainingMs}
          totalMs={totalMs}
          tone={tone}
          complete={circleComplete}
          syncKey={syncKey}
        >
          {circleComplete ? (
            <Text style={[typeScale.title1, { color: colors.successText }]}>Bajarildi</Text>
          ) : (
            <>
              <TimerText getRemainingMs={getRemainingMs} status={status} syncKey={syncKey} />
              <Text style={[typeScale.callout, { color: phase === 'break' ? colors.successText : colors.textMuted }]}>
                {phase === 'break' ? 'Tanaffus' : status === 'paused' ? 'Toʻxtatildi' : 'Fokus vaqti'}
                {running && totalSessions > 1 ? ` · ${currentSession}/${totalSessions}` : ''}
              </Text>
            </>
          )}
        </FocusRing>
        {/* After the last round the status stays 'active' until the sheet is
            done, so the idle-view fly also covers circleComplete. */}
        {(!running || circleComplete) && <XpFly amount={xpFly.amount} trigger={xpFly.n} distance={flyDistance} />}
      </View>

      {status === 'idle' && !circleComplete && (
        <>
          <DurationPicker value={plannedMinutes} onChange={selectMinutes} />
          <View style={styles.sessions}>
            <Text style={[typeScale.callout, { color: colors.textMuted }]}>Sessiyalar</Text>
            <Stepper
              value={totalSessions}
              onChange={selectSessions}
              min={1}
              max={4}
              suffix="×"
              accessibilityLabel="Sessiyalar soni"
            />
          </View>
          <Button label="Boshlash" icon={Play} size="lg" fullWidth onPress={onStart} />
        </>
      )}

      {running && minimized && (
        <Button label="Toʻliq ekran" icon={Maximize2} size="lg" fullWidth onPress={() => setMinimized(false)} />
      )}

      <Card style={styles.today}>
        <ListRow title="Bugungi sessiyalar" trailing={{ kind: 'value', value: statValue(todaySessions, 'ta') }} />
        <ListRow title="Bugungi vaqt" trailing={{ kind: 'value', value: statValue(todayMinutes, 'daq') }} />
        <ListRow title="Bugungi XP" trailing={{ kind: 'value', value: `+${statValue(displayXp(todayMinutes))}` }} />
      </Card>

      <AmbientSheet />

      <RunningMode
        visible={running && !minimized && !circleComplete}
        status={status}
        phase={phase}
        getRemainingMs={getRemainingMs}
        totalMs={totalMs}
        tone={tone}
        syncKey={syncKey}
        round={{ current: currentSession, total: totalSessions }}
        onPause={() => { haptics.light(); pause() }}
        onResume={() => { haptics.light(); resume() }}
        onStop={askStop}
        onMinimize={() => setMinimized(true)}
        overlay={<XpFly amount={xpFly.amount} trigger={xpFly.n} distance={RING_SIZE / 2 + space.huge} />}
      />

      <Sheet visible={showStopConfirm} onClose={() => { setShowStopConfirm(false); resume() }} title="Sessiyani tugataysizmi?">
        <View style={styles.sheet}>
          <Text style={[typeScale.body, { color: colors.textMuted }]}>{stopMinutes} daqiqa oʻqidingiz</Text>
          <Button
            label="Tugatish"
            variant="destructive"
            size="lg"
            fullWidth
            onPress={() => { setShowStopConfirm(false); setMinimized(false); stop() }}
          />
          <Button
            label="Davom ettirish"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => { setShowStopConfirm(false); resume() }}
          />
        </View>
      </Sheet>

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
        tangaEarned={goalModalTanga}
        onClose={() => { setShowGoalModal(false); setTimeout(showNextOverlay, OVERLAY_GAP_MS) }}
      />
      <EvolutionModal
        visible={showMilestone}
        toStage={milestoneStage}
        bonusXp={milestoneBonusXp}
        bonusTanga={milestoneBonusTanga}
        onClose={() => { setShowMilestone(false); setTimeout(showNextOverlay, OVERLAY_GAP_MS) }}
      />
      <ChallengeCompletionModal
        visible={showChallengeComplete}
        challenge={completedChallenge}
        onClose={() => setShowChallengeComplete(false)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: space.md, paddingBottom: space.xxl, gap: space.lg },
  selfCenter: { alignSelf: 'center' },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  sessions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  today: { paddingVertical: space.xxs },
  sheet: { gap: space.sm },
})
