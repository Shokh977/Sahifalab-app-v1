import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, Animated, Easing, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/shallow'
import { useTimerStore, SoundTrack } from '../../stores/timerStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { playFocusSound, playBreakSound } from '../../lib/timerSounds'

// expo modules lazy-required for Expo Go compatibility
let Notifications: any = null
try { Notifications = require('expo-notifications') } catch {}

let Haptics: any = null
try { Haptics = require('expo-haptics') } catch {}

let AudioModule: any = null
try { AudioModule = require('expo-audio') } catch {}

// Module-level ambient player instances — survive renders
const soundInstances: Record<string, any> = {}

async function loadSoundInstance(track: SoundTrack) {
  if (!AudioModule?.createAudioPlayer || !track.uri) return
  try {
    await AudioModule.setAudioModeAsync({ playsInSilentModeIOS: true })
    const player = AudioModule.createAudioPlayer({ uri: track.uri })
    player.loop   = true
    player.volume = track.volume
    player.play()
    soundInstances[track.id] = player
  } catch {}
}

async function unloadSoundInstance(id: string) {
  const p = soundInstances[id]
  if (!p) return
  try { p.pause(); p.remove() } catch {}
  delete soundInstances[id]
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Focus durations (minutes) ─────────────────────────────────────────────────
const DURATIONS = [15, 25, 45, 60]
const SESSION_OPTIONS = [1, 2, 3, 4]

// ── Colors ────────────────────────────────────────────────────────────────────
const FOCUS_COLOR = '#f97316'  // orange
const BREAK_COLOR = '#22c55e'  // green

function DurationChip({
  minutes, selected, onPress,
}: { minutes: number; selected: boolean; onPress: () => void }) {
  const { c } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.durationChip,
        { backgroundColor: selected ? FOCUS_COLOR : c.bgTertiary },
      ]}
    >
      <Text style={[
        styles.durationChipText,
        { color: selected ? '#fff' : c.textMuted, fontFamily: typography.fontFamily.medium },
      ]}>
        {minutes} daq
      </Text>
    </Pressable>
  )
}

function SessionChip({
  count, selected, onPress,
}: { count: number; selected: boolean; onPress: () => void }) {
  const { c } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.durationChip,
        { backgroundColor: selected ? FOCUS_COLOR : c.bgTertiary },
      ]}
    >
      <Text style={[
        styles.durationChipText,
        { color: selected ? '#fff' : c.textMuted, fontFamily: typography.fontFamily.medium },
      ]}>
        {count}x
      </Text>
    </Pressable>
  )
}

function SoundRow({ track }: { track: SoundTrack }) {
  const { c } = useTheme()
  const toggleSound    = useTimerStore(s => s.toggleSound)
  const setSoundVolume = useTimerStore(s => s.setSoundVolume)

  return (
    <View style={[styles.soundRow, { borderBottomColor: c.border }]}>
      <Pressable
        onPress={() => toggleSound(track.id)}
        style={[styles.soundToggle, { backgroundColor: track.isActive ? c.brandSubtle : c.bgTertiary }]}
      >
        <Text style={{ fontSize: 20 }}>{track.emoji}</Text>
        <Text style={[
          styles.soundName,
          { color: track.isActive ? c.brand : c.textSecondary, fontFamily: typography.fontFamily.medium },
        ]}>
          {track.name}
        </Text>
        {!track.uri && (
          <Text style={[styles.soundTag, { color: c.textMuted }]}>tez kunda</Text>
        )}
      </Pressable>

      {track.isActive && (
        <View style={styles.volRow}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
            <Pressable
              key={v}
              onPress={() => setSoundVolume(track.id, v)}
              style={[
                styles.volDot,
                { backgroundColor: track.volume >= v ? c.brand : c.bgElevated },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

export default function FocusTimerScreen() {
  const { c } = useTheme()

  const {
    plannedMinutes, totalSessions, phase, status, secondsLeft,
    sessionCount, sounds, lastXP,
    start, pause, resume, reset, tick,
    startBreak, completeBreak, onSessionComplete,
    selectMinutes, selectSessions,
  } = useTimerStore(useShallow(s => ({
    plannedMinutes:    s.plannedMinutes,
    totalSessions:     s.totalSessions,
    phase:             s.phase,
    status:            s.status,
    secondsLeft:       s.secondsLeft,
    sessionCount:      s.sessionCount,
    sounds:            s.sounds,
    lastXP:            s.lastXP,
    start:             s.start,
    pause:             s.pause,
    resume:            s.resume,
    reset:             s.reset,
    tick:              s.tick,
    startBreak:        s.startBreak,
    completeBreak:     s.completeBreak,
    onSessionComplete: s.onSessionComplete,
    selectMinutes:     s.selectMinutes,
    selectSessions:    s.selectSessions,
  })))

  const { soundEnabled, vibrateEnabled } = useSettingsStore()

  const isRunning = status === 'active'

  const [showXP, setShowXP]                   = useState(false)
  const [levelUp, setLevelUp]                 = useState(false)
  const [soundsOpen, setSoundsOpen]           = useState(false)
  const [showCompletion, setShowCompletion]   = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalXpEarned, setTotalXpEarned]     = useState(0)

  const xpAnim              = useRef(new Animated.Value(0)).current
  const completionAnim      = useRef(new Animated.Value(0)).current
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedSessionsRef = useRef(0)
  const totalSessionsRef     = useRef(totalSessions)

  // Keep refs in sync so callbacks always see latest values
  useEffect(() => { totalSessionsRef.current = totalSessions }, [totalSessions])

  const sessionDoneRef = useRef<() => Promise<void>>(async () => {})

  // ── Phase-transition handler ────────────────────────────────────────────────
  const handleSessionDone = useCallback(async () => {
    if (phase === 'focus') {
      // Focus finished → award XP, notify, then auto-start break
      if (soundEnabled) playBreakSound().catch(() => {})
      if (vibrateEnabled) Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success)

      if (Notifications) {
        Notifications.scheduleNotificationAsync({
          content: { title: 'Seans tugadi! 🎉', body: 'Ajoyib! Dam oling.', sound: true },
          trigger: null,
        }).catch(() => {})
      }

      const result = await onSessionComplete()
      const newCompleted = completedSessionsRef.current + 1
      completedSessionsRef.current = newCompleted
      setCompletedSessions(newCompleted)
      setTotalXpEarned(prev => prev + result.xpAwarded)
      setLevelUp(result.levelUp)
      setShowXP(true)

      Animated.sequence([
        Animated.timing(xpAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
        Animated.delay(2000),
        Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setShowXP(false)
        startBreak()
      })

    } else {
      // Break finished → check if all sessions done
      if (completedSessionsRef.current >= totalSessionsRef.current) {
        // All sessions complete → show completion modal
        if (soundEnabled) playFocusSound().catch(() => {})
        if (vibrateEnabled) Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success)

        if (Notifications) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Barcha seanslar tugadi! 🏆',
              body: `${completedSessionsRef.current} seans muvaffaqiyatli bajarildi!`,
              sound: true,
            },
            trigger: null,
          }).catch(() => {})
        }

        setShowCompletion(true)
        Animated.spring(completionAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start()

      } else {
        // More sessions remaining → start next focus session
        if (soundEnabled) playFocusSound().catch(() => {})
        if (vibrateEnabled) Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium)

        if (Notifications) {
          Notifications.scheduleNotificationAsync({
            content: { title: "Tanaffus tugadi! 💪", body: 'Yana diqqat seansi boshlaylik!', sound: true },
            trigger: null,
          }).catch(() => {})
        }

        completeBreak()
      }
    }
  }, [phase, onSessionComplete, xpAnim, completionAnim, startBreak, completeBreak, soundEnabled, vibrateEnabled])

  useEffect(() => { sessionDoneRef.current = handleSessionDone }, [handleSessionDone])

  // ── Ticker ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const done = tick()
        if (done) {
          clearInterval(intervalRef.current!)
          sessionDoneRef.current()
        }
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, tick])

  // ── Ambient sound sync ──────────────────────────────────────────────────────
  useEffect(() => {
    sounds.forEach(track => {
      if (track.isActive && !soundInstances[track.id]) loadSoundInstance(track)
      else if (!track.isActive && soundInstances[track.id]) unloadSoundInstance(track.id)
    })
  }, [sounds])

  useEffect(() => {
    sounds.forEach(track => {
      const inst = soundInstances[track.id]
      if (inst && track.isActive) inst.setVolumeAsync(track.volume).catch(() => {})
    })
  }, [sounds])

  useEffect(() => {
    return () => { Object.keys(soundInstances).forEach(id => unloadSoundInstance(id)) }
  }, [])

  // ── Derived display values ──────────────────────────────────────────────────
  const phaseColor   = phase === 'focus' ? FOCUS_COLOR : BREAK_COLOR
  const phaseLabel   = phase === 'focus' ? 'Diqqat' : 'Tanaffus'
  const breakSecs    = useTimerStore(s => s.breakSeconds())
  const totalSeconds = phase === 'focus' ? plannedMinutes * 60 : breakSecs
  const progress     = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0

  const xpTranslateY         = xpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
  const completionScale      = completionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })
  const completionOpacity    = completionAnim

  function handlePlayPause() {
    if (status === 'active') {
      pause()
    } else if (status === 'paused') {
      resume()
    } else {
      // Fresh start — reset session tracking
      completedSessionsRef.current = 0
      setCompletedSessions(0)
      setTotalXpEarned(0)
      setShowCompletion(false)
      completionAnim.setValue(0)
      start()
    }
  }

  function handleReset() {
    completedSessionsRef.current = 0
    setCompletedSessions(0)
    setTotalXpEarned(0)
    setShowCompletion(false)
    completionAnim.setValue(0)
    reset()
  }

  // Session progress dots for the current run
  const runDots = Array.from({ length: totalSessions })

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bgPrimary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Duration selector — disabled while running */}
        <View style={styles.durationRow}>
          {DURATIONS.map(m => (
            <DurationChip
              key={m}
              minutes={m}
              selected={plannedMinutes === m}
              onPress={() => selectMinutes(m)}
            />
          ))}
        </View>

        {/* Session count selector */}
        <View style={styles.sessionSelectorRow}>
          <Text style={[styles.selectorLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Seanslar:
          </Text>
          {SESSION_OPTIONS.map(n => (
            <SessionChip
              key={n}
              count={n}
              selected={totalSessions === n}
              onPress={() => selectSessions(n)}
            />
          ))}
        </View>

        {/* Break info label */}
        <Text style={[styles.breakHint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {plannedMinutes <= 25 ? '5 daqiqa tanaffus' : '10 daqiqa tanaffus'} · avtomatik
        </Text>

        {/* Run progress dots — shows current session within the set */}
        {(status !== 'idle' || completedSessions > 0) && totalSessions > 1 && (
          <View style={styles.runProgressRow}>
            {runDots.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.runDot,
                  {
                    backgroundColor: i < completedSessions
                      ? FOCUS_COLOR
                      : (i === completedSessions && phase === 'focus' && status === 'active')
                        ? FOCUS_COLOR + '66'
                        : c.bgTertiary,
                  },
                ]}
              />
            ))}
            <Text style={[styles.sessionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {completedSessions}/{totalSessions}
            </Text>
          </View>
        )}

        {/* Lifetime session counter */}
        <View style={styles.sessionRow}>
          {Array.from({ length: Math.min(sessionCount, 8) }).map((_, i) => (
            <View key={i} style={[styles.sessionDot, { backgroundColor: FOCUS_COLOR }]} />
          ))}
          {sessionCount > 0 && (
            <Text style={[styles.sessionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              {sessionCount} seans
            </Text>
          )}
        </View>

        {/* Big clock */}
        <View style={[styles.clockWrap, { borderColor: phaseColor + '33' }]}>
          <View style={[styles.progressRing, {
            borderColor:    phaseColor,
            borderTopColor: progress > 0 ? phaseColor : 'transparent',
            opacity:        0.25 + progress * 0.75,
          }]} />
          <View style={styles.clockInner}>
            <Text style={[styles.clockText, { color: phaseColor, fontFamily: typography.fontFamily.bold }]}>
              {fmtTime(secondsLeft)}
            </Text>
            <Text style={[styles.clockMode, { color: phaseColor, fontFamily: typography.fontFamily.medium }]}>
              {phaseLabel}
            </Text>
          </View>
        </View>

        {/* XP burst */}
        {showXP && (
          <Animated.View style={[styles.xpBurst, { opacity: xpAnim, transform: [{ translateY: xpTranslateY }] }]}>
            <View style={[styles.xpCard, { backgroundColor: FOCUS_COLOR }]}>
              <Text style={styles.xpText}>+{lastXP} XP 🎉</Text>
              {levelUp && <Text style={styles.xpSub}>Yangi daraja! 🚀</Text>}
            </View>
          </Animated.View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={handleReset}
            hitSlop={10}
            style={[styles.controlBtn, { backgroundColor: c.bgTertiary }]}
          >
            <Text style={[styles.controlIcon, { color: c.textSecondary }]}>↺</Text>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={[styles.playBtn, { backgroundColor: phaseColor }]}
          >
            <Text style={styles.playIcon}>{isRunning ? '⏸' : '▶'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setSoundsOpen(v => !v)}
            hitSlop={10}
            style={[styles.controlBtn, { backgroundColor: soundsOpen ? c.brandSubtle : c.bgTertiary }]}
          >
            <Text style={[styles.controlIcon, { color: soundsOpen ? c.brand : c.textSecondary }]}>🎵</Text>
          </Pressable>
        </View>

        {/* Ambient sound mixer */}
        {soundsOpen && (
          <View style={[styles.soundPanel, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.soundPanelTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Muhit shovqini
            </Text>
            {sounds.map(track => (
              <SoundRow key={track.id} track={track} />
            ))}
            <Text style={[styles.soundHint, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Bir nechta ovoz bir vaqtda ijro etiladi
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {sessionCount}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Bugungi seans
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {sessionCount * plannedMinutes} daq
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Diqqat vaqti
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: FOCUS_COLOR, fontFamily: typography.fontFamily.bold }]}>
              +{sessionCount * 50} XP
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Bugun
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* ── Completion Modal ──────────────────────────────────────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={showCompletion}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            styles.modalCard,
            { backgroundColor: c.bgSecondary },
            { opacity: completionOpacity, transform: [{ scale: completionScale }] },
          ]}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={[styles.modalTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Siz buni bajardingiz!
            </Text>
            <Text style={[styles.modalSub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {completedSessions} seans · {plannedMinutes * completedSessions} daqiqa
            </Text>

            {/* Session dots */}
            <View style={styles.modalDots}>
              {Array.from({ length: completedSessions }).map((_, i) => (
                <View key={i} style={[styles.modalDot, { backgroundColor: FOCUS_COLOR }]} />
              ))}
            </View>

            {/* XP badge */}
            <View style={[styles.modalXpBadge, { backgroundColor: FOCUS_COLOR }]}>
              <Text style={[styles.modalXpText, { fontFamily: typography.fontFamily.bold }]}>
                +{totalXpEarned} XP
              </Text>
            </View>

            <Pressable
              onPress={handleReset}
              style={[styles.modalBtn, { backgroundColor: FOCUS_COLOR }]}
            >
              <Text style={[styles.modalBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                Yangidan boshlash
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const CLOCK_SIZE = 220

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { padding: spacing.base, gap: spacing.lg, paddingBottom: spacing['3xl'] },

  durationRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs + 2,
    borderRadius:      radius.full,
  },
  durationChipText: { fontSize: typography.size.sm },

  sessionSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectorLabel:      { fontSize: typography.size.xs },

  breakHint: { fontSize: typography.size.xs, marginTop: -spacing.sm },

  runProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  runDot:         { width: 10, height: 10, borderRadius: 5 },

  sessionRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 16 },
  sessionDot:   { width: 8, height: 8, borderRadius: 4 },
  sessionLabel: { fontSize: typography.size.xs, marginLeft: spacing.xs },

  clockWrap: {
    alignSelf:      'center',
    width:          CLOCK_SIZE,
    height:         CLOCK_SIZE,
    borderRadius:   CLOCK_SIZE / 2,
    borderWidth:    6,
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  progressRing: {
    position:     'absolute',
    width:        CLOCK_SIZE - 12,
    height:       CLOCK_SIZE - 12,
    borderRadius: (CLOCK_SIZE - 12) / 2,
    borderWidth:  6,
  },
  clockInner: { alignItems: 'center', gap: spacing.xs },
  clockText:  { fontSize: 52, lineHeight: 60 },
  clockMode:  { fontSize: typography.size.sm },

  xpBurst: { alignItems: 'center' },
  xpCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:      radius.xl,
    alignItems:        'center',
    gap:               spacing.xs,
  },
  xpText: { color: '#fff', fontSize: typography.size.xl, fontWeight: '800' },
  xpSub:  { color: 'rgba(255,255,255,0.85)', fontSize: typography.size.sm },

  controls:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  controlBtn:  { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  controlIcon: { fontSize: 22 },
  playBtn: {
    width:          70,
    height:         70,
    borderRadius:   35,
    alignItems:     'center',
    justifyContent: 'center',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.4,
    shadowRadius:   10,
    elevation:      8,
  },
  playIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },

  soundPanel: {
    borderRadius: radius.lg,
    borderWidth:  1,
    padding:      spacing.base,
    gap:          spacing.xs,
  },
  soundPanelTitle: { fontSize: typography.size.base, marginBottom: spacing.xs },
  soundRow: {
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  soundToggle: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs + 2,
  },
  soundName: { flex: 1, fontSize: typography.size.sm },
  soundTag:  { fontSize: typography.size.xs },
  volRow:    { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm + 28 },
  volDot:    { width: 14, height: 14, borderRadius: 7 },
  soundHint: { fontSize: typography.size.xs, marginTop: spacing.xs, textAlign: 'center' },

  statsRow: {
    flexDirection: 'row',
    borderRadius:  radius.lg,
    borderWidth:   1,
    overflow:      'hidden',
  },
  statItem:   { flex: 1, alignItems: 'center', paddingVertical: spacing.base, gap: 4 },
  statVal:    { fontSize: typography.size.md },
  statLabel:  { fontSize: typography.size.xs, textAlign: 'center' },
  statDivider:{ width: 1 },

  // Completion modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.xl,
  },
  modalCard: {
    width:        '100%',
    borderRadius: radius.xl,
    padding:      spacing['2xl'],
    alignItems:   'center',
    gap:          spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius:  20,
    elevation:     12,
  },
  modalEmoji: { fontSize: 56 },
  modalTitle: { fontSize: typography.size['2xl'], textAlign: 'center' },
  modalSub:   { fontSize: typography.size.sm, textAlign: 'center' },
  modalDots:  { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  modalDot:   { width: 12, height: 12, borderRadius: 6 },
  modalXpBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    marginVertical:    spacing.xs,
  },
  modalXpText: { color: '#fff', fontSize: typography.size.xl },
  modalBtn: {
    width:          '100%',
    paddingVertical: spacing.md,
    borderRadius:   radius.lg,
    alignItems:     'center',
    marginTop:      spacing.xs,
  },
  modalBtnText: { color: '#fff', fontSize: typography.size.base },
})
